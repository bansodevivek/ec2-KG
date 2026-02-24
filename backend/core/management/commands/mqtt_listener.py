# core/management/commands/mqtt_listener.py
"""
Updated MQTT Listener
Handles segregated MQTT topics:
- kg_dash/{VCU_ID}/can-data
- kg_dash/{VCU_ID}/tyre
- kg_dash/{VCU_ID}/location
- kg_dash/{VCU_ID}/status
"""

from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
import time
import logging

# Import MQTT handlers (DB + Redis cache + WebSocket broadcast pipeline)
from core.mqtt.handlers import (
    handle_can_data,
    handle_tyre_pressure,
    handle_location,
    handle_status
)

# Import auth handlers (keep existing)
from core.mqtt_auth_handler import handle_mqtt_login, handle_mqtt_signup

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Listens for MQTT messages on segregated topics and processes them'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting MQTT Listener (Segregated Topics)...'))

        # Use CallbackAPIVersion.VERSION2 for paho-mqtt >= 2.0
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)

        client.on_message = self.on_message
        client.on_connect = self.on_connect
        client.on_disconnect = self.on_disconnect
        
        self.stdout.write("Connecting to MQTT broker...")
        try:
            # Connect to broker
            client.connect("test.mosquitto.org", 1883, 300)
            
            # Use loop_start() to run in background thread
            client.loop_start()
            self.stdout.write(self.style.SUCCESS('MQTT background loop started'))
            
            # Keep the management command alive
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Stopping MQTT listener..."))
            client.loop_stop()
            client.disconnect()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Connection failed: {e}"))

    def on_connect(self, client, userdata, flags, rc, properties=None):
        """Called when connected to MQTT broker"""
        if rc == 0:
            self.stdout.write(self.style.SUCCESS("✓ Connected to MQTT broker"))
            
            # Subscribe to wildcard topics for all vehicles
            subscriptions = [
                ("kg_dash/+/can-data", 0),      # CAN data from any vehicle
                ("kg_dash/+/tyre", 0),          # Tyre pressure from any vehicle
                ("kg_dash/+/location", 0),      # Location from any vehicle
                ("kg_dash/+/status", 0),        # Status from any vehicle
                # Legacy auth topics
                ("kg-dash/user/login", 0),
                ("kg-dash/user/signup", 0),
            ]
            
            # Subscribe to all topics
            client.subscribe(subscriptions)
            
            self.stdout.write(self.style.SUCCESS("✓ Subscribed to topics:"))
            for topic, qos in subscriptions:
                self.stdout.write(f"  - {topic}")
        else:
            self.stdout.write(self.style.ERROR(f"✗ Connection failed with code {rc}"))

    def on_disconnect(self, client, userdata, rc, properties=None):
        """Called when disconnected from MQTT broker"""
        self.stdout.write(self.style.WARNING(f"⚠ Disconnected from MQTT broker (code: {rc})"))
        if rc != 0:
            self.stdout.write(self.style.WARNING("  Unexpected disconnection, will auto-reconnect"))

    def on_message(self, client, userdata, msg):
        """Called when a message is received"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8', errors='replace')
            
            self.stdout.write(f"📨 [{topic}] Message received")
            
            # Route to appropriate processor based on topic
            
            # CAN Data: kg_dash/{VCU_ID}/can-data
            if '/can-data' in topic:
                self._process_can_data(topic, payload)
            
            # Tyre Pressure: kg_dash/{VCU_ID}/tyre
            elif '/tyre' in topic:
                self._process_tyre_pressure(topic, payload)
            
            # Location: kg_dash/{VCU_ID}/location
            elif '/location' in topic:
                self._process_location(topic, payload)
            
            # Status: kg_dash/{VCU_ID}/status
            elif '/status' in topic:
                self._process_status(topic, payload)
            
            # Legacy auth topics
            elif topic == "kg-dash/user/login":
                handle_mqtt_login(client, payload)
                self.stdout.write(self.style.SUCCESS('✓ Login request handled'))
            
            elif topic == "kg-dash/user/signup":
                handle_mqtt_signup(client, payload)
                self.stdout.write(self.style.SUCCESS('✓ Signup request handled'))
            
            else:
                self.stdout.write(self.style.WARNING(f"⚠ Unknown topic: {topic}"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error processing message: {e}"))
            import traceback
            self.stdout.write(traceback.format_exc())

    def _process_can_data(self, topic, payload):
        """Process CAN data topic → DB + Redis + WebSocket"""
        try:
            data = json.loads(payload)
            vcu_id = topic.split('/')[1]
            
            self.stdout.write(f"  VCU_ID: {vcu_id}, Speed: {data.get('MD', {}).get('VS', 'N/A')} km/h")
            
            # Full pipeline: DB save + alerts + trips + Redis cache + WS broadcast
            entry = handle_can_data(vcu_id, data)
            
            if entry:
                self.stdout.write(self.style.SUCCESS('✓ CAN data → DB + Redis + WebSocket'))
            else:
                self.stdout.write(self.style.ERROR('✗ Failed to process CAN data'))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'✗ JSON decode error in CAN data: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error processing CAN data: {e}'))

    def _process_tyre_pressure(self, topic, payload):
        """Process tyre pressure topic → DB + Redis + WebSocket"""
        try:
            data = json.loads(payload)
            vcu_id = topic.split('/')[1]
            
            self.stdout.write(f"  VCU_ID: {vcu_id}, Front: {data.get('front', 'N/A')} PSI, Rear: {data.get('rear', 'N/A')} PSI")
            
            entry = handle_tyre_pressure(vcu_id, data)
            
            if entry:
                self.stdout.write(self.style.SUCCESS('✓ Tyre pressure → DB + Redis + WebSocket'))
            else:
                self.stdout.write(self.style.ERROR('✗ Failed to process tyre pressure'))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'✗ JSON decode error in tyre data: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error processing tyre pressure: {e}'))

    def _process_location(self, topic, payload):
        """Process location topic → DB + Redis + WebSocket"""
        try:
            data = json.loads(payload)
            vcu_id = topic.split('/')[1]
            
            self.stdout.write(f"  VCU_ID: {vcu_id}, Lat: {data.get('lat', 'N/A')}, Lng: {data.get('lng', 'N/A')}")
            
            entry = handle_location(vcu_id, data)
            
            if entry:
                self.stdout.write(self.style.SUCCESS('✓ Location → DB + Redis + WebSocket'))
            else:
                self.stdout.write(self.style.ERROR('✗ Failed to process location'))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'✗ JSON decode error in location data: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error processing location: {e}'))

    def _process_status(self, topic, payload):
        """Process status/heartbeat topic → DB + Redis + WebSocket"""
        try:
            data = json.loads(payload)
            vcu_id = topic.split('/')[1]
            
            self.stdout.write(f"  VCU_ID: {vcu_id}, Online: {data.get('online', 'N/A')}, FW: {data.get('fw_ver', 'N/A')}")
            
            entry = handle_status(vcu_id, data)
            
            if entry:
                self.stdout.write(self.style.SUCCESS('✓ Status → DB + Redis + WebSocket'))
            else:
                self.stdout.write(self.style.ERROR('✗ Failed to process status'))
            
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'✗ JSON decode error in status data: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error processing status: {e}'))