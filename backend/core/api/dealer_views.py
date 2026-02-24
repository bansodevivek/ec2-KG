from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.Services.dealer_service import DealerService
from django.core.exceptions import ObjectDoesNotExist
from django.forms import ValidationError

class DealerListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        API Endpoint to list all dealer details.
        """
        try:
            # Call the service method
            dealers = DealerService.get_all_dealers()
            
            return Response({
                "success": True,
                "count": len(dealers),
                "data": list(dealers)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": f"An error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DealerCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        API Endpoint for Super Admin to create a new dealer.
        """
        # 1. Strict Role Authorization
        try:
            user_role = request.user.role_profile.role
            if user_role != 'SUPER_ADMIN':
                return Response({
                    "error": "Only Super Admins can create dealers."
                }, status=status.HTTP_403_FORBIDDEN)
        except AttributeError:
            return Response({
                "error": "User role profile not found."
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Call Service to create data
        try:
            dealer = DealerService.create_dealer(request.data)
            
            return Response({
                "success": True,
                "message": "Dealer created successfully",
                "data": {
                    "dealer_code": dealer.dealer_code,
                    "username": dealer.user.username
                }
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class DealerDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    # Changed parameter to dealer_code
    def get(self, request, dealer_code=None):
        """
        API Endpoint for Super Admin to view specific dealer dashboard,
        or for Dealer to view their own dashboard.
        """
        user = request.user
        
        # 1. Safely check user role
        try:
            role = user.role_profile.role
        except ObjectDoesNotExist:
            return Response({"error": "User profile is incomplete (missing role)."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Determine target dealer based on role
        if role == 'SUPER_ADMIN':
            if not dealer_code:
                return Response({"error": "dealer_code is required for Super Admin."}, status=status.HTTP_400_BAD_REQUEST)
            # Service will handle lookup by dealer_code

        elif role == 'DEALER':
            # Dealers can only see their own data
            try:
                # Lookup dealer_code from the logged in user's profile
                dealer_code = user.dealerinformation.dealer_code
            except ObjectDoesNotExist:
                return Response({"error": "Dealer information profile not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"error": "Unauthorized role."}, status=status.HTTP_403_FORBIDDEN)

        # 3. Call Service
        try:
            # Updated service method
            data = DealerService.get_dealer_inventory_and_history_by_code(dealer_code)
            return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            traceback.print_exc() # Corrected indentation here
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)