# core/models/rolesUser.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# ========================================
# UPDATED MODEL - Added SALES role
# ========================================
class RoleUser(models.Model):
    ROLE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('OEM', 'OEM / Plant User'),
        ('SALES', 'Sales Manager'),  # NEW ROLE - Subset of OEM
        ('RND', 'R&D User'),
        ('DEALER', 'Dealer'),
        ('SERVICE', 'Service Engineer'),
        ('FLEET', 'Fleet Manager'),
        ('USER', 'End User'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='role_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER')
    phone = models.CharField(max_length=15, blank=True, null=True)
    vehicle_no = models.CharField(max_length=20, blank=True, null=True)
    
    # Sales-specific fields (optional)
    sales_region = models.CharField(max_length=100, blank=True, null=True)  # For SALES role
    sales_target = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # For SALES role
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "User Role"
        verbose_name_plural = "User Roles"

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


# ========================================
# EXISTING MODELS - No changes needed
# ========================================

class VehicleOwnership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_vehicles')
    vin = models.CharField(max_length=50)
    purchased_date = models.DateField(null=True, blank=True)
    is_primary = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('user', 'vin')
        verbose_name = "Vehicle Ownership"
        verbose_name_plural = "Vehicle Ownerships"
    
    def __str__(self):
        return f"{self.user.username} owns {self.vin}"


class FleetVehicle(models.Model):
    fleet_manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fleet_vehicles')
    vin = models.CharField(max_length=50)
    fleet_name = models.CharField(max_length=100)
    assigned_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('fleet_manager', 'vin')
        verbose_name = "Fleet Vehicle"
        verbose_name_plural = "Fleet Vehicles"
    
    def __str__(self):
        return f"{self.fleet_name} - {self.vin}"


class ServiceAssignment(models.Model):
    engineer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='service_assignments')
    vin = models.CharField(max_length=50)
    assigned_date = models.DateField(default=timezone.now)
    service_type = models.CharField(max_length=50, blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "Service Assignment"
        verbose_name_plural = "Service Assignments"
    
    def __str__(self):
        return f"{self.engineer.username} servicing {self.vin}"


class DealerVehicle(models.Model):
    dealer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dealer_vehicles')
    vin = models.CharField(max_length=50)
    dealer_name = models.CharField(max_length=100)
    assigned_date = models.DateField(default=timezone.now)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='assigned_dealer_vehicles')  # Track who assigned (OEM/SALES)
    is_sold = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('dealer', 'vin')
        verbose_name = "Dealer Vehicle"
        verbose_name_plural = "Dealer Vehicles"
    
    def __str__(self):
        return f"{self.dealer_name} - {self.vin}"


