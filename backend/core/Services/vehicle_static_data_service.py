# core/Services/vehicle_static_data_service.py
"""
Vehicle Static Data Service
Handles vehicle info and specs with role-based filtering
"""

import logging
from typing import Dict, Any, Optional
from django.core.exceptions import ObjectDoesNotExist

from core.models.VehicleInfo import VehicleInfo
from core.models.vehicleSpecs import VehicleSpecs

logger = logging.getLogger(__name__)


class VehicleStaticDataService:
    """
    Service to retrieve and filter vehicle info and specs based on user role
    """
    
    # Role-based field access for VehicleInfo
    VEHICLE_INFO_FIELDS = {
        'SUPER_ADMIN': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant', 
            'subtype', 'colour', 'battery_type', 'charger_type',
            'battery_serial_number', 'vcu_id', 'cluster_id',
            'motor_serial_number', 'controller_serial_number', 'charger_serial_number',
            'manufacturing_date', 'warranty_expiry_date',
            'service_due_date', 'service_due_distance', 
            'last_service_date', 'last_service_distance',
            'is_active', 'is_sold', 'is_registered', 'notes'
        ],
        'OEM': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant', 
            'subtype', 'colour', 'battery_type', 'charger_type',
            'battery_serial_number', 'vcu_id', 'cluster_id',
            'motor_serial_number', 'controller_serial_number',
            'manufacturing_date', 'warranty_expiry_date',
            'is_active', 'is_sold', 'is_registered'
        ],
        'RND': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant', 
            'subtype', 'battery_type', 'charger_type',
            'battery_serial_number', 'vcu_id', 'cluster_id',
            'motor_serial_number', 'controller_serial_number',
            'manufacturing_date'
        ],
        'DEALER': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant',
            'colour', 'battery_type', 'charger_type',
            'manufacturing_date', 'warranty_expiry_date',
            'is_sold'
        ],
        'SERVICE': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant',
            'battery_type', 'charger_type',
            'battery_serial_number', 'vcu_id', 'cluster_id',
            'service_due_date', 'service_due_distance',
            'last_service_date', 'last_service_distance'
        ],
        'FLEET': [
            'vin', 'vehicle_no', 'model_name', 'make', 'model', 'variant',
            'colour', 'battery_type', 'charger_type',
            'service_due_date', 'service_due_distance'
        ],
        'USER': [
            'vehicle_no', 'model_name', 'variant', 'colour',
            'service_due_date', 'service_due_distance'
        ]
    }
    
    # Role-based field access for VehicleSpecs
    VEHICLE_SPECS_FIELDS = {
        'SUPER_ADMIN': 'all',  # All fields
        'OEM': 'all',  # All fields
        'RND': 'all',  # All fields
        'DEALER': [
            'motor_power', 'top_speed', 'battery_capacity', 'range_km',
            'seating_capacity', 'charging_time_0_to_80', 'fast_charging_supported',
            'weight', 'length', 'width', 'height', 'ground_clearance',
            'payload_capacity', 'boot_space'
        ],
        'SERVICE': [
            'motor_power', 'motor_type', 'motor_torque', 'top_speed',
            'battery_capacity', 'battery_voltage', 'battery_cells_config',
            'range_km', 'charging_time_0_to_80', 'charging_time_0_to_100',
            'seating_capacity', 'weight', 'front_brake_type', 'rear_brake_type',
            'suspension_front', 'suspension_rear', 'tire_size_front', 'tire_size_rear',
            'abs_available', 'regenerative_braking'
        ],
        'FLEET': [
            'motor_power', 'top_speed', 'battery_capacity', 'range_km',
            'range_city', 'range_highway', 'seating_capacity',
            'charging_time_0_to_80', 'fast_charging_supported',
            'payload_capacity', 'boot_space'
        ],
        'USER': [
            'motor_power', 'top_speed', 'battery_capacity', 'range_km',
            'seating_capacity', 'charging_time_0_to_80', 'charging_time_0_to_100',
            'fast_charging_supported'
        ]
    }

    @staticmethod
    def get_vehicle_info(vin: str, role: str) -> Optional[Dict[str, Any]]:
        """
        Get vehicle info filtered by role
        
        Args:
            vin: Vehicle Identification Number
            role: User role (SUPER_ADMIN, OEM, RND, DEALER, SERVICE, FLEET, USER)
            
        Returns:
            Dictionary with filtered vehicle info or None
        """
        try:
            vehicle = VehicleInfo.objects.get(vin=vin)
            
            # Get allowed fields for this role
            allowed_fields = VehicleStaticDataService.VEHICLE_INFO_FIELDS.get(
                role, 
                VehicleStaticDataService.VEHICLE_INFO_FIELDS['USER']
            )
            
            # Build filtered response
            filtered_data = {}
            for field in allowed_fields:
                if hasattr(vehicle, field):
                    value = getattr(vehicle, field)
                    # Convert date objects to ISO format strings
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    filtered_data[field] = value
            
            # Add computed properties
            if 'service_due_date' in allowed_fields:
                filtered_data['service_status'] = vehicle.service_status
                filtered_data['is_service_due'] = vehicle.is_service_due
            
            return filtered_data
            
        except ObjectDoesNotExist:
            logger.error(f"Vehicle not found: {vin}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving vehicle info: {e}")
            return None

    @staticmethod
    def get_vehicle_specs(vin: str, role: str) -> Optional[Dict[str, Any]]:
        try:
            # 1. Fetch VehicleInfo
            vehicle = VehicleInfo.objects.filter(vin=vin).first()
            if not vehicle:
                return None

            # 2. Check for individual overrides first (VehicleSpecs)
            # Note: We use the new related_name 'individual_specifications'
            individual_specs = getattr(vehicle, 'individual_specifications', None)
            
            # 3. Determine the source
            # Priority: Individual Overrides -> Vehicle's Template -> None
            source = individual_specs if individual_specs else vehicle.specs_template
            
            if not source:
                logger.warning(f"No specs or template assigned to VIN: {vin}")
                return None

            # 4. Get role-based fields
            allowed_fields = VehicleStaticDataService.VEHICLE_SPECS_FIELDS.get(
                role, 
                VehicleStaticDataService.VEHICLE_SPECS_FIELDS.get('USER', [])
            )

            # 5. Build Response
            if allowed_fields == 'all':
                if hasattr(source, 'get_all_specs'):
                    return {'vin': vehicle.vin, **source.get_all_specs()}
                return {'vin': vehicle.vin, **{f.name: getattr(source, f.name) for f in source._meta.fields if not f.name.startswith('_')}}

            data = {'vin': vehicle.vin, 'model_name': vehicle.model_name}
            for field in allowed_fields:
                if hasattr(source, field):
                    data[field] = getattr(source, field)
            
            return data

        except Exception as e:
            logger.error(f"Error: {e}")
            return None
    @staticmethod
    def get_complete_vehicle_data(vin: str, role: str) -> Dict[str, Any]:
        """
        Get both vehicle info and specs in one call
        
        Args:
            vin: Vehicle Identification Number
            role: User role
            
        Returns:
            Dictionary with both info and specs
        """
        return {
            'vehicle_info': VehicleStaticDataService.get_vehicle_info(vin, role),
            'vehicle_specs': VehicleStaticDataService.get_vehicle_specs(vin, role),
            'vin': vin,
            'role': role
        }

    @staticmethod
    def get_vehicles_list(role: str, user=None) -> list:
        """
        Get list of vehicles based on role and user
        
        Args:
            role: User role
            user: Django user object (for ownership filtering)
            
        Returns:
            List of VINs the user can access
        """
        try:
            if role in ['SUPER_ADMIN', 'OEM', 'RND']:
                # These roles can see all vehicles
                vehicles = VehicleInfo.objects.all()
                
            elif role == 'DEALER':
                # Dealers see their inventory
                # TODO: Add dealer assignment logic when implemented
                vehicles = VehicleInfo.objects.filter(is_sold=False)
                
            elif role == 'SERVICE':
                # Service engineers see assigned vehicles
                # TODO: Add service assignment logic when implemented
                vehicles = VehicleInfo.objects.all()
                
            elif role == 'FLEET':
                # Fleet managers see their fleet vehicles
                # TODO: Add fleet assignment logic when implemented
                vehicles = VehicleInfo.objects.all()
                
            elif role == 'USER':
                # Users see only their own vehicles
                # TODO: Add ownership logic when implemented
                if user and hasattr(user, 'owned_vehicles'):
                    vehicles = user.owned_vehicles.all()
                else:
                    vehicles = VehicleInfo.objects.none()
            else:
                vehicles = VehicleInfo.objects.none()
            
            return [vehicle.vin for vehicle in vehicles]
            
        except Exception as e:
            logger.error(f"Error getting vehicles list: {e}")
            return []


# Singleton instance
vehicle_static_data_service = VehicleStaticDataService()