from django.contrib.auth.models import AbstractUser
from django.db import models

from .VehicleInfo import Vehicle

class Fault(models.Model):
    vehicle = models.ForeignKey(Vehicle)
    code = models.CharField()
    severity = models.CharField()
    timestamp = models.DateTimeField()
