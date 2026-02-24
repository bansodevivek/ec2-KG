from django.core.management.base import BaseCommand
from core.services.vcu_client import fetch_vcu_data
from core.services.processor import process_data
from core.models import VehicleTelemetry
from datetime import datetime

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        data = fetch_vcu_data()
        data = process_data(data)

        VehicleTelemetry.objects.create(
            vehicle_id=data["vehicle_id"],
            speed=data["speed"],
            brake=data["brake"],
            motor_temp=data["motor_temp"],
            battery_voltage=data["battery_voltage"],
            battery_current=data["battery_current"],
            power=data["power"],
            timestamp=datetime.fromisoformat(data["timestamp"])
        )
