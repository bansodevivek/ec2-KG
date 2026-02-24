# core/permissions.py

from rest_framework import permissions
from functools import wraps
from django.http import JsonResponse

class RolePermission(permissions.BasePermission):
    """
    Custom permission class for role-based access control
    UPDATED: Added SALES role with limited OEM permissions
    """
    
    # Define what each role can access
    ROLE_PERMISSIONS = {
        'SUPER_ADMIN': {
            'vehicle_info': ['view', 'create', 'update', 'delete'],
            'vehicle_raw_data': ['view', 'create', 'update', 'delete'],
            'vehicle_specs': ['view', 'create', 'update', 'delete'],
            'vehicle_control': ['view', 'execute'],
            'user_management': ['view', 'create', 'update', 'delete'],
            'system_config': ['view', 'update'],
            'dealer_management': ['view', 'create', 'update', 'assign'],
            'all_vehicles': True,
            'can_data': 'full',
            'historical_data': 'full',
        },
        'OEM': {
            'vehicle_info': ['view', 'create', 'update'],
            'vehicle_raw_data': ['view', 'create'],
            'vehicle_specs': ['view', 'create', 'update'],
            'vehicle_control': ['view'],
            'user_management': ['view', 'create'],  # Can create DEALER, SERVICE, FLEET, SALES
            'system_config': [],
            'dealer_management': ['view', 'create', 'update', 'assign'],
            'all_vehicles': True,
            'can_data': 'full',
            'historical_data': 'full',
        },
        'SALES': {  # NEW ROLE - Subset of OEM
            'vehicle_info': ['view', 'create'],  # Can view and add vehicles to inventory
            'vehicle_raw_data': ['view'],  # Limited to sales-relevant data only
            'vehicle_specs': ['view'],  # Read-only specs
            'vehicle_control': [],  # No control access
            'user_management': ['view', 'create'],  # UPDATED: Can create dealers
            'system_config': [],  # No system config access
            'dealer_management': ['view', 'create', 'update', 'assign'],  # UPDATED: Full dealer management
            'all_vehicles': True,  # Can see all vehicles (for sales purposes)
            'can_data': 'none',  # No raw CAN data access
            'historical_data': 'limited',  # 30 days for sales cycle
        },
        'RND': {
            'vehicle_info': ['view'],
            'vehicle_raw_data': ['view'],
            'vehicle_specs': ['view'],
            'vehicle_control': [],
            'user_management': [],
            'system_config': [],
            'dealer_management': [],
            'all_vehicles': True,
            'can_data': 'full',
            'historical_data': 'full',
        },
        'DEALER': {
            'vehicle_info': ['view'],
            'vehicle_raw_data': ['view'],
            'vehicle_specs': ['view'],
            'vehicle_control': [],
            'user_management': [],
            'system_config': [],
            'dealer_management': [],
            'all_vehicles': False,
            'can_data': 'none',
            'historical_data': 'limited',
        },
        'SERVICE': {
            'vehicle_info': ['view'],
            'vehicle_raw_data': ['view'],
            'vehicle_specs': ['view'],
            'vehicle_control': [],
            'user_management': [],
            'system_config': [],
            'dealer_management': [],
            'all_vehicles': False,
            'can_data': 'limited',
            'historical_data': 'limited',
        },
        'FLEET': {
            'vehicle_info': ['view'],
            'vehicle_raw_data': ['view'],
            'vehicle_specs': ['view'],
            'vehicle_control': ['view', 'execute'],
            'user_management': [],
            'system_config': [],
            'dealer_management': [],
            'all_vehicles': False,
            'can_data': 'none',
            'historical_data': 'limited',
        },
        'USER': {
            'vehicle_info': ['view'],
            'vehicle_raw_data': ['view'],
            'vehicle_specs': ['view'],
            'vehicle_control': ['view', 'execute'],
            'user_management': [],
            'system_config': [],
            'dealer_management': [],
            'all_vehicles': False,
            'can_data': 'none',
            'historical_data': 'limited',
        },
    }

    def has_permission(self, request, view):
        """Check if user has permission to access the view"""
        if not request.user.is_authenticated:
            return False
        
        try:
            role = request.user.role_profile.role
            return role in self.ROLE_PERMISSIONS
        except:
            return False

    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access specific object"""
        if not request.user.is_authenticated:
            return False
        
        try:
            role = request.user.role_profile.role
            
            if role in ['SUPER_ADMIN', 'OEM', 'SALES']:  # SALES can see all vehicles
                return True
            
            if hasattr(obj, 'vin'):
                return self.can_access_vehicle(request.user, obj.vin)
            
            return False
        except:
            return False

    @staticmethod
    def can_access_vehicle(user, vin):
        """Check if user can access a specific vehicle"""
        # Import here to avoid circular imports
        from core.models import (
            VehicleOwnership, FleetVehicle, 
            ServiceAssignment, DealerVehicle
        )
        
        try:
            role = user.role_profile.role
            
            # High-level roles see all vehicles
            if role in ['SUPER_ADMIN', 'OEM', 'RND', 'SALES']:
                return True
            
            # For end users, check if they own the vehicle
            if role == 'USER':
                return user.role_profile.vehicle_no == vin or \
                       VehicleOwnership.objects.filter(user=user, vin=vin).exists()
            
            # For fleet managers, check fleet assignment
            if role == 'FLEET':
                return FleetVehicle.objects.filter(
                    fleet_manager=user, 
                    vin=vin
                ).exists()
            
            # For service engineers, check service region
            if role == 'SERVICE':
                return ServiceAssignment.objects.filter(
                    engineer=user, 
                    vin=vin
                ).exists()
            
            # For dealers, check dealer assignment
            if role == 'DEALER':
                return DealerVehicle.objects.filter(
                    dealer=user, 
                    vin=vin
                ).exists()
            
            return False
        except Exception as e:
            print(f"Error checking vehicle access: {e}")
            return False

    @staticmethod
    def get_user_role(user):
        """Get user's role"""
        try:
            return user.role_profile.role
        except:
            return None

    @staticmethod
    def has_permission_for_action(user, resource, action):
        """Check if user has permission for specific action on resource"""
        try:
            role = user.role_profile.role
            permissions = RolePermission.ROLE_PERMISSIONS.get(role, {})
            resource_permissions = permissions.get(resource, [])
            return action in resource_permissions
        except:
            return False


