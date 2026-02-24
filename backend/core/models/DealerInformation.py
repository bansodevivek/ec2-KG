from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class DealerInformation(models.Model):
    """
    Stores dealer details. Fields like Partner's Name, Contact Person Name,
    Mobile No., and Email are linked to the auth_user table.
    """
    # Linked to auth_user table (2nd screenshot)
    # Using OneToOneField assuming one User record represents one dealer
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='dealer_profile',
        help_text="Link to the authentication user table"
    )
    
    # Other fields from the yellow screenshot
    reference_no = models.CharField(max_length=50, unique=True, verbose_name="Reference No.")
    dealer_code = models.CharField(max_length=50, unique=True, verbose_name="Dealer Code")
    dealership_name = models.CharField(max_length=255, verbose_name="Dealership Name")
    for_party_creation = models.CharField(max_length=255, verbose_name="FOR PARTY CREATION")
    dealer_address = models.TextField(verbose_name="Dealer's Address")
    state = models.CharField(max_length=100, verbose_name="State")
    zone = models.CharField(max_length=100, verbose_name="Zone")
    location = models.CharField(max_length=100, verbose_name="Location")
    pin_code = models.CharField(max_length=10, verbose_name="Pin Code")
    gst_no = models.CharField(max_length=15, verbose_name="GST No.")
    loi_date = models.DateField(null=True, blank=True, verbose_name="LOI Date")
    loi_valid_upto = models.DateField(null=True, blank=True, verbose_name="LOI Valid Upto")
    lead_status = models.CharField(max_length=100, verbose_name="Lead status Digital/Newspaper/scouting")
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dealer Information"
        verbose_name_plural = "Dealer Information"

    def __str__(self):
        return f"{self.dealership_name} ({self.dealer_code})"

    # --- HELPER PROPERTIES ---
    # These automatically pull data from the linked user table
    
    @property
    def partner_name(self):
        """Returns First Name + Last Name from auth_user"""
        return f"{self.user.first_name} {self.user.last_name}".strip()

    @property
    def contact_person_name(self):
        """Usually same as partner name, or use username"""
        return self.user.username

    @property
    def mobile_no(self):
        """Fetches phone from RoleUser profile if exists"""
        if hasattr(self.user, 'role_profile'):
            return self.user.role_profile.phone
        return "N/A"

    @property
    def email_id(self):
        """Returns email from auth_user"""
        return self.user.email