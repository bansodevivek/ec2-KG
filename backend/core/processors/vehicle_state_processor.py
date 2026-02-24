import logging
from django.utils import timezone
from core.models.vehicle_state import VehicleState
from core.models.VehicleInfo import VehicleInfo

logger = logging.getLogger(__name__)


def process_vehicle_state(data):
    """
    Process vehicle state updates from /status topic
    This syncs physical button states (hazard, headlight, etc.)
    
    Args:
        data: Dict containing VCU_ID and state information from SYS object
    
    Returns:
        VehicleState object or None
    """
    try:
        vcu_id = data.get('VCU_ID')
        
        if not vcu_id:
            logger.error("No VCU_ID in state data")
            return None
        
        logger.info(f"Processing state update for VCU: {vcu_id}")
        
        # Get VIN from VehicleInfo
        try:
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            vin = vehicle_info.vin
        except VehicleInfo.DoesNotExist:
            logger.warning(f"VehicleInfo not found for VCU: {vcu_id}")
            vin = "UNKNOWN"
        
        # Get or create vehicle state
        vehicle_state, created = VehicleState.objects.get_or_create(
            vcu_id=vcu_id,
            defaults={'vin': vin}
        )
        
        # Update VIN if it changed
        if vehicle_state.vin != vin:
            vehicle_state.vin = vin
        
        # Extract SYS data (where physical button states are)
        sys_data = data.get('SYS', {})
        
        # Update state from SYS data
        state_updates = {
            'power': bool(sys_data.get('PW', 0)),
            'lock': bool(sys_data.get('LK', 0)),
            'horn': bool(sys_data.get('HN', 0)),
            'headlights': bool(sys_data.get('HL', 0)),
            'hazard': bool(sys_data.get('HZ', 0)),
            'immobilizer': bool(sys_data.get('IM', 0)),
        }
        
        # Update vehicle state
        vehicle_state.update_state(state_updates)
        
        action = "created" if created else "updated"
        logger.info(f"✅ Vehicle state {action}: {vcu_id} - Hazard: {vehicle_state.hazard}, Lock: {vehicle_state.lock}")
        
        return vehicle_state
        
    except Exception as e:
        logger.exception(f"Error processing vehicle state: {e}")
        return None


def mark_vehicle_offline(vcu_id):
    """
    Mark a vehicle as offline
    
    Args:
        vcu_id: Vehicle Control Unit ID
    """
    try:
        vehicle_state = VehicleState.objects.get(vcu_id=vcu_id)
        vehicle_state.mark_offline()
        logger.info(f"Vehicle marked offline: {vcu_id}")
    except VehicleState.DoesNotExist:
        logger.warning(f"Cannot mark offline - Vehicle state not found: {vcu_id}")