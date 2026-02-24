from django.db import models

# Create your models here.
class VehicleTelemetry(models.Model):
    vehicle_id = models.CharField(max_length=50)
    speed = models.FloatField()
    brake = models.BooleanField()
    motor_temp = models.FloatField()
    battery_voltage = models.FloatField()
    battery_current = models.FloatField()
    power = models.FloatField()
    timestamp = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
