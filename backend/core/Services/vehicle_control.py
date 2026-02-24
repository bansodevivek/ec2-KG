# core/Services/vehicle_control.py

import json
import logging
from typing import Optional, Dict, Any
from django.conf import settings
import paho.mqtt.client as mqtt
from threading import Lock

logger = logging.getLogger(__name__)


class VehicleControlService:
    """
    MQTT Service for publishing vehicle control commands
    Compatible with ARIS ESP32 firmware format
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.client = None
            self.is_connected = False
            self.initialize_mqtt()
            self.initialized = True

    def initialize_mqtt(self):
        """Initialize MQTT client connection"""
        try:
            # MQTT Broker Configuration
            broker = getattr(settings, 'MQTT_BROKER', 'test.mosquitto.org')
            port = getattr(settings, 'MQTT_PORT', 1883)
            username = getattr(settings, 'MQTT_USERNAME', None)
            password = getattr(settings, 'MQTT_PASSWORD', None)
            
            # Create MQTT Client
            self.client = mqtt.Client(
                client_id=f"django_control_{settings.SECRET_KEY[:8]}",
                clean_session=True,
                protocol=mqtt.MQTTv311
            )
            
            # Set credentials if provided
            if username and password:
                self.client.username_pw_set(username, password)
            
            # Set callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_publish = self._on_publish
            
            # Connect to broker
            self.client.connect(broker, port, keepalive=60)
            self.client.loop_start()
            
            logger.info(f"MQTT Client initialized and connecting to {broker}:{port}")
            
        except Exception as e:
            logger.error(f"Failed to initialize MQTT client: {e}")
            self.is_connected = False

    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self.is_connected = True
            logger.info("Successfully connected to MQTT broker")
        else:
            self.is_connected = False
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.is_connected = False
        if rc != 0:
            logger.warning(f"Unexpected MQTT disconnection. Code: {rc}")

    def _on_publish(self, client, userdata, mid):
        """Callback when message is published"""
        logger.debug(f"Message published with mid: {mid}")

    # Mapping from our control types to ESP32 command format
    CONTROL_COMMAND_MAP = {
        'immobilizer': 'immobilize',
        'horn': 'horn',
        'headlights': 'headlights',
        'hazard_lights': 'hazard',
        'vehicle_lock': 'lock',
        'seat_lock': 'seat_lock',
        'vehicle_power': 'power',
        'indicators': 'indicators',
        'brake_lights': 'brake_lights'
    }

    def publish_control_command(
        self, 
        control_type: str, 
        value: Any,
        qos: int = 1
    ) -> bool:
        """
        Publish a control command to the vehicle in ESP32 format
        
        Args:
            control_type: Type of control (immobilizer, horn, headlights, etc.)
            value: Control value (True/False for boolean controls)
            qos: MQTT QoS level (0, 1, or 2)
            
        Returns:
            bool: True if published successfully, False otherwise
        """
        if not self.is_connected:
            logger.error("MQTT client not connected. Cannot publish command.")
            return False

        try:
            # Single topic without vehicle ID
            topic = "aris/vehicle/control"
            
            # Map control_type to ESP32 command format
            command = self.CONTROL_COMMAND_MAP.get(control_type, control_type)
            
            # Create payload in ESP32 expected format
            payload = {
                "command": command,
                "value": "true" if value else "false"  # ESP32 expects string
            }
            
            # Publish message
            result = self.client.publish(
                topic,
                json.dumps(payload),
                qos=qos,
                retain=False
            )
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Published {command}={value} to {topic}")
                return True
            else:
                logger.error(f"Failed to publish to {topic}. Error code: {result.rc}")
                return False
                
        except Exception as e:
            logger.error(f"Error publishing control command: {e}")
            return False

    def control_immobilizer(self, activate: bool) -> bool:
        """Control vehicle immobilizer"""
        return self.publish_control_command(
            control_type="immobilizer",
            value=activate
        )

    def control_horn(self, activate: bool) -> bool:
        """Control vehicle horn"""
        return self.publish_control_command(
            control_type="horn",
            value=activate
        )

    def control_headlights(self, activate: bool) -> bool:
        """Control vehicle headlights"""
        return self.publish_control_command(
            control_type="headlights",
            value=activate
        )

    def control_hazard_lights(self, activate: bool) -> bool:
        """Control vehicle hazard lights"""
        return self.publish_control_command(
            control_type="hazard_lights",
            value=activate
        )

    def control_lock(self, lock: bool) -> bool:
        """Control vehicle lock"""
        return self.publish_control_command(
            control_type="vehicle_lock",
            value=lock
        )

    def control_seat_lock(self, lock: bool) -> bool:
        """Control seat lock"""
        return self.publish_control_command(
            control_type="seat_lock",
            value=lock
        )

    def control_power(self, on: bool) -> bool:
        """Control vehicle power"""
        return self.publish_control_command(
            control_type="vehicle_power",
            value=on
        )

    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"

    def disconnect(self):
        """Disconnect MQTT client"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
            logger.info("MQTT client disconnected")


# Singleton instance
vehicle_control_service = VehicleControlService()