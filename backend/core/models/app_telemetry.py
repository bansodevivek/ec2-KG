# core/models/app_telemetry.py
"""
New models for segregated MQTT topics
These complement the existing VehicleRawData model
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from timescale.db.models.models import TimescaleModel


class TyrePressure(TimescaleModel):
    """
    Hypertable for tyre pressure data
    Topic: kg_dash/{VCU_ID}/tyre
    """
    time = models.DateTimeField(db_column='timestamp', default=timezone.now)
    
    vcu_id = models.CharField(max_length=100, db_index=True)
    vin = models.CharField(max_length=50, db_index=True)
    
    front_pressure = models.IntegerField(default=0, help_text="Front tyre pressure in PSI")
    rear_pressure = models.IntegerField(default=0, help_text="Rear tyre pressure in PSI")
    
    device_timestamp = models.BigIntegerField(default=0)
    
    class Meta:
        verbose_name = "Tyre Pressure"
        verbose_name_plural = "Tyre Pressures"
        ordering = ['-time']
        indexes = [
            models.Index(fields=['vcu_id', '-time']),
            models.Index(fields=['vin', '-time']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - Front: {self.front_pressure}, Rear: {self.rear_pressure}"


class VehicleLocation(TimescaleModel):
    """
    Hypertable for GPS location data
    Topic: kg_dash/{VCU_ID}/location
    """
    time = models.DateTimeField(db_column='timestamp', default=timezone.now)
    
    vcu_id = models.CharField(max_length=100, db_index=True)
    vin = models.CharField(max_length=50, db_index=True)
    
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    altitude = models.FloatField(default=0.0, help_text="Altitude in meters")
    speed = models.FloatField(default=0.0, help_text="GPS speed in km/h")
    satellites = models.IntegerField(default=0, help_text="Number of satellites")
    hdop = models.FloatField(default=0.0, help_text="Horizontal dilution of precision")
    
    device_timestamp = models.BigIntegerField(default=0)
    
    class Meta:
        verbose_name = "Vehicle Location"
        verbose_name_plural = "Vehicle Locations"
        ordering = ['-time']
        indexes = [
            models.Index(fields=['vcu_id', '-time']),
            models.Index(fields=['vin', '-time']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - ({self.latitude}, {self.longitude})"


class VehicleStatus(TimescaleModel):
    """
    Hypertable for vehicle status/heartbeat
    Topic: kg_dash/{VCU_ID}/status
    """
    time = models.DateTimeField(db_column='timestamp', default=timezone.now)
    
    vcu_id = models.CharField(max_length=100, db_index=True)
    vin = models.CharField(max_length=50, db_index=True)
    
    online = models.BooleanField(default=False)
    firmware_version = models.CharField(max_length=20, default="")
    rssi = models.IntegerField(default=0, help_text="WiFi signal strength in dBm")
    uptime = models.BigIntegerField(default=0, help_text="Uptime in seconds")
    heap_free = models.IntegerField(default=0, help_text="Free heap in bytes")
    packets_received = models.IntegerField(default=0)
    packets_published = models.IntegerField(default=0)
    reconnect_count = models.IntegerField(default=0)
    
    device_timestamp = models.BigIntegerField(default=0)
    
    class Meta:
        verbose_name = "Vehicle Status"
        verbose_name_plural = "Vehicle Statuses"
        ordering = ['-time']
        indexes = [
            models.Index(fields=['vcu_id', '-time']),
            models.Index(fields=['vin', '-time']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - Online: {self.online}"


class Alert(models.Model):
    """
    Alert model for server-side alert management
    """
    SEVERITY_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ]
    
    vcu_id = models.CharField(max_length=100, db_index=True)
    vin = models.CharField(max_length=50, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, 
                            related_name='vehicle_alerts')
    
    alert_type = models.CharField(max_length=50, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='WARNING')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Alert metadata
    data = models.JSONField(null=True, blank=True, help_text="Additional alert data")
    
    class Meta:
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vcu_id', 'status', '-created_at']),
            models.Index(fields=['vin', 'status', '-created_at']),
            models.Index(fields=['severity', 'status']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - {self.alert_type} ({self.severity})"
    
    def acknowledge(self):
        """Mark alert as acknowledged"""
        self.status = 'ACKNOWLEDGED'
        self.acknowledged_at = timezone.now()
        self.save()
    
    def resolve(self):
        """Mark alert as resolved"""
        self.status = 'RESOLVED'
        self.resolved_at = timezone.now()
        self.save()


class Trip(models.Model):
    """
    Trip model for server-side trip detection and tracking
    """
    vcu_id = models.CharField(max_length=100, db_index=True)
    vin = models.CharField(max_length=50, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,
                            related_name='vehicle_trips')
    
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # Trip metrics
    distance_km = models.FloatField(default=0.0)
    start_odometer = models.FloatField(default=0.0)
    end_odometer = models.FloatField(default=0.0)
    
    start_soc = models.FloatField(default=0.0)
    end_soc = models.FloatField(default=0.0)
    energy_consumed_wh = models.FloatField(default=0.0)
    
    max_speed_kmh = models.IntegerField(default=0)
    avg_speed_kmh = models.FloatField(default=0.0)
    
    # Location data
    start_latitude = models.FloatField(null=True, blank=True)
    start_longitude = models.FloatField(null=True, blank=True)
    end_latitude = models.FloatField(null=True, blank=True)
    end_longitude = models.FloatField(null=True, blank=True)
    
    # Computed metrics
    eco_score = models.IntegerField(default=0, help_text="0-100 driving efficiency score")
    co2_saved_kg = models.FloatField(default=0.0)
    efficiency_wh_km = models.FloatField(default=0.0)
    
    # Trip route (array of lat/lng points)
    route = models.JSONField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Trip"
        verbose_name_plural = "Trips"
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['vcu_id', '-start_time']),
            models.Index(fields=['vin', '-start_time']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - Trip {self.id} ({self.start_time})"
    
    def end_trip(self, end_data):
        """End the trip with final data"""
        self.end_time = timezone.now()
        self.is_active = False
        
        # Calculate duration
        if self.start_time and self.end_time:
            self.duration_seconds = int((self.end_time - self.start_time).total_seconds())
        
        # Update with end data
        self.end_odometer = end_data.get('odometer', self.start_odometer)
        self.end_soc = end_data.get('soc', self.start_soc)
        self.end_latitude = end_data.get('latitude')
        self.end_longitude = end_data.get('longitude')
        
        # Calculate distance
        self.distance_km = self.end_odometer - self.start_odometer
        
        # Calculate energy consumed
        soc_used = self.start_soc - self.end_soc
        battery_capacity_wh = 3000  # TODO: Get from vehicle specs
        self.energy_consumed_wh = (soc_used / 100.0) * battery_capacity_wh
        
        # Calculate efficiency
        if self.distance_km > 0:
            self.efficiency_wh_km = self.energy_consumed_wh / self.distance_km
        
        # Calculate CO2 saved (compared to petrol scooter)
        self.co2_saved_kg = self.distance_km * 0.12
        
        # Calculate average speed
        if self.duration_seconds > 0:
            self.avg_speed_kmh = (self.distance_km / self.duration_seconds) * 3600
        
        self.save()