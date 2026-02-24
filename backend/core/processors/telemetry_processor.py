# core/processors/telemetry_processors.py
"""
Processors for segregated MQTT topics
Each processor handles one specific topic type
"""

import json
import logging
from django.utils import timezone
from core.models.app_telemetry import TyrePressure, VehicleLocation, VehicleStatus
from core.models.VehicleInfo import VehicleInfo

logger = logging.getLogger(__name__)


def get_vin_from_vcu_id(vcu_id: str) -> str:
    """
    Lookup VIN from VCU_ID in VehicleInfo table
    """
    try:
        vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
        return vehicle_info.vin
    except VehicleInfo.DoesNotExist:
        logger.warning(f"No VIN found for VCU_ID: {vcu_id}")
        return f"UNKNOWN_{vcu_id}"
    except Exception as e:
        logger.error(f"Error looking up VIN for VCU_ID {vcu_id}: {e}")
        return f"ERROR_{vcu_id}"


def process_tyre_pressure(data):
    """
    Process tyre pressure data from kg_dash/{VCU_ID}/tyre
    
    Payload format:
    {
        "ts": 1707500000,
        "front": 32,
        "rear": 30,
        "VCU_ID": "A4CF12345678"
    }
    """
    try:
        # Parse JSON if string
        if isinstance(data, (str, bytes)):
            data = json.loads(data)
        
        # Extract VCU_ID
        vcu_id = str(data.get("VCU_ID", "")).strip()
        if not vcu_id:
            logger.error("No VCU_ID in tyre pressure data")
            return None
        
        # Lookup VIN
        vin = get_vin_from_vcu_id(vcu_id)
        
        # Create entry
        entry = TyrePressure.objects.create(
            vcu_id=vcu_id,
            vin=vin,
            front_pressure=data.get("front", 0),
            rear_pressure=data.get("rear", 0),
            device_timestamp=data.get("ts", 0)
        )
        
        logger.info(f"Tyre pressure saved: {vcu_id} - Front: {entry.front_pressure}, Rear: {entry.rear_pressure}")
        return entry
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in tyre pressure: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing tyre pressure: {e}")
        return None


def process_location(data):
    """
    Process location data from kg_dash/{VCU_ID}/location
    
    Payload format:
    {
        "ts": 1707500000,
        "lat": 18.520430,
        "lng": 73.856743,
        "alt": 560.5,
        "spd": 45.2,
        "sat": 8,
        "hdop": 1.2,
        "VCU_ID": "A4CF12345678"
    }
    """
    try:
        # Parse JSON if string
        if isinstance(data, (str, bytes)):
            data = json.loads(data)
        
        # Extract VCU_ID
        vcu_id = str(data.get("VCU_ID", "")).strip()
        if not vcu_id:
            logger.error("No VCU_ID in location data")
            return None
        
        # Lookup VIN
        vin = get_vin_from_vcu_id(vcu_id)
        
        # Create entry
        entry = VehicleLocation.objects.create(
            vcu_id=vcu_id,
            vin=vin,
            latitude=data.get("lat", 0.0),
            longitude=data.get("lng", 0.0),
            altitude=data.get("alt", 0.0),
            speed=data.get("spd", 0.0),
            satellites=data.get("sat", 0),
            hdop=data.get("hdop", 0.0),
            device_timestamp=data.get("ts", 0)
        )
        
        logger.info(f"Location saved: {vcu_id} - ({entry.latitude}, {entry.longitude})")
        return entry
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in location: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing location: {e}")
        return None


def process_status(data):
    """
    Process status/heartbeat data from kg_dash/{VCU_ID}/status
    
    Payload format:
    {
        "ts": 1707500000,
        "online": true,
        "fw_ver": "1.2.0",
        "rssi": -65,
        "uptime": 360,
        "heap": 45000,
        "pkts": 1234,
        "pubs": 1230,
        "reconnects": 2,
        "VCU_ID": "A4CF12345678"
    }
    """
    try:
        # Parse JSON if string
        if isinstance(data, (str, bytes)):
            data = json.loads(data)
        
        # Extract VCU_ID
        vcu_id = str(data.get("VCU_ID", "")).strip()
        if not vcu_id:
            logger.error("No VCU_ID in status data")
            return None
        
        # Lookup VIN
        vin = get_vin_from_vcu_id(vcu_id)
        
        # Create entry
        entry = VehicleStatus.objects.create(
            vcu_id=vcu_id,
            vin=vin,
            online=data.get("online", False),
            firmware_version=data.get("fw_ver", ""),
            rssi=data.get("rssi", 0),
            uptime=data.get("uptime", 0),
            heap_free=data.get("heap", 0),
            packets_received=data.get("pkts", 0),
            packets_published=data.get("pubs", 0),
            reconnect_count=data.get("reconnects", 0),
            device_timestamp=data.get("ts", 0)
        )
        
        logger.info(f"Status saved: {vcu_id} - Online: {entry.online}, FW: {entry.firmware_version}")
        return entry
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in status: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing status: {e}")
        return None