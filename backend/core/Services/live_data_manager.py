# core/Services/live_data_manager.py
"""
Live Data Manager - Updated Version
Handles only live CAN data, delegates vehicle info/specs to vehicle_static_data_service
Uses Django cache for persistence across requests
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.core.cache import cache

from core.Services.vehicle_static_data_service import vehicle_static_data_service

logger = logging.getLogger(__name__)

# Default VIN for single test vehicle
DEFAULT_TEST_VIN = "KINETIC-ARIS-2025-001"


class LiveDataManager:
    """
    Singleton service to manage live vehicle data from MQTT
    Uses Django cache for persistence across requests
    Focuses only on real-time CAN data
    """
    
    # Cache keys
    CACHE_LATEST_RAW_DATA = 'live_latest_raw_data'
    CACHE_RAW_DATA_HISTORY = 'live_raw_data_history'
    CACHE_ACTIVE_ALERTS = 'live_active_alerts'
    CACHE_ALERT_HISTORY = 'live_alert_history'
    CACHE_CURRENT_TRIP = 'live_current_trip'
    CACHE_TRIP_HISTORY = 'live_trip_history'
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize cache if not exists"""
        if not cache.get(self.CACHE_LATEST_RAW_DATA):
            cache.set(self.CACHE_LATEST_RAW_DATA, {}, timeout=None)
        if not cache.get(self.CACHE_RAW_DATA_HISTORY):
            cache.set(self.CACHE_RAW_DATA_HISTORY, [], timeout=None)
        if not cache.get(self.CACHE_ACTIVE_ALERTS):
            cache.set(self.CACHE_ACTIVE_ALERTS, [], timeout=None)
        if not cache.get(self.CACHE_ALERT_HISTORY):
            cache.set(self.CACHE_ALERT_HISTORY, [], timeout=None)
        if not cache.get(self.CACHE_TRIP_HISTORY):
            cache.set(self.CACHE_TRIP_HISTORY, [], timeout=None)

    # ==========================================
    # HELPER METHOD FOR SAFE NUMBER CONVERSION
    # ==========================================
    
    def _safe_number(self, value, default=0):
        """
        Safely convert value to number, handling empty strings and None
        This prevents "can't compare str to int" errors
        """
        if value == '' or value is None:
            return default
        try:
            if isinstance(value, (int, float)):
                return value
            return float(value)
        except (ValueError, TypeError):
            return default

    # ==========================================
    # CACHE GETTERS/SETTERS
    # ==========================================

    @property
    def latest_raw_data(self):
        return cache.get(self.CACHE_LATEST_RAW_DATA, {})
    
    @latest_raw_data.setter
    def latest_raw_data(self, value):
        cache.set(self.CACHE_LATEST_RAW_DATA, value, timeout=None)

    @property
    def raw_data_history(self):
        return cache.get(self.CACHE_RAW_DATA_HISTORY, [])
    
    def append_to_history(self, data):
        history = self.raw_data_history
        history.append(data)
        # Keep only last 100 records
        if len(history) > 100:
            history = history[-100:]
        cache.set(self.CACHE_RAW_DATA_HISTORY, history, timeout=None)

    @property
    def active_alerts(self):
        return cache.get(self.CACHE_ACTIVE_ALERTS, [])
    
    @active_alerts.setter
    def active_alerts(self, value):
        cache.set(self.CACHE_ACTIVE_ALERTS, value, timeout=None)

    @property
    def alert_history(self):
        return cache.get(self.CACHE_ALERT_HISTORY, [])
    
    def append_alert(self, alert):
        alerts = self.alert_history
        alerts.append(alert)
        # Keep only last 50 alerts
        if len(alerts) > 50:
            alerts = alerts[-50:]
        cache.set(self.CACHE_ALERT_HISTORY, alerts, timeout=None)

    @property
    def current_trip(self):
        return cache.get(self.CACHE_CURRENT_TRIP)
    
    @current_trip.setter
    def current_trip(self, value):
        cache.set(self.CACHE_CURRENT_TRIP, value, timeout=None)

    @property
    def trip_history(self):
        return cache.get(self.CACHE_TRIP_HISTORY, [])
    
    def append_trip(self, trip):
        trips = self.trip_history
        trips.append(trip)
        # Keep only last 20 trips
        if len(trips) > 20:
            trips = trips[-20:]
        cache.set(self.CACHE_TRIP_HISTORY, trips, timeout=None)

    # ==========================================
    # DATA INGESTION (Called from MQTT listener)
    # ==========================================

    def update_raw_data(self, data: Dict[str, Any]):
        """
        Update latest raw CAN data from MQTT
        Called from mqtt_listener when raw-can-data arrives
        """
        try:
            enriched_data = {
                **data,
                'vin': DEFAULT_TEST_VIN,  # Add default VIN
                'timestamp': datetime.now().isoformat(),
                'received_at': datetime.now().isoformat()
            }
            
            self.latest_raw_data = enriched_data
            
            # Add to history
            self.append_to_history(enriched_data.copy())
            
            # Check for alerts
            self._check_for_alerts(data)
            
            # Update trip if active
            if self.current_trip:
                self._update_current_trip(data)
            
            logger.info(f"Updated raw data: Speed={data.get('MD', {}).get('VS', 0)} km/h, Cache size={len(self.raw_data_history)}")
            
        except Exception as e:
            logger.error(f"Error updating raw data: {e}")
            import traceback
            logger.error(traceback.format_exc())

    # ==========================================
    # ROLE-BASED DATA ACCESS
    # ==========================================

    def get_dashboard_data(self, role: str, vin: str = None) -> Dict[str, Any]:
        """
        Get dashboard data filtered by role
        Returns: Dashboard overview with speed, battery, trip, etc.
        
        Args:
            role: User role
            vin: Vehicle VIN (optional, uses default if not provided)
        """
        latest_data = self.latest_raw_data
        
        if not latest_data or 'MD' not in latest_data:
            return {'error': 'No live data available'}

        md = latest_data.get('MD', {})
        bms = latest_data.get('BMS', {})
        mf = latest_data.get('MF', {})
        
        # Base dashboard data (available to all roles)
        dashboard = {
            'timestamp': latest_data.get('timestamp'),
            'vin': vin or DEFAULT_TEST_VIN,
            'speed': {
                'current': self._safe_number(md.get('VS', 0), 0),
                'average': self._calculate_average_speed(),
                'max_trip': self._get_max_speed_in_trip(),
                'unit': 'km/h'
            },
            'battery': {
                'soc': self._safe_number(bms.get('SOC', 0), 0),
                'voltage': self._safe_number(bms.get('PV', 0), 0),
                'current': self._safe_number(bms.get('PC', 0), 0),
                'available_energy': self._safe_number(bms.get('AE', 0), 0),
                'health': self._calculate_battery_health(bms),
            },
            'trip': self._get_trip_summary(),
            'vehicle_mode': self._get_vehicle_mode(self._safe_number(md.get('VM', 0), 0)),
            'motor_direction': self._get_direction(self._safe_number(md.get('D', 0), 0)),
            'odometer': self._safe_number(md.get('OD', 0), 0),
        }

        # Add role-specific data
        if role in ['SUPER_ADMIN', 'OEM', 'RND', 'SERVICE']:
            dashboard['diagnostics'] = {
                'controller_temp': self._safe_number(md.get('CT', 0), 0),
                'motor_temp': self._safe_number(md.get('MT', 0), 0),
                'motor_rpm': self._safe_number(md.get('RPM', 0), 0),
                'throttle_position': self._safe_number(md.get('TCP', 0), 0),
                'motor_torque': self._safe_number(md.get('MTN', 0), 0),
            }

        if role in ['SUPER_ADMIN', 'OEM', 'RND']:
            dashboard['technical'] = {
                'rms_current': self._safe_number(md.get('RCA', 0), 0),
                'capacitor_voltage': self._safe_number(md.get('CBV', 0), 0),
                'throttle_voltage': self._safe_number(md.get('TV', 0), 0),
                'battery_current': self._safe_number(md.get('BCAE', 0), 0),
            }

        if role in ['FLEET', 'DEALER', 'SUPER_ADMIN', 'OEM']:
            dashboard['efficiency'] = {
                'energy_consumption': self._calculate_energy_consumption(),
                'range_remaining': self._estimate_range_remaining(bms),
                'efficiency_rating': self._calculate_efficiency_rating(),
            }

        return dashboard

    def get_fault_data(self, role: str) -> Dict[str, Any]:
        """Get fault/error data filtered by role"""
        latest_data = self.latest_raw_data
        
        if not latest_data:
            return {'error': 'No live data available'}

        mf = latest_data.get('MF', {})
        md = latest_data.get('MD', {})
        bms = latest_data.get('BMS', {})

        basic_faults = {
            'critical_faults': [],
            'warnings': [],
            'fault_count': 0
        }

        # Check critical faults
        critical_checks = [
            ('hardware_over_current', self._safe_number(mf.get('HOCF', 0), 0), 'Hardware Over Current'),
            ('hardware_over_voltage', self._safe_number(mf.get('HWOV', 0), 0), 'Hardware Over Voltage'),
            ('motor_overtemperature', self._safe_number(mf.get('MOT', 0), 0), 'Motor Overheating'),
            ('over_temperature_fault', self._safe_number(mf.get('OTF', 0), 0), 'Controller Overheating'),
            ('motor_overload', self._safe_number(mf.get('MO', 0), 0), 'Motor Overload'),
            ('thermal_runaway', self._safe_number(bms.get('TRE', 0), 0), 'Battery Thermal Runaway'),
        ]

        for fault_key, fault_value, fault_name in critical_checks:
            if fault_value == 1:
                basic_faults['critical_faults'].append({
                    'code': fault_key,
                    'name': fault_name,
                    'severity': 'critical',
                    'timestamp': latest_data.get('timestamp')
                })
                basic_faults['fault_count'] += 1

        # Warnings
        warning_checks = [
            ('under_voltage_fault', self._safe_number(md.get('UVF', 0), 0), 'Under Voltage'),
            ('controller_temp_fault', self._safe_number(md.get('CTF', 0), 0), 'Controller Temperature Warning'),
            ('soc_less_10', self._safe_number(bms.get('ESL10', 0), 0), 'Battery Below 10%'),
            ('over_voltage_error', self._safe_number(bms.get('EOV', 0), 0), 'Battery Over Voltage'),
        ]

        for warn_key, warn_value, warn_name in warning_checks:
            if warn_value == 1:
                basic_faults['warnings'].append({
                    'code': warn_key,
                    'name': warn_name,
                    'severity': 'warning',
                    'timestamp': latest_data.get('timestamp')
                })

        # For SERVICE+, add detailed diagnostics
        if role in ['SERVICE', 'SUPER_ADMIN', 'OEM', 'RND']:
            basic_faults['detailed_faults'] = self._get_all_fault_codes(mf, md, bms)
            basic_faults['phase_diagnostics'] = {
                'u_phase_abnormal': self._safe_number(mf.get('UPA', 0), 0),
                'v_phase_abnormal': self._safe_number(mf.get('VPA', 0), 0),
                'w_phase_abnormal': self._safe_number(mf.get('WPA', 0), 0),
                'motor_phase_short_battery': self._safe_number(mf.get('MPSTB', 0), 0),
                'motor_phase_short_ground': self._safe_number(mf.get('MPSG', 0), 0),
            }
            basic_faults['sensor_status'] = {
                'temp_sensor_fault': self._safe_number(mf.get('TSF', 0), 0),
                'encoder_disconnection': self._safe_number(mf.get('ED', 0), 0),
                'hall_error': self._safe_number(md.get('HEM', 0), 0),
            }

        return basic_faults

    def get_bms_data(self, role: str) -> Dict[str, Any]:
        """Get Battery Management System data filtered by role"""
        latest_data = self.latest_raw_data
        
        if not latest_data:
            return {'error': 'No live data available'}

        bms = latest_data.get('BMS', {})

        bms_data = {
            'timestamp': latest_data.get('timestamp'),
            'state_of_charge': self._safe_number(bms.get('SOC', 0), 0),
            'voltage': self._safe_number(bms.get('PV', 0), 0),
            'current': self._safe_number(bms.get('PC', 0), 0),
            'available_energy': self._safe_number(bms.get('AE', 0), 0),
            'health_status': {
                'over_voltage': self._safe_number(bms.get('EOV', 0), 0),
                'under_voltage': self._safe_number(bms.get('EUV', 0), 0),
                'over_temperature': self._safe_number(bms.get('EOT', 0), 0),
                'under_temperature': self._safe_number(bms.get('EUT', 0), 0),
                'pack_not_connected': self._safe_number(bms.get('EPNC', 0), 0),
                'thermal_runaway': self._safe_number(bms.get('TRE', 0), 0),
            },
            'charge_status': {
                'is_charging': self._is_charging(bms),
                'estimated_charge_time': self._estimate_charge_time(bms),
            },
            'warnings': []
        }

        if self._safe_number(bms.get('ESL10', 0), 0) == 1:
            bms_data['warnings'].append('Battery below 10%')
        if self._safe_number(bms.get('ESC5', 0), 0) == 1:
            bms_data['warnings'].append('Battery critically low (below 5%)')

        if role in ['SUPER_ADMIN', 'OEM', 'RND', 'SERVICE']:
            bms_data['advanced_metrics'] = {
                'power': self._calculate_battery_power(bms),
                'capacity_utilization': self._calculate_capacity_utilization(bms),
                'discharge_rate': self._calculate_discharge_rate(),
            }

        return bms_data

    def get_alerts(self, role: str) -> Dict[str, Any]:
        """Get active alerts and alert history"""
        return {
            'active_alerts': self.active_alerts,
            'alert_count': len(self.active_alerts),
            'recent_alerts': self.alert_history[-10:] if self.alert_history else [],
            'critical_count': len([a for a in self.active_alerts if a.get('severity') == 'critical']),
            'warning_count': len([a for a in self.active_alerts if a.get('severity') == 'warning']),
        }

    def get_available_controls(self, role: str) -> List[str]:
        """Get list of controls available for this role"""
        if role in ['SUPER_ADMIN']:
            return [
                'immobilizer', 'horn', 'headlights', 'hazard_lights',
                'vehicle_lock', 'seat_lock', 'vehicle_power', 'indicators',
                'brake_lights'
            ]
        elif role in ['FLEET']:
            return ['immobilizer', 'vehicle_lock', 'indicators']
        elif role in ['USER']:
            return ['horn', 'headlights', 'hazard_lights', 'vehicle_lock',
                    'seat_lock', 'indicators']
        else:
            return []

    # ==========================================
    # HELPER METHODS - ALL FIXED WITH _safe_number()
    # ==========================================

    def _check_for_alerts(self, data: Dict[str, Any]):
        """Check for alert conditions"""
        try:
            md = data.get('MD', {})
            bms = data.get('BMS', {})
            mf = data.get('MF', {})

            new_alerts = []
            current_alerts = self.active_alerts

            # Battery alerts
            soc = self._safe_number(bms.get('SOC', 100), 100)
            if soc < 10:
                alert = {
                    'type': 'battery_low',
                    'severity': 'warning',
                    'message': f"Battery low: {soc}%",
                    'timestamp': datetime.now().isoformat()
                }
                if not any(a.get('type') == 'battery_low' for a in current_alerts):
                    new_alerts.append(alert)
                    self.append_alert(alert)

            # Temperature alerts
            ct = self._safe_number(md.get('CT', 0), 0)
            if ct > 80:
                alert = {
                    'type': 'controller_overheat',
                    'severity': 'warning',
                    'message': f"Controller temperature high: {ct}°C",
                    'timestamp': datetime.now().isoformat()
                }
                if not any(a.get('type') == 'controller_overheat' for a in current_alerts):
                    new_alerts.append(alert)
                    self.append_alert(alert)

            mt = self._safe_number(md.get('MT', 0), 0)
            if mt > 90:
                alert = {
                    'type': 'motor_overheat',
                    'severity': 'critical',
                    'message': f"Motor overheating: {mt}°C",
                    'timestamp': datetime.now().isoformat()
                }
                if not any(a.get('type') == 'motor_overheat' for a in current_alerts):
                    new_alerts.append(alert)
                    self.append_alert(alert)

            # Fault alerts
            if self._safe_number(mf.get('MOT', 0), 0) == 1:
                alert = {
                    'type': 'motor_overtemperature',
                    'severity': 'critical',
                    'message': 'Motor overtemperature fault',
                    'timestamp': datetime.now().isoformat()
                }
                if not any(a.get('type') == 'motor_overtemperature' for a in current_alerts):
                    new_alerts.append(alert)
                    self.append_alert(alert)

            # Update active alerts
            all_alerts = current_alerts + new_alerts
            self.active_alerts = [a for a in all_alerts if self._is_alert_still_active(a, data)]
            
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")

    def _is_alert_still_active(self, alert: Dict, current_data: Dict) -> bool:
        """Check if alert condition still exists"""
        try:
            alert_type = alert.get('type')
            bms = current_data.get('BMS', {})
            md = current_data.get('MD', {})

            if alert_type == 'battery_low' and self._safe_number(bms.get('SOC', 100), 100) >= 10:
                return False
            if alert_type == 'controller_overheat' and self._safe_number(md.get('CT', 0), 0) <= 75:
                return False
            if alert_type == 'motor_overheat' and self._safe_number(md.get('MT', 0), 0) <= 85:
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error checking if alert active: {e}")
            return True

    def _calculate_average_speed(self) -> float:
        """Calculate average speed from history"""
        try:
            history = self.raw_data_history
            if not history:
                return 0.0
            
            speeds = [self._safe_number(d.get('MD', {}).get('VS', 0), 0) for d in history]
            non_zero_speeds = [s for s in speeds if s > 0]
            
            return round(sum(non_zero_speeds) / len(non_zero_speeds), 2) if non_zero_speeds else 0.0
        except Exception as e:
            logger.error(f"Error calculating average speed: {e}")
            return 0.0

    def _get_max_speed_in_trip(self) -> float:
        """Get maximum speed in current trip"""
        if self.current_trip:
            return self._safe_number(self.current_trip.get('max_speed', 0), 0)
        return 0

    def _calculate_battery_health(self, bms: Dict) -> str:
        """Calculate battery health status"""
        try:
            soc = self._safe_number(bms.get('SOC', 0), 0)
            
            if self._safe_number(bms.get('TRE', 0), 0) > 0:
                return 'Critical'
            elif self._safe_number(bms.get('EOV', 0), 0) == 1 or self._safe_number(bms.get('EUV', 0), 0) == 1:
                return 'Warning'
            elif soc < 10:
                return 'Low'
            elif soc < 30:
                return 'Fair'
            else:
                return 'Good'
        except Exception as e:
            logger.error(f"Error calculating battery health: {e}")
            return 'Unknown'

    def _get_trip_summary(self) -> Dict[str, Any]:
        """Get current trip summary"""
        if not self.current_trip:
            return {
                'active': False,
                'distance': 0,
                'duration': 0,
                'average_speed': 0,
                'max_speed': 0,
                'energy_consumed': 0
            }
        
        return {
            'active': True,
            **self.current_trip
        }

    def _update_current_trip(self, data: Dict):
        """Update current trip data"""
        try:
            trip = self.current_trip
            if not trip:
                return
            
            md = data.get('MD', {})
            speed = self._safe_number(md.get('VS', 0), 0)
            
            if speed > trip.get('max_speed', 0):
                trip['max_speed'] = speed
            
            self.current_trip = trip
        except Exception as e:
            logger.error(f"Error updating trip: {e}")

    def _get_vehicle_mode(self, mode_code) -> str:
        """Convert mode code to string"""
        try:
            mode_int = int(self._safe_number(mode_code, 0))
            modes = {1: 'Drive', 2: 'Sports', 3: 'Boost', 4: 'Park'}
            return modes.get(mode_int, 'Unknown')
        except Exception as e:
            logger.error(f"Error getting vehicle mode: {e}")
            return 'Unknown'

    def _get_direction(self, direction_code) -> str:
        """Convert direction code to string"""
        try:
            dir_int = int(self._safe_number(direction_code, 0))
            directions = {1: 'Forward', 2: 'Reverse', 3: 'Neutral'}
            return directions.get(dir_int, 'Unknown')
        except Exception as e:
            logger.error(f"Error getting direction: {e}")
            return 'Unknown'

    def _is_charging(self, bms: Dict) -> bool:
        """Check if vehicle is charging"""
        try:
            current = self._safe_number(bms.get('PC', 0), 0)
            return current < 0
        except Exception as e:
            logger.error(f"Error checking charging: {e}")
            return False

    def _estimate_charge_time(self, bms: Dict) -> Optional[int]:
        """Estimate minutes to full charge"""
        if not self._is_charging(bms):
            return None
        return 60  # Placeholder

    def _calculate_battery_power(self, bms: Dict) -> float:
        """Calculate battery power in watts"""
        try:
            voltage = self._safe_number(bms.get('PV', 0), 0)
            current = self._safe_number(bms.get('PC', 0), 0)
            return round(voltage * current, 2)
        except Exception as e:
            logger.error(f"Error calculating battery power: {e}")
            return 0.0

    def _calculate_capacity_utilization(self, bms: Dict) -> float:
        """
        Calculate capacity utilization percentage
        Gets battery capacity from vehicle_static_data_service
        """
        try:
            available = self._safe_number(bms.get('AE', 0), 0)
            
            # Get specs from vehicle_static_data_service
            vin = self.latest_raw_data.get('vin', DEFAULT_TEST_VIN)
            vehicle_specs = vehicle_static_data_service.get_vehicle_specs(vin, 'SUPER_ADMIN')
            
            if vehicle_specs and 'battery_capacity' in vehicle_specs:
                total_capacity = self._safe_number(vehicle_specs['battery_capacity'], 3000)
            else:
                total_capacity = 3000  # Default fallback
            
            return round((available / total_capacity) * 100, 2) if total_capacity > 0 else 0
        except Exception as e:
            logger.error(f"Error calculating capacity utilization: {e}")
            return 0.0

    def _calculate_discharge_rate(self) -> float:
        """Calculate battery discharge rate"""
        return 0.5  # Placeholder

    def _calculate_energy_consumption(self) -> float:
        """Calculate energy consumption rate"""
        return 20.0  # Placeholder

    def _estimate_range_remaining(self, bms: Dict) -> float:
        """Estimate remaining range in km"""
        try:
            available_energy = self._safe_number(bms.get('AE', 0), 0)
            avg_consumption = 20
            return round(available_energy / avg_consumption, 2) if avg_consumption > 0 else 0
        except Exception as e:
            logger.error(f"Error estimating range: {e}")
            return 0.0

    def _calculate_efficiency_rating(self) -> str:
        """Calculate efficiency rating"""
        return 'Good'  # Placeholder

    def _get_all_fault_codes(self, mf: Dict, md: Dict, bms: Dict) -> List[Dict]:
        """Get all active fault codes"""
        try:
            faults = []
            fault_map = {
                'HOCF': ('Hardware Over Current', 'critical'),
                'HWOV': ('Hardware Over Voltage', 'critical'),
                'MOT': ('Motor Over Temperature', 'critical'),
            }

            for code, (name, severity) in fault_map.items():
                if self._safe_number(mf.get(code, 0), 0) == 1:
                    faults.append({
                        'code': code,
                        'name': name,
                        'severity': severity,
                        'timestamp': datetime.now().isoformat()
                    })

            return faults
        except Exception as e:
            logger.error(f"Error getting fault codes: {e}")
            return []

    # ==========================================
    # TRIP MANAGEMENT
    # ==========================================

    def start_trip(self):
        """Start a new trip"""
        latest_data = self.latest_raw_data
        self.current_trip = {
            'start_time': datetime.now().isoformat(),
            'distance': 0,
            'duration': 0,
            'max_speed': 0,
            'avg_speed': 0,
            'energy_consumed': 0,
            'start_soc': self._safe_number(latest_data.get('BMS', {}).get('SOC', 0), 0) if latest_data else 0
        }

    def end_trip(self):
        """End current trip"""
        if self.current_trip:
            trip = self.current_trip
            latest_data = self.latest_raw_data
            trip['end_time'] = datetime.now().isoformat()
            trip['end_soc'] = self._safe_number(latest_data.get('BMS', {}).get('SOC', 0), 0) if latest_data else 0
            self.append_trip(trip)
            self.current_trip = None


# Singleton instance
live_data_manager = LiveDataManager()