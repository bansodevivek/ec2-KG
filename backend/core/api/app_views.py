# core/api/app_views.py
"""
Mobile App API Views
Provides REST endpoints for Android app
USER role only - end users accessing their own vehicles
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.db.models import Q
import logging
import json

from core.models.VehicleInfo import VehicleInfo
from core.models.rawcandata import VehicleRawData
from core.models.app_telemetry import TyrePressure, VehicleLocation, VehicleStatus, Alert, Trip
from core.models.rolesUser import VehicleOwnership
from core.Services.alerts_service import alert_service
from core.Services.trip_service import trip_service
import paho.mqtt.publish as mqtt_publish

logger = logging.getLogger(__name__)


# =============================================================================
# VEHICLE LIST & DETAILS
# =============================================================================

class AppVehicleListView(APIView):
    """
    Get list of vehicles owned by the current user
    
    GET /api/app/vehicles/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Verify user is USER role
            try:
                role = request.user.role_profile.role
                if role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'This endpoint is only for end users (USER role)'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get vehicles owned by this user
            ownerships = VehicleOwnership.objects.filter(user=request.user).select_related('vehicle')
            
            vehicles = []
            for ownership in ownerships:
                # Get latest status
                latest_status = VehicleStatus.objects.filter(
                    vin=ownership.vin
                ).order_by('-time').first()
                
                # Get latest CAN data
                latest_can = VehicleRawData.objects.filter(
                    vin=ownership.vin
                ).order_by('-time').first()
                
                # Get active alerts count
                active_alerts_count = Alert.objects.filter(
                    vin=ownership.vin,
                    status='ACTIVE'
                ).count()
                
                vehicle_data = {
                    'vin': ownership.vin,
                    'vcu_id': latest_status.vcu_id if latest_status else '',
                    'online': latest_status.online if latest_status else False,
                    'last_seen': latest_status.time.isoformat() if latest_status else None,
                    'soc': float(latest_can.soc_battery_pack) if latest_can else 0,
                    'odometer': float(latest_can.odometer) if latest_can else 0,
                    'active_alerts': active_alerts_count,
                }
                
                # Add vehicle info if available
                try:
                    vehicle_info = VehicleInfo.objects.get(vin=ownership.vin)
                    vehicle_data.update({
                        'model': vehicle_info.model,
                        'variant': vehicle_info.variant,
                        'color': vehicle_info.color,
                        'manufacturing_date': vehicle_info.manufacturing_date.isoformat() if vehicle_info.manufacturing_date else None,
                    })
                except VehicleInfo.DoesNotExist:
                    pass
                
                vehicles.append(vehicle_data)
            
            return Response({
                'success': True,
                'count': len(vehicles),
                'vehicles': vehicles
            })
            
        except Exception as e:
            logger.error(f"Error fetching vehicle list: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AppVehicleDetailView(APIView):
    """
    Get detailed information about a specific vehicle
    
    GET /api/app/vehicles/{vcu_id}/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id):
        try:
            # Verify user is USER role
            try:
                role = request.user.role_profile.role
                if role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'This endpoint is only for end users (USER role)'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get VIN from VCU_ID
            try:
                vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
                vin = vehicle_info.vin
            except VehicleInfo.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Vehicle not found: {vcu_id}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify ownership
            if not VehicleOwnership.objects.filter(user=request.user, vin=vin).exists():
                return Response({
                    'success': False,
                    'error': 'You do not own this vehicle'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get vehicle details
            vehicle_data = {
                'vin': vin,
                'vcu_id': vcu_id,
                'model': vehicle_info.model,
                'variant': vehicle_info.variant,
                'color': vehicle_info.color,
                'manufacturing_date': vehicle_info.manufacturing_date.isoformat() if vehicle_info.manufacturing_date else None,
                'chassis_number': vehicle_info.chassis_number,
                'motor_number': vehicle_info.motor_number,
                'battery_number': vehicle_info.battery_number,
            }
            
            # Get latest status
            latest_status = VehicleStatus.objects.filter(vcu_id=vcu_id).order_by('-time').first()
            if latest_status:
                vehicle_data['status'] = {
                    'online': latest_status.online,
                    'firmware_version': latest_status.firmware_version,
                    'rssi': latest_status.rssi,
                    'uptime': latest_status.uptime,
                    'last_seen': latest_status.time.isoformat()
                }
            
            return Response({
                'success': True,
                'vehicle': vehicle_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching vehicle details: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# LIVE TELEMETRY
# =============================================================================

class AppLiveTelemetryView(APIView):
    """
    Get live telemetry data for a vehicle
    Server sends processed data ready for display
    
    GET /api/app/vehicles/{vcu_id}/live/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id):
        try:
            # Verify user role and ownership
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get latest CAN data
            latest_can = VehicleRawData.objects.filter(vcu_id=vcu_id).order_by('-time').first()
            
            if not latest_can:
                return Response({
                    'success': False,
                    'error': 'No live data available'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get latest tyre pressure
            latest_tyre = TyrePressure.objects.filter(vcu_id=vcu_id).order_by('-time').first()
            
            # Get latest location
            latest_location = VehicleLocation.objects.filter(vcu_id=vcu_id).order_by('-time').first()
            
            # Build processed response
            telemetry = {
                'timestamp': latest_can.time.isoformat(),
                'speed': latest_can.vehicle_speed,
                'soc': float(latest_can.soc_battery_pack),
                'battery': {
                    'voltage': float(latest_can.voltage_battery),
                    'current': float(latest_can.current_battery),
                    'power': float(latest_can.voltage_battery) * abs(float(latest_can.current_battery)) / 1000.0,
                    'temperature': float(latest_can.battery_temperature),
                    'health': latest_can.battery_health,
                    'dte': latest_can.discharge_time_estimate,
                },
                'motor': {
                    'temperature': latest_can.motor_temperature,
                    'rpm': latest_can.motor_rpm,
                    'torque': latest_can.motor_torque,
                },
                'controller': {
                    'temperature': latest_can.controller_temperature,
                },
                'odometer': float(latest_can.odometer),
                'mode': self._get_mode_name(latest_can.vehicle_mode),
                'direction': self._get_direction_name(latest_can.motor_direction),
                'computed': {
                    'odometer_km': float(latest_can.odometer),
                    'co2_saved_kg': float(latest_can.odometer) * 0.12,
                    'energy_efficiency_wh_km': 0.0,  # TODO: Calculate from trip data
                    'eco_score': 0  # TODO: Calculate from trip data
                }
            }
            
            # Add tyre pressure
            if latest_tyre:
                telemetry['tyres'] = {
                    'front': latest_tyre.front_pressure,
                    'rear': latest_tyre.rear_pressure
                }
            
            # Add location
            if latest_location:
                telemetry['location'] = {
                    'latitude': latest_location.latitude,
                    'longitude': latest_location.longitude,
                    'altitude': latest_location.altitude,
                    'speed': latest_location.speed,
                    'satellites': latest_location.satellites
                }
            
            # Add status
            telemetry['status'] = {
                'vehicle_state': latest_can.vehicle_state,
                'headlight': bool(latest_can.headlight),
                'hazard': bool(latest_can.hazard),
                'lock': bool(latest_can.lock),
                'power': bool(latest_can.power),
            }
            
            return Response({
                'success': True,
                'telemetry': telemetry
            })
            
        except Exception as e:
            logger.error(f"Error fetching live telemetry: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False
    
    def _get_mode_name(self, mode_code):
        """Convert mode code to name"""
        modes = {0: 'Eco', 1: 'Normal', 2: 'Sport', 3: 'Park'}
        return modes.get(mode_code, 'Unknown')
    
    def _get_direction_name(self, direction_code):
        """Convert direction code to name"""
        directions = {1: 'Forward', 2: 'Reverse', 3: 'Neutral'}
        return directions.get(direction_code, 'Unknown')


# =============================================================================
# ALERTS
# =============================================================================

class AppAlertsView(APIView):
    """
    Get alerts for a vehicle
    
    GET /api/app/vehicles/{vcu_id}/alerts/ - Get alert history
    GET /api/app/vehicles/{vcu_id}/alerts/active/ - Get active alerts only
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get alert history
            alerts = alert_service.get_alert_history(vcu_id=vcu_id, user=request.user, limit=50)
            
            alerts_data = [{
                'id': alert.id,
                'type': alert.alert_type,
                'severity': alert.severity,
                'status': alert.status,
                'title': alert.title,
                'message': alert.message,
                'created_at': alert.created_at.isoformat(),
                'acknowledged_at': alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                'data': alert.data
            } for alert in alerts]
            
            return Response({
                'success': True,
                'count': len(alerts_data),
                'alerts': alerts_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching alerts: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


class AppActiveAlertsView(APIView):
    """
    Get active alerts for a vehicle
    
    GET /api/app/vehicles/{vcu_id}/alerts/active/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get active alerts
            alerts = alert_service.get_active_alerts(vcu_id=vcu_id, user=request.user)
            
            alerts_data = [{
                'id': alert.id,
                'type': alert.alert_type,
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'created_at': alert.created_at.isoformat(),
                'data': alert.data
            } for alert in alerts]
            
            return Response({
                'success': True,
                'count': len(alerts_data),
                'critical_count': len([a for a in alerts if a.severity == 'CRITICAL']),
                'warning_count': len([a for a in alerts if a.severity == 'WARNING']),
                'alerts': alerts_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching active alerts: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


class AppAcknowledgeAlertView(APIView):
    """
    Acknowledge an alert
    
    POST /api/app/vehicles/{vcu_id}/alerts/{alert_id}/acknowledge/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, vcu_id, alert_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get and acknowledge alert
            try:
                alert = Alert.objects.get(id=alert_id, vcu_id=vcu_id)
                alert.acknowledge()
                
                return Response({
                    'success': True,
                    'message': 'Alert acknowledged',
                    'alert': {
                        'id': alert.id,
                        'status': alert.status,
                        'acknowledged_at': alert.acknowledged_at.isoformat()
                    }
                })
            except Alert.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Alert not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


# =============================================================================
# TRIPS
# =============================================================================

class AppTripsView(APIView):
    """
    Get trip history for a vehicle
    
    GET /api/app/vehicles/{vcu_id}/trips/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get trip history
            trips = trip_service.get_trip_history(vcu_id=vcu_id, user=request.user, limit=20)
            
            trips_data = [{
                'id': trip.id,
                'start_time': trip.start_time.isoformat(),
                'end_time': trip.end_time.isoformat() if trip.end_time else None,
                'duration_seconds': trip.duration_seconds,
                'distance_km': trip.distance_km,
                'start_soc': trip.start_soc,
                'end_soc': trip.end_soc,
                'energy_consumed_wh': trip.energy_consumed_wh,
                'max_speed_kmh': trip.max_speed_kmh,
                'avg_speed_kmh': trip.avg_speed_kmh,
                'eco_score': trip.eco_score,
                'co2_saved_kg': trip.co2_saved_kg,
                'efficiency_wh_km': trip.efficiency_wh_km,
            } for trip in trips]
            
            return Response({
                'success': True,
                'count': len(trips_data),
                'trips': trips_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching trips: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


class AppTripDetailView(APIView):
    """
    Get detailed information about a specific trip including route
    
    GET /api/app/vehicles/{vcu_id}/trips/{trip_id}/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, vcu_id, trip_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get trip
            try:
                trip = Trip.objects.get(id=trip_id, vcu_id=vcu_id)
                
                trip_data = {
                    'id': trip.id,
                    'start_time': trip.start_time.isoformat(),
                    'end_time': trip.end_time.isoformat() if trip.end_time else None,
                    'duration_seconds': trip.duration_seconds,
                    'distance_km': trip.distance_km,
                    'start_soc': trip.start_soc,
                    'end_soc': trip.end_soc,
                    'energy_consumed_wh': trip.energy_consumed_wh,
                    'max_speed_kmh': trip.max_speed_kmh,
                    'avg_speed_kmh': trip.avg_speed_kmh,
                    'eco_score': trip.eco_score,
                    'co2_saved_kg': trip.co2_saved_kg,
                    'efficiency_wh_km': trip.efficiency_wh_km,
                    'start_location': {
                        'latitude': trip.start_latitude,
                        'longitude': trip.start_longitude
                    } if trip.start_latitude else None,
                    'end_location': {
                        'latitude': trip.end_latitude,
                        'longitude': trip.end_longitude
                    } if trip.end_latitude else None,
                    'route': trip.route if trip.route else []
                }
                
                return Response({
                    'success': True,
                    'trip': trip_data
                })
            except Trip.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Trip not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Error fetching trip details: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


# =============================================================================
# VEHICLE CONTROLS
# =============================================================================

class AppVehicleControlView(APIView):
    """
    Send control commands to vehicle via MQTT
    
    POST /api/app/vehicles/{vcu_id}/control/
    Body: {"cmd": "power", "value": true}
    """
    permission_classes = [IsAuthenticated]
    
    # MQTT configuration
    MQTT_BROKER = "test.mosquitto.org"
    MQTT_PORT = 1883
    
    # Allowed controls for USER role
    ALLOWED_CONTROLS = {
        'power': bool,
        'lock': bool,
        'seat_lock': bool,
        'horn': bool,
        'headlights': bool,
        'hazard': bool,
    }
    
    def post(self, request, vcu_id):
        try:
            # Verify access
            if not self._verify_access(request.user, vcu_id):
                return Response({
                    'success': False,
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get command
            cmd = request.data.get('cmd')
            value = request.data.get('value')
            
            if not cmd:
                return Response({
                    'success': False,
                    'error': 'Command (cmd) is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate command
            if cmd not in self.ALLOWED_CONTROLS:
                return Response({
                    'success': False,
                    'error': f'Command not allowed: {cmd}. Allowed: {list(self.ALLOWED_CONTROLS.keys())}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate value type
            expected_type = self.ALLOWED_CONTROLS[cmd]
            if not isinstance(value, expected_type):
                return Response({
                    'success': False,
                    'error': f'Invalid value type for {cmd}. Expected: {expected_type.__name__}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Build MQTT topic and payload
            topic = f"kg_dash/{vcu_id}/control"
            payload = json.dumps({
                'cmd': cmd,
                'value': value,
                'timestamp': timezone.now().isoformat(),
                'user': request.user.username
            })
            
            # Publish to MQTT
            try:
                mqtt_publish.single(
                    topic,
                    payload,
                    hostname=self.MQTT_BROKER,
                    port=self.MQTT_PORT
                )
                
                logger.info(f"Control command sent: {cmd}={value} to {vcu_id} by {request.user.username}")
                
                return Response({
                    'success': True,
                    'message': f'Command {cmd} sent successfully',
                    'command': {
                        'cmd': cmd,
                        'value': value,
                        'vcu_id': vcu_id
                    }
                })
            except Exception as mqtt_error:
                logger.error(f"MQTT publish error: {mqtt_error}")
                return Response({
                    'success': False,
                    'error': 'Failed to send command to vehicle'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Error sending control command: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _verify_access(self, user, vcu_id):
        """Verify user has access to this vehicle"""
        try:
            if user.role_profile.role != 'USER':
                return False
            
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            return VehicleOwnership.objects.filter(user=user, vin=vehicle_info.vin).exists()
        except:
            return False


# =============================================================================
# VEHICLE INFO
# =============================================================================

class AppVehicleInfoView(APIView):
    """
    Get vehicle static info (specs, model, color etc.)
    
    GET /api/app/vehicles/{vcu_id}/info/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vcu_id):
        try:
            # Verify role
            try:
                role = request.user.role_profile.role
                if role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'This endpoint is only for end users (USER role)'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Find vehicle by VCU ID
            try:
                vehicle = VehicleInfo.objects.get(vcu_id=vcu_id)
            except VehicleInfo.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Vehicle with VCU ID {vcu_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Verify ownership
            if not VehicleOwnership.objects.filter(user=request.user, vin=vehicle.vin).exists():
                return Response({
                    'success': False,
                    'error': 'You do not have access to this vehicle'
                }, status=status.HTTP_403_FORBIDDEN)

            return Response({
                'success': True,
                'vehicle': {
                    'vin': vehicle.vin,
                    'vcu_id': vehicle.vcu_id,
                    'model_name': vehicle.model_name if hasattr(vehicle, 'model_name') else '',
                    'variant': vehicle.variant if hasattr(vehicle, 'variant') else '',
                    'color': vehicle.color if hasattr(vehicle, 'color') else '',
                    'manufacture_date': str(vehicle.manufacture_date) if hasattr(vehicle, 'manufacture_date') else '',
                    'registration_number': vehicle.registration_number if hasattr(vehicle, 'registration_number') else '',
                }
            })
        except Exception as e:
            logger.error(f"AppVehicleInfoView error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# CONTROL STATUS & HISTORY
# =============================================================================

class AppVehicleControlStatusView(APIView):
    """
    Get status of a control command
    
    GET /api/app/vehicles/{vcu_id}/control/status/{command_id}/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vcu_id, command_id):
        try:
            try:
                role = request.user.role_profile.role
                if role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'This endpoint is only for end users'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Return status — in real implementation, would track from DB/Redis
            return Response({
                'success': True,
                'command_id': command_id,
                'vcu_id': vcu_id,
                'status': 'sent',
                'message': 'Command has been sent to the vehicle'
            })
        except Exception as e:
            logger.error(f"AppVehicleControlStatusView error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AppVehicleControlHistoryView(APIView):
    """
    Get control command history for a vehicle
    
    GET /api/app/vehicles/{vcu_id}/control/history/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, vcu_id):
        try:
            try:
                role = request.user.role_profile.role
                if role != 'USER':
                    return Response({
                        'success': False,
                        'error': 'This endpoint is only for end users'
                    }, status=status.HTTP_403_FORBIDDEN)
            except ObjectDoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User role not assigned'
                }, status=status.HTTP_403_FORBIDDEN)

            # Verify ownership
            try:
                vehicle = VehicleInfo.objects.get(vcu_id=vcu_id)
                if not VehicleOwnership.objects.filter(user=request.user, vin=vehicle.vin).exists():
                    return Response({
                        'success': False,
                        'error': 'You do not have access to this vehicle'
                    }, status=status.HTTP_403_FORBIDDEN)
            except VehicleInfo.DoesNotExist:
                return Response({
                    'success': False,
                    'error': f'Vehicle with VCU ID {vcu_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Return empty history — will be populated when ControlCommandLog model is added
            return Response({
                'success': True,
                'vcu_id': vcu_id,
                'history': [],
                'message': 'Control command history'
            })
        except Exception as e:
            logger.error(f"AppVehicleControlHistoryView error: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)