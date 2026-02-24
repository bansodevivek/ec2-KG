# core/models/VehicleInfo.py

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class VehicleInfo(models.Model):
    """
    Main vehicle information model
    Contains all static vehicle data and identifiers
    """
    
    # ==========================================
    # PRIMARY IDENTIFIERS
    # ==========================================
    vin = models.CharField(
        max_length=50, 
        unique=True, 
        primary_key=True,
        help_text='Vehicle Identification Number'
    )
    vehicle_no = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        unique=True,
        help_text='License plate number (e.g., MH12AB1234)'
    )
    
    # ==========================================
    # COMPONENT SERIAL NUMBERS
    # ==========================================
    # core/models/VehicleInfo.py

    battery_serial_number = models.CharField(
        max_length=100,
        unique=True,
        null=True,   # Add this
        blank=True,  # Add this
        help_text='Battery pack serial number'
    )
    vcu_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,   # Add this
        blank=True,  # Add this
        help_text='Vehicle Control Unit ID'
    )
    cluster_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,   # Add this
        blank=True,  # Add this
        help_text='Instrument cluster ID'
    )
    
    controller_serial_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Motor controller serial number'
    )
    charger_serial_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Charger serial number'
    )
    
    # ==========================================
    # VEHICLE SPECIFICATIONS
    # ==========================================
    model_name = models.CharField(
        max_length=100,
        help_text='Full model name (e.g., "Electric Scooter X1")'
    )
    make = models.CharField(
        max_length=100,
        help_text='Manufacturer name (e.g., "EVCompany")'
    )
    model = models.CharField(
        max_length=50,
        help_text='Model code (e.g., "X1")'
    )
    variant = models.CharField(
        max_length=50,
        help_text='Variant name (e.g., "Pro", "Standard", "Lite")'
    )
    
    colour = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Vehicle color'
    )
    
    # ==========================================
    # BATTERY & CHARGING
    # ==========================================
    battery_type = models.CharField(
        max_length=50,
        help_text='Battery chemistry (e.g., "Lithium Ion", "LFP")'
    )
    charger_type = models.CharField(
        max_length=50,
        help_text='Charger type (e.g., "Type-C", "Type-2")'
    )

    specs_template = models.ForeignKey(
        'VehicleSpecsTemplate', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='vehicles_info', # Unique
        help_text='Master template for this vehicle'
    )
    
    # ==========================================
    # MANUFACTURING & DATES
    # ==========================================
    manufacturing_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date of manufacture'
    )
    warranty_expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text='Warranty expiration date'
    )
    
    # ==========================================
    # SERVICE INFORMATION
    # ==========================================
    service_due_date = models.DateField(
        null=True, 
        blank=True,
        help_text='Next service due date'
    )
    service_due_distance = models.IntegerField(
        default=0,
        help_text='Next service due at distance (km)'
    )
    last_service_date = models.DateField(
        null=True,
        blank=True,
        help_text='Last service date'
    )
    last_service_distance = models.IntegerField(
        default=0,
        help_text='Odometer reading at last service (km)'
    )
    
    # ==========================================
    # STATUS FLAGS
    # ==========================================
    is_active = models.BooleanField(
        default=True,
        help_text='Is vehicle active in system'
    )
    is_sold = models.BooleanField(
        default=False,
        help_text='Has vehicle been sold to end customer'
    )
    is_registered = models.BooleanField(
        default=False,
        help_text='Is vehicle registered with RTO'
    )
    
    # ==========================================
    # ADDITIONAL INFO
    # ==========================================
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes or comments'
    )
    
    # ==========================================
    # TIMESTAMPS
    # ==========================================
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text='Record creation timestamp'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Record last updated timestamp'
    )
    
    # ==========================================
    # METADATA
    # ==========================================
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles_created',
        help_text='User who created this vehicle record'
    )

    class Meta:
        verbose_name = "Vehicle Info"
        verbose_name_plural = "Vehicle Info"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vin']),
            models.Index(fields=['vehicle_no']),
            models.Index(fields=['model', 'variant']),
            models.Index(fields=['battery_serial_number']),
            models.Index(fields=['vcu_id']),
        ]

    def __str__(self):
        if self.vehicle_no:
            return f"{self.vehicle_no} - {self.model_name} ({self.vin})"
        return f"{self.vin} - {self.model_name}"
    
    def clean(self):
        """Validate model data"""
        super().clean()
        
        # Ensure VIN is uppercase
        if self.vin:
            self.vin = self.vin.upper()
        
        # Ensure vehicle_no is uppercase if provided
        if self.vehicle_no:
            self.vehicle_no = self.vehicle_no.upper()
    
    def save(self, *args, **kwargs):
        """Override save to call clean"""
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def full_name(self):
        """Get full vehicle name with variant"""
        return f"{self.model_name} {self.variant}"
    
    @property
    def is_service_due(self):
        """Check if service is due"""
        from datetime import date
        
        if self.service_due_date and self.service_due_date <= date.today():
            return True
        return False
    
    @property
    def service_status(self):
        """Get service status"""
        if not self.service_due_date:
            return "Not scheduled"
        
        from datetime import date, timedelta
        today = date.today()
        
        if self.service_due_date <= today:
            return "Overdue"
        elif self.service_due_date <= today + timedelta(days=7):
            return "Due soon"
        else:
            return "Up to date"