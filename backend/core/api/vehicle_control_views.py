# core/api/vehicle_control_views.py
"""
Vehicle Control API Views
Provides endpoints for controlling vehicle systems via MQTT
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.exceptions import ObjectDoesNotExist

import logging
logger = logging.getLogger(__name__)


class VehicleControlView(APIView):
    """
    Generic vehicle control endpoint
    POST /api/vehicle/control/
    Body: { "control_type": "horn", "value": true }
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            # Check permissions
            try:
                role = request.user.role_profile.role
                if role not in ['SUPER_ADMIN', 'OEM', 'RND', 'DEALER', 'USER']:
                    return Response({
                        'success': False,
                        'error': 'You do not have permission to control vehicles'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            control_type = request.data.get('control_type')
            value = request.data.get('value')

            if not control_type:
                return Response({
                    'success': False,
                    'error': 'control_type is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get vehicle control service
            from core.Services.vehicle_control import vehicle_control_service

            success = vehicle_control_service.publish_control_command(
                control_type=control_type,
                value=value
            )

            if success:
                return Response({
                    'success': True,
                    'message': f'Control command "{control_type}" sent successfully',
                    'data': {
                        'control_type': control_type,
                        'value': value,
                        'mqtt_connected': vehicle_control_service.is_connected
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to send control command. MQTT may be disconnected.',
                    'mqtt_connected': vehicle_control_service.is_connected
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        except Exception as e:
            logger.error(f"Error in vehicle control: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImmobilizerControlView(APIView):
    """
    Vehicle immobilizer control
    POST /api/vehicle/immobilizer/
    Body: { "activate": true }
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            try:
                role = request.user.role_profile.role
                if role not in ['SUPER_ADMIN', 'OEM', 'RND']:
                    return Response({
                        'success': False,
                        'error': 'Only SUPER_ADMIN, OEM, and RND can control immobilizer'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            activate = request.data.get('activate', False)

            from core.Services.vehicle_control import vehicle_control_service
            success = vehicle_control_service.control_immobilizer(activate)

            if success:
                action = "activated" if activate else "deactivated"
                return Response({
                    'success': True,
                    'message': f'Immobilizer {action} successfully'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to control immobilizer'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        except Exception as e:
            logger.error(f"Error in immobilizer control: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HornControlView(APIView):
    """
    Vehicle horn control
    POST /api/vehicle/horn/
    Body: { "activate": true }
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        try:
            try:
                role = request.user.role_profile.role
                if role not in ['SUPER_ADMIN', 'OEM', 'RND', 'DEALER', 'USER']:
                    return Response({
                        'success': False,
                        'error': 'You do not have permission to control horn'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            activate = request.data.get('activate', False)

            from core.Services.vehicle_control import vehicle_control_service
            success = vehicle_control_service.control_horn(activate)

            if success:
                action = "activated" if activate else "deactivated"
                return Response({
                    'success': True,
                    'message': f'Horn {action} successfully'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to control horn'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        except Exception as e:
            logger.error(f"Error in horn control: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MQTTStatusView(APIView):
    """
    Check MQTT connection status
    GET /api/mqtt/status/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            try:
                role = request.user.role_profile.role
                if role not in ['SUPER_ADMIN', 'OEM', 'RND']:
                    return Response({
                        'success': False,
                        'error': 'Only SUPER_ADMIN, OEM, and RND can check MQTT status'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            from core.Services.vehicle_control import vehicle_control_service
            from django.conf import settings

            return Response({
                'success': True,
                'mqtt_status': {
                    'connected': vehicle_control_service.is_connected,
                    'broker': getattr(settings, 'MQTT_BROKER', 'unknown'),
                    'port': getattr(settings, 'MQTT_PORT', 0),
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error checking MQTT status: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
