# core/api/live_data_views.py
"""
Updated Live Data Views
Handles only live CAN data, delegates vehicle info/specs to vehicle_static_data_views
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist
import logging

from core.Services.live_data_manager import live_data_manager
from core.Services.vehicle_static_data_service import vehicle_static_data_service
from core.models import AccessLog

logger = logging.getLogger(__name__)


class LiveDashboardView(APIView):
    """
    Get live dashboard data (speed, battery, trip)
    Filtered based on user role
    
    GET /api/live/dashboard/
    Query params: ?vin=ARIS2024VIN00001 (optional)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get optional VIN parameter
            vin = request.query_params.get('vin', None)

            # Get dashboard data filtered by role
            dashboard_data = live_data_manager.get_dashboard_data(role, vin)

            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_live_dashboard',
                resource='LiveDashboard',
                resource_id=vin or 'default',
                success=True,
                details=f"Role: {role}"
            )

            return Response({
                'success': True,
                'role': role,
                'data': dashboard_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching live dashboard: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LiveFaultsView(APIView):
    """
    Get live fault/error data
    Filtered based on user role
    
    GET /api/live/faults/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get fault data filtered by role
            fault_data = live_data_manager.get_fault_data(role)

            return Response({
                'success': True,
                'role': role,
                'data': fault_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching live faults: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LiveBMSView(APIView):
    """
    Get live Battery Management System data
    Filtered based on user role
    
    GET /api/live/bms/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get BMS data filtered by role
            bms_data = live_data_manager.get_bms_data(role)

            return Response({
                'success': True,
                'role': role,
                'data': bms_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching live BMS data: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LiveAlertsView(APIView):
    """
    Get active alerts and alert history
    
    GET /api/live/alerts/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get alerts
            alerts = live_data_manager.get_alerts(role)

            return Response({
                'success': True,
                'role': role,
                'data': alerts
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching alerts: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AvailableControlsView(APIView):
    """
    Get list of controls available for current user's role
    
    GET /api/live/available-controls/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get available controls
            controls = live_data_manager.get_available_controls(role)

            return Response({
                'success': True,
                'role': role,
                'available_controls': controls,
                'control_count': len(controls)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching available controls: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TripManagementView(APIView):
    """
    Manage trips - start, end, get current trip info
    
    POST /api/live/trip/start/
    POST /api/live/trip/end/
    GET /api/live/trip/current/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Start or end a trip"""
        action = request.data.get('action')  # 'start' or 'end'

        if action == 'start':
            live_data_manager.start_trip()
            return Response({
                'success': True,
                'message': 'Trip started',
                'trip': live_data_manager.current_trip
            }, status=status.HTTP_200_OK)

        elif action == 'end':
            live_data_manager.end_trip()
            return Response({
                'success': True,
                'message': 'Trip ended and saved to history'
            }, status=status.HTTP_200_OK)

        else:
            return Response({
                'success': False,
                'error': 'Invalid action. Use "start" or "end"'
            }, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request):
        """Get current trip info"""
        trip_summary = live_data_manager._get_trip_summary()
        
        return Response({
            'success': True,
            'current_trip': trip_summary,
            'trip_history_count': len(live_data_manager.trip_history)
        }, status=status.HTTP_200_OK)


class LiveDataStatusView(APIView):
    """
    Check if live data is available and when it was last updated
    
    GET /api/live/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            has_data = bool(live_data_manager.latest_raw_data)
            last_update = live_data_manager.latest_raw_data.get('timestamp') if has_data else None

            return Response({
                'success': True,
                'live_data_available': has_data,
                'last_update': last_update,
                'data_age_seconds': self._calculate_data_age() if has_data else None,
                'total_records_in_history': len(live_data_manager.raw_data_history),
                'active_alerts_count': len(live_data_manager.active_alerts)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching live data status: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _calculate_data_age(self):
        """Calculate how old the latest data is"""
        from datetime import datetime
        received_at = live_data_manager.latest_raw_data.get('received_at')
        if received_at:
            age = (datetime.now() - received_at).total_seconds()
            return int(age)
        return None


class CompleteLiveDataView(APIView):
    """
    Get all live data sections in one call
    Useful for initial dashboard load
    Combines live CAN data with static vehicle info/specs
    
    GET /api/live/complete/
    Query params: ?vin=ARIS2024VIN00001 (optional)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get user role
            try:
                role = request.user.role_profile.role
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get optional VIN parameter
            vin = request.query_params.get('vin', None)

            # Get all data sections
            # Live CAN data from live_data_manager
            complete_data = {
                'dashboard': live_data_manager.get_dashboard_data(role, vin),
                'faults': live_data_manager.get_fault_data(role),
                'bms': live_data_manager.get_bms_data(role),
                'alerts': live_data_manager.get_alerts(role),
                'available_controls': live_data_manager.get_available_controls(role),
                'timestamp': live_data_manager.latest_raw_data.get('timestamp')
            }

            # Add static vehicle info/specs from vehicle_static_data_service if VIN provided
            if vin:
                complete_data['vehicle_info'] = vehicle_static_data_service.get_vehicle_info(vin, role)
                complete_data['vehicle_specs'] = vehicle_static_data_service.get_vehicle_specs(vin, role)

            # Log access
            AccessLog.objects.create(
                user=request.user,
                action='view_complete_live_data',
                resource='LiveData',
                resource_id=vin or 'default',
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
            logger.error(f"Error fetching complete live data: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)