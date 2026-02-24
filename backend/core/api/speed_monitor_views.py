# core/api/speed_monitor_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Max, Min, Count
from datetime import datetime, timedelta
from core.models import VehicleRawData, VehicleInfo
import logging

logger = logging.getLogger(__name__)


class LiveSpeedView(APIView):
    """
    Get current live speed from MQTT latest data
    """
    def get(self, request, vin=None):
        try:
            if vin:
                # Get latest speed for specific VIN
                latest_data = VehicleRawData.objects.filter(
                    vin=vin
                ).order_by('-timestamp').first()
                
                if not latest_data:
                    return Response({
                        'success': False,
                        'message': f'No data found for VIN: {vin}',
                        'speed': 0
                    }, status=status.HTTP_404_NOT_FOUND)
                
                return Response({
                    'success': True,
                    'vin': vin,
                    'speed': latest_data.vehicle_speed,
                    'timestamp': latest_data.timestamp.isoformat(),
                    'motor_rpm': latest_data.motor_rpm,
                    'soc': latest_data.soc_battery_pack
                }, status=status.HTTP_200_OK)
            else:
                # Get latest speed for all vehicles
                vehicles = VehicleInfo.objects.all()
                vehicles_speed = []
                
                for vehicle in vehicles:
                    latest_data = VehicleRawData.objects.filter(
                        vin=vehicle.vin
                    ).order_by('-timestamp').first()
                    
                    if latest_data:
                        vehicles_speed.append({
                            'vin': vehicle.vin,
                            'model_name': vehicle.model_name,
                            'speed': latest_data.vehicle_speed,
                            'timestamp': latest_data.timestamp.isoformat()
                        })
                
                return Response({
                    'success': True,
                    'count': len(vehicles_speed),
                    'vehicles': vehicles_speed
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error fetching live speed: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HistoricalSpeedView(APIView):
    """
    Get historical speed data for a specific VIN
    """
    def get(self, request, vin):
        try:
            # Get time range from query params (default: 24 hours)
            hours = int(request.query_params.get('hours', 24))
            
            # Calculate cutoff time
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Fetch historical data
            historical_data = VehicleRawData.objects.filter(
                vin=vin,
                timestamp__gte=cutoff_time
            ).order_by('timestamp').values(
                'timestamp',
                'vehicle_speed',
                'motor_rpm',
                'soc_battery_pack'
            )
            
            if not historical_data:
                return Response({
                    'success': False,
                    'message': f'No historical data found for VIN: {vin}',
                    'data': []
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Format data
            formatted_data = [
                {
                    'timestamp': data['timestamp'].isoformat(),
                    'vehicle_speed': data['vehicle_speed'],
                    'motor_rpm': data['motor_rpm'],
                    'soc_battery_pack': data['soc_battery_pack']
                }
                for data in historical_data
            ]
            
            return Response({
                'success': True,
                'vin': vin,
                'hours': hours,
                'count': len(formatted_data),
                'data': formatted_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching historical speed: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SpeedStatisticsView(APIView):
    """
    Get speed statistics for a vehicle
    """
    def get(self, request, vin):
        try:
            # Get time range from query params (default: 24 hours)
            hours = int(request.query_params.get('hours', 24))
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Calculate statistics
            stats = VehicleRawData.objects.filter(
                vin=vin,
                timestamp__gte=cutoff_time
            ).aggregate(
                avg_speed=Avg('vehicle_speed'),
                max_speed=Max('vehicle_speed'),
                min_speed=Min('vehicle_speed'),
                total_records=Count('id')
            )
            
            if stats['total_records'] == 0:
                return Response({
                    'success': False,
                    'message': f'No data found for VIN: {vin}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'success': True,
                'vin': vin,
                'hours': hours,
                'stats': {
                    'avg_speed': round(stats['avg_speed'] or 0, 2),
                    'max_speed': stats['max_speed'] or 0,
                    'min_speed': stats['min_speed'] or 0,
                    'total_records': stats['total_records']
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching speed statistics: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AllVehiclesSpeedView(APIView):
    """
    Get latest speed for all vehicles
    """
    def get(self, request):
        try:
            vehicles = VehicleInfo.objects.all()
            vehicles_data = []
            
            for vehicle in vehicles:
                # Get latest data
                latest = VehicleRawData.objects.filter(
                    vin=vehicle.vin
                ).order_by('-timestamp').first()
                
                if latest:
                    # Calculate time difference
                    time_diff = datetime.now() - latest.timestamp.replace(tzinfo=None)
                    is_online = time_diff.total_seconds() < 300  # 5 minutes
                    
                    vehicles_data.append({
                        'vin': vehicle.vin,
                        'model_name': vehicle.model_name,
                        'vehicle_no': vehicle.vehicle_no,
                        'speed': latest.vehicle_speed,
                        'soc': latest.soc_battery_pack,
                        'odometer': latest.odometer,
                        'timestamp': latest.timestamp.isoformat(),
                        'is_online': is_online
                    })
            
            return Response({
                'success': True,
                'count': len(vehicles_data),
                'vehicles': vehicles_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching all vehicles speed: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)