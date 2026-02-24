# core/mqtt/consumers.py
"""
MQTT Consumer — processes incoming MQTT messages and feeds them into the
Django data pipeline (Redis cache → WebSocket broadcast → DB).

This is the bridge between raw MQTT data and the rest of the system.
Used by the mqtt_listener management command.
"""

import json
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

# Lazy Redis helper (same pattern as tasks.py / telemetry_cache.py)
_redis_client = None


def _get_redis():
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
        logger.info("mqtt.consumers: Redis connection established")
        return _redis_client
    except Exception as e:
        logger.warning(f"mqtt.consumers: Redis unavailable: {e}")
        return None


CACHE_TTL = 300  # 5 minutes


def process_mqtt_message(vcu_id, data_type, payload):
    """
    Central processing function called from mqtt_listener on_message.
    
    Steps:
      1. Cache latest data in Redis  (live:{data_type}:{vcu_id})
      2. Broadcast to WebSocket group via Channel Layer
      3. (DB save is handled separately in mqtt_listener processors)
    
    Args:
        vcu_id:    Vehicle Control Unit ID
        data_type: One of 'can', 'location', 'tyre', 'status'
        payload:   Already-parsed dict of telemetry data
    """

    # ── 1. Redis Cache ──────────────────────────────────────────
    r = _get_redis()
    if r:
        try:
            cache_key = f"live:{data_type}:{vcu_id}"
            r.setex(cache_key, CACHE_TTL, json.dumps(payload))
            logger.debug(f"Cached {cache_key}")
        except Exception as e:
            logger.warning(f"Redis cache write failed for {vcu_id}: {e}")

    # ── 2. WebSocket Broadcast ──────────────────────────────────
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"vehicle_{vcu_id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "telemetry_message",
                    "data": {
                        "data_type": data_type,
                        "vcu_id": vcu_id,
                        **payload,
                    }
                }
            )
            logger.debug(f"Broadcast {data_type} to group {group_name}")
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed for {vcu_id}: {e}")
