from django.db import models
from django.core.exceptions import ValidationError

class VehicleSpecsTemplate(models.Model):
    """
    Template for vehicle specifications based on variant and subtype.
    This is a master template - one entry per variant/subtype combination.
    """
    # REMOVED the 'vin' field from here. Templates are linked via VehicleInfo.
    
    model = models.CharField(
        max_length=50,
        help_text='Model code (e.g., "X1")',
        default='Standard'
    )
    variant = models.CharField(
        max_length=50,
        help_text='Variant name (e.g., "Pro", "Standard", "Lite")',
        default='Standard'
    )

    # ... [Keep all your other specification fields: motor_power, top_speed, etc.] ...

    motor_power = models.IntegerField(help_text='Motor power in Watts')
    motor_type = models.CharField(max_length=50, blank=True, null=True)
    motor_torque = models.FloatField(blank=True, null=True)
    top_speed = models.IntegerField(help_text='Top speed in km/h')
    acceleration_0_to_40 = models.FloatField(blank=True, null=True)
    battery_capacity = models.IntegerField(help_text='Battery capacity in Wh')
    battery_voltage = models.FloatField(help_text='Nominal battery voltage (V)')
    battery_cells_config = models.CharField(max_length=50, blank=True, null=True)
    range_km = models.IntegerField(help_text='Maximum range in km')
    range_city = models.IntegerField(blank=True, null=True)
    range_highway = models.IntegerField(blank=True, null=True)
    charging_time_0_to_80 = models.FloatField(blank=True, null=True)
    charging_time_0_to_100 = models.FloatField(blank=True, null=True)
    fast_charging_supported = models.BooleanField(default=False)
    seating_capacity = models.IntegerField(default=2)
    weight = models.FloatField(blank=True, null=True)
    length = models.FloatField(blank=True, null=True)
    width = models.FloatField(blank=True, null=True)
    height = models.FloatField(blank=True, null=True)
    wheelbase = models.FloatField(blank=True, null=True)
    ground_clearance = models.FloatField(blank=True, null=True)
    payload_capacity = models.FloatField(blank=True, null=True)
    boot_space = models.FloatField(blank=True, null=True)
    front_brake_type = models.CharField(max_length=50, blank=True, null=True)
    rear_brake_type = models.CharField(max_length=50, blank=True, null=True)
    suspension_front = models.CharField(max_length=100, blank=True, null=True)
    suspension_rear = models.CharField(max_length=100, blank=True, null=True)
    tire_size_front = models.CharField(max_length=50, blank=True, null=True)
    tire_size_rear = models.CharField(max_length=50, blank=True, null=True)
    abs_available = models.BooleanField(default=False)
    regenerative_braking = models.BooleanField(default=True)
    reverse_mode = models.BooleanField(default=True)
    cruise_control = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Vehicle Specs Template"
        verbose_name_plural = "Vehicle Specs Templates"
        unique_together = ['model', 'variant']
        ordering = ['model', 'variant']

    def __str__(self):
        return f"{self.model} - {self.variant}"

    def clean(self):
        if self.motor_power <= 0: raise ValidationError({'motor_power': 'Must be positive'})
        if self.top_speed <= 0: raise ValidationError({'top_speed': 'Must be positive'})
        if self.battery_capacity <= 0: raise ValidationError({'battery_capacity': 'Must be positive'})
        if self.range_km <= 0: raise ValidationError({'range_km': 'Must be positive'})


class VehicleSpecs(models.Model):
    """
    Individual vehicle specifications with override capabilities.
    """
    # Unique link to VehicleInfo
    vin = models.OneToOneField(
        'VehicleInfo',
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='individual_specs', # Changed from 'specifications' to avoid clash
        help_text='Vehicle Identification Number'
    )
    
    specs_template = models.ForeignKey(
        VehicleSpecsTemplate,
        on_delete=models.PROTECT,
        related_name='template_instances', # Unique name
        null=True,
        blank=True
    )
    
    custom_motor_power = models.IntegerField(blank=True, null=True)
    custom_top_speed = models.IntegerField(blank=True, null=True)
    custom_range_km = models.IntegerField(blank=True, null=True)
    custom_battery_capacity = models.IntegerField(blank=True, null=True)
    customization_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Vehicle Specs"
        verbose_name_plural = "Vehicle Specs"

    def __str__(self):
        return f"Specs for {self.vin_id}"
    
    # Logic to get custom value if exists, else template value
    @property
    def motor_power(self):
        return self.custom_motor_power or self.specs_template.motor_power
    
    @property
    def top_speed(self):
        return self.custom_top_speed or self.specs_template.top_speed

    @property
    def range_km(self):
        return self.custom_range_km or self.specs_template.range_km

    @property
    def battery_capacity(self):
        return self.custom_battery_capacity or self.specs_template.battery_capacity

    def get_all_specs(self):
        t = self.specs_template
        return {
            'motor_power': self.motor_power,
            'top_speed': self.top_speed,
            'range_km': self.range_km,
            'battery_capacity': self.battery_capacity,
            'motor_type': t.motor_type,
            'motor_torque': t.motor_torque,
            'acceleration_0_to_40': t.acceleration_0_to_40,
            'battery_voltage': t.battery_voltage,
            'battery_cells_config': t.battery_cells_config,
            'range_city': t.range_city,
            'range_highway': t.range_highway,
            'charging_time_0_to_80': t.charging_time_0_to_80,
            'charging_time_0_to_100': t.charging_time_0_to_100,
            'fast_charging_supported': t.fast_charging_supported,
            'seating_capacity': t.seating_capacity,
            'weight': t.weight,
            'length': t.length,
            'width': t.width,
            'height': t.height,
            'wheelbase': t.wheelbase,
            'ground_clearance': t.ground_clearance,
            'payload_capacity': t.payload_capacity,
            'boot_space': t.boot_space,
            'front_brake_type': t.front_brake_type,
            'rear_brake_type': t.rear_brake_type,
            'suspension_front': t.suspension_front,
            'suspension_rear': t.suspension_rear,
            'tire_size_front': t.tire_size_front,
            'tire_size_rear': t.tire_size_rear,
            'abs_available': t.abs_available,
            'regenerative_braking': t.regenerative_braking,
            'reverse_mode': t.reverse_mode,
            'cruise_control': t.cruise_control,
        }