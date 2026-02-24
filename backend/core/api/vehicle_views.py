from django.forms import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.Services.vehicle_service import VehicleService
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import IsAuthenticated

class VehicleRegistrationAPIView(APIView):
    permission_classes = [IsAuthenticated] # Basic auth check

    def post(self, request):
        # 1. Strict Role Authorization
        try:
            user_role = request.user.role_profile.role
            if user_role not in ['SUPER_ADMIN', 'OEM']:
                return Response({
                    "error": "Only OEM and Super Admins can register new vehicles."
                }, status=status.HTTP_403_FORBIDDEN)
        except ObjectDoesNotExist:
            return Response({"error": "User role not defined."}, status=403)

        # 2. Payload Validation
        specs_template_id = request.data.get('specs_template_id')
        if not specs_template_id:
            return Response({"error": "specs_template_id is required"}, status=400)

        # 3. Call Service
        try:
            vehicle = VehicleService.register_eol_vehicle(
                data=request.data,
                specs_template_id=specs_template_id,
                created_by_user=request.user
            )
            
            return Response({
                "success": True,
                "message": "Vehicle created successfully",
                "data": {
                    "vin": vehicle.vin,
                    "model_name": vehicle.model_name,
                    "created_at": vehicle.created_at # Assuming you have a timestamp
                }
            }, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            # Handle DRF Validation Errors specifically
            return Response({"error": e.detail if hasattr(e, 'detail') else str(e)}, status=400)
        except Exception as e:
            return Response({"error": f"Internal Server Error: {str(e)}"}, status=500)
    
    def delete(self, request, vin):
        # 1. Strict Role Authorization
        try:
            user_role = request.user.role_profile.role
            if user_role not in ['SUPER_ADMIN', 'OEM']:
                return Response({
                    "error": "Only OEM and Super Admins can delete vehicles."
                }, status=status.HTTP_403_FORBIDDEN)
        except ObjectDoesNotExist:
            return Response({"error": "User role not defined."}, status=403)

        # 2. Payload Validation - REMOVED: vin = request.data.get('vin')
        # The 'vin' is already available from the URL argument

        # 3. Call Service
        try:
            # Pass the 'vin' from the URL to the service
            VehicleService.delete_vehicle(vin=vin)
            
            return Response({
                "success": True,
                "message": f"Vehicle with VIN {vin} deleted successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # This will catch Http404 from get_object_or_404 in the service
            return Response({"error": str(e)}, status=404)
    
    # Update URL to take a generic query term
    def get(self, request, query_term): 
        """
        Search for vehicles by VIN or Model Name.
        """
        try:
            # Service now returns a list
            vehicles = VehicleService.search_vehicle(query_term)
            
            # Serialize the list of vehicles
            vehicle_list = []
            for vehicle in vehicles:
                vehicle_list.append({
                    "vin": vehicle.vin,
                    "model_name": vehicle.model_name,
                    "colour": vehicle.colour,
                })
            
            return Response({
                "success": True,
                "count": len(vehicle_list),
                "data": vehicle_list
            }, status=status.HTTP_200_OK)
            
        except Exception:
            return Response({
                "error": f"No vehicles found matching '{query_term}'."
            }, status=status.HTTP_404_NOT_FOUND)