# =====================================================
# SPECIFIC PERMISSION CLASSES FOR DIFFERENT ROLES
# =====================================================

class IsSuperAdminOrOEM(permissions.BasePermission):
    """
    Permission class that allows only SUPER_ADMIN or OEM roles
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role in ['SUPER_ADMIN', 'OEM']
        except:
            return False


class IsSuperAdminOrOEMOrSales(permissions.BasePermission):
    """
    Permission class that allows SUPER_ADMIN, OEM, or SALES roles
    NEW: Added for views that SALES should access
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role in ['SUPER_ADMIN', 'OEM', 'SALES']
        except:
            return False


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission class that allows only SUPER_ADMIN role
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role == 'SUPER_ADMIN'
        except:
            return False


class IsOEM(permissions.BasePermission):
    """
    Permission class that allows only OEM role
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role == 'OEM'
        except:
            return False


class IsSales(permissions.BasePermission):
    """
    Permission class that allows only SALES role
    NEW: Permission class for SALES-only endpoints
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role == 'SALES'
        except:
            return False


class IsRND(permissions.BasePermission):
    """
    Permission class that allows only RND role
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            user_role = request.user.role_profile.role
            return user_role == 'RND'
        except:
            return False


# =====================================================
# DECORATORS
# =====================================================

def role_required(allowed_roles):
    """
    Decorator to restrict access based on user roles
    Usage: @role_required(['SUPER_ADMIN', 'OEM', 'SALES'])
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            try:
                role = request.user.role_profile.role
                if role not in allowed_roles:
                    return JsonResponse({
                        'error': 'Access denied',
                        'message': f'This action requires one of these roles: {", ".join(allowed_roles)}'
                    }, status=403)
            except:
                return JsonResponse({'error': 'User role not found'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def permission_required(resource, action):
    """
    Decorator to check specific permission
    Usage: @permission_required('vehicle_raw_data', 'view')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            if not RolePermission.has_permission_for_action(request.user, resource, action):
                return JsonResponse({
                    'error': 'Permission denied',
                    'message': f'You do not have permission to {action} {resource}'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator