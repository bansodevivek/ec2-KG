# core/caches/telemetry_cache.py

import json
import logging

logger = logging.getLogger(__name__)

# ── Lazy Redis connection ──────────────────────────────────────────
_redis_client = None


def _get_redis():
    """Create Redis connection on first use (lazy init)."""
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
        logger.info("TelemetryCache: Redis connection established")
        return _redis_client
    except Exception as e:
        logger.warning(f"TelemetryCache: Redis unavailable: {e}")
        return None


# ── Cache TTL ──────────────────────────────────────────────────────
CACHE_TTL = 300  # 5 minutes


class TelemetryCache:
    """Redis-backed cache for live vehicle telemetry data."""

    # ── Write methods ──────────────────────────────────────────────

    def cache_can_data(self, vcu_id, data):
        """Cache CAN bus data."""
        r = _get_redis()
        if not r:
            return False
        try:
            key = f"live:can:{vcu_id}"
            r.setex(key, CACHE_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"cache_can_data failed: {e}")
            return False

    def cache_location(self, vcu_id, data):
        """Cache GPS location data."""
        r = _get_redis()
        if not r:
            return False
        try:
            key = f"live:location:{vcu_id}"
            r.setex(key, CACHE_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"cache_location failed: {e}")
            return False

    def cache_tyre(self, vcu_id, data):
        """Cache tyre pressure data."""
        r = _get_redis()
        if not r:
            return False
        try:
            key = f"live:tyre:{vcu_id}"
            r.setex(key, CACHE_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"cache_tyre failed: {e}")
            return False

    def cache_status(self, vcu_id, data):
        """Cache vehicle status data."""
        r = _get_redis()
        if not r:
            return False
        try:
            key = f"live:status:{vcu_id}"
            r.setex(key, CACHE_TTL, json.dumps(data))
            return True
        except Exception as e:
            logger.warning(f"cache_status failed: {e}")
            return False

    # ── Read methods ───────────────────────────────────────────────

    def get_can_data(self, vcu_id):
        """Get cached CAN data."""
        r = _get_redis()
        if not r:
            return None
        try:
            data = r.get(f"live:can:{vcu_id}")
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"get_can_data failed: {e}")
            return None

    def get_location(self, vcu_id):
        """Get cached location."""
        r = _get_redis()
        if not r:
            return None
        try:
            data = r.get(f"live:location:{vcu_id}")
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"get_location failed: {e}")
            return None

    def get_tyre(self, vcu_id):
        """Get cached tyre pressure."""
        r = _get_redis()
        if not r:
            return None
        try:
            data = r.get(f"live:tyre:{vcu_id}")
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"get_tyre failed: {e}")
            return None

    def get_status(self, vcu_id):
        """Get cached vehicle status."""
        r = _get_redis()
        if not r:
            return None
        try:
            data = r.get(f"live:status:{vcu_id}")
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"get_status failed: {e}")
            return None

    def get_all_latest(self, vcu_id):
        """Get all cached telemetry for a vehicle."""
        r = _get_redis()
        if not r:
            return {'can': None, 'location': None, 'tyre': None, 'status': None}
        try:
            pipe = r.pipeline()
            pipe.get(f"live:can:{vcu_id}")
            pipe.get(f"live:location:{vcu_id}")
            pipe.get(f"live:tyre:{vcu_id}")
            pipe.get(f"live:status:{vcu_id}")
            results = pipe.execute()

            return {
                'can': json.loads(results[0]) if results[0] else None,
                'location': json.loads(results[1]) if results[1] else None,
                'tyre': json.loads(results[2]) if results[2] else None,
                'status': json.loads(results[3]) if results[3] else None,
            }
        except Exception as e:
            logger.warning(f"get_all_latest failed: {e}")
            return {'can': None, 'location': None, 'tyre': None, 'status': None}

    def get_vin_to_vcu(self, vin):
        """Get VCU_ID from VIN via cache."""
        r = _get_redis()
        if not r:
            return None
        try:
            return r.get(f"vin:vcu:{vin}")
        except Exception:
            return None

    def set_vin_to_vcu(self, vin, vcu_id):
        """Cache VIN→VCU mapping (24hr TTL)."""
        r = _get_redis()
        if not r:
            return False
        try:
            r.setex(f"vin:vcu:{vin}", 86400, vcu_id)
            return True
        except Exception:
            return False


# Singleton instance
telemetry_cache = TelemetryCache()
