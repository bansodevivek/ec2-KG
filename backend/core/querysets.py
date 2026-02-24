# core/querysets.py

from django.db.models import Q
from datetime import datetime, timedelta
from django.conf import settings

# Get default VIN from settings or use hardcoded
DEFAULT_TEST_VIN = getattr(settings, 'DEFAULT_TEST_VIN', 'KINETIC-ARIS-2025-001')


class RoleBasedQuerySet:
    """
    QuerySet filters based on user role and data visibility levels
    UPDATED: Added SALES role with all vehicle visibility
    """
    @staticmethod
    def filter_vehicles_by_role(queryset, user):
        from core.models import (
            VehicleOwnership, FleetVehicle, 
            ServiceAssignment, DealerVehicle
        )
        
        try:
            role = user.role_profile.role
        except Exception:
            return queryset.none()
        
        # 1. HIGH-LEVEL ROLES: See all vehicles immediately
        if role in ['SUPER_ADMIN', 'OEM', 'RND', 'SALES']:  # Added SALES
            return queryset
        
        # 2. ASSIGNMENT LOGIC: Check for specific assignments
        assigned_vins = []

        if role == 'USER':
            assigned_vins = list(VehicleOwnership.objects.filter(user=user).values_list('vin', flat=True))
            if user.role_profile.vehicle_no:
                assigned_vins.append(user.role_profile.vehicle_no)
        
        elif role == 'FLEET':
            assigned_vins = FleetVehicle.objects.filter(fleet_manager=user, is_active=True).values_list('vin', flat=True)
        
        elif role == 'SERVICE':
            assigned_vins = ServiceAssignment.objects.filter(engineer=user).values_list('vin', flat=True)
        
        elif role == 'DEALER':
            assigned_vins = DealerVehicle.objects.filter(dealer=user).values_list('vin', flat=True)

        # 3. RETURN RESULTS: If assignments exist, filter by them
        if assigned_vins:
            return queryset.filter(vin__in=assigned_vins)

        # 4. FALLBACK: Only show the single test vehicle if it exists and user has no assignments
        if queryset.filter(vin=DEFAULT_TEST_VIN).exists():
            return queryset.filter(vin=DEFAULT_TEST_VIN)
        
        # 5. NO ACCESS: Return empty so the View can show "No vehicle assigned"
        return queryset.none()
    
    @staticmethod
    def filter_raw_data_by_role(queryset, user):
        """
        Filter raw CAN data based on user's role and data visibility
        UPDATED: SALES has limited access to raw data
        """
        try:
            role = user.role_profile.role
        except:
            return queryset.none()
        
        # First filter by vehicle access
        queryset = RoleBasedQuerySet.filter_vehicles_by_role(queryset, user)
        
        # For single test vehicle: Filter by default VIN
        queryset = queryset.filter(vin=DEFAULT_TEST_VIN)
        
        # Then apply time-based restrictions based on role
        time_limits = {
            'SUPER_ADMIN': None,
            'OEM': 7,
            'SALES': 30,  # NEW: 30 days for sales cycle tracking
            'RND': None,
            'DEALER': 30,
            'SERVICE': 90,
            'FLEET': 180,
            'USER': 30,
        }
        
        days_limit = time_limits.get(role)
        if days_limit:
            cutoff_date = datetime.now() - timedelta(days=days_limit)
            queryset = queryset.filter(timestamp__gte=cutoff_date)
        
        return queryset
    
    @staticmethod
    def get_accessible_can_fields(user):
        """
        Return list of CAN data fields accessible by user role
        UPDATED: SALES has limited field access (sales-relevant data only)
        """
        try:
            role = user.role_profile.role
        except:
            return []
        
        # Define field groups
        basic_fields = [
            'vin', 'timestamp', 'vehicle_speed', 'motor_rpm',
            'soc_battery_pack', 'voltage_battery', 'odometer',
            'available_energy', 'current_battery'
        ]
        
        battery_fields = [
            'soc_battery_pack', 'available_energy', 'voltage_battery',
            'current_battery', 'over_voltage_error', 'under_voltage_error',
            'over_temperature_error', 'under_temperature_error',
            'pack_not_connected_error', 'thermal_runaway_error'
        ]
        
        motor_fields = [
            'motor_direction', 'vehicle_speed', 'controller_temperature',
            'motor_temperature', 'motor_rpm', 'throttle_command',
            'motor_torque', 'rms_current', 'capacitor_battery_voltage'
        ]
        
        fault_fields = [
            'controller_fault', 'fault_codes', 'throttle_error',
            'under_voltage_fault', 'controller_temp_fault',
            'motor_stall_fault', 'hall_error_motor', 'phase_missing',
            'hardware_over_current', 'over_current_baseline_fault',
            'hardware_over_voltage', 'over_temperature_fault',
            'motor_overtemperature', 'motor_overspeeding'
        ]
        
        system_fields = [
            'is_active', 'can_interface_mode', 'connection_count',
            'ready_signal', 'brake_actuation', 'side_stand_actuation'
        ]
        
        # Sales-specific fields (high-level status for sales tracking)
        sales_fields = [
            'vin', 'timestamp', 'odometer', 'soc_battery_pack',
            'available_energy', 'vehicle_speed', 'is_active'
        ]
        
        # Role-based field access
        field_access = {
            'SUPER_ADMIN': 'all',
            'OEM': 'all',
            'SALES': sales_fields,  # NEW: Limited to sales-relevant fields
            'RND': 'all',
            'DEALER': list(set(basic_fields + battery_fields + fault_fields)),
            'SERVICE': list(set(basic_fields + motor_fields + fault_fields + system_fields)),
            'FLEET': list(set(basic_fields + battery_fields + fault_fields)),
            'USER': list(set(basic_fields + battery_fields)),
        }
        
        allowed = field_access.get(role, basic_fields)
        
        if allowed == 'all':
            # Import here to avoid circular imports
            from core.models import VehicleRawData
            return [field.name for field in VehicleRawData._meta.get_fields()]
        
        return allowed
    
    @staticmethod
    def filter_raw_data_fields(data_dict, user):
        """
        Filter dictionary to only include fields user can access
        """
        accessible_fields = RoleBasedQuerySet.get_accessible_can_fields(user)
        
        if 'all' in accessible_fields:
            return data_dict
        
        return {
            key: value 
            for key, value in data_dict.items() 
            if key in accessible_fields
        }
    
    @staticmethod
    def can_access_vehicle_control(user):
        """
        Check if user can send vehicle control commands
        UPDATED: SALES cannot control vehicles
        """
        try:
            role = user.role_profile.role
            return role in ['SUPER_ADMIN', 'FLEET', 'USER']
        except:
            return False
    
    @staticmethod
    def can_view_user_data(user, target_user):
        """
        Check if user can view another user's data
        UPDATED: SALES can view dealer data
        """
        try:
            role = user.role_profile.role
            
            if role == 'SUPER_ADMIN':
                return True
            
            if user.id == target_user.id:
                return True
            
            # OEM can view SALES user data
            if role == 'OEM' and target_user.role_profile.role == 'SALES':
                return True
            
            # SALES can view dealer data
            if role == 'SALES' and target_user.role_profile.role in ['DEALER', 'USER']:
                return True
            
            return False
        except:
            return False
    
    @staticmethod
    def can_assign_vehicle_to_dealer(user):
        """
        Check if user can assign vehicles to dealers
        NEW: Helper method for vehicle assignment permission
        """
        try:
            role = user.role_profile.role
            return role in ['SUPER_ADMIN', 'OEM', 'SALES']
        except:
            return False
    
    @staticmethod
    def get_sales_metrics(user):
        """
        Get sales-specific metrics and KPIs
        NEW: Helper method for SALES role dashboard
        """
        try:
            from core.models import DealerVehicle, VehicleOwnership
            from django.db.models import Count, Q
            from datetime import datetime, timedelta
            
            role = user.role_profile.role
            
            if role not in ['SUPER_ADMIN', 'OEM', 'SALES']:
                return None
            
            # Get time periods
            now = datetime.now()
            this_month = now.replace(day=1)
            last_month = (this_month - timedelta(days=1)).replace(day=1)
            this_year = now.replace(month=1, day=1)
            
            metrics = {
                'total_inventory': DealerVehicle.objects.filter(is_sold=False).count(),
                'sold_this_month': DealerVehicle.objects.filter(
                    is_sold=True,
                    assigned_date__gte=this_month
                ).count(),
                'sold_this_year': DealerVehicle.objects.filter(
                    is_sold=True,
                    assigned_date__gte=this_year
                ).count(),
                'active_dealers': DealerVehicle.objects.values('dealer').distinct().count(),
                'pending_deliveries': DealerVehicle.objects.filter(is_sold=False).count(),
            }
            
            # If SALES role, filter by their assignments
            if role == 'SALES':
                metrics = {
                    key: DealerVehicle.objects.filter(assigned_by=user, **{
                        'is_sold': key.startswith('sold_'),
                    }).count() if 'sold' in key else val
                    for key, val in metrics.items()
                }
            
            return metrics
            
        except Exception as e:
            print(f"Error getting sales metrics: {e}")
            return None