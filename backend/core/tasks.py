# core/tasks.py

import json
import logging
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

# ── Lazy Redis helper ──────────────────────────────────────────────
_redis_client = None


def _get_redis():
    """Lazy Redis init — retries every call if Redis was down at startup."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis
        client = redis.Redis(
            host='127.0.0.1', port=6379, db=0,
            decode_responses=True, socket_connect_timeout=2
        )
        client.ping()
        _redis_client = client
        logger.info("Redis connection established (lazy init)")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis unavailable: {e}")
        return None


# ── Main Celery task ───────────────────────────────────────────────
@shared_task(name='core.tasks.process_vehicle_data')
def process_vehicle_data(vcu_id, data_type, payload):
    """
    Process incoming vehicle data from MQTT.
    Steps:
      1. Cache in Redis  (live:can/location/tyre/status:<vcu_id>)
      2. Broadcast via Channel Layer to WebSocket group
      3. Save to PostgreSQL
    """
    try:
        # ---------- Step 1: Redis cache ----------
        r = _get_redis()
        if r:
            cache_key = f"live:{data_type}:{vcu_id}"
            payload_str = json.dumps(payload) if isinstance(payload, dict) else payload
            try:
                r.setex(cache_key, 300, payload_str)  # 5-min TTL
                logger.debug(f"Cached {cache_key}")
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")
        else:
            logger.warning(f"Redis unavailable — skipping cache for {vcu_id}")

        # ---------- Step 2: WebSocket broadcast ----------
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"vehicle_{vcu_id}"
                broadcast_payload = payload if isinstance(payload, dict) else json.loads(payload)
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "telemetry_message",
                        "data": broadcast_payload,
                    }
                )
                logger.debug(f"Broadcast to {group_name}")
        except Exception as e:
            logger.warning(f"WebSocket broadcast failed: {e}")

        # ---------- Step 3: DB persistence ----------
        _save_to_db(vcu_id, data_type, payload)

    except Exception as e:
        logger.error(f"process_vehicle_data failed for {vcu_id}: {e}")


def _save_to_db(vcu_id, data_type, payload):
    """Persist data to PostgreSQL based on type."""
    try:
        data = payload if isinstance(payload, dict) else json.loads(payload)

        if data_type == 'can':
            from core.processors.telemetry_processor import process_can_data
            process_can_data(vcu_id, data)
        elif data_type == 'location':
            from core.models.app_telemetry import VehicleLocation
            VehicleLocation.objects.create(
                vin=data.get('vin', ''),
                vcu_id=vcu_id,
                latitude=data.get('lat', 0),
                longitude=data.get('lng', 0),
                speed=data.get('speed', 0),
                heading=data.get('heading', 0),
                altitude=data.get('altitude', 0),
            )
        elif data_type == 'tyre':
            from core.models.app_telemetry import TyrePressure
            TyrePressure.objects.create(
                vin=data.get('vin', ''),
                vcu_id=vcu_id,
                front_pressure=data.get('front', 0),
                rear_pressure=data.get('rear', 0),
            )
        elif data_type == 'status':
            from core.models.app_telemetry import VehicleStatus
            VehicleStatus.objects.update_or_create(
                vcu_id=vcu_id,
                defaults={
                    'vin': data.get('vin', ''),
                    'online': data.get('online', False),
                    'firmware_version': data.get('firmware_version', ''),
                    'signal_strength': data.get('signal_strength', 0),
                }
            )
        logger.debug(f"Saved {data_type} to DB for {vcu_id}")
    except Exception as e:
        logger.error(f"DB save failed ({data_type}, {vcu_id}): {e}")
