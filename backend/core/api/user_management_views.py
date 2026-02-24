# core/api/user_management_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from datetime import date

from core.models import AccessLog
from core.models.rolesUser import (
    RoleUser, VehicleOwnership, FleetVehicle, 
    ServiceAssignment, DealerVehicle
)
from core.models import VehicleInfo
from core.serializers import (
    UserCreateSerializer, UserUpdateSerializer,
    RoleUserSerializer, DealerVehicleSaleSerializer
)
from core.role_permissions import RolePermission

import logging
logger = logging.getLogger(__name__)


class UserLoginView(APIView):
    """
    JWT Login endpoint
    Returns access and refresh tokens
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            username = request.data.get('username')
            password = request.data.get('password')

            if not username or not password:
                return Response({
                    'success': False,
                    'error': 'Username and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Authenticate user
            user = authenticate(username=username, password=password)
            
            if user is None:
                return Response({
                    'success': False,
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)

            if not user.is_active:
                return Response({
                    'success': False,
                    'error': 'User account is disabled'
                }, status=status.HTTP_403_FORBIDDEN)

            # Check if user has role profile
            try:
                role_profile = user.role_profile
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Log successful login
            AccessLog.objects.create(
                user=user,
                action='login',
                resource='Authentication',
                resource_id=str(user.id),
                success=True,
                details=f"User {user.username} logged in successfully"
            )

            return Response({
                'success': True,
                'message': 'Login successful',
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': role_profile.role,
                    'role_display': role_profile.get_role_display(),
                    'phone': role_profile.phone,
                    'vehicle_no': role_profile.vehicle_no
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error during login: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserLogoutView(APIView):
    """
    JWT Logout endpoint
    Blacklists the refresh token
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            
            if not refresh_token:
                return Response({
                    'success': False,
                    'error': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Blacklist the token
            token = RefreshToken(refresh_token)
            token.blacklist()

            # Log logout
            AccessLog.objects.create(
                user=request.user,
                action='logout',
                resource='Authentication',
                resource_id=str(request.user.id),
                success=True,
                details=f"User {request.user.username} logged out"
            )

            return Response({
                'success': True,
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error during logout: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TokenRefreshView(APIView):
    """
    Refresh JWT access token using refresh token
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            
            if not refresh_token:
                return Response({
                    'success': False,
                    'error': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Generate new access token
            refresh = RefreshToken(refresh_token)
            
            return Response({
                'success': True,
                'access': str(refresh.access_token)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return Response({
                'success': False,
                'error': 'Invalid or expired refresh token'
            }, status=status.HTTP_401_UNAUTHORIZED)


class CreateUserView(APIView):
    """
    Create users based on role hierarchy
    UPDATED: Added SALES role
    - SUPER_ADMIN: Can create OEM, SALES, RND, DEALER, SERVICE, FLEET, USER
    - OEM: Can create SALES, DEALER, SERVICE, FLEET, USER
    - SALES: Cannot create users (view only)
    - RND: Can create SERVICE, FLEET, USER
    - DEALER: Can create USER (end customers)
    - FLEET: Can create USER (fleet employees)
    """
    permission_classes = [IsAuthenticated] 
    authentication_classes = [JWTAuthentication]

    # Define who can create which roles
    CREATION_PERMISSIONS = {
        'SUPER_ADMIN': ['OEM', 'SALES', 'RND', 'DEALER', 'SERVICE', 'FLEET', 'USER'],
        'OEM': ['SALES', 'DEALER', 'SERVICE', 'FLEET', 'USER'],
        'SALES': ['DEALER', 'USER'],  # UPDATED: SALES can create dealers and customers
        'RND': ['SERVICE', 'FLEET', 'USER'],
        'DEALER': ['USER'],
        'FLEET': ['USER'],
        'SERVICE': [],
        'USER': [],
    }

    def post(self, request):
        try:
            # Get creator's role
            try:
                creator_role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get target role from request
            target_role = request.data.get('role')
            
            # Check if creator can create this role
            allowed_roles = self.CREATION_PERMISSIONS.get(creator_role, [])
            if target_role not in allowed_roles:
                return Response({
                    'success': False,
                    'error': f'{creator_role} cannot create {target_role} users',
                    'allowed_roles': allowed_roles
                }, status=status.HTTP_403_FORBIDDEN)

            # Validate and create user
            serializer = UserCreateSerializer(data=request.data)
            if serializer.is_valid():
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Log the creation
                    AccessLog.objects.create(
                        user=request.user,
                        action='create_user',
                        resource='User',
                        resource_id=str(user.id),
                        success=True,
                        details=f"Created {target_role} user: {user.username}"
                    )
                    
                    return Response({
                        'success': True,
                        'message': f'{target_role} user created successfully',
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email,
                            'role': user.role_profile.role,
                            'role_display': user.role_profile.get_role_display()
                        }
                    }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateUserView(APIView):
    """
    Update user details (name, email, phone, password)
    - Cannot change: role, vehicle_no, vin
    - Users can update their own profile
    - SUPER_ADMIN can update anyone
    - OEM can update SALES users
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def put(self, request, user_id=None):
        try:
            # If user_id is provided, check permissions
            if user_id:
                target_user = User.objects.get(id=user_id)
                
                # Check if requester can update this user
                try:
                    requester_role = request.user.role_profile.role
                    target_role = target_user.role_profile.role
                except ObjectDoesNotExist:
                    return Response({
                        'success': False,
                        'error': 'User role not assigned'
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # Authorization logic
                can_update = False
                
                # Users can always update themselves
                if request.user.id == target_user.id:
                    can_update = True
                # SUPER_ADMIN can update anyone
                elif requester_role == 'SUPER_ADMIN':
                    can_update = True
                # OEM can update SALES and DEALER
                elif requester_role == 'OEM' and target_role in ['SALES', 'DEALER']:
                    can_update = True
                # SALES can update DEALER (UPDATED)
                elif requester_role == 'SALES' and target_role == 'DEALER':
                    can_update = True
                
                if not can_update:
                    return Response({
                        'success': False,
                        'error': 'You do not have permission to update this user'
                    }, status=status.HTTP_403_FORBIDDEN)
            else:
                # Update own profile
                target_user = request.user

            # Validate and update
            serializer = UserUpdateSerializer(target_user, data=request.data, partial=True)
            if serializer.is_valid():
                updated_user = serializer.save()
                
                # Log the update
                AccessLog.objects.create(
                    user=request.user,
                    action='update_user',
                    resource='User',
                    resource_id=str(updated_user.id),
                    success=True,
                    details=f"Updated user: {updated_user.username}"
                )
                
                return Response({
                    'success': True,
                    'message': 'User updated successfully',
                    'user': {
                        'id': updated_user.id,
                        'username': updated_user.username,
                        'email': updated_user.email,
                        'first_name': updated_user.first_name,
                        'last_name': updated_user.last_name,
                        'phone': updated_user.role_profile.phone
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListUsersView(APIView):
    """
    List users based on role hierarchy
    UPDATED: Added SALES visibility
    - SUPER_ADMIN: See all users
    - OEM: See SALES, dealers, service, fleet, users they created
    - SALES: See dealers and their customers only (read-only)
    - RND: See dealers, service, fleet, users they created
    - DEALER: See only end users they created
    - FLEET: See only fleet members
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Filter users based on role
            if role == 'SUPER_ADMIN':
                users = User.objects.all()
            elif role == 'OEM':
                # Can see SALES, dealers, service, fleet, and users
                users = User.objects.filter(
                    role_profile__role__in=['SALES', 'DEALER', 'SERVICE', 'FLEET', 'USER']
                )
            elif role == 'SALES':
                # Can only see dealers and their customers (end users)
                users = User.objects.filter(
                    role_profile__role__in=['DEALER', 'USER']
                )
            elif role == 'RND':
                # Can see dealers, service, fleet, and users
                users = User.objects.filter(
                    role_profile__role__in=['DEALER', 'SERVICE', 'FLEET', 'USER']
                )
            elif role == 'DEALER':
                # Can only see end users
                users = User.objects.filter(role_profile__role='USER')
            elif role == 'FLEET':
                # Can see fleet members
                fleet_user_ids = VehicleOwnership.objects.filter(
                    vin__in=FleetVehicle.objects.filter(
                        fleet_manager=request.user
                    ).values_list('vin', flat=True)
                ).values_list('user_id', flat=True)
                users = User.objects.filter(id__in=fleet_user_ids)
            else:
                users = User.objects.filter(id=request.user.id)

            # Serialize users
            user_list = []
            for user in users:
                try:
                    user_list.append({
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role_profile.role,
                        'role_display': user.role_profile.get_role_display(),
                        'phone': user.role_profile.phone,
                        'vehicle_no': user.role_profile.vehicle_no,
                        'is_active': user.role_profile.is_active,
                        'created_at': user.role_profile.created_at.isoformat()
                    })
                except:
                    continue

            return Response({
                'success': True,
                'count': len(user_list),
                'users': user_list
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error listing users: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserProfileView(APIView):
    """
    Get current authenticated user's profile
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            user = request.user
            profile = user.role_profile
            
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': profile.role,
                    'role_display': profile.get_role_display(),
                    'phone': profile.phone,
                    'vehicle_no': profile.vehicle_no,
                    'is_active': profile.is_active,
                    'created_at': profile.created_at.isoformat()
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DealerSellVehicleView(APIView):
    """
    Dealer sells vehicle to customer
    - Creates USER account
    - Assigns vehicle ownership
    - Updates vehicle info with vehicle number
    - Marks vehicle as sold in dealer inventory
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            # Check if user is a dealer, OEM, SALES, or SUPER_ADMIN
            try:
                role = request.user.role_profile.role
                if role not in ['DEALER', 'SUPER_ADMIN', 'OEM', 'SALES']:
                    return Response({
                        'success': False,
                        'error': 'Only dealers, OEM, and SALES can process vehicle sales'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            serializer = DealerVehicleSaleSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data
            
            # Check if vehicle exists and is assigned to dealer
            try:
                vehicle = VehicleInfo.objects.get(vin=data['vin'])
            except VehicleInfo.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f"Vehicle with VIN {data['vin']} not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # If dealer, verify they have this vehicle
            if role == 'DEALER':
                dealer_has_vehicle = DealerVehicle.objects.filter(
                    dealer=request.user,
                    vin=data['vin'],
                    is_sold=False
                ).exists()
                
                if not dealer_has_vehicle:
                    return Response({
                        'success': False,
                        'error': 'This vehicle is not in your inventory or already sold'
                    }, status=status.HTTP_403_FORBIDDEN)

            with transaction.atomic():
                # Create user account
                user = User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password=data['password'],
                    first_name=data['first_name'],
                    last_name=data['last_name']
                )

                # Create role profile
                RoleUser.objects.create(
                    user=user,
                    role='USER',
                    phone=data['phone'],
                    vehicle_no=data['vehicle_no']
                )

                # Create vehicle ownership
                VehicleOwnership.objects.create(
                    user=user,
                    vin=data['vin'],
                    purchased_date=data.get('purchased_date', date.today()),
                    is_primary=True
                )

                # Update vehicle info with vehicle number
                vehicle.vehicle_no = data['vehicle_no']
                vehicle.save()

                # Mark as sold in dealer inventory
                if role == 'DEALER':
                    DealerVehicle.objects.filter(
                        dealer=request.user,
                        vin=data['vin']
                    ).update(is_sold=True)

                # Log the sale
                AccessLog.objects.create(
                    user=request.user,
                    action='sell_vehicle',
                    resource='VehicleSale',
                    resource_id=data['vin'],
                    success=True,
                    details=f"Sold {data['vin']} ({data['vehicle_no']}) to {user.username}"
                )

                return Response({
                    'success': True,
                    'message': 'Vehicle sold successfully',
                    'customer': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'name': f"{user.first_name} {user.last_name}",
                        'phone': data['phone']
                    },
                    'vehicle': {
                        'vin': data['vin'],
                        'vehicle_no': data['vehicle_no'],
                        'model': vehicle.model_name
                    }
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error selling vehicle: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FleetAssignVehicleToMemberView(APIView):
    """
    Fleet manager assigns vehicle to fleet member (end user)
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            # Check if user is fleet manager
            try:
                role = request.user.role_profile.role
                if role != 'FLEET':
                    return Response({
                        'success': False,
                        'error': 'Only fleet managers can assign vehicles to members'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            member_id = request.data.get('member_id')
            vin = request.data.get('vin')

            if not member_id or not vin:
                return Response({
                    'success': False,
                    'error': 'member_id and vin are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if member exists and is USER role
            try:
                member = User.objects.get(id=member_id)
                if member.role_profile.role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'Member must be an end user'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Member not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if vehicle is in fleet
            fleet_vehicle = FleetVehicle.objects.filter(
                fleet_manager=request.user,
                vin=vin,
                is_active=True
            ).first()

            if not fleet_vehicle:
                return Response({
                    'success': False,
                    'error': 'Vehicle not in your fleet'
                }, status=status.HTTP_403_FORBIDDEN)

            # Assign vehicle to member
            with transaction.atomic():
                ownership, created = VehicleOwnership.objects.get_or_create(
                    user=member,
                    vin=vin,
                    defaults={'is_primary': False}
                )

                AccessLog.objects.create(
                    user=request.user,
                    action='assign_fleet_vehicle',
                    resource='FleetVehicle',
                    resource_id=vin,
                    success=True,
                    details=f"Assigned {vin} to fleet member {member.username}"
                )

                return Response({
                    'success': True,
                    'message': 'Vehicle assigned to fleet member',
                    'assignment': {
                        'member': member.username,
                        'vin': vin,
                        'created': created
                    }
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error assigning fleet vehicle: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AssignVehicleView(APIView):
    """
    Assign vehicles to users (Super Admin, OEM, SALES only)
    UPDATED: SALES can assign vehicles to dealers
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Check if user is Super Admin, OEM, or SALES
            try:
                role = request.user.role_profile.role
                if role not in ['SUPER_ADMIN', 'OEM', 'SALES']:
                    return Response({
                        'success': False,
                        'error': 'Only Super Admin, OEM, and SALES can assign vehicles',
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
            
            # SALES can only assign to dealers
            if role == 'SALES' and assignment_type != 'dealer':
                return Response({
                    'success': False,
                    'error': 'SALES role can only assign vehicles to dealers',
                    'allowed_types': ['dealer']
                }, status=status.HTTP_403_FORBIDDEN)
            
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
                    defaults={
                        'dealer_name': dealer_name,
                        'assigned_by': request.user  # Track who assigned it
                    }
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
                    'created': created,
                    'assigned_by': request.user.username
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