from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Initialize MQTT service when Django starts
        This runs once when the server starts
        """
        import sys
        
        # Avoid running during migrations or other management commands
        management_commands = [
            'makemigrations', 'migrate', 'createsuperuser',
            'shell', 'test', 'collectstatic', 'showmigrations',
            'dbshell', 'inspectdb', 'flush'
        ]
        
        try:
            argv = sys.argv
        except AttributeError:
            return
        
        if len(argv) > 1 and argv[1] in management_commands:
            return
        
        if 'runserver' not in argv and not any('uvicorn' in arg or 'gunicorn' in arg for arg in argv):
            return
            
        try:
            from core.Services.vehicle_control import vehicle_control_service
            print("✓ MQTT Vehicle Control Service initialized successfully")
        except ImportError as e:
            print(f"⚠ Warning: Could not import vehicle_control service: {e}")
            print("  Make sure paho-mqtt is installed: pip install paho-mqtt")
        except Exception as e:
            print(f"✗ Failed to initialize MQTT service: {e}")