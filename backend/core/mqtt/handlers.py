# core/mqtt/handlers.py
"""
MQTT Message Handlers — topic-specific processing logic.
Delegates to the appropriate processor and then pushes data through
the real-time pipeline (Redis + WebSocket via mqtt.consumers).
"""

import json
import logging

from core.processors.vehicle_rawcandata_processor import process_vehicle_raw_data
from core.processors.telemetry_processor import (
    process_tyre_pressure,
    process_location,
    process_status
)
from core.Services.alerts_service import alert_service
from core.Services.trip_service import trip_service
from core.mqtt.consumers import process_mqtt_message

logger = logging.getLogger(__name__)


def handle_can_data(vcu_id, data):
    """
    Process CAN bus data:
      1. Save to DB via processor
      2. Run alert/trip detection
      3. Push to Redis + WebSocket (live pipeline)
    """
    try:
        # Ensure VCU_ID is in payload
        if 'VCU_ID' not in data:
            data['VCU_ID'] = vcu_id

        # ── DB save ──
        entry = process_vehicle_raw_data(data)

        if entry:
            # ── Alert detection ──
            try:
                alerts = alert_service.process_telemetry(
                    vcu_id=vcu_id, vin=entry.vin, data=data
                )
                if alerts:
                    logger.info(f"{len(alerts)} alerts created for {vcu_id}")
            except Exception as e:
                logger.warning(f"Alert processing failed for {vcu_id}: {e}")

            # ── Trip detection ──
            try:
                trip_service.process_telemetry(
                    vcu_id=vcu_id, vin=entry.vin, data=data
                )
            except Exception as e:
                logger.warning(f"Trip processing failed for {vcu_id}: {e}")

            # ── Real-time pipeline (Redis + WS) ──
            # Build a clean payload from the DB-saved entry for caching
            live_payload = {
                'vin': entry.vin,
                'vcu_id': vcu_id,
                'vehicle_speed': float(entry.vehicle_speed) if entry.vehicle_speed else 0,
                'soc_battery_pack': float(entry.soc_battery_pack) if entry.soc_battery_pack else 0,
                'odometer': float(entry.odometer) if entry.odometer else 0,
                'motor_rpm': float(entry.motor_rpm) if entry.motor_rpm else 0,
                'motor_temp': float(entry.motor_temp) if entry.motor_temp else 0,
                'controller_temp': float(entry.controller_temp) if entry.controller_temp else 0,
                'pack_voltage': float(entry.pack_voltage) if entry.pack_voltage else 0,
                'pack_current': float(entry.pack_current) if entry.pack_current else 0,
                'battery_temp': float(entry.battery_temp) if entry.battery_temp else 0,
                'throttle': float(entry.throttle) if entry.throttle else 0,
                'time': entry.time.isoformat() if entry.time else None,
            }
            process_mqtt_message(vcu_id, 'can', live_payload)

            return entry

    except Exception as e:
        logger.error(f"handle_can_data error for {vcu_id}: {e}")
    return None


def handle_tyre_pressure(vcu_id, data):
    """Process tyre pressure data → DB + live pipeline."""
    try:
        if 'VCU_ID' not in data:
            data['VCU_ID'] = vcu_id

        entry = process_tyre_pressure(data)

        if entry:
            # Alert detection
            try:
                alert_service.process_tyre_pressure(
                    vcu_id=vcu_id, vin=entry.vin,
                    front=entry.front_pressure, rear=entry.rear_pressure
                )
            except Exception as e:
                logger.warning(f"Tyre alert processing failed: {e}")

            # Live pipeline
            live_payload = {
                'vin': entry.vin,
                'vcu_id': vcu_id,
                'front_pressure': float(entry.front_pressure) if entry.front_pressure else 0,
                'rear_pressure': float(entry.rear_pressure) if entry.rear_pressure else 0,
                'time': entry.time.isoformat() if entry.time else None,
            }
            process_mqtt_message(vcu_id, 'tyre', live_payload)

            return entry

    except Exception as e:
        logger.error(f"handle_tyre_pressure error for {vcu_id}: {e}")
    return None


def handle_location(vcu_id, data):
    """Process location data → DB + live pipeline."""
    try:
        if 'VCU_ID' not in data:
            data['VCU_ID'] = vcu_id

        entry = process_location(data)

        if entry:
            live_payload = {
                'vin': entry.vin if hasattr(entry, 'vin') else '',
                'vcu_id': vcu_id,
                'latitude': float(entry.latitude) if entry.latitude else 0,
                'longitude': float(entry.longitude) if entry.longitude else 0,
                'speed': float(entry.speed) if entry.speed else 0,
                'heading': float(entry.heading) if hasattr(entry, 'heading') and entry.heading else 0,
                'altitude': float(entry.altitude) if hasattr(entry, 'altitude') and entry.altitude else 0,
                'time': entry.time.isoformat() if entry.time else None,
            }
            process_mqtt_message(vcu_id, 'location', live_payload)

            return entry

    except Exception as e:
        logger.error(f"handle_location error for {vcu_id}: {e}")
    return None


def handle_status(vcu_id, data):
    """Process vehicle status data → DB + live pipeline."""
    try:
        if 'VCU_ID' not in data:
            data['VCU_ID'] = vcu_id

        entry = process_status(data)

        if entry:
            live_payload = {
                'vin': entry.vin if hasattr(entry, 'vin') else '',
                'vcu_id': vcu_id,
                'online': entry.online if hasattr(entry, 'online') else False,
                'firmware_version': entry.firmware_version if hasattr(entry, 'firmware_version') else '',
                'signal_strength': float(entry.signal_strength) if hasattr(entry, 'signal_strength') and entry.signal_strength else 0,
                'time': entry.time.isoformat() if entry.time else None,
            }
            process_mqtt_message(vcu_id, 'status', live_payload)

            return entry

    except Exception as e:
        logger.error(f"handle_status error for {vcu_id}: {e}")
    return None
