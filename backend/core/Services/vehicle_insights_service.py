# core/Services/vehicle_insights_service.py
"""
Vehicle Insights Service - WITH SMART TIME-BUCKETED SAMPLING
Provides comprehensive vehicle analytics with flexible time range filtering and intelligent sampling
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Avg, Max, Min, Count, Sum, Q, F
from django.core.exceptions import ObjectDoesNotExist

from core.models import VehicleInfo, VehicleRawData, VehicleSpecs
from core.models.app_telemetry import Trip, VehicleLocation

logger = logging.getLogger(__name__)


class VehicleInsightsService:
    CO2_PER_LITER_PETROL = 2.31
    TREE_CO2_ABSORPTION_PER_YEAR = 21.77
    TREE_CO2_ABSORPTION_PER_DAY = TREE_CO2_ABSORPTION_PER_YEAR / 365
    PETROL_EFFICIENCY_KM_PER_LITER = 40
    BATTERY_WEIGHT = 0.4
    TIRE_WEIGHT = 0.3
    BRAKE_WEIGHT = 0.3
    TIME_RANGES = {
        '1h':  {'hours': 1,   'label': '1 Hour'},
        '6h':  {'hours': 6,   'label': '6 Hours'},
        '12h': {'hours': 12,  'label': '12 Hours'},
        '24h': {'hours': 24,  'label': '24 Hours'},
        '2d':  {'days':  2,   'label': '2 Days'},
        '3d':  {'days':  3,   'label': '3 Days'},
        '1w':  {'days':  7,   'label': '1 Week'},
        '2w':  {'days':  14,  'label': '2 Weeks'},
        '1m':  {'days':  30,  'label': '1 Month'},
        '3m':  {'days':  90,  'label': '3 Months'},
    }

    @classmethod
    def parse_time_range(cls, time_range: str) -> timedelta:
        try:
            if isinstance(time_range, (int, float)):
                return timedelta(hours=time_range)
            if time_range in cls.TIME_RANGES:
                config = cls.TIME_RANGES[time_range]
                if 'hours' in config:
                    return timedelta(hours=config['hours'])
                elif 'days' in config:
                    return timedelta(days=config['days'])
            try:
                return timedelta(hours=int(time_range))
            except ValueError:
                pass
            logger.warning(f"Invalid time range '{time_range}', defaulting to 1 hour")
            return timedelta(hours=1)
        except Exception as e:
            logger.error(f"Error parsing time range: {e}")
            return timedelta(hours=1)

    @classmethod
    def _get_optimal_sample_interval(cls, time_range: str, target_points: int = 200) -> dict:
        delta = cls.parse_time_range(time_range)
        total_seconds = int(delta.total_seconds())
        seconds_per_point = total_seconds / target_points
        if seconds_per_point < 10:
            interval, label = 5, "5 sec"
        elif seconds_per_point < 30:
            interval, label = 10, "10 sec"
        elif seconds_per_point < 60:
            interval, label = 30, "30 sec"
        elif seconds_per_point < 300:
            interval, label = 60, "1 min"
        elif seconds_per_point < 600:
            interval, label = 300, "5 min"
        elif seconds_per_point < 1800:
            interval, label = 600, "10 min"
        elif seconds_per_point < 3600:
            interval, label = 1800, "30 min"
        elif seconds_per_point < 7200:
            interval, label = 3600, "1 hour"
        elif seconds_per_point < 21600:
            interval, label = 7200, "2 hours"
        else:
            interval, label = 21600, "6 hours"
        return {
            'interval_seconds': interval,
            'interval_label': label,
            'estimated_points': total_seconds // interval,
            'method': 'time_bucketed_average'
        }

    @classmethod
    def _aggregate_telemetry_data(cls, queryset, interval_seconds: int, fields: list) -> list:
        if not queryset.exists():
            return []
        first_record = queryset.first()
        last_record  = queryset.last()
        if not first_record or not last_record:
            return []
        start_time = first_record.time
        end_time   = last_record.time
        aggregated_data = []
        current_time = start_time
        interval = timedelta(seconds=interval_seconds)
        while current_time < end_time:
            bucket_end  = current_time + interval
            bucket_data = queryset.filter(time__gte=current_time, time__lt=bucket_end)
            if bucket_data.exists():
                aggregates = {}
                for field in fields:
                    avg_value = bucket_data.aggregate(avg=Avg(field))['avg']
                    aggregates[field] = round(avg_value, 2) if avg_value is not None else 0
                aggregated_data.append({
                    'timestamp':    current_time.isoformat(),
                    'bucket_start': current_time.isoformat(),
                    'bucket_end':   bucket_end.isoformat(),
                    'sample_count': bucket_data.count(),
                    **aggregates
                })
            current_time = bucket_end
        return aggregated_data

    @classmethod
    def _should_use_bucketing(cls, time_range: str) -> bool:
        delta = cls.parse_time_range(time_range)
        return (delta.total_seconds() / 3600) > 6

    # ------------------------------------------------------------------
    # FULL INSIGHTS
    # ------------------------------------------------------------------
    @classmethod
    def get_vehicle_insights(cls, vin: str, user=None, time_range: str = '1h') -> Dict[str, Any]:
        try:
            vehicle = VehicleInfo.objects.get(vin=vin)
            return {
                'success': True,
                'vin': vin,
                'vehicle_no':   vehicle.vehicle_no,
                'model_name':   vehicle.model_name,
                'time_range':   time_range,
                'overview':             cls.get_overview(vin),
                'trips':                cls.get_trip_summary(vin, user, time_range),
                'environmental_impact': cls.get_environmental_impact(vin),
                'vehicle_health':       cls.get_vehicle_health(vin),
                'performance_metrics':  cls.get_performance_metrics(vin, time_range),
                'maintenance_schedule': cls.get_maintenance_schedule(vin),
                'mcu_telemetry':        cls.get_mcu_telemetry(vin, time_range),
                'bms_telemetry':        cls.get_bms_telemetry(vin, time_range),
                'location_data':        cls.get_location_history(vin, time_range),
                'last_updated': timezone.now().isoformat()
            }
        except VehicleInfo.DoesNotExist:
            logger.error(f"Vehicle not found: {vin}")
            return {'success': False, 'error': 'Vehicle not found'}
        except Exception as e:
            logger.error(f"Error getting vehicle insights: {e}")
            return {'success': False, 'error': str(e)}

    # ------------------------------------------------------------------
    # OVERVIEW
    # ------------------------------------------------------------------
    @classmethod
    def get_overview(cls, vin: str) -> Dict[str, Any]:
        try:
            latest_data   = VehicleRawData.objects.filter(vin=vin).order_by('-time').first()
            total_trips   = Trip.objects.filter(vin=vin, is_active=False).count()
            total_distance = Trip.objects.filter(
                vin=vin, is_active=False
            ).aggregate(total=Sum('distance_km'))['total'] or 0
            completed_trips = Trip.objects.filter(
                vin=vin, is_active=False, distance_km__gt=0, duration_seconds__gt=0
            )
            avg_speed = completed_trips.aggregate(avg=Avg('avg_speed_kmh'))['avg'] or 0
            return {
                'total_trips':         total_trips,
                'total_distance_km':   round(total_distance, 2),
                'average_speed_kmh':   round(avg_speed, 1),
                'current_soc':         latest_data.soc_battery_pack if latest_data else 0,
                'current_odometer':    latest_data.odometer          if latest_data else 0,
                'vehicle_state':       latest_data.vehicle_state     if latest_data else 'Unknown',
                'last_activity':       latest_data.time.isoformat()  if latest_data else None
            }
        except Exception as e:
            logger.error(f"Error getting overview: {e}")
            return {}

    # ------------------------------------------------------------------
    # TRIPS
    # ------------------------------------------------------------------
    @classmethod
    def get_trip_summary(cls, vin: str, user=None, time_range: str = '1m') -> Dict[str, Any]:
        try:
            delta = cls.parse_time_range(time_range)
            since = timezone.now() - delta
            trips = Trip.objects.filter(
                vin=vin, is_active=False, start_time__gte=since
            ).order_by('-start_time')
            total_trips     = trips.count()
            total_distance  = trips.aggregate(total=Sum('distance_km'))['total']  or 0
            avg_distance    = trips.aggregate(avg=Avg('distance_km'))['avg']       or 0
            avg_efficiency  = trips.aggregate(avg=Avg('efficiency_wh_km'))['avg']  or 0
            avg_eco_score   = trips.aggregate(avg=Avg('eco_score'))['avg']         or 0
            recent_trips = []
            for trip in trips[:10]:
                duration_minutes = trip.duration_seconds // 60 if trip.duration_seconds else 0
                recent_trips.append({
                    'id':                trip.id,
                    'start_time':        trip.start_time.isoformat(),
                    'end_time':          trip.end_time.isoformat() if trip.end_time else None,
                    'distance_km':       round(trip.distance_km, 2),
                    'duration_minutes':  duration_minutes,
                    'duration_seconds':  trip.duration_seconds,
                    'avg_speed_kmh':     round(trip.avg_speed_kmh, 1),
                    'max_speed_kmh':     trip.max_speed_kmh,
                    'efficiency_wh_km':  round(trip.efficiency_wh_km, 2),
                    'eco_score':         trip.eco_score,
                    'energy_consumed_kwh': round(trip.energy_consumed_wh / 1000, 2)
                })
            days = max(1, int(delta.total_seconds() / 86400))
            daily_stats = []
            for i in range(min(days, 30)):
                day_start = timezone.now() - timedelta(days=i)
                day_end   = day_start + timedelta(days=1)
                day_trips = trips.filter(start_time__gte=day_start, start_time__lt=day_end)
                daily_stats.append({
                    'date':        day_start.date().isoformat(),
                    'trips':       day_trips.count(),
                    'distance_km': round(day_trips.aggregate(total=Sum('distance_km'))['total'] or 0, 2),
                    'avg_eco_score': round(day_trips.aggregate(avg=Avg('eco_score'))['avg'] or 0, 1)
                })
            return {
                'time_range':               time_range,
                'total_trips':              total_trips,
                'total_distance_km':        round(total_distance, 2),
                'avg_distance_per_trip_km': round(avg_distance, 2),
                'avg_efficiency_wh_km':     round(avg_efficiency, 2),
                'avg_eco_score':            round(avg_eco_score, 1),
                'recent_trips':             recent_trips,
                'daily_statistics':         daily_stats
            }
        except Exception as e:
            logger.error(f"Error getting trip summary: {e}")
            return {}

    # ------------------------------------------------------------------
    # ENVIRONMENTAL IMPACT
    # ------------------------------------------------------------------
    @classmethod
    def get_environmental_impact(cls, vin: str) -> Dict[str, Any]:
        try:
            trips = Trip.objects.filter(vin=vin, is_active=False)
            total_distance = trips.aggregate(total=Sum('distance_km'))['total'] or 0
            if total_distance == 0:
                return {
                    'total_distance_km': 0, 'fuel_saved_liters': 0,
                    'co2_saved_kg': 0, 'trees_equivalent_daily': 0,
                    'trees_equivalent_yearly': 0, 'petrol_cost_saved_inr': 0
                }
            petrol_liters    = total_distance / cls.PETROL_EFFICIENCY_KM_PER_LITER
            co2_saved_kg     = petrol_liters * cls.CO2_PER_LITER_PETROL
            trees_daily      = co2_saved_kg / cls.TREE_CO2_ABSORPTION_PER_DAY
            trees_yearly     = co2_saved_kg / cls.TREE_CO2_ABSORPTION_PER_YEAR
            petrol_cost_saved = petrol_liters * 100
            return {
                'total_distance_km':       round(total_distance, 2),
                'fuel_saved_liters':       round(petrol_liters, 2),
                'co2_saved_kg':            round(co2_saved_kg, 2),
                'co2_saved_tons':          round(co2_saved_kg / 1000, 3),
                'trees_equivalent_daily':  round(trees_daily, 1),
                'trees_equivalent_yearly': round(trees_yearly, 1),
                'petrol_cost_saved_inr':   round(petrol_cost_saved, 2),
                'calculation_basis': {
                    'co2_per_liter_petrol_kg':       cls.CO2_PER_LITER_PETROL,
                    'tree_absorption_per_year_kg':   cls.TREE_CO2_ABSORPTION_PER_YEAR,
                    'petrol_efficiency_km_per_liter': cls.PETROL_EFFICIENCY_KM_PER_LITER
                }
            }
        except Exception as e:
            logger.error(f"Error calculating environmental impact: {e}")
            return {}

    # ------------------------------------------------------------------
    # VEHICLE HEALTH
    # ------------------------------------------------------------------
    @classmethod
    def get_vehicle_health(cls, vin: str) -> Dict[str, Any]:
        try:
            latest_data = VehicleRawData.objects.filter(vin=vin).order_by('-time').first()
            if not latest_data:
                return {'overall_health_score': 0, 'battery_health': 0,
                        'tire_condition': 0, 'brake_health': 0}
            battery_health_raw = latest_data.battery_health or 0
            battery_temp       = latest_data.battery_temperature or 0
            temp_penalty = 0
            if battery_temp > 45 or battery_temp < 10:
                temp_penalty = 10
            elif battery_temp > 40 or battery_temp < 15:
                temp_penalty = 5
            battery_health = max(0, min(100, battery_health_raw - temp_penalty))
            tire_condition = 90
            brake_health   = 85 if latest_data.brake_actuation > 80 else 92
            overall_health = (
                battery_health * cls.BATTERY_WEIGHT +
                tire_condition * cls.TIRE_WEIGHT +
                brake_health   * cls.BRAKE_WEIGHT
            )
            return {
                'overall_health_score': round(overall_health),
                'battery_health':       round(battery_health),
                'tire_condition':       round(tire_condition),
                'brake_health':         round(brake_health),
                'health_status':        cls._get_health_status(overall_health)
            }
        except Exception as e:
            logger.error(f"Error getting vehicle health: {e}")
            return {}

    # ------------------------------------------------------------------
    # PERFORMANCE METRICS
    # ------------------------------------------------------------------
    @classmethod
    def get_performance_metrics(cls, vin: str, time_range: str = '24h') -> Dict[str, Any]:
        try:
            delta    = cls.parse_time_range(time_range)
            since    = timezone.now() - delta
            raw_data = VehicleRawData.objects.filter(vin=vin, time__gte=since)
            if not raw_data.exists():
                return {
                    'time_range': time_range,
                    'avg_speed_kmh': 0, 'battery_performance_percent': 0,
                    'capacity_percent': 0, 'maintenance_cost_inr': 0, 'co2_saved_g': 0
                }
            avg_speed   = raw_data.aggregate(avg=Avg('vehicle_speed'))['avg'] or 0
            latest      = raw_data.order_by('-time').first()
            latest_soc  = latest.soc_battery_pack  or 0
            latest_ae   = latest.available_energy   or 0
            try:
                vehicle      = VehicleInfo.objects.get(vin=vin)
                specs_source = vehicle.individual_specifications or vehicle.specs_template
                nominal_capacity = getattr(specs_source, 'battery_capacity', 3000) if specs_source else 3000
            except Exception:
                nominal_capacity = 3000
            capacity_percent = (latest_ae / nominal_capacity) * 100 if nominal_capacity > 0 else 0
            env_impact   = cls.get_environmental_impact(vin)
            co2_saved_g  = env_impact.get('co2_saved_kg', 0) * 1000
            return {
                'time_range':                  time_range,
                'avg_speed_kmh':               round(avg_speed, 1),
                'battery_performance_percent': round(min(100, latest_soc), 1),
                'capacity_percent':            round(min(100, capacity_percent), 1),
                'maintenance_cost_inr':        0,
                'co2_saved_g':                 round(co2_saved_g, 1)
            }
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {}

    # ------------------------------------------------------------------
    # MAINTENANCE
    # ------------------------------------------------------------------
    @classmethod
    def get_maintenance_schedule(cls, vin: str) -> Dict[str, Any]:
        try:
            vehicle = VehicleInfo.objects.get(vin=vin)
            return {
                'last_service_date':         vehicle.last_service_date.isoformat() if vehicle.last_service_date else None,
                'last_service_distance_km':  vehicle.last_service_distance,
                'next_service_date':         vehicle.service_due_date.isoformat() if vehicle.service_due_date else None,
                'next_service_distance_km':  vehicle.service_due_distance,
                'service_status':            vehicle.service_status,
                'is_service_due':            vehicle.is_service_due,
                'days_until_service': (
                    (vehicle.service_due_date - timezone.now().date()).days
                    if vehicle.service_due_date else None
                )
            }
        except VehicleInfo.DoesNotExist:
            logger.error(f"Vehicle not found: {vin}")
            return {}
        except Exception as e:
            logger.error(f"Error getting maintenance schedule: {e}")
            return {}

    # ------------------------------------------------------------------
    # MCU TELEMETRY
    # ------------------------------------------------------------------
    @classmethod
    def get_mcu_telemetry(cls, vin: str, time_range: str = '1h') -> Dict[str, Any]:
        """
        Get MCU telemetry with SMART TIME-BUCKETED SAMPLING.
        Simple sampling for ≤6 h; bucketed averaging for >6 h.

        Model fields used (all verified against VehicleRawData):
            vehicle_speed, motor_temperature, controller_temperature,
            motor_rpm, capacitor_battery_voltage, motor_torque, input_current
        """
        try:
            delta    = cls.parse_time_range(time_range)
            since    = timezone.now() - delta
            raw_data = VehicleRawData.objects.filter(
                vin=vin, time__gte=since
            ).order_by('time')
            total_records = raw_data.count()

            if total_records == 0:
                return {
                    'time_range': time_range,
                    'update_interval_seconds': 7,
                    'data_points': 0,
                    'message': f'No data available for the last {time_range}'
                }

            if cls._should_use_bucketing(time_range):
                # ── Bucketed path ────────────────────────────────────────────
                sample_config = cls._get_optimal_sample_interval(time_range, target_points=200)
                mcu_fields = [
                    'vehicle_speed',
                    'motor_temperature',        # ✅ correct model field
                    'controller_temperature',   # ✅ correct model field
                    'motor_rpm',
                    'capacitor_battery_voltage',
                    'motor_torque',
                    'input_current',
                ]
                aggregated = cls._aggregate_telemetry_data(
                    raw_data, sample_config['interval_seconds'], mcu_fields
                )
                vehicle_speed        = []
                motor_temperature    = []
                controller_temp      = []
                motor_rpm            = []
                motor_voltage        = []
                motor_torque         = []
                power_generation     = []

                for point in aggregated:
                    ts = point['timestamp']
                    sc = point['sample_count']
                    vehicle_speed.append(       {'timestamp': ts, 'value': point.get('vehicle_speed', 0),              'sample_count': sc})
                    motor_temperature.append(   {'timestamp': ts, 'value': point.get('motor_temperature', 0),          'sample_count': sc})
                    controller_temp.append(     {'timestamp': ts, 'value': point.get('controller_temperature', 0),     'sample_count': sc})
                    motor_rpm.append(           {'timestamp': ts, 'value': point.get('motor_rpm', 0),                  'sample_count': sc})
                    motor_voltage.append(       {'timestamp': ts, 'value': point.get('capacitor_battery_voltage', 0),  'sample_count': sc})
                    motor_torque.append(        {'timestamp': ts, 'value': point.get('motor_torque', 0),               'sample_count': sc})
                    v = point.get('capacitor_battery_voltage', 0)
                    i = point.get('input_current', 0)
                    power_generation.append(    {'timestamp': ts, 'value': round((v * i) / 1000, 2),                   'sample_count': sc})

                return {
                    'time_range': time_range,
                    'sampling': {
                        'method':         sample_config['method'],
                        'interval_seconds': sample_config['interval_seconds'],
                        'interval_label': sample_config['interval_label'],
                        'target_points':  200,
                        'actual_points':  len(aggregated)
                    },
                    'data_points':          len(aggregated),
                    'total_records':        total_records,
                    'vehicle_speed':        {'range': '0-120 km/h',  'data': vehicle_speed},
                    'motor_temperature':    {'range': '25-90 °C',    'data': motor_temperature},
                    'controller_temperature': {'range': '25-85 °C',  'data': controller_temp},
                    'motor_rpm':            {'range': '0-8000 RPM',  'data': motor_rpm},
                    'motor_voltage':        {'range': '50-90 V',     'data': motor_voltage},
                    'motor_torque':         {'range': '0-250 Nm',    'data': motor_torque},
                    'power_generation':     {'range': '0-100 %',     'data': power_generation}
                }

            else:
                # ── Simple-sampling path ──────────────────────────────────────
                step         = max(1, total_records // 200)
                sampled_data = list(raw_data[::step])
                vehicle_speed     = []
                motor_temperature = []
                controller_temp   = []
                motor_rpm         = []
                motor_voltage     = []
                motor_torque      = []
                power_generation  = []

                for record in sampled_data:
                    ts = record.time.isoformat()
                    vehicle_speed.append(       {'timestamp': ts, 'value': record.vehicle_speed              or 0})
                    motor_temperature.append(   {'timestamp': ts, 'value': record.motor_temperature          or 0})   # ✅
                    controller_temp.append(     {'timestamp': ts, 'value': record.controller_temperature     or 0})   # ✅
                    motor_rpm.append(           {'timestamp': ts, 'value': record.motor_rpm                  or 0})
                    motor_voltage.append(       {'timestamp': ts, 'value': record.capacitor_battery_voltage  or 0})
                    motor_torque.append(        {'timestamp': ts, 'value': record.motor_torque               or 0})
                    v = record.capacitor_battery_voltage or 0
                    i = record.input_current             or 0
                    power_generation.append(    {'timestamp': ts, 'value': round((v * i) / 1000, 2)})

                return {
                    'time_range': time_range,
                    'sampling': {
                        'method':        'simple_sampling',
                        'step':          step,
                        'target_points': 200,
                        'actual_points': len(sampled_data)
                    },
                    'data_points':          len(sampled_data),
                    'total_records':        total_records,
                    'vehicle_speed':        {'range': '0-120 km/h',  'data': vehicle_speed},
                    'motor_temperature':    {'range': '25-90 °C',    'data': motor_temperature},
                    'controller_temperature': {'range': '25-85 °C',  'data': controller_temp},
                    'motor_rpm':            {'range': '0-8000 RPM',  'data': motor_rpm},
                    'motor_voltage':        {'range': '50-90 V',     'data': motor_voltage},
                    'motor_torque':         {'range': '0-250 Nm',    'data': motor_torque},
                    'power_generation':     {'range': '0-100 %',     'data': power_generation}
                }

        except Exception as e:
            logger.error(f"Error getting MCU telemetry: {e}")
            return {}

    # ------------------------------------------------------------------
    # BMS TELEMETRY
    # ------------------------------------------------------------------
    @classmethod
    def get_bms_telemetry(cls, vin: str, time_range: str = '1h') -> Dict[str, Any]:
        """
        Get BMS telemetry with SMART TIME-BUCKETED SAMPLING.
        Simple sampling for ≤6 h; bucketed averaging for >6 h.

        Model fields used (all verified against VehicleRawData):
            battery_temperature, battery_health, motor_torque,
            battery_pack_voltage,   ← FIX: was 'voltage_battery' (doesn't exist)
            current_battery,
            soc_battery_pack, vehicle_speed
        """
        try:
            delta    = cls.parse_time_range(time_range)
            since    = timezone.now() - delta
            raw_data = VehicleRawData.objects.filter(
                vin=vin, time__gte=since
            ).order_by('time')
            total_records = raw_data.count()

            if total_records == 0:
                return {
                    'time_range': time_range,
                    'update_interval_seconds': 8,
                    'data_points': 0,
                    'message': f'No data available for the last {time_range}'
                }

            if cls._should_use_bucketing(time_range):
                # ── Bucketed path ────────────────────────────────────────────
                sample_config = cls._get_optimal_sample_interval(time_range, target_points=200)
                bms_fields = [
                    'battery_temperature',
                    'battery_health',
                    'motor_torque',
                    'battery_pack_voltage',  # ✅ FIX: was 'voltage_battery'
                    'current_battery',
                    'soc_battery_pack',
                    'vehicle_speed',
                ]
                aggregated = cls._aggregate_telemetry_data(
                    raw_data, sample_config['interval_seconds'], bms_fields
                )
                battery_temperature = []
                battery_performance = []
                battery_torque      = []
                battery_power       = []
                range_left          = []
                idle_time           = []

                for point in aggregated:
                    ts = point['timestamp']
                    sc = point['sample_count']
                    battery_temperature.append({'timestamp': ts, 'value': point.get('battery_temperature', 0), 'sample_count': sc})
                    battery_performance.append({'timestamp': ts, 'value': point.get('battery_health', 0),       'sample_count': sc})
                    battery_torque.append(     {'timestamp': ts, 'value': point.get('motor_torque', 0),         'sample_count': sc})
                    v = point.get('battery_pack_voltage', 0)   # ✅ FIX
                    i = point.get('current_battery', 0)
                    battery_power.append(      {'timestamp': ts, 'value': round((v * i) / 1000, 2),             'sample_count': sc})
                    range_left.append(         {'timestamp': ts, 'value': point.get('soc_battery_pack', 0),     'sample_count': sc})
                    avg_speed = point.get('vehicle_speed', 0)
                    idle_time.append(          {'timestamp': ts, 'value': 100 if avg_speed < 1 else 0,          'sample_count': sc})

                return {
                    'time_range': time_range,
                    'sampling': {
                        'method':           sample_config['method'],
                        'interval_seconds': sample_config['interval_seconds'],
                        'interval_label':   sample_config['interval_label'],
                        'target_points':    200,
                        'actual_points':    len(aggregated)
                    },
                    'data_points':              len(aggregated),
                    'total_records':            total_records,
                    'battery_temperature':      {'range': '20-65 °C',   'data': battery_temperature},
                    'battery_performance':      {'range': '60-100 %',   'data': battery_performance},
                    'battery_torque':           {'range': '0-300 Nm',   'data': battery_torque},
                    'battery_power':            {'range': '-50-80 kW',  'data': battery_power},
                    'range_left_on_battery':    {'range': '0-100 %',    'data': range_left},
                    'idle_time':                {'range': '0-100 %',    'data': idle_time}
                }

            else:
                # ── Simple-sampling path ──────────────────────────────────────
                step         = max(1, total_records // 200)
                sampled_data = list(raw_data[::step])
                battery_temperature = []
                battery_performance = []
                battery_torque      = []
                battery_power       = []
                range_left          = []
                idle_time           = []

                for record in sampled_data:
                    ts = record.time.isoformat()
                    battery_temperature.append({'timestamp': ts, 'value': record.battery_temperature or 0})
                    battery_performance.append({'timestamp': ts, 'value': record.battery_health       or 0})
                    battery_torque.append(     {'timestamp': ts, 'value': record.motor_torque         or 0})
                    v = record.battery_pack_voltage or 0   # ✅ FIX: was record.voltage_battery
                    i = record.current_battery      or 0
                    battery_power.append(      {'timestamp': ts, 'value': round((v * i) / 1000, 2)})
                    range_left.append(         {'timestamp': ts, 'value': record.soc_battery_pack     or 0})
                    idle_time.append(          {'timestamp': ts, 'value': 100 if record.vehicle_speed == 0 else 0})

                return {
                    'time_range': time_range,
                    'sampling': {
                        'method':        'simple_sampling',
                        'step':          step,
                        'target_points': 200,
                        'actual_points': len(sampled_data)
                    },
                    'data_points':              len(sampled_data),
                    'total_records':            total_records,
                    'battery_temperature':      {'range': '20-65 °C',   'data': battery_temperature},
                    'battery_performance':      {'range': '60-100 %',   'data': battery_performance},
                    'battery_torque':           {'range': '0-300 Nm',   'data': battery_torque},
                    'battery_power':            {'range': '-50-80 kW',  'data': battery_power},
                    'range_left_on_battery':    {'range': '0-100 %',    'data': range_left},
                    'idle_time':                {'range': '0-100 %',    'data': idle_time}
                }

        except Exception as e:
            logger.error(f"Error getting BMS telemetry: {e}")
            return {}

    # ------------------------------------------------------------------
    # LOCATION HISTORY
    # ------------------------------------------------------------------
    @classmethod
    def get_location_history(cls, vin: str, time_range: str = '24h', limit: int = 100) -> Dict[str, Any]:
        try:
            delta     = cls.parse_time_range(time_range)
            since     = timezone.now() - delta
            locations = VehicleLocation.objects.filter(
                vin=vin, time__gte=since
            ).order_by('-time')[:limit]
            location_points = []
            for loc in locations:
                if loc.latitude != 0 and loc.longitude != 0:
                    location_points.append({
                        'timestamp': loc.time.isoformat(),
                        'latitude':  loc.latitude,
                        'longitude': loc.longitude,
                        'altitude':  loc.altitude,
                        'satellites': loc.satellites,
                        'speed': getattr(loc, 'speed', None),
                        'hdop':  getattr(loc, 'hdop',  None)
                    })
            current_location = None
            for loc in locations:
                if loc.latitude != 0 and loc.longitude != 0:
                    current_location = {
                        'latitude':  loc.latitude,
                        'longitude': loc.longitude,
                        'timestamp': loc.time.isoformat(),
                        'speed':     getattr(loc, 'speed', None)
                    }
                    break
            return {
                'time_range':       time_range,
                'current_location': current_location,
                'total_points':     len(location_points),
                'location_history': location_points
            }
        except Exception as e:
            logger.error(f"Error getting location history: {e}")
            return {}

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------
    @classmethod
    def get_available_time_ranges(cls) -> List[Dict[str, str]]:
        return [{'value': k, 'label': v['label']} for k, v in cls.TIME_RANGES.items()]

    @classmethod
    def get_vehicles_list(cls, user) -> List[Dict[str, Any]]:
        try:
            from core.querysets import RoleBasedQuerySet
            vehicles = VehicleInfo.objects.all()
            filtered = RoleBasedQuerySet.filter_vehicles_by_role(vehicles, user)
            vehicle_list = []
            for vehicle in filtered:
                latest_data = VehicleRawData.objects.filter(
                    vin=vehicle.vin
                ).order_by('-time').first()
                vehicle_list.append({
                    'vin':          vehicle.vin,
                    'vehicle_no':   vehicle.vehicle_no,
                    'model_name':   vehicle.model_name,
                    'variant':      vehicle.variant,
                    'current_soc':  latest_data.soc_battery_pack if latest_data else 0,
                    'is_active':    vehicle.is_active
                })
            return vehicle_list
        except Exception as e:
            logger.error(f"Error getting vehicles list: {e}")
            return []

    @staticmethod
    def _get_health_status(score: float) -> str:
        if score >= 90: return 'Excellent'
        if score >= 75: return 'Good'
        if score >= 60: return 'Fair'
        if score >= 40: return 'Poor'
        return 'Critical'


# Singleton instance
vehicle_insights_service = VehicleInsightsService()