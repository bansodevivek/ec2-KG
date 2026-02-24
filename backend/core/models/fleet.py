from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Fleet(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # The user with RoleUser.role == 'FLEET' who manages this fleet
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='managed_fleets')
    
    # Members assigned to this fleet (users with specific roles)
    members = models.ManyToManyField(User, related_name='assigned_fleets', blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name