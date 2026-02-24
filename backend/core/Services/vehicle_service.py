from core.models.vehicleSpecs import VehicleSpecsTemplate
from core.models import VehicleInfo, VehicleSpecs
from django.db import transaction
from django.shortcuts import get_list_or_404, get_object_or_404
from rest_framework.exceptions import ValidationError
from django.db.models import Q

class VehicleService:
    @staticmethod
    @transaction.atomic
    def register_eol_vehicle(data, specs_template_id, created_by_user):
        """
        Simplified EOL Logic:
        Takes a flat dictionary of manually entered fields and a template ID
        to create the vehicle and its associated specs.
        """
        # 1. Fetch the specifications template
        template = get_object_or_404(VehicleSpecsTemplate, id=specs_template_id)
        
        # 2. Clean and Validate VIN
        vin = str(data.get('vin', '')).upper().strip()
        if not vin:
            raise ValidationError("VIN is required.")
            
        if VehicleInfo.objects.filter(vin=vin).exists():
            raise ValidationError(f"Vehicle with VIN {vin} already exists.")

        # 3. Create VehicleInfo (Manual fields + Template fields)
        vehicle = VehicleInfo.objects.create(
            vin=vin,
            # Manual Hardware IDs
            battery_serial_number=data.get('battery_serial_number'),
            vcu_id=data.get('vcu_id'),
            cluster_id=data.get('cluster_id'),
            controller_serial_number=data.get('controller_serial_number'),
            charger_serial_number=data.get('charger_serial_number'),
            colour=data.get('colour'),
            vehicle_no=data.get('vehicle_no'),

            # Inherited from Template
            model=template.model,
            variant=template.variant,
            model_name=f"{template.model} {template.variant}",
            make=getattr(template, 'make', 'EV Company'),
            battery_type=getattr(template, 'battery_type', 'Lithium Ion'),
            charger_type=getattr(template, 'charger_type', 'Standard'),
            
            # --- FIX: Assign template to VehicleInfo here ---
            specs_template=template,
            # ------------------------------------------------
            
            created_by=created_by_user
        )
        
        # 4. Create VehicleSpecs link (This serves as a secondary reference or history)
        VehicleSpecs.objects.create(
            vin=vehicle,
            specs_template=template
        )
        
        return vehicle

    @staticmethod
    def get_vehicle_complete_info(vin):
        """
        Retrieves vehicle info and joins with specs for a complete view.
        """
        vehicle = get_object_or_404(VehicleInfo, vin=vin)
        
        # Try to get linked specs, default to empty if not found
        specs_data = {}
        try:
            if hasattr(vehicle, 'specifications'):
                specs_data = vehicle.specifications.get_all_specs()
        except Exception:
            pass

        return {
            'vehicle_info': {
                'vin': vehicle.vin,
                'vehicle_no': vehicle.vehicle_no,
                'model_name': vehicle.model_name,
                'model': vehicle.model,
                'variant': vehicle.variant,
                'colour': vehicle.colour,
                'vcu_id': vehicle.vcu_id,
                'battery_serial_number': vehicle.battery_serial_number,
            },
            'specifications': specs_data
        }
    @staticmethod
    @transaction.atomic # --- FIX: Add this decorator ---
    def delete_vehicle(vin):
        """
        Deletes a vehicle and its associated specs.
        """
        # get_object_or_404 raises Http404, which DRF handles automatically
        # to return a 404 response.
        vehicle = get_object_or_404(VehicleInfo, vin=str(vin))
        vehicle.delete()

    @staticmethod
    def search_vehicle(search_term):
        """
        Searches for vehicles by VIN or Model Name and returns all matches.
        """
        query = Q(vin__icontains=search_term) | Q(model_name__icontains=search_term)
        
        # Returns a list of matches or raises 404 if the list is empty
        return get_list_or_404(VehicleInfo, query)    