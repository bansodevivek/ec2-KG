# core/mqtt_publisher.py
"""
MQTT Publisher utility
Publishes messages to MQTT topics from Django application code.
"""

import json
import logging
from django.conf import settings
import paho.mqtt.publish as mqtt_publish

logger = logging.getLogger(__name__)


def publish_message(topic, payload, qos=1, retain=False):
    """
    Publish a message to an MQTT topic.
    
    Args:
        topic:   MQTT topic string
        payload: dict or string payload
        qos:     Quality of Service (0, 1, 2)
        retain:  Retain flag
    
    Returns:
        bool: True if published successfully
    """
    try:
        broker = getattr(settings, 'MQTT_BROKER', 'test.mosquitto.org')
        port = getattr(settings, 'MQTT_PORT', 1883)
        username = getattr(settings, 'MQTT_USERNAME', None)
        password = getattr(settings, 'MQTT_PASSWORD', None)

        auth = None
        if username and password:
            auth = {'username': username, 'password': password}

        message = json.dumps(payload) if isinstance(payload, dict) else payload

        mqtt_publish.single(
            topic,
            payload=message,
            qos=qos,
            retain=retain,
            hostname=broker,
            port=port,
            auth=auth,
        )

        logger.info(f"Published to {topic}")
        return True

    except Exception as e:
        logger.error(f"Failed to publish to {topic}: {e}")
        return False


def publish_control_response(vcu_id, command, status, message=""):
    """
    Publish a control command response back to the vehicle/app.
    
    Args:
        vcu_id:  Vehicle Control Unit ID
        command: Command name (e.g. 'horn', 'lock')
        status:  'success' or 'error'
        message: Optional message
    """
    topic = f"kg_dash/{vcu_id}/control/response"
    payload = {
        "command": command,
        "status": status,
        "message": message,
    }
    return publish_message(topic, payload)
