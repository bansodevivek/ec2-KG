# core/Services/alert_service.py
"""
Alert Service - Server-side alert detection and management
Processes telemetry data and creates alerts based on thresholds
"""

import logging
from typing import List, Dict, Any
from django.utils import timezone
from core.models.app_telemetry import Alert

logger = logging.getLogger(__name__)


class AlertService:
    """
    Server-side alert detection and management
    All alert logic runs on the server
    """
    
    # Alert thresholds and configurations
    ALERT_THRESHOLDS = {
        # Speed alerts
        'over_speed': {
            'limit': 65,
            'severity': 'WARNING',
            'title': 'Over Speed',
            'message_template': 'Speed {speed} km/h exceeds limit of {limit} km/h'
        },
        
        # Battery SOC alerts
        'critical_soc': {
            'limit': 5,
            'severity': 'CRITICAL',
            'title': 'Critical Battery',
            'message_template': 'Battery at {soc}%! Recharge immediately'
        },
        'low_soc': {
            'limit': 20,
            'severity': 'WARNING',
            'title': 'Low Battery',
            'message_template': 'Battery at {soc}%'
        },
        
        # Tyre pressure alerts
        'low_tyre_front': {
            'limit': 28,
            'severity': 'WARNING',
            'title': 'Low Front Tyre Pressure',
            'message_template': 'Front tyre pressure {pressure} PSI is below {limit} PSI'
        },
        'low_tyre_rear': {
            'limit': 28,
            'severity': 'WARNING',
            'title': 'Low Rear Tyre Pressure',
            'message_template': 'Rear tyre pressure {pressure} PSI is below {limit} PSI'
        },
        
        # Temperature alerts
        'high_motor_temp': {
            'limit': 80,
            'severity': 'CRITICAL',
            'title': 'Motor Overheating',
            'message_template': 'Motor temperature {temp}°C exceeds safe limit'
        },
        'high_controller_temp': {
            'limit': 75,
            'severity': 'CRITICAL',
            'title': 'Controller Overheating',
            'message_template': 'Controller temperature {temp}°C exceeds safe limit'
        },
        
        # BMS fault alerts
        'bms_over_voltage': {
            'severity': 'WARNING',
            'title': 'Battery Over-Voltage',
            'message_template': 'Battery over-voltage detected'
        },
        'bms_under_voltage': {
            'severity': 'WARNING',
            'title': 'Battery Under-Voltage',
            'message_template': 'Battery under-voltage detected'
        },
        'bms_over_temp': {
            'severity': 'CRITICAL',
            'title': 'Battery Over-Temperature',
            'message_template': 'Battery over-temperature detected'
        },
        'bms_under_temp': {
            'severity': 'WARNING',
            'title': 'Battery Under-Temperature',
            'message_template': 'Battery under-temperature detected'
        },
        'thermal_runaway': {
            'severity': 'CRITICAL',
            'title': 'THERMAL RUNAWAY',
            'message_template': 'CRITICAL: Battery thermal runaway detected! Stop vehicle immediately!'
        },
        
        # Motor fault alerts
        'motor_overload': {
            'severity': 'WARNING',
            'title': 'Motor Overload',
            'message_template': 'Motor overload detected'
        },
        'hardware_over_current': {
            'severity': 'CRITICAL',
            'title': 'Hardware Over-Current',
            'message_template': 'Hardware over-current fault detected'
        },
        'hardware_over_voltage': {
            'severity': 'CRITICAL',
            'title': 'Hardware Over-Voltage',
            'message_template': 'Hardware over-voltage fault detected'
        },
    }
    
    # State tracking per vehicle (to prevent duplicate alerts)
    _vehicle_states = {}  # {vcu_id: {alert_type: last_alert_time}}
    
    # Alert cooldown period (seconds) - prevents spamming same alert
    ALERT_COOLDOWN = 300  # 5 minutes
    
    @classmethod
    def process_telemetry(cls, vcu_id: str, vin: str, data: dict, user=None) -> List[Alert]:
        """
        Process telemetry data and detect alerts
        
        Args:
            vcu_id: Vehicle Control Unit ID
            vin: Vehicle Identification Number
            data: Telemetry data dict with MD, MF, BMS sections
            user: User object (optional) for alert assignment
        
        Returns:
            List of created Alert objects
        """
        alerts = []
        
        md = data.get('MD', {})
        mf = data.get('MF', {})
        bms = data.get('BMS', {})
        
        # Speed alerts
        speed = cls._safe_int(md.get('VS', 0))
        if speed >= cls.ALERT_THRESHOLDS['over_speed']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'over_speed', user,
                extra_data={'speed': speed}
            )
            if alert:
                alerts.append(alert)
        
        # SOC alerts
        soc = cls._safe_float(bms.get('SOC', 100))
        if soc <= cls.ALERT_THRESHOLDS['critical_soc']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'critical_soc', user,
                extra_data={'soc': soc}
            )
            if alert:
                alerts.append(alert)
        elif soc <= cls.ALERT_THRESHOLDS['low_soc']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'low_soc', user,
                extra_data={'soc': soc}
            )
            if alert:
                alerts.append(alert)
        
        # Temperature alerts
        motor_temp = cls._safe_int(md.get('MT', 0))
        if motor_temp >= cls.ALERT_THRESHOLDS['high_motor_temp']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'high_motor_temp', user,
                extra_data={'temp': motor_temp}
            )
            if alert:
                alerts.append(alert)
        
        controller_temp = cls._safe_int(md.get('CT', 0))
        if controller_temp >= cls.ALERT_THRESHOLDS['high_controller_temp']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'high_controller_temp', user,
                extra_data={'temp': controller_temp}
            )
            if alert:
                alerts.append(alert)
        
        # BMS fault alerts
        if cls._safe_int(bms.get('EOV', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'bms_over_voltage', user
            )
            if alert:
                alerts.append(alert)
        
        if cls._safe_int(bms.get('EUV', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'bms_under_voltage', user
            )
            if alert:
                alerts.append(alert)
        
        if cls._safe_int(bms.get('EOT', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'bms_over_temp', user
            )
            if alert:
                alerts.append(alert)
        
        if cls._safe_int(bms.get('EUT', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'bms_under_temp', user
            )
            if alert:
                alerts.append(alert)
        
        # CRITICAL: Thermal runaway
        if cls._safe_int(bms.get('TRE', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'thermal_runaway', user
            )
            if alert:
                alerts.append(alert)
        
        # Motor fault alerts
        if cls._safe_int(mf.get('MO', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'motor_overload', user
            )
            if alert:
                alerts.append(alert)
        
        if cls._safe_int(mf.get('HOCF', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'hardware_over_current', user
            )
            if alert:
                alerts.append(alert)
        
        if cls._safe_int(mf.get('HWOV', 0)) == 1:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'hardware_over_voltage', user
            )
            if alert:
                alerts.append(alert)
        
        # Auto-resolve alerts that are no longer active
        cls._auto_resolve_alerts(vcu_id, vin, data)
        
        return alerts
    
    @classmethod
    def process_tyre_pressure(cls, vcu_id: str, vin: str, front: int, rear: int, user=None) -> List[Alert]:
        """
        Process tyre pressure and create alerts if needed
        """
        alerts = []
        
        if front < cls.ALERT_THRESHOLDS['low_tyre_front']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'low_tyre_front', user,
                extra_data={'pressure': front}
            )
            if alert:
                alerts.append(alert)
        
        if rear < cls.ALERT_THRESHOLDS['low_tyre_rear']['limit']:
            alert = cls._create_alert_if_needed(
                vcu_id, vin, 'low_tyre_rear', user,
                extra_data={'pressure': rear}
            )
            if alert:
                alerts.append(alert)
        
        return alerts
    
    @classmethod
    def _create_alert_if_needed(cls, vcu_id: str, vin: str, alert_type: str, 
                                user=None, extra_data: dict = None) -> Alert:
        """
        Create alert if it doesn't exist or is outside cooldown period
        """
        # Check cooldown
        if vcu_id in cls._vehicle_states:
            vehicle_state = cls._vehicle_states[vcu_id]
            if alert_type in vehicle_state:
                last_alert_time = vehicle_state[alert_type]
                time_since_last = (timezone.now() - last_alert_time).total_seconds()
                if time_since_last < cls.ALERT_COOLDOWN:
                    logger.debug(f"Alert {alert_type} for {vcu_id} in cooldown ({time_since_last}s)")
                    return None
        
        # Check if active alert already exists
        existing = Alert.objects.filter(
            vcu_id=vcu_id,
            alert_type=alert_type,
            status='ACTIVE'
        ).first()
        
        if existing:
            logger.debug(f"Active alert {alert_type} already exists for {vcu_id}")
            return None
        
        # Get alert configuration
        config = cls.ALERT_THRESHOLDS.get(alert_type, {})
        
        # Format message with extra data
        message = config.get('message_template', '')
        if extra_data:
            try:
                # Add limit from config if needed
                if 'limit' in config:
                    extra_data['limit'] = config['limit']
                message = message.format(**extra_data)
            except KeyError:
                pass
        
        # Create alert
        alert = Alert.objects.create(
            vcu_id=vcu_id,
            vin=vin,
            user=user,
            alert_type=alert_type,
            severity=config.get('severity', 'WARNING'),
            title=config.get('title', alert_type),
            message=message,
            status='ACTIVE',
            data=extra_data
        )
        
        # Update state tracking
        if vcu_id not in cls._vehicle_states:
            cls._vehicle_states[vcu_id] = {}
        cls._vehicle_states[vcu_id][alert_type] = timezone.now()
        
        logger.info(f"Created {alert.severity} alert: {alert.title} for {vcu_id}")
        
        return alert
    
    @classmethod
    def _auto_resolve_alerts(cls, vcu_id: str, vin: str, data: dict):
        """
        Auto-resolve alerts when conditions return to normal
        """
        md = data.get('MD', {})
        mf = data.get('MF', {})
        bms = data.get('BMS', {})
        
        # Get all active alerts for this vehicle
        active_alerts = Alert.objects.filter(
            vcu_id=vcu_id,
            status='ACTIVE'
        )
        
        for alert in active_alerts:
            should_resolve = False
            
            # Check if alert condition is resolved
            if alert.alert_type == 'over_speed':
                speed = cls._safe_int(md.get('VS', 0))
                if speed < cls.ALERT_THRESHOLDS['over_speed']['limit'] - 5:  # 5 km/h hysteresis
                    should_resolve = True
            
            elif alert.alert_type in ['critical_soc', 'low_soc']:
                soc = cls._safe_float(bms.get('SOC', 100))
                if soc > cls.ALERT_THRESHOLDS['low_soc']['limit'] + 5:  # 5% hysteresis
                    should_resolve = True
            
            elif alert.alert_type == 'high_motor_temp':
                temp = cls._safe_int(md.get('MT', 0))
                if temp < cls.ALERT_THRESHOLDS['high_motor_temp']['limit'] - 10:  # 10°C hysteresis
                    should_resolve = True
            
            elif alert.alert_type == 'high_controller_temp':
                temp = cls._safe_int(md.get('CT', 0))
                if temp < cls.ALERT_THRESHOLDS['high_controller_temp']['limit'] - 10:
                    should_resolve = True
            
            elif alert.alert_type == 'bms_over_voltage':
                if cls._safe_int(bms.get('EOV', 0)) == 0:
                    should_resolve = True
            
            elif alert.alert_type == 'bms_under_voltage':
                if cls._safe_int(bms.get('EUV', 0)) == 0:
                    should_resolve = True
            
            # Add more auto-resolve conditions as needed
            
            if should_resolve:
                alert.resolve()
                logger.info(f"Auto-resolved alert: {alert.title} for {vcu_id}")
    
    @classmethod
    def get_active_alerts(cls, vcu_id: str = None, vin: str = None, user=None) -> List[Alert]:
        """
        Get active alerts for a vehicle or user
        """
        filters = {'status': 'ACTIVE'}
        
        if vcu_id:
            filters['vcu_id'] = vcu_id
        if vin:
            filters['vin'] = vin
        if user:
            filters['user'] = user
        
        return list(Alert.objects.filter(**filters).order_by('-created_at'))
    
    @classmethod
    def get_alert_history(cls, vcu_id: str = None, vin: str = None, user=None, limit: int = 50) -> List[Alert]:
        """
        Get alert history for a vehicle or user
        """
        filters = {}
        
        if vcu_id:
            filters['vcu_id'] = vcu_id
        if vin:
            filters['vin'] = vin
        if user:
            filters['user'] = user
        
        return list(Alert.objects.filter(**filters).order_by('-created_at')[:limit])
    
    @staticmethod
    def _safe_int(value, default=0):
        """Safely convert to int"""
        if value in ('', None):
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    @staticmethod
    def _safe_float(value, default=0.0):
        """Safely convert to float"""
        if value in ('', None):
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default


# Singleton instance
alert_service = AlertService()