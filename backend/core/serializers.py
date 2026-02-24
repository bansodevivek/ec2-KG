# core/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from core.models.rolesUser import RoleUser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

# Import the new Fleet model
from core.models.fleet import Fleet 


# ========================================
# EXISTING SERIALIZERS
# ========================================

class SignupSerializer(serializers.ModelSerializer):
    """Existing signup serializer - DO NOT MODIFY"""
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=RoleUser.ROLE_CHOICES, default='USER')
    phone = serializers.CharField(required=False, allow_blank=True)
    vehicle_no = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'vehicle_no']

    def create(self, validated_data):
        role = validated_data.pop('role', 'USER')
        phone = validated_data.pop('phone', None)
        vehicle_no = validated_data.pop('vehicle_no', None)
        
        user = User.objects.create_user(**validated_data)
        
        RoleUser.objects.create(
            user=user,
            role=role,
            phone=phone,
            vehicle_no=vehicle_no
        )
        
        return user


# ========================================
# RBAC SERIALIZERS
# ========================================

class RoleUserSerializer(serializers.ModelSerializer):
    """Serializer for RoleUser profile - UPDATED with SALES fields"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = RoleUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'phone', 'vehicle_no',
            'sales_region', 'sales_target', 
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users via RBAC - UPDATED with SALES support"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=RoleUser.ROLE_CHOICES, required=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=15)
    vehicle_no = serializers.CharField(required=False, allow_blank=True, max_length=20)
    
    # SALES-specific fields
    sales_region = serializers.CharField(required=False, allow_blank=True, max_length=100)
    sales_target = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, allow_null=True)
    
    # For dealer registration with vehicle details
    aadhar_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    address = serializers.CharField(required=False, allow_blank=True)
    vin = serializers.CharField(required=False, allow_blank=True, max_length=50)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone', 'vehicle_no',
            'sales_region', 'sales_target', 
            'aadhar_number', 'address', 'vin'
        ]
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate(self, data):
        # Check password match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        
        # Validate password strength
        try:
            validate_password(data['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        
        # Validate role-specific requirements
        role = data.get('role')
        
        # SALES role requirements
        if role == 'SALES':
            if not data.get('sales_region'):
                raise serializers.ValidationError({
                    "sales_region": "Sales region is required for SALES role"
                })
        
        # End users (USER role) must have vehicle_no when purchased from dealer
        if role == 'USER' and data.get('vin'):
            if not data.get('vehicle_no'):
                raise serializers.ValidationError({
                    "vehicle_no": "Vehicle number is required for end users"
                })
            if not data.get('aadhar_number'):
                raise serializers.ValidationError({
                    "aadhar_number": "Aadhar number is required for end users"
                })
            if not data.get('address'):
                raise serializers.ValidationError({
                    "address": "Address is required for end users"
                })
        
        return data
    
    def create(self, validated_data):
        # Remove non-User fields
        password_confirm = validated_data.pop('password_confirm')
        role = validated_data.pop('role')
        phone = validated_data.pop('phone', None)
        vehicle_no = validated_data.pop('vehicle_no', None)
        sales_region = validated_data.pop('sales_region', None)
        sales_target = validated_data.pop('sales_target', None)
        aadhar_number = validated_data.pop('aadhar_number', None)
        address = validated_data.pop('address', None)
        vin = validated_data.pop('vin', None)
        
        # Create User
        user = User.objects.create_user(**validated_data)
        
        # Create RoleUser profile
        role_user = RoleUser.objects.create(
            user=user,
            role=role,
            phone=phone,
            vehicle_no=vehicle_no,
            sales_region=sales_region, 
            sales_target=sales_target 
        )
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (no role/vehicle changes)"""
    phone = serializers.CharField(required=False, allow_blank=True, max_length=15)
    sales_region = serializers.CharField(required=False, allow_blank=True, max_length=100) 
    sales_target = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, allow_null=True) 
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 
            'phone', 'sales_region', 'sales_target', 
            'password', 'password_confirm'
        ]
    
    def validate_email(self, value):
        if value:
            # Check if email is already used by another user
            user = self.instance
            if User.objects.filter(email=value).exclude(id=user.id).exists():
                raise serializers.ValidationError("Email already exists")
        return value
    
    def validate(self, data):
        # If password is being changed, validate it
        if 'password' in data:
            if 'password_confirm' not in data:
                raise serializers.ValidationError({
                    "password_confirm": "Password confirmation is required"
                })
            
            if data['password'] != data['password_confirm']:
                raise serializers.ValidationError({
                    "password": "Passwords don't match"
                })
            
            try:
                validate_password(data['password'])
            except ValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})
        
        return data
    
    def update(self, instance, validated_data):
        # Remove password fields for separate handling
        password = validated_data.pop('password', None)
        password_confirm = validated_data.pop('password_confirm', None)
        phone = validated_data.pop('phone', None)
        sales_region = validated_data.pop('sales_region', None) 
        sales_target = validated_data.pop('sales_target', None) 
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        
        # Update phone and SALES fields in RoleUser
        role_profile = instance.role_profile
        if phone is not None:
            role_profile.phone = phone
        if sales_region is not None:
            role_profile.sales_region = sales_region
        if sales_target is not None:
            role_profile.sales_target = sales_target
        
        role_profile.save()
        
        return instance


class VehicleAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning vehicles to users"""
    user_id = serializers.IntegerField(required=True)
    vin = serializers.CharField(required=True, max_length=50)
    assignment_type = serializers.ChoiceField(
        choices=['owner', 'fleet', 'service', 'dealer'],
        required=True
    )
    
    # Optional fields based on assignment type
    fleet_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    service_type = serializers.CharField(required=False, allow_blank=True, max_length=50)
    dealer_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    purchased_date = serializers.DateField(required=False, allow_null=True)


class DealerVehicleSaleSerializer(serializers.Serializer):
    """Serializer for dealer selling vehicle to customer"""
    # Customer details
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=True, max_length=15)
    aadhar_number = serializers.CharField(required=True, max_length=20)
    address = serializers.CharField(required=True)
    
    # Vehicle details
    vin = serializers.CharField(required=True, max_length=50)
    vehicle_no = serializers.CharField(required=True, max_length=20)  # e.g., MH12AB1234
    purchased_date = serializers.DateField(required=False, allow_null=True)
    
    # User credentials
    username = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate_vehicle_no(self, value):
        # Basic validation for Indian vehicle number format
        # Format: AA00AA0000 or AA00A0000
        import re
        pattern = r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$'
        if not re.match(pattern, value.upper()):
            raise serializers.ValidationError(
                "Invalid vehicle number format. Expected format: MH12AB1234"
            )
        return value.upper()
    
    def validate(self, data):
        # Validate passwords match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                "password": "Passwords don't match"
            })
        
        # Validate password strength
        try:
            validate_password(data['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        
        return data


# ========================================
# NEW SERIALIZERS FOR SALES ROLE
# ========================================

class SalesReportSerializer(serializers.Serializer):
    """
    Serializer for sales reports and analytics
    NEW: For SALES role dashboard
    """
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    dealer_id = serializers.IntegerField(required=False, allow_null=True)
    region = serializers.CharField(required=False, allow_blank=True, max_length=100)
    report_type = serializers.ChoiceField(
        choices=['sales', 'inventory', 'dealer_performance', 'regional'],
        default='sales'
    )


class DealerInventorySerializer(serializers.Serializer):
    """
    Serializer for dealer inventory management
    NEW: For SALES role to track dealer inventory
    """
    dealer_id = serializers.IntegerField(required=True)
    show_sold = serializers.BooleanField(default=False)
    show_available = serializers.BooleanField(default=True)

# ========================================
# NEW SERIALIZERS FOR FLEET ROLE
# ========================================

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user data for dropdowns and lists"""
    role = serializers.CharField(source='role_profile.role', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']


class FleetSerializer(serializers.ModelSerializer):
    """
    Serializer for Fleet model - Read operations
    Displays complete fleet information including manager and members
    """
    manager_id = serializers.IntegerField(source='manager.id', read_only=True)
    manager_username = serializers.CharField(source='manager.username', read_only=True)
    manager_email = serializers.CharField(source='manager.email', read_only=True)
    manager_phone = serializers.CharField(source='manager.role_profile.phone', read_only=True)
    
    members = UserMinimalSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Fleet
        fields = [
            'id',
            'name',
            'description',
            'manager_id',
            'manager_username',
            'manager_email',
            'manager_phone',
            'members',
            'member_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        """Get total number of members in fleet"""
        return obj.members.count()


class FleetCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new fleet with automatic manager user creation.
    Used by SUPERADMIN, OEM, or RANDD roles only.
    """
    
    # Fleet Manager User Details
    username = serializers.CharField(
        required=True,
        max_length=150,
        help_text="Username for the fleet manager"
    )
    email = serializers.EmailField(
        required=True,
        help_text="Email for the fleet manager"
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        help_text="Password for the fleet manager"
    )
    first_name = serializers.CharField(
        required=True,
        max_length=150,
        help_text="First name of the fleet manager"
    )
    last_name = serializers.CharField(
        required=True,
        max_length=150,
        help_text="Last name of the fleet manager"
    )
    phone = serializers.CharField(
        required=True,
        max_length=15,
        help_text="Phone number of the fleet manager"
    )
    
    # Fleet Details
    fleet_name = serializers.CharField(
        required=True,
        max_length=100,
        help_text="Name of the fleet"
    )
    fleet_description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Description of the fleet (optional)"
    )
    
    def validate_username(self, value):
        """Validate username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(f"Username '{value}' already exists")
        return value.strip()
    
    def validate_email(self, value):
        """Validate email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(f"Email '{value}' already exists")
        return value.strip()
    
    def validate_fleet_name(self, value):
        """Validate fleet name is unique"""
        if Fleet.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Fleet name '{value}' already exists")
        return value.strip()
    
    def validate_password(self, value):
        """Validate password strength"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate_phone(self, value):
        """Basic phone number validation"""
        # Remove spaces and dashes
        cleaned = value.replace(' ', '').replace('-', '')
        if not cleaned.isdigit() or len(cleaned) < 10:
            raise serializers.ValidationError(
                "Phone number must contain at least 10 digits"
            )
        return value.strip()


class FleetUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating fleet information.
    Only name and description can be updated.
    """
    name = serializers.CharField(
        required=False,
        max_length=100,
        help_text="New name for the fleet"
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="New description for the fleet"
    )


class FleetMemberSerializer(serializers.Serializer):
    """
    Serializer for adding/removing members from fleet
    """
    fleet_id = serializers.IntegerField(
        required=True,
        help_text="ID of the fleet"
    )
    member_id = serializers.IntegerField(
        required=True,
        help_text="ID of the user to add/remove as member"
    )


class FleetVehicleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for assigning vehicles to fleet inventory
    (SUPERADMIN/OEM/RANDD only)
    """
    fleet_id = serializers.IntegerField(
        required=True,
        help_text="ID of the fleet"
    )
    vin = serializers.CharField(
        required=True,
        max_length=50,
        help_text="Vehicle Identification Number"
    )


class FleetMemberVehicleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for fleet manager assigning vehicle to member
    """
    member_id = serializers.IntegerField(
        required=True,
        help_text="ID of the fleet member"
    )
    vin = serializers.CharField(
        required=True,
        max_length=50,
        help_text="Vehicle Identification Number from fleet inventory"
    )