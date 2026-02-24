from django.db import transaction
from django.db.models import F, OuterRef, Subquery, BooleanField, ExpressionWrapper
from django.contrib.auth.models import User
from django.forms import ValidationError
from django.shortcuts import get_object_or_404
from core.models.DealerInformation import DealerInformation
from core.models.rolesUser import DealerVehicle, RoleUser, VehicleOwnership

class DealerService:
    # ... get_all_dealers and create_dealer methods remain the same ...
    
    @staticmethod
    def get_all_dealers():
        """
        Retrieves all dealers with associated user details
        (name, email, phone) combined in one query.
        """
        return DealerInformation.objects.annotate(
            # Fetching data from auth_user table
            partner_name=F('user__first_name'),
            email_id=F('user__email'),
            # Fetching phone from RoleUser profile
            mobile_no=F('user__role_profile__phone')
        ).values(
            'reference_no',
            'dealer_code',
            'dealership_name',
            'partner_name', # Annotated field
            'email_id',      # Annotated field
            'mobile_no',     # Annotated field
            'state',
            'location',
            'lead_status'
        )

    @staticmethod
    @transaction.atomic
    def create_dealer(dealer_data):
        """
        Creates a new dealer user and their associated information.
        """
        # 1. Validate Email uniqueness
        email = dealer_data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError("A user with this email already exists.")

        # 2. Create User in auth_user table
        user = User.objects.create_user(
            username=dealer_data.get('username'),
            email=email,
            password=dealer_data.get('password'),
            first_name=dealer_data.get('first_name'),
            last_name=dealer_data.get('last_name')
        )

        # 3. Create RoleUser profile
        RoleUser.objects.create(
            user=user,
            role='DEALER',
            phone=dealer_data.get('phone')
        )

        # 4. Create DealerInformation record
        dealer_info = DealerInformation.objects.create(
            user=user,
            reference_no=dealer_data.get('reference_no'),
            dealer_code=dealer_data.get('dealer_code'),
            dealership_name=dealer_data.get('dealership_name'),
            for_party_creation=dealer_data.get('for_party_creation'),
            dealer_address=dealer_data.get('dealer_address'),
            state=dealer_data.get('state'),
            zone=dealer_data.get('zone'),
            location=dealer_data.get('location'),
            pin_code=dealer_data.get('pin_code'),
            gst_no=dealer_data.get('gst_no'),
            loi_date=dealer_data.get('loi_date'),
            loi_valid_upto=dealer_data.get('loi_valid_upto'),
            lead_status=dealer_data.get('lead_status')
        )
        
        return dealer_info

    @staticmethod
    def get_dealer_inventory_and_history_by_code(dealer_code):
        """
        Retrieves inventory and selling history using dealer_code.
        """
        # 1. Lookup the dealer information record by code
        dealer_info = get_object_or_404(DealerInformation, dealer_code=dealer_code)
        dealer_user = dealer_info.user
        
        # Subquery to check if a VIN from DealerVehicle exists in VehicleOwnership
        is_sold_subquery = VehicleOwnership.objects.filter(
            vin=OuterRef('vin')
        )

        vehicles = DealerVehicle.objects.filter(dealer=dealer_user).annotate(
            sold_status=ExpressionWrapper(
                Subquery(is_sold_subquery.values('pk')[:1]),
                output_field=BooleanField()
            ),
            # Fetch purchaser details if sold
            purchased_date=Subquery(is_sold_subquery.values('purchased_date')[:1]),
            customer_name=Subquery(is_sold_subquery.values('user__username')[:1])
        ).order_by('-assigned_date')

        # Structure the data
        inventory = []
        selling_history = []

        for vehicle in vehicles:
            vehicle_data = {
                "vin": vehicle.vin,
                "dealer_name": vehicle.dealer_name,
                "assigned_date": vehicle.assigned_date,
            }

            if vehicle.sold_status: 
                vehicle_data.update({
                    "customer_name": vehicle.customer_name,
                    "purchased_date": vehicle.purchased_date
                })
                selling_history.append(vehicle_data)
            else:
                inventory.append(vehicle_data)

        # Calculate statistics
        total_assigned = len(vehicles)
        total_sold = len(selling_history)
        total_inventory = len(inventory)

        return {
            "dealer_code": dealer_code,
            "dealership_name": dealer_info.dealership_name,
            "statistics": {
                "total_assigned": total_assigned,
                "total_sold": total_sold,
                "total_inventory": total_inventory
            },
            "inventory": inventory,
            "selling_history": selling_history
        }