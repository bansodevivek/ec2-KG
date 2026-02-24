# core/api/rbac_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from core.models import (
    VehicleInfo, VehicleRawData, VehicleSpecs,
    VehicleOwnership, FleetVehicle, ServiceAssignment, DealerVehicle, AccessLog
)
from core.role_permissions import RolePermission
from core.querysets import RoleBasedQuerySet
import logging

logger = logging.getLogger(__name__)


class VehicleInfoAccessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # 1. Role Check
            try:
                role_profile = request.user.role_profile
                role = role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 2. Role-Based Filtering
            queryset = VehicleInfo.objects.all()
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)
            
            # 3. "No Vehicle Assigned" Handler
            # If the user is NOT a high-level role and has no vehicles
            if not filtered_queryset.exists():
                return Response({
                    'success': True,
                    'role': role,
                    'role_display': role_profile.get_role_display(),
                    'vehicle_count': 0,
                    'vehicles': [],
                    'message': 'No vehicle assigned to this account. Please contact your administrator.'
                }, status=status.HTTP_200_OK)

            # 4. Data Serialization
            vehicles = []
            for vehicle in filtered_queryset:
                vehicles.append({
                    'vin': vehicle.vin,
                    'model_name': getattr(vehicle, 'model_name', 'N/A'),
                    'make': vehicle.make,
                    'model': vehicle.model,
                    'variant': vehicle.variant,
                    'battery_type': vehicle.battery_type,
                    'service_due_date': vehicle.service_due_date.isoformat() if vehicle.service_due_date else None,
                    'service_due_distance': vehicle.service_due_distance,
                })
            
            return Response({
                'success': True,
                'role': role,
                'role_display': role_profile.get_role_display(),
                'vehicle_count': len(vehicles),
                'vehicles': vehicles
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching vehicles: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VehicleRawDataAccessView(APIView):
    """
    Get raw CAN data based on user's role and data visibility level
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin=None):
        try:
            # Check if user has role assigned
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned. Please contact administrator.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Build queryset
            if vin:
                # Check if user has access to this specific vehicle
                vehicle_queryset = VehicleInfo.objects.filter(vin=vin)
                accessible = RoleBasedQuerySet.filter_vehicles_by_role(
                    vehicle_queryset, 
                    request.user
                ).exists()
                
                if not accessible:
                    return Response({
                        'success': False,
                        'error': f'You do not have access to vehicle {vin}'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                queryset = VehicleRawData.objects.filter(vin=vin)
            else:
                queryset = VehicleRawData.objects.all()
            
            # Apply role-based filters
            filtered_queryset = RoleBasedQuerySet.filter_raw_data_by_role(
                queryset, 
                request.user
            )
            
            # Get accessible fields for this role
            accessible_fields = RoleBasedQuerySet.get_accessible_can_fields(request.user)
            
            # Limit number of records based on role
            record_limits = {
                'SUPER_ADMIN': 1000,
                'OEM': 500,
                'RND': 1000,
                'DEALER': 100,
                'SERVICE': 200,
                'FLEET': 200,
                'USER': 50,
            }
            limit = record_limits.get(role, 50)
            
            # Get latest records
            raw_data = filtered_queryset.order_by('-timestamp')[:limit]
            
            # Filter fields based on role
            data_list = []
            for record in raw_data:
                record_dict = {}
                for field in accessible_fields:
                    if hasattr(record, field):
                        value = getattr(record, field)
                        # Convert datetime to string
                        if hasattr(value, 'isoformat'):
                            value = value.isoformat()
                        record_dict[field] = value
                data_list.append(record_dict)
            
            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_raw_data',
                resource='VehicleRawData',
                resource_id=vin if vin else 'all',
                success=True,
                details=f"Accessed {len(data_list)} records"
            )
            
            return Response({
                'success': True,
                'role': role,
                'data_visibility': self._get_data_visibility_level(role),
                'record_count': len(data_list),
                'accessible_fields_count': len(accessible_fields),
                'max_records': limit,
                'data': data_list
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching raw data: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_data_visibility_level(self, role):
        """Return data visibility description"""
        visibility = {
            'SUPER_ADMIN': 'Full access to all CAN data',
            'OEM': 'Full CAN data, limited to 7 days',
            'RND': 'Full CAN data, no time limit',
            'DEALER': 'Summary data, limited to 30 days',
            'SERVICE': 'Fault codes and diagnostics, limited to 90 days',
            'FLEET': 'Summary data, limited to 180 days',
            'USER': 'Basic telemetry only, limited to 30 days',
        }
        return visibility.get(role, 'Limited access')


class VehicleControlAccessView(APIView):
    """
    Vehicle control with role-based restrictions
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Check if user has role assigned
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned. Please contact administrator.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if user can control vehicles
            if not RoleBasedQuerySet.can_access_vehicle_control(request.user):
                AccessLog.objects.create(
                    user=request.user,
                    action='vehicle_control_denied',
                    resource='VehicleControl',
                    success=False,
                    details=f"User with role {role} attempted vehicle control"
                )
                return Response({
                    'success': False,
                    'error': 'Your role does not have vehicle control permissions',
                    'role': role,
                    'allowed_roles': ['SUPER_ADMIN', 'FLEET', 'USER']
                }, status=status.HTTP_403_FORBIDDEN)
            
            control_type = request.data.get('control_type')
            value = request.data.get('value')
            vin = request.data.get('vin')
            
            # Validate input
            if not control_type:
                return Response({
                    'success': False,
                    'error': 'control_type is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if value is None:
                return Response({
                    'success': False,
                    'error': 'value is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify user can access this vehicle (if vin provided)
            if vin:
                vehicle_queryset = VehicleInfo.objects.filter(vin=vin)
                accessible = RoleBasedQuerySet.filter_vehicles_by_role(
                    vehicle_queryset, 
                    request.user
                ).exists()
                
                if not accessible:
                    AccessLog.objects.create(
                        user=request.user,
                        action='vehicle_control_denied',
                        resource=control_type,
                        resource_id=vin,
                        success=False,
                        details=f"User attempted to control vehicle {vin} without access"
                    )
                    return Response({
                        'success': False,
                        'error': 'You do not have access to control this vehicle'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Execute control command
            from core.Services.vehicle_control import vehicle_control_service
            success = vehicle_control_service.publish_control_command(
                control_type=control_type,
                value=value
            )
            
            # Log the action
            AccessLog.objects.create(
                user=request.user,
                action='vehicle_control',
                resource=control_type,
                resource_id=vin if vin else 'global',
                success=success,
                details=f"Control: {control_type}={value}"
            )
            
            return Response({
                'success': success,
                'message': 'Control command sent' if success else 'Failed to send command',
                'control_type': control_type,
                'value': value,
                'vin': vin
            }, status=status.HTTP_200_OK if success else status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            logger.error(f"Error in vehicle control: {e}")
            AccessLog.objects.create(
                user=request.user,
                action='vehicle_control_error',
                resource='VehicleControl',
                success=False,
                details=str(e)
            )
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserPermissionsView(APIView):
    """
    Get current user's permissions and capabilities
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Check if user has role assigned
            try:
                role = request.user.role_profile.role
                role_display = request.user.role_profile.get_role_display()
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned. Please contact administrator.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            permissions = RolePermission.ROLE_PERMISSIONS.get(role, {})
            
            # Get user's assigned vehicles
            accessible_vehicles = VehicleInfo.objects.all()
            accessible_vehicles = RoleBasedQuerySet.filter_vehicles_by_role(
                accessible_vehicles,
                request.user
            )
            
            # Get accessible CAN fields
            accessible_fields = RoleBasedQuerySet.get_accessible_can_fields(request.user)
            
            return Response({
                'success': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'role': role,
                    'role_display': role_display,
                    'phone': request.user.role_profile.phone,
                    'vehicle_no': request.user.role_profile.vehicle_no,
                },
                'permissions': permissions,
                'accessible_vehicles_count': accessible_vehicles.count(),
                'accessible_can_fields_count': len(accessible_fields),
                'can_control_vehicles': RoleBasedQuerySet.can_access_vehicle_control(request.user),
                'capabilities': {
                    'view_raw_data': 'vehicle_raw_data' in permissions and 'view' in permissions.get('vehicle_raw_data', []),
                    'control_vehicles': RoleBasedQuerySet.can_access_vehicle_control(request.user),
                    'manage_users': 'user_management' in permissions and len(permissions.get('user_management', [])) > 0,
                    'full_can_access': permissions.get('can_data') == 'full',
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching permissions: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AssignVehicleView(APIView):
    """
    Assign vehicles to users (Super Admin only)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Check if user is Super Admin
            try:
                role = request.user.role_profile.role
                if role != 'SUPER_ADMIN':
                    return Response({
                        'success': False,
                        'error': 'Only Super Admins can assign vehicles',
                        'your_role': role
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not found'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user_id = request.data.get('user_id')
            vin = request.data.get('vin')
            assignment_type = request.data.get('type')  # 'owner', 'fleet', 'service', 'dealer'
            
            # Validate input
            if not user_id or not vin or not assignment_type:
                return Response({
                    'success': False,
                    'error': 'user_id, vin, and type are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify vehicle exists
            if not VehicleInfo.objects.filter(vin=vin).exists():
                return Response({
                    'success': False,
                    'error': f'Vehicle with VIN {vin} not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            user = User.objects.get(id=user_id)
            target_role = user.role_profile.role
            
            # Create appropriate assignment based on role
            if assignment_type == 'owner' and target_role == 'USER':
                obj, created = VehicleOwnership.objects.get_or_create(
                    user=user,
                    vin=vin,
                    defaults={'is_primary': True}
                )
                message = 'Vehicle assigned to user' if created else 'Vehicle already assigned to user'
            
            elif assignment_type == 'fleet' and target_role == 'FLEET':
                fleet_name = request.data.get('fleet_name', 'Default Fleet')
                obj, created = FleetVehicle.objects.get_or_create(
                    fleet_manager=user,
                    vin=vin,
                    defaults={'fleet_name': fleet_name}
                )
                message = 'Vehicle assigned to fleet' if created else 'Vehicle already in fleet'
            
            elif assignment_type == 'service' and target_role == 'SERVICE':
                service_type = request.data.get('service_type', 'General Service')
                obj, created = ServiceAssignment.objects.get_or_create(
                    engineer=user,
                    vin=vin,
                    defaults={'service_type': service_type}
                )
                message = 'Vehicle assigned to service engineer' if created else 'Vehicle already assigned'
            
            elif assignment_type == 'dealer' and target_role == 'DEALER':
                dealer_name = request.data.get('dealer_name', 'Default Dealer')
                obj, created = DealerVehicle.objects.get_or_create(
                    dealer=user,
                    vin=vin,
                    defaults={'dealer_name': dealer_name}
                )
                message = 'Vehicle assigned to dealer' if created else 'Vehicle already assigned to dealer'
            else:
                return Response({
                    'success': False,
                    'error': f'Invalid assignment type "{assignment_type}" or role mismatch (user role: {target_role})',
                    'valid_combinations': {
                        'owner': 'USER',
                        'fleet': 'FLEET',
                        'service': 'SERVICE',
                        'dealer': 'DEALER'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Log the assignment
            AccessLog.objects.create(
                user=request.user,
                action='assign_vehicle',
                resource=assignment_type,
                resource_id=vin,
                success=True,
                details=f"Assigned {vin} to user {user.username} as {assignment_type}"
            )
            
            return Response({
                'success': True,
                'message': message,
                'assignment': {
                    'user': user.username,
                    'vin': vin,
                    'type': assignment_type,
                    'created': created
                }
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error assigning vehicle: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnassignVehicleView(APIView):
    """
    Remove vehicle assignment (Super Admin only)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Check if user is Super Admin
            try:
                role = request.user.role_profile.role
                if role != 'SUPER_ADMIN':
                    return Response({
                        'success': False,
                        'error': 'Only Super Admins can unassign vehicles'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not found'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user_id = request.data.get('user_id')
            vin = request.data.get('vin')
            assignment_type = request.data.get('type')
            
            if not all([user_id, vin, assignment_type]):
                return Response({
                    'success': False,
                    'error': 'user_id, vin, and type are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.get(id=user_id)
            deleted = False
            
            # Remove assignment based on type
            if assignment_type == 'owner':
                deleted = VehicleOwnership.objects.filter(user=user, vin=vin).delete()[0]
            elif assignment_type == 'fleet':
                deleted = FleetVehicle.objects.filter(fleet_manager=user, vin=vin).delete()[0]
            elif assignment_type == 'service':
                deleted = ServiceAssignment.objects.filter(engineer=user, vin=vin).delete()[0]
            elif assignment_type == 'dealer':
                deleted = DealerVehicle.objects.filter(dealer=user, vin=vin).delete()[0]
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid assignment type'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if deleted:
                AccessLog.objects.create(
                    user=request.user,
                    action='unassign_vehicle',
                    resource=assignment_type,
                    resource_id=vin,
                    success=True,
                    details=f"Unassigned {vin} from user {user.username}"
                )
                
            return Response({
                'success': True,
                'message': 'Vehicle unassigned' if deleted else 'No assignment found'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error unassigning vehicle: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)