# core/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json


class TelemetryConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        if not self.scope.get("user") or self.scope["user"].is_anonymous:
            print("❌ Unauthorized WebSocket connection attempt")
            await self.close()
            return

        # URL parameter — could be VIN or VCU_ID depending on what frontend sends
        url_param = self.scope['url_route']['kwargs']['vcu_id']

        # ✅ Always resolve to actual VCU_ID via Redis cache → DB
        self.vcu_id = await self.resolve_vcu_id(url_param)

        if not self.vcu_id:
            print(f"❌ Could not resolve VCU_ID for: {url_param}")
            await self.close()
            return

        self.group_name = f"vehicle_{self.vcu_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        print(f"✅ WebSocket connected: param={url_param} → VCU_ID={self.vcu_id} | Group={self.group_name}")

        # Send cached data immediately
        await self.send_initial_cache()

    @database_sync_to_async
    def resolve_vcu_id(self, url_param):
        """
        Resolves URL param to actual VCU_ID.
        Checks Redis cache first, then DB.
        Works whether frontend sends VIN or VCU_ID.
        """
        import redis as redis_lib
        from core.models.VehicleInfo import VehicleInfo

        r = None
        try:
            r = redis_lib.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True,
                                socket_connect_timeout=2)

            # Step 1: Check Redis cache for VIN→VCU mapping
            cache_key = f"vin:vcu:{url_param}"
            cached_vcu = r.get(cache_key)
            if cached_vcu:
                return cached_vcu

            # Step 2: Check if it's already a VCU_ID (live:can:{param} exists in Redis)
            live_key = f"live:can:{url_param}"
            if r.exists(live_key):
                return url_param
        except redis_lib.ConnectionError:
            # Redis down — fall through to DB lookup
            r = None
            print(f"⚠️ Redis unavailable for resolve_vcu_id, falling back to DB")

        # Step 3: DB lookup by VIN
        try:
            vehicle = VehicleInfo.objects.get(vin=url_param)
            vcu_id = vehicle.vcu_id
            if r:
                try:
                    r.setex(f"vin:vcu:{url_param}", 86400, vcu_id)
                except Exception:
                    pass
            return vcu_id
        except VehicleInfo.DoesNotExist:
            pass

        # Step 4: DB lookup by VCU_ID (frontend might send vcu_id directly)
        try:
            VehicleInfo.objects.get(vcu_id=url_param)
            return url_param
        except VehicleInfo.DoesNotExist:
            pass

        return None  # Could not resolve

    @database_sync_to_async
    def get_cached_telemetry(self):
        from core.caches.telemetry_cache import telemetry_cache
        return telemetry_cache.get_all_latest(self.vcu_id)

    async def send_initial_cache(self):
        try:
            cached = await self.get_cached_telemetry()
            if any(v is not None for v in cached.values()):
                await self.send(text_data=json.dumps({
                    "type": "initial_cache",
                    "data": cached
                }))
                print(f"✅ Initial cache sent to {self.vcu_id}")
            else:
                print(f"⚠️ No cache available yet for {self.vcu_id}")
        except Exception as e:
            print(f"⚠️ Could not send initial cache for {self.vcu_id}: {e}")

    async def disconnect(self, close_code):
        if not hasattr(self, 'vcu_id'):
            return
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print(f"🔌 WebSocket disconnected: VCU_ID={self.vcu_id} | Code={close_code}")

    async def telemetry_message(self, event):
        """Called by Celery task via channel layer group_send"""
        await self.send(text_data=json.dumps(event["data"]))
