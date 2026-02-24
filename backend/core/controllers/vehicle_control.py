"""
Vehicle Control Commands Handler
Manages all vehicle control operations (horn, hazard, lock, unlock, etc.)
"""

import logging
from django.core.cache import cache
from django.utils import timezone
from core.models import ControlCommandLog  # You'll need to create this model
from core.mqtt_publisher import mqtt_publisher

logger = logging.getLogger(__name__)


class VehicleControlError(Exception):
    """Custom exception for vehicle control errors"""
    pass


class VehicleController:
    """
    Handles all vehicle control operations
    """
    
    # Define valid commands and their configurations
    VALID_COMMANDS = {
        'horn': {
            'topic_suffix': 'control/horn',
            'requires_value': True,
            'value_type': bool
        },
        'hazard': {
            'topic_suffix': 'control/hazard',
            'requires_value': True,
            'value_type': bool
        },
        'headlight': {
            'topic_suffix': 'control/headlight',
            'requires_value': True,
            'value_type': bool
        },
        'lock': {
            'topic_suffix': 'control/lock',
            'requires_value': False,
            'value_type': None
        },
        'unlock': {
            'topic_suffix': 'control/unlock',
            'requires_value': False,
            'value_type': None
        },
        'climate_on': {
            'topic_suffix': 'control/climate',
            'requires_value': True,
            'value_type': dict,  # {"temperature": 22, "mode": "cool"}
        },
        'climate_off': {
            'topic_suffix': 'control/climate',
            'requires_value': False,
            'value_type': None
        },
        'trunk_open': {
            'topic_suffix': 'control/trunk',
            'requires_value': False,
            'value_type': None
        },
    }

    @classmethod
    def validate_command(cls, command, value=None):
        """
        Validate command and its value
        
        Args:
            command: Command name (e.g., 'horn', 'hazard')
            value: Command value (can be bool, dict, or None)
        
        Returns:
            tuple: (is_valid, error_message)
        """
        if command not in cls.VALID_COMMANDS:
            return False, f"Invalid command. Valid commands: {list(cls.VALID_COMMANDS.keys())}"
        
        cmd_config = cls.VALID_COMMANDS[command]
        
        # Check if value is required
        if cmd_config['requires_value'] and value is None:
            return False, f"Command '{command}' requires a value"
        
        # Check value type
        if cmd_config['requires_value'] and cmd_config['value_type']:
            expected_type = cmd_config['value_type']
            if not isinstance(value, expected_type):
                return False, f"Command '{command}' expects value of type {expected_type.__name__}"
        
        return True, None

    @classmethod
    def send_command(cls, vcu_id, command, value=None, user=None):
        """
        Send control command to vehicle
        
        Args:
            vcu_id: Vehicle Control Unit ID
            command: Command name (horn, hazard, etc.)
            value: Command value (True/False or dict)
            user: User who initiated the command
        
        Returns:
            dict: Result with success status and command_id
        """
        
        # Validate command
        is_valid, error_msg = cls.validate_command(command, value)
        if not is_valid:
            logger.error(f"Invalid command: {error_msg}")
            raise VehicleControlError(error_msg)
        
        # Prepare payload
        cmd_config = cls.VALID_COMMANDS[command]
        topic = f"kg_dash/{vcu_id}/{cmd_config['topic_suffix']}"
        
        payload = {
            "command": command,
            "timestamp": int(timezone.now().timestamp())
        }
        
        # Add value if present
        if value is not None:
            if isinstance(value, bool):
                payload["value"] = value
            elif isinstance(value, dict):
                payload.update(value)
        
        # Log command to database
        try:
            command_log = ControlCommandLog.objects.create(
                vcu_id=vcu_id,
                command=command,
                payload=payload,
                user=user,
                status='pending'
            )
            command_id = command_log.id
            logger.info(f"Command logged: ID={command_id}")
        except Exception as e:
            logger.error(f"Failed to log command: {e}")
            command_id = None
        
        # Publish to MQTT
        result = mqtt_publisher.publish_control_command(
            vcu_id=vcu_id,
            command_type=command,
            command_data=payload,
            qos=1
        )
        
        if result['success']:
            # Store in cache for quick status check
            cache.set(
                f"control_cmd:{vcu_id}:{command_id}",
                {"status": "sent", "timestamp": timezone.now().isoformat()},
                timeout=300  # 5 minutes
            )
            
            # Update log status
            if command_id:
                try:
                    command_log.status = 'sent'
                    command_log.save(update_fields=['status'])
                except:
                    pass
            
            logger.info(f" Control command sent: {vcu_id} -> {command}")
            return {
                "success": True,
                "command_id": command_id,
                "vcu_id": vcu_id,
                "command": command,
                "topic": topic
            }
        else:
            # Update log status
            if command_id:
                try:
                    command_log.status = 'failed'
                    command_log.error_message = result.get('error')
                    command_log.save(update_fields=['status', 'error_message'])
                except:
                    pass
            
            logger.error(f" Control command failed: {result.get('error')}")
            raise VehicleControlError(result.get('error', 'Unknown error'))

    @classmethod
    def get_command_status(cls, command_id):
        """
        Get status of a control command
        
        Args:
            command_id: Command log ID
        
        Returns:
            dict: Command status info
        """
        try:
            command_log = ControlCommandLog.objects.get(id=command_id)
            return {
                "command_id": command_id,
                "vcu_id": command_log.vcu_id,
                "command": command_log.command,
                "status": command_log.status,
                "created_at": command_log.created_at,
                "response": command_log.response
            }
        except ControlCommandLog.DoesNotExist:
            raise VehicleControlError(f"Command {command_id} not found")

    @classmethod
    def process_control_response(cls, vcu_id, response_data):
        """
        Process response from vehicle for a control command
        
        Args:
            vcu_id: Vehicle Control Unit ID
            response_data: Response payload from vehicle
        
        Returns:
            dict: Processing result
        """
        command_id = response_data.get('command_id')
        status = response_data.get('status', 'unknown')
        
        if not command_id:
            logger.warning(f"Control response without command_id: {response_data}")
            return {"success": False, "error": "No command_id in response"}
        
        try:
            # Update command log
            command_log = ControlCommandLog.objects.get(id=command_id)
            command_log.status = status
            command_log.response = response_data
            command_log.response_received_at = timezone.now()
            command_log.save()
            
            # Update cache
            cache.set(
                f"control_cmd:{vcu_id}:{command_id}",
                {
                    "status": status,
                    "response": response_data,
                    "timestamp": timezone.now().isoformat()
                },
                timeout=300
            )
            
            logger.info(f" Control response processed: {command_id} -> {status}")
            return {"success": True, "command_id": command_id, "status": status}
            
        except ControlCommandLog.DoesNotExist:
            logger.error(f"Command log not found: {command_id}")
            return {"success": False, "error": "Command log not found"}
        except Exception as e:
            logger.exception(f"Error processing control response: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
vehicle_controller = VehicleController()