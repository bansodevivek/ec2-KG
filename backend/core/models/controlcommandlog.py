from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ControlCommandLog(models.Model):
    """
    Log of all control commands sent to vehicles
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('timeout', 'Timeout'),
    ]
    
    vcu_id = models.CharField(max_length=50, db_index=True)
    command = models.CharField(max_length=50)
    payload = models.JSONField()
    user = models.ForeignKey(
        User, 
        null=True,  # ✅ Fixed: was on_null=True
        blank=True, 
        on_delete=models.SET_NULL
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(null=True, blank=True)
    
    response = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    response_received_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'control_command_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vcu_id', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.vcu_id} - {self.command} [{self.status}]"