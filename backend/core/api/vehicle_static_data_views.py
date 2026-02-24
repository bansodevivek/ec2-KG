# core/api/vehicle_static_data_views.py
"""
API Views for Vehicle Info and Specs
Role-based access control applied with ownership validation
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist
import logging

from core.Services.vehicle_static_data_service import vehicle_static_data_service
from core.models import AccessLog, VehicleInfo
# Assuming RoleBasedQuerySet is imported from where it is defined
from core.querysets import RoleBasedQuerySet

logger = logging.getLogger(__name__)


class VehicleInfoView(APIView):
    """
    Get vehicle static information filtered by role and ownership
    
    GET /api/vehicle-static/info/<vin>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin):
        try:
            # 1. Role Check
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Role-Based Filtering to ensure ownership/access
            queryset = VehicleInfo.objects.filter(vin=vin)
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': False,
                    'error': f'Vehicle with VIN {vin} not found or not assigned to you'
                }, status=status.HTTP_404_NOT_FOUND)

            # 3. Get vehicle info filtered by role
            vehicle_info = vehicle_static_data_service.get_vehicle_info(vin, role)

            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_vehicle_info',
                resource='VehicleInfo',
                resource_id=vin,
                success=True,
                details=f"Role: {role}"
            )

            return Response({
                'success': True,
                'role': role,
                'vin': vin,
                'data': vehicle_info
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching vehicle info: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehicleSpecsView(APIView):
    """
    Get vehicle specifications filtered by role and ownership
    
    GET /api/vehicle-static/specs/<vin>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin):
        try:
            # 1. Role Check
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Role-Based Filtering
            queryset = VehicleInfo.objects.filter(vin=vin)
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': False,
                    'error': f'Specs for VIN {vin} not found or not assigned to you'
                }, status=status.HTTP_404_NOT_FOUND)

            # 3. Get vehicle specs filtered by role
            vehicle_specs = vehicle_static_data_service.get_vehicle_specs(vin, role)

            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_vehicle_specs',
                resource='VehicleSpecs',
                resource_id=vin,
                success=True,
                details=f"Role: {role}"
            )

            return Response({
                'success': True,
                'role': role,
                'vin': vin,
                'data': vehicle_specs
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching vehicle specs: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompleteVehicleDataView(APIView):
    """
    Get complete vehicle data (info + specs) in one call
    Filtered by role and ownership
    
    GET /api/vehicle-static/complete/<vin>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin):
        try:
            # 1. Role Check
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Role-Based Filtering
            queryset = VehicleInfo.objects.filter(vin=vin)
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': False,
                    'error': f'No data found for VIN {vin} or not assigned to you'
                }, status=status.HTTP_404_NOT_FOUND)

            # 3. Get complete vehicle data
            complete_data = vehicle_static_data_service.get_complete_vehicle_data(vin, role)

            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_complete_vehicle_data',
                resource='VehicleData',
                resource_id=vin,
                success=True,
                details=f"Role: {role}"
            )

            return Response({
                'success': True,
                'role': role,
                'role_display': request.user.role_profile.get_role_display(),
                'vin': vin,
                'data': complete_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching complete vehicle data: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehiclesListView(APIView):
    """
    Get list of vehicles accessible to current user
    Based on role and ownership
    
    GET /api/vehicle-static/list/
    """
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
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Role-Based Filtering to get allowed VINs
            queryset = VehicleInfo.objects.all()
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': True,
                    'role': role,
                    'role_display': role_profile.get_role_display(),
                    'vehicle_count': 0,
                    'vehicles': [],
                    'message': 'No vehicle assigned to this account. Please contact your administrator.'
                }, status=status.HTTP_200_OK)

            # 3. Handle data details
            include_details = request.query_params.get('details', 'false').lower() == 'true'
            
            if include_details:
                vehicles_data = []
                for vehicle in filtered_queryset:
                    vehicle_data = vehicle_static_data_service.get_complete_vehicle_data(vehicle.vin, role)
                    if vehicle_data['vehicle_info']:
                        vehicles_data.append(vehicle_data)
                
                return Response({
                    'success': True,
                    'role': role,
                    'count': len(vehicles_data),
                    'vehicles': vehicles_data
                }, status=status.HTTP_200_OK)
            else:
                # Return list of VINs
                vins = list(filtered_queryset.values_list('vin', flat=True))
                return Response({
                    'success': True,
                    'role': role,
                    'count': len(vins),
                    'vins': vins
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching vehicles list: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VehicleServiceStatusView(APIView):
    """
    Get vehicle service status information
    Available to roles that need service information AND own/manage the vehicle
    
    GET /api/vehicle-static/service-status/<vin>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin):
        try:
            # 1. Role Check
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Permission Check for Role Type
            if role not in ['SUPER_ADMIN', 'OEM', 'SERVICE', 'FLEET', 'USER']:
                return Response({
                    'success': False,
                    'error': 'Insufficient permissions to view service status'
                }, status=status.HTTP_403_FORBIDDEN)

            # 3. Ownership/Assignment Check
            queryset = VehicleInfo.objects.filter(vin=vin)
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': False,
                    'error': f'Vehicle with VIN {vin} not found or not assigned to you'
                }, status=status.HTTP_404_NOT_FOUND)

            # 4. Get vehicle info
            vehicle_info = vehicle_static_data_service.get_vehicle_info(vin, role)

            # Extract service-related fields
            service_data = {
                'vin': vin,
                'service_due_date': vehicle_info.get('service_due_date'),
                'service_due_distance': vehicle_info.get('service_due_distance'),
                'service_status': vehicle_info.get('service_status'),
                'is_service_due': vehicle_info.get('is_service_due'),
            }

            # Add historical service data if role allows
            if role in ['SUPER_ADMIN', 'OEM', 'SERVICE']:
                service_data['last_service_date'] = vehicle_info.get('last_service_date')
                service_data['last_service_distance'] = vehicle_info.get('last_service_distance')

            return Response({
                'success': True,
                'role': role,
                'data': service_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching service status: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehicleBasicInfoView(APIView):
    """
    Get basic vehicle information (model, variant, color)
    Available to all authenticated users ONLY IF vehicle is assigned
    
    GET /api/vehicle-static/basic/<vin>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vin):
        try:
            # 1. Role Check
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # 2. Ownership/Assignment Check
            queryset = VehicleInfo.objects.filter(vin=vin)
            filtered_queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, request.user)

            if not filtered_queryset.exists():
                return Response({
                    'success': False,
                    'error': f'Vehicle with VIN {vin} not found or not assigned to you'
                }, status=status.HTTP_404_NOT_FOUND)

            # 3. Get vehicle info
            vehicle_info = vehicle_static_data_service.get_vehicle_info(vin, role)

            # Return only basic fields available to all
            basic_info = {
                'model_name': vehicle_info.get('model_name'),
                'variant': vehicle_info.get('variant'),
            }

            # Add optional fields if available
            if 'vehicle_no' in vehicle_info:
                basic_info['vehicle_no'] = vehicle_info.get('vehicle_no')
            if 'colour' in vehicle_info:
                basic_info['colour'] = vehicle_info.get('colour')

            return Response({
                'success': True,
                'vin': vin,
                'data': basic_info
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching basic info: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)