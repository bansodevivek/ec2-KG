# core/processors/vehicle_info_processor.py

import json
from core.models.VehicleInfo import VehicleInfo

def process_vehicle_info(payload, vin=None):
    """
    Process vehicle info from MQTT
    
    Args:
        payload: JSON string with vehicle info
        vin: VIN to use (required for single test vehicle)
    """
    data = json.loads(payload)
    
    # Use VIN from payload or parameter
    actual_vin = data.get('vin', vin)
    
    if not actual_vin:
        print("Warning: No VIN provided in vehicle info")
        return None
    
    # Mapping JSON camelCase to Django snake_case
    vehicle, created = VehicleInfo.objects.update_or_create(
        vin=actual_vin,
        defaults={
            'model_name': data.get('modelName'),
            'make': data.get('make'),
            'model': data.get('model'),
            'variant': data.get('variant'),
            'charger_type': data.get('chargerType'),
            'battery_type': data.get('batteryType'),
            'service_due_date': data.get('serviceDueDate'),
            'service_due_distance': data.get('serviceDueDistance'),
        }
    )
    
    action = "Created" if created else "Updated"
    print(f"{action} vehicle info for VIN: {actual_vin}")
    
    return vehicle