# core/views/fleet_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
import logging

# Import Service Layer and Models
from core.Services.fleet_service import (
    get_all_fleets,
    create_fleet_and_setup_profile,
    update_fleet,
    delete_fleet,
    add_member_to_fleet,
    remove_member_from_fleet,
    assign_vehicle_to_fleet,
    assign_vehicle_to_member,
    unassign_vehicle_from_member
)
from core.models.fleet import Fleet
from core.serializers import FleetSerializer, FleetCreateSerializer

logger = logging.getLogger(__name__)

# ========================================
# FLEET CRUD VIEWS
# ========================================

class FleetListCreateView(APIView):
    """
    List all fleets, or create a new fleet with automatic manager user creation.
    
    GET: List all fleets (filtered by role)
    POST: Create fleet + fleet manager user (SUPER_ADMIN/OEM/RANDD only)
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        """
        List fleets based on user role:
        - SUPER_ADMIN/OEM/RANDD: See all fleets
        - FLEET: See only their own fleet
        - Others: Empty list
        """
        try:
            user_role = request.user.role_profile.role
            
            if user_role in ['SUPER_ADMIN', 'OEM', 'RANDD']:
                fleets = get_all_fleets()
            elif user_role == 'FLEET':
                fleets = Fleet.objects.filter(manager=request.user)
            else:
                fleets = Fleet.objects.none()
            
            serializer = FleetSerializer(fleets, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error listing fleets: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """
        Creates a fleet and fleet manager user in one transaction.
        Only SUPER_ADMIN, OEM, or RANDD can create fleets.
        
        Required fields:
        - username: Fleet manager's username
        - email: Fleet manager's email
        - password: Fleet manager's password
        - first_name: Fleet manager's first name
        - last_name: Fleet manager's last name
        - phone: Fleet manager's phone number
        - fleet_name: Name of the fleet
        - fleet_description: Description (optional)
        """
        try:
            # Validate using serializer
            serializer = FleetCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Create fleet and manager using service layer
            fleet = create_fleet_and_setup_profile(
                data=serializer.validated_data,
                created_by_user=request.user
            )
            
            # Return fleet details
            response_serializer = FleetSerializer(fleet)
            return Response(
                {
                    'success': True,
                    'message': 'Fleet and manager created successfully',
                    'fleet': response_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creating fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FleetDetailView(APIView):
    """
    Retrieve, update or delete a fleet instance.
    
    GET: Retrieve fleet details
    PUT: Update fleet (name/description only)
    DELETE: Delete fleet (SUPER_ADMIN/OEM/RANDD only)
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_object(self, pk, user):
        """Get fleet if user has access to it"""
        try:
            user_role = user.role_profile.role
            fleet = get_object_or_404(Fleet, pk=pk)
            
            # SUPER_ADMIN/OEM/RANDD can access any fleet
            if user_role in ['SUPER_ADMIN', 'OEM', 'RANDD']:
                return fleet
            # FLEET managers can only access their own fleet
            elif user_role == 'FLEET' and fleet.manager == user:
                return fleet
            else:
                return None
                
        except Exception:
            return None

    def get(self, request, pk):
        """Get fleet details"""
        fleet = self.get_object(pk, request.user)
        if not fleet:
            return Response(
                {"error": "Fleet not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = FleetSerializer(fleet)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update fleet name and/or description"""
        try:
            fleet = self.get_object(pk, request.user)
            if not fleet:
                return Response(
                    {"error": "Fleet not found or access denied"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update using service layer
            updated_fleet = update_fleet(
                fleet_id=pk,
                data=request.data,
                updated_by_user=request.user
            )
            
            serializer = FleetSerializer(updated_fleet)
            return Response(
                {
                    'success': True,
                    'message': 'Fleet updated successfully',
                    'fleet': serializer.data
                }
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, pk):
        """Delete fleet (SUPER_ADMIN/OEM/RANDD only)"""
        try:
            delete_fleet(fleet_id=pk, deleted_by_user=request.user)
            return Response(
                {
                    'success': True,
                    'message': 'Fleet deleted successfully'
                },
                status=status.HTTP_200_OK
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ========================================
# MEMBER MANAGEMENT VIEWS
# ========================================

class FleetMemberManagementView(APIView):
    """
    Add or remove members from a fleet.
    
    POST: Add member to fleet
    DELETE: Remove member from fleet
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        """
        Add a member to a fleet.
        
        Required:
        - fleet_id: ID of the fleet
        - member_id: ID of the user to add (must have USER role)
        """
        try:
            fleet_id = request.data.get('fleet_id')
            member_id = request.data.get('member_id')
            
            if not fleet_id or not member_id:
                return Response(
                    {"error": "fleet_id and member_id are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add member using service layer
            fleet = add_member_to_fleet(
                fleet_id=fleet_id,
                member_id=member_id,
                added_by_user=request.user
            )
            
            serializer = FleetSerializer(fleet)
            return Response(
                {
                    'success': True,
                    'message': 'Member added to fleet successfully',
                    'fleet': serializer.data
                },
                status=status.HTTP_200_OK
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error adding member to fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):
        """
        Remove a member from a fleet.
        
        Required:
        - fleet_id: ID of the fleet
        - member_id: ID of the member to remove
        """
        try:
            fleet_id = request.data.get('fleet_id')
            member_id = request.data.get('member_id')
            
            if not fleet_id or not member_id:
                return Response(
                    {"error": "fleet_id and member_id are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Remove member using service layer
            fleet = remove_member_from_fleet(
                fleet_id=fleet_id,
                member_id=member_id,
                removed_by_user=request.user
            )
            
            serializer = FleetSerializer(fleet)
            return Response(
                {
                    'success': True,
                    'message': 'Member removed from fleet successfully',
                    'fleet': serializer.data
                },
                status=status.HTTP_200_OK
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error removing member from fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ========================================
# VEHICLE MANAGEMENT VIEWS
# ========================================

class FleetVehicleInventoryView(APIView):
    """
    Assign vehicles to fleet inventory.
    Only SUPER_ADMIN/OEM/RANDD can add vehicles to fleet inventory.
    
    POST: Assign vehicle to fleet inventory
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        """
        Assign a vehicle to fleet inventory.
        
        Required:
        - fleet_id: ID of the fleet
        - vin: Vehicle Identification Number
        """
        try:
            fleet_id = request.data.get('fleet_id')
            vin = request.data.get('vin')
            
            if not fleet_id or not vin:
                return Response(
                    {"error": "fleet_id and vin are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign vehicle to fleet using service layer
            fleet_vehicle = assign_vehicle_to_fleet(
                fleet_id=fleet_id,
                vin=vin,
                assigned_by_user=request.user
            )
            
            return Response(
                {
                    'success': True,
                    'message': 'Vehicle assigned to fleet inventory',
                    'vehicle': {
                        'vin': fleet_vehicle.vin,
                        'fleet_name': fleet_vehicle.fleet_name,
                        'is_active': fleet_vehicle.is_active
                    }
                },
                status=status.HTTP_201_CREATED
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error assigning vehicle to fleet: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FleetAssignVehicleToMemberView(APIView):
    """
    Fleet manager assigns vehicle from fleet inventory to a member.
    
    POST: Assign vehicle to member
    DELETE: Unassign vehicle from member
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        """
        Assign a vehicle to a fleet member.
        
        Required:
        - member_id: ID of the member
        - vin: Vehicle Identification Number
        """
        try:
            member_id = request.data.get('member_id')
            vin = request.data.get('vin')
            
            if not member_id or not vin:
                return Response(
                    {"error": "member_id and vin are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assign vehicle to member
            ownership, created = assign_vehicle_to_member(
                manager_user=request.user,
                member_id=member_id,
                vin=vin
            )
            
            return Response(
                {
                    'success': True,
                    'message': 'Vehicle assigned to member successfully',
                    'assignment': {
                        'vin': vin,
                        'member_id': member_id,
                        'created': created
                    }
                },
                status=status.HTTP_200_OK
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error assigning vehicle to member: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):
        """
        Unassign a vehicle from a fleet member.
        
        Required:
        - member_id: ID of the member
        - vin: Vehicle Identification Number
        """
        try:
            member_id = request.data.get('member_id')
            vin = request.data.get('vin')
            
            if not member_id or not vin:
                return Response(
                    {"error": "member_id and vin are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Unassign vehicle from member
            unassign_vehicle_from_member(
                manager_user=request.user,
                member_id=member_id,
                vin=vin
            )
            
            return Response(
                {
                    'success': True,
                    'message': 'Vehicle unassigned from member successfully'
                },
                status=status.HTTP_200_OK
            )
            
        except PermissionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error unassigning vehicle from member: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )