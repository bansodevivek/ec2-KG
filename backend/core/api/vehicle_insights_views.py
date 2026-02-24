# core/api/vehicle_insights_views.py
"""
Vehicle Insights API Views
All field names verified against real DB schema (data-1771829393791.csv).
No limit/slicing applied — bucketing and sampling is handled by VehicleInsightsService.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Avg, Max, Min, Sum, Count
from django.utils import timezone
from datetime import timedelta

import logging
logger = logging.getLogger(__name__)

from core.models.VehicleInfo import VehicleInfo
from core.models.rawcandata import VehicleRawData
from core.models.app_telemetry import VehicleLocation, TyrePressure, VehicleStatus, Trip
from core.role_permissions import RolePermission


def _check_vehicle_access(request, vin):
    """Common vehicle access check. Returns (vehicle, error_response)."""
    try:
        role = request.user.role_profile.role
    except ObjectDoesNotExist:
        return None, Response({
            'success': False, 'error': 'User role not assigned'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        vehicle = VehicleInfo.objects.get(vin=vin)
    except VehicleInfo.DoesNotExist:
        return None, Response({
            'success': False, 'error': f'Vehicle {vin} not found'
        }, status=status.HTTP_404_NOT_FOUND)

    return vehicle, None


class VehicleInsightsView(APIView):
    """
    GET /api/insights/vehicle/<vin>/
    Aggregated insights summary for a vehicle.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            now      = timezone.now()
            last_30d = now - timedelta(days=30)

            records = VehicleRawData.objects.filter(vin=vin, time__gte=last_30d)
            trips   = Trip.objects.filter(vin=vin, start_time__gte=last_30d)

            stats = records.aggregate(
                avg_speed=Avg('vehicle_speed'),
                max_speed=Max('vehicle_speed'),
                avg_soc=Avg('soc_battery_pack'),
                total_records=Count('id'),
            )
            trip_stats = trips.aggregate(
                total_trips=Count('id'),
                total_distance=Sum('distance_km'),
                avg_efficiency=Avg('efficiency_wh_km'),
            )

            return Response({
                'success': True,
                'vin': vin,
                'period': '30_days',
                'driving': {
                    'avg_speed_kmh':     round(stats['avg_speed']    or 0, 1),
                    'max_speed_kmh':     round(stats['max_speed']    or 0, 1),
                    'total_data_points': stats['total_records']      or 0,
                },
                'battery': {
                    'avg_soc': round(stats['avg_soc'] or 0, 1),
                },
                'trips': {
                    'total_trips':          trip_stats['total_trips']     or 0,
                    'total_distance_km':    round(trip_stats['total_distance']  or 0, 1),
                    'avg_efficiency_wh_km': round(trip_stats['avg_efficiency']  or 0, 1),
                },
            })
        except Exception as e:
            logger.error(f"VehicleInsightsView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehicleOverviewView(APIView):
    """GET /api/insights/vehicle/<vin>/overview/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            latest        = VehicleRawData.objects.filter(vin=vin).order_by('-time').first()
            latest_status = VehicleStatus.objects.filter(vin=vin).order_by('-time').first()

            return Response({
                'success': True,
                'vin': vin,
                'model':  vehicle.model_name,
                'vcu_id': vehicle.vcu_id,
                'status': {
                    'online':    latest_status.online           if latest_status else False,
                    'last_seen': latest_status.time.isoformat() if latest_status else None,
                },
                'latest_data': {
                    'speed':    float(latest.vehicle_speed)    if latest else 0,
                    'soc':      float(latest.soc_battery_pack) if latest else 0,
                    'odometer': float(latest.odometer)         if latest else 0,
                    'time':     latest.time.isoformat()        if latest else None,
                } if latest else None,
            })
        except Exception as e:
            logger.error(f"VehicleOverviewView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehicleTripsView(APIView):
    """GET /api/insights/vehicle/<vin>/trips/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            trips       = Trip.objects.filter(vin=vin).order_by('-start_time')
            total_count = trips.count()

            return Response({
                'success': True,
                'vin': vin,
                'total_count': total_count,
                'trips': [{
                    'id':               t.id,
                    'start_time':       t.start_time.isoformat(),
                    'end_time':         t.end_time.isoformat() if t.end_time else None,
                    'distance_km':      float(t.distance_km)      if t.distance_km      else 0,
                    'duration_seconds': t.duration_seconds        if hasattr(t, 'duration_seconds') else 0,
                    'start_soc':        float(t.start_soc)        if t.start_soc        else 0,
                    'end_soc':          float(t.end_soc)          if t.end_soc          else 0,
                    'max_speed_kmh':    float(t.max_speed_kmh)    if t.max_speed_kmh    else 0,
                    'avg_speed_kmh':    float(t.avg_speed_kmh)    if t.avg_speed_kmh    else 0,
                    'efficiency_wh_km': float(t.efficiency_wh_km) if t.efficiency_wh_km else 0,
                } for t in trips],
            })
        except Exception as e:
            logger.error(f"VehicleTripsView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EnvironmentalImpactView(APIView):
    """GET /api/insights/vehicle/<vin>/environmental/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            trips          = Trip.objects.filter(vin=vin)
            total_distance = trips.aggregate(total=Sum('distance_km'))['total'] or 0
            co2_saved      = total_distance * 0.12

            return Response({
                'success': True,
                'vin': vin,
                'total_distance_km': round(total_distance, 1),
                'co2_saved_kg':      round(co2_saved, 1),
                'trees_equivalent':  round(co2_saved / 21.0, 1),
                'fuel_saved_liters': round(total_distance / 15.0, 1),
            })
        except Exception as e:
            logger.error(f"EnvironmentalImpactView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VehicleHealthView(APIView):
    """GET /api/insights/vehicle/<vin>/health/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            latest      = VehicleRawData.objects.filter(vin=vin).order_by('-time').first()
            latest_tyre = TyrePressure.objects.filter(vin=vin).order_by('-time').first()

            return Response({
                'success': True,
                'vin': vin,
                'battery_health': {
                    'soc':              float(latest.soc_battery_pack)    if latest else 0,
                    'pack_voltage':     float(latest.battery_pack_voltage) if latest else 0,
                    'pack_current':     float(latest.current_battery)      if latest else 0,
                    'battery_health_pct': float(latest.battery_health)    if latest else 0,
                },
                'motor': {
                    'controller_temp': float(latest.controller_temperature) if latest else 0,
                    'motor_temp':      float(latest.motor_temperature)       if latest else 0,
                },
                'tyres': {
                    'front_pressure': float(latest_tyre.front_pressure) if latest_tyre else 0,
                    'rear_pressure':  float(latest_tyre.rear_pressure)  if latest_tyre else 0,
                } if latest_tyre else None,
            })
        except Exception as e:
            logger.error(f"VehicleHealthView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PerformanceMetricsView(APIView):
    """GET /api/insights/vehicle/<vin>/performance/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            now     = timezone.now()
            last_7d = now - timedelta(days=7)
            records = VehicleRawData.objects.filter(vin=vin, time__gte=last_7d)

            stats = records.aggregate(
                avg_speed=Avg('vehicle_speed'),
                max_speed=Max('vehicle_speed'),
                avg_motor_temp=Avg('motor_temperature'),
                max_motor_temp=Max('motor_temperature'),
                avg_controller_temp=Avg('controller_temperature'),
                max_controller_temp=Max('controller_temperature'),
                avg_rpm=Avg('motor_rpm'),
                max_rpm=Max('motor_rpm'),
                avg_battery_voltage=Avg('battery_pack_voltage'),
                min_soc=Min('soc_battery_pack'),
                max_soc=Max('soc_battery_pack'),
            )

            return Response({
                'success': True,
                'vin': vin,
                'period': '7_days',
                'speed': {
                    'avg_kmh': round(stats['avg_speed'] or 0, 1),
                    'max_kmh': round(stats['max_speed'] or 0, 1),
                },
                'motor': {
                    'avg_temp': round(stats['avg_motor_temp'] or 0, 1),
                    'max_temp': round(stats['max_motor_temp'] or 0, 1),
                    'avg_rpm':  round(stats['avg_rpm']        or 0, 0),
                    'max_rpm':  round(stats['max_rpm']        or 0, 0),
                },
                'controller': {
                    'avg_temp': round(stats['avg_controller_temp'] or 0, 1),
                    'max_temp': round(stats['max_controller_temp'] or 0, 1),
                },
                'battery': {
                    'avg_voltage': round(stats['avg_battery_voltage'] or 0, 1),
                    'min_soc':     round(stats['min_soc']             or 0, 1),
                    'max_soc':     round(stats['max_soc']             or 0, 1),
                },
            })
        except Exception as e:
            logger.error(f"PerformanceMetricsView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MaintenanceScheduleView(APIView):
    """GET /api/insights/vehicle/<vin>/maintenance/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            latest   = VehicleRawData.objects.filter(vin=vin).order_by('-time').first()
            odometer = float(latest.odometer) if latest else 0

            service_interval_km = 5000
            next_service_at     = ((int(odometer / service_interval_km) + 1) * service_interval_km)
            km_until_service    = next_service_at - odometer

            return Response({
                'success': True,
                'vin': vin,
                'odometer_km':         round(odometer, 1),
                'next_service_km':     next_service_at,
                'km_until_service':    round(km_until_service, 1),
                'service_interval_km': service_interval_km,
                'maintenance_items': [
                    {'item': 'Brake pads',         'interval_km': 20000, 'next_at': ((int(odometer / 20000)  + 1) * 20000)},
                    {'item': 'Tyre rotation',       'interval_km': 10000, 'next_at': ((int(odometer / 10000)  + 1) * 10000)},
                    {'item': 'Coolant check',       'interval_km': 15000, 'next_at': ((int(odometer / 15000)  + 1) * 15000)},
                    {'item': 'Battery diagnostics', 'interval_km': 25000, 'next_at': ((int(odometer / 25000)  + 1) * 25000)},
                ],
            })
        except Exception as e:
            logger.error(f"MaintenanceScheduleView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MCUTelemetryView(APIView):
    """GET /api/insights/vehicle/<vin>/mcu-telemetry/?time_range=1h"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            time_range = request.query_params.get('time_range', '1h')
            from core.Services.vehicle_insights_service import VehicleInsightsService
            result = VehicleInsightsService.get_mcu_telemetry(vin, time_range)
            return Response({'success': True, 'vin': vin, **result})
        except Exception as e:
            logger.error(f"MCUTelemetryView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BMSTelemetryView(APIView):
    """GET /api/insights/vehicle/<vin>/bms-telemetry/?time_range=1h"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            time_range = request.query_params.get('time_range', '1h')
            from core.Services.vehicle_insights_service import VehicleInsightsService
            result = VehicleInsightsService.get_bms_telemetry(vin, time_range)
            return Response({'success': True, 'vin': vin, **result})
        except Exception as e:
            logger.error(f"BMSTelemetryView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LocationHistoryView(APIView):
    """GET /api/insights/vehicle/<vin>/location/?time_range=24h"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            time_range = request.query_params.get('time_range', '24h')
            from core.Services.vehicle_insights_service import VehicleInsightsService
            result = VehicleInsightsService.get_location_history(vin, time_range)
            return Response({'success': True, 'vin': vin, **result})
        except Exception as e:
            logger.error(f"LocationHistoryView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LatestVehicleLocationView(APIView):
    """GET /api/insights/vehicle/<vin>/location/latest/"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, vin):
        vehicle, err = _check_vehicle_access(request, vin)
        if err:
            return err
        try:
            latest_location = VehicleLocation.objects.filter(vin=vin).order_by('-time').first()
            if not latest_location:
                return Response({'success': False, 'error': 'No location data found'}, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'success': True,
                'vin': vin,
                'latest_location': {
                    'latitude':  float(latest_location.latitude),
                    'longitude': float(latest_location.longitude),
                    'time':      latest_location.time.isoformat(),
                }
            })
        except Exception as e:
            logger.error(f"LatestVehicleLocationView error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)  