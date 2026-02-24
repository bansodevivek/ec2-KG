# core/management/commands/verify_live_data.py
"""
Management command to verify live data system is working
Usage: python manage.py verify_live_data
"""

from django.core.management.base import BaseCommand
from core.Services import live_data_manager
from core.Services.live_data_manager import LiveDataManager
from core.models import VehicleInfo, VehicleRawData
from django.contrib.auth.models import User
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Verify live data system is working correctly'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('=== Live Data System Verification ===\n'))
        
        # 1. Check cache
        self.stdout.write('1. Checking Django Cache...')
        try:
            cache.set('test_key', 'test_value', timeout=10)
            value = cache.get('test_key')
            if value == 'test_value':
                self.stdout.write(self.style.SUCCESS('   ✓ Cache is working'))
            else:
                self.stdout.write(self.style.ERROR('   ✗ Cache not working properly'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Cache error: {e}'))
        
        # 2. Check live data manager
        self.stdout.write('\n2. Checking Live Data Manager...')
        try:
            latest_data = live_data_manager.latest_raw_data
            if latest_data and 'MD' in latest_data:
                speed = latest_data.get('MD', {}).get('VS', 0)
                soc = latest_data.get('BMS', {}).get('SOC', 0)
                timestamp = latest_data.get('timestamp', 'No timestamp')
                self.stdout.write(self.style.SUCCESS('   ✓ Live data available'))
                self.stdout.write(f'     Speed: {speed} km/h')
                self.stdout.write(f'     SOC: {soc}%')
                self.stdout.write(f'     Last update: {timestamp}')
            else:
                self.stdout.write(self.style.WARNING('   ! No live data available yet'))
                self.stdout.write('     Wait for MQTT data or check if mqtt_listener is running')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {e}'))
        
        # 3. Check vehicle info
        self.stdout.write('\n3. Checking Vehicle Info...')
        try:
            vehicle_info = live_data_manager.latest_vehicle_info
            if vehicle_info:
                self.stdout.write(self.style.SUCCESS('   ✓ Vehicle info available'))
                self.stdout.write(f'     Model: {vehicle_info.get("modelName", "Unknown")}')
                self.stdout.write(f'     VIN: {vehicle_info.get("vin", "Unknown")}')
            else:
                self.stdout.write(self.style.WARNING('   ! No vehicle info yet'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {e}'))
        
        # 4. Check database
        self.stdout.write('\n4. Checking Database...')
        try:
            vehicle_count = VehicleInfo.objects.count()
            rawdata_count = VehicleRawData.objects.count()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Database accessible'))
            self.stdout.write(f'     Vehicles in DB: {vehicle_count}')
            self.stdout.write(f'     Raw data records: {rawdata_count}')
            
            if rawdata_count > 0:
                latest_db_data = VehicleRawData.objects.latest('timestamp')
                self.stdout.write(f'     Latest DB record: {latest_db_data.timestamp}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Database error: {e}'))
        
        # 5. Check users
        self.stdout.write('\n5. Checking Users...')
        try:
            user_count = User.objects.count()
            users_with_roles = User.objects.filter(role_profile__isnull=False).count()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Users in system: {user_count}'))
            self.stdout.write(f'     Users with roles: {users_with_roles}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {e}'))
        
        # 6. Check data history
        self.stdout.write('\n6. Checking Data History...')
        try:
            history = live_data_manager.raw_data_history
            self.stdout.write(self.style.SUCCESS(f'   ✓ History records: {len(history)}'))
            if len(history) > 0:
                self.stdout.write('     History is being maintained')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {e}'))
        
        # 7. Check alerts
        self.stdout.write('\n7. Checking Alerts...')
        try:
            active_alerts = live_data_manager.active_alerts
            self.stdout.write(self.style.SUCCESS(f'   ✓ Active alerts: {len(active_alerts)}'))
            for alert in active_alerts:
                self.stdout.write(f'     - {alert.get("message", "Unknown alert")}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {e}'))
        
        # Summary
        self.stdout.write(self.style.WARNING('\n=== Verification Complete ==='))
        self.stdout.write('\nTo test API endpoints:')
        self.stdout.write('1. Login: POST /api/login/')
        self.stdout.write('2. Get dashboard: GET /api/live/dashboard/')
        self.stdout.write('3. Get complete data: GET /api/live/complete/')
        self.stdout.write('\nMake sure mqtt_listener is running:')
        self.stdout.write('   python manage.py mqtt_listener')