from django.db import models
from django.utils import timezone


class VehicleState(models.Model):
    """
    Stores the current state of vehicle controls
    Updated whenever vehicle publishes status
    Syncs physical button states with app
    """
    
    vcu_id = models.CharField(max_length=50, unique=True, db_index=True)
    vin = models.CharField(max_length=17, db_index=True)
    
    # Control States (from SYS data)
    power = models.BooleanField(default=False)
    lock = models.BooleanField(default=False)
    horn = models.BooleanField(default=False)
    headlights = models.BooleanField(default=False)
    hazard = models.BooleanField(default=False)
    immobilizer = models.BooleanField(default=False)
    
    # Connection Status
    is_online = models.BooleanField(default=False)
    last_online = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Raw state data (for debugging)
    raw_state = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'vehicle_state'
        verbose_name = 'Vehicle State'
        verbose_name_plural = 'Vehicle States'
    
    def __str__(self):
        return f"{self.vcu_id} - Online: {self.is_online}"
    
    def update_state(self, state_data):
        """
        Update vehicle state from incoming data
        
        Args:
            state_data: Dict containing state information
        """
        # Update control states
        if 'power' in state_data:
            self.power = bool(state_data['power'])
        if 'lock' in state_data:
            self.lock = bool(state_data['lock'])
        if 'horn' in state_data:
            self.horn = bool(state_data['horn'])
        if 'headlights' in state_data:
            self.headlights = bool(state_data['headlights'])
        if 'hazard' in state_data:
            self.hazard = bool(state_data['hazard'])
        if 'immobilizer' in state_data:
            self.immobilizer = bool(state_data['immobilizer'])
        
        # Update connection status
        self.is_online = True
        self.last_online = timezone.now()
        
        # Store raw data
        self.raw_state = state_data
        
        self.save()
    
    def mark_offline(self):
        """Mark vehicle as offline"""
        self.is_online = False
        self.save(update_fields=['is_online'])
    
    def get_state_dict(self):
        """Return current state as dictionary"""
        return {
            'vcu_id': self.vcu_id,
            'vin': self.vin,
            'power': self.power,
            'lock': self.lock,
            'horn': self.horn,
            'headlights': self.headlights,
            'hazard': self.hazard,
            'immobilizer': self.immobilizer,
            'is_online': self.is_online,
            'last_online': self.last_online.isoformat() if self.last_online else None,
            'last_updated': self.last_updated.isoformat()
        }