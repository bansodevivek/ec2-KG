# core/Services/trip_service.py
"""
Trip Service - Server-side trip detection and management
Automatically detects trip start/end based on telemetry data
"""

import logging
from typing import Optional, Dict, Any
from django.utils import timezone
from core.models.app_telemetry import Trip

logger = logging.getLogger(__name__)


class TripService:
    """
    Server-side trip detection and tracking
    Automatically starts/ends trips based on vehicle speed
    """
    
    # Trip detection thresholds
    TRIP_START_SPEED_THRESHOLD = 5  # km/h - speed above which trip starts
    TRIP_END_IDLE_SECONDS = 200  # 3 minutes 20 seconds - idle time before trip ends
    MIN_TRIP_DISTANCE = 0.1  # km - minimum distance to count as trip
    
    # Active trips tracking
    _active_trips = {}  # {vcu_id: trip_id}
    _last_movement = {}  # {vcu_id: timestamp}
    
    @classmethod
    def process_telemetry(cls, vcu_id: str, vin: str, data: dict, user=None) -> Optional[Trip]:
        """
        Process telemetry and manage trip lifecycle
        
        Args:
            vcu_id: Vehicle Control Unit ID
            vin: Vehicle Identification Number
            data: Telemetry data with MD, BMS sections
            user: User object (optional)
        
        Returns:
            Trip object if trip state changed, None otherwise
        """
        md = data.get('MD', {})
        bms = data.get('BMS', {})
        
        speed = cls._safe_int(md.get('VS', 0))
        odometer = cls._safe_float(md.get('OD', 0.0))
        soc = cls._safe_float(bms.get('SOC', 0.0))
        
        # Check if vehicle is moving
        is_moving = speed >= cls.TRIP_START_SPEED_THRESHOLD
        
        # Get or create active trip
        trip_id = cls._active_trips.get(vcu_id)
        
        if trip_id:
            # Trip is active
            try:
                trip = Trip.objects.get(id=trip_id, is_active=True)
                
                if is_moving:
                    # Vehicle is moving - update trip
                    cls._last_movement[vcu_id] = timezone.now()
                    cls._update_trip(trip, data)
                else:
                    # Vehicle stopped - check if trip should end
                    last_move = cls._last_movement.get(vcu_id)
                    if last_move:
                        idle_seconds = (timezone.now() - last_move).total_seconds()
                        if idle_seconds >= cls.TRIP_END_IDLE_SECONDS:
                            # End the trip
                            cls._end_trip(trip, data)
                            del cls._active_trips[vcu_id]
                            del cls._last_movement[vcu_id]
                            logger.info(f"Trip ended for {vcu_id} after {idle_seconds}s idle")
                            return trip
                
            except Trip.DoesNotExist:
                # Trip was deleted - clean up
                del cls._active_trips[vcu_id]
                if vcu_id in cls._last_movement:
                    del cls._last_movement[vcu_id]
        
        else:
            # No active trip
            if is_moving:
                # Start new trip
                trip = cls._start_trip(vcu_id, vin, data, user)
                cls._active_trips[vcu_id] = trip.id
                cls._last_movement[vcu_id] = timezone.now()
                logger.info(f"Trip started for {vcu_id}")
                return trip
        
        return None
    
    @classmethod
    def _start_trip(cls, vcu_id: str, vin: str, data: dict, user=None) -> Trip:
        """
        Start a new trip
        """
        md = data.get('MD', {})
        bms = data.get('BMS', {})
        
        # Extract location if available (from separate location topic)
        lat = cls._safe_float(data.get('latitude'))
        lng = cls._safe_float(data.get('longitude'))
        
        trip = Trip.objects.create(
            vcu_id=vcu_id,
            vin=vin,
            user=user,
            start_time=timezone.now(),
            start_odometer=cls._safe_float(md.get('OD', 0.0)),
            start_soc=cls._safe_float(bms.get('SOC', 0.0)),
            start_latitude=lat if lat != 0 else None,
            start_longitude=lng if lng != 0 else None,
            max_speed_kmh=cls._safe_int(md.get('VS', 0)),
            is_active=True,
            route=[]  # Initialize empty route
        )
        
        return trip
    
    @classmethod
    def _update_trip(cls, trip: Trip, data: dict):
        """
        Update ongoing trip with latest data
        """
        md = data.get('MD', {})
        bms = data.get('BMS', {})
        
        speed = cls._safe_int(md.get('VS', 0))
        
        # Update max speed
        if speed > trip.max_speed_kmh:
            trip.max_speed_kmh = speed
        
        # Update current odometer
        current_odometer = cls._safe_float(md.get('OD', trip.start_odometer))
        trip.distance_km = current_odometer - trip.start_odometer
        
        # Add location point to route if available
        lat = cls._safe_float(data.get('latitude'))
        lng = cls._safe_float(data.get('longitude'))
        if lat != 0 and lng != 0:
            if trip.route is None:
                trip.route = []
            trip.route.append({
                'lat': lat,
                'lng': lng,
                'timestamp': timezone.now().isoformat()
            })
        
        trip.save()
    
    @classmethod
    def _end_trip(cls, trip: Trip, data: dict):
        """
        End the trip with final calculations
        """
        md = data.get('MD', {})
        bms = data.get('BMS', {})
        
        end_data = {
            'odometer': cls._safe_float(md.get('OD', trip.start_odometer)),
            'soc': cls._safe_float(bms.get('SOC', trip.start_soc)),
            'latitude': cls._safe_float(data.get('latitude')),
            'longitude': cls._safe_float(data.get('longitude'))
        }
        
        trip.end_trip(end_data)
        
        # Calculate eco score based on efficiency
        trip.eco_score = cls._calculate_eco_score(trip)
        trip.save()
    
    @classmethod
    def _calculate_eco_score(cls, trip: Trip) -> int:
        """
        Calculate eco score (0-100) based on driving efficiency
        
        Factors:
        - Energy efficiency (Wh/km)
        - Speed consistency
        - Regenerative braking usage
        """
        score = 100
        
        # Penalize high energy consumption
        if trip.efficiency_wh_km > 0:
            # Ideal efficiency: 20 Wh/km
            # Score decreases if efficiency is worse
            efficiency_penalty = max(0, (trip.efficiency_wh_km - 20) * 2)
            score -= min(40, efficiency_penalty)
        
        # Penalize excessive speed
        if trip.max_speed_kmh > 60:
            speed_penalty = (trip.max_speed_kmh - 60) * 0.5
            score -= min(30, speed_penalty)
        
        # Bonus for longer trips (promotes efficient usage)
        if trip.distance_km > 10:
            score += min(10, trip.distance_km * 0.5)
        
        return max(0, min(100, int(score)))
    
    @classmethod
    def get_active_trip(cls, vcu_id: str) -> Optional[Trip]:
        """
        Get active trip for a vehicle
        """
        trip_id = cls._active_trips.get(vcu_id)
        if trip_id:
            try:
                return Trip.objects.get(id=trip_id, is_active=True)
            except Trip.DoesNotExist:
                del cls._active_trips[vcu_id]
                return None
        return None
    
    @classmethod
    def get_trip_history(cls, vcu_id: str = None, vin: str = None, user=None, limit: int = 20):
        """
        Get trip history for a vehicle or user
        """
        filters = {'is_active': False}
        
        if vcu_id:
            filters['vcu_id'] = vcu_id
        if vin:
            filters['vin'] = vin
        if user:
            filters['user'] = user
        
        return list(Trip.objects.filter(**filters).order_by('-start_time')[:limit])
    
    @classmethod
    def force_end_trip(cls, vcu_id: str):
        """
        Manually end an active trip
        """
        trip = cls.get_active_trip(vcu_id)
        if trip:
            # Get latest data - use current values as end data
            end_data = {
                'odometer': trip.start_odometer + trip.distance_km,
                'soc': trip.start_soc,
                'latitude': trip.start_latitude,
                'longitude': trip.start_longitude
            }
            trip.end_trip(end_data)
            trip.eco_score = cls._calculate_eco_score(trip)
            trip.save()
            
            del cls._active_trips[vcu_id]
            if vcu_id in cls._last_movement:
                del cls._last_movement[vcu_id]
            
            logger.info(f"Manually ended trip for {vcu_id}")
    
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
trip_service = TripService()