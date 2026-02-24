# core/services/fleet_service.py

from core.models.fleet import Fleet
from core.models.rolesUser import FleetVehicle, RoleUser, VehicleOwnership
from core.models.rawcandata import AccessLog 
from django.db import transaction
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

def get_all_fleets():
    """Fetches all fleets with managers, members, and vehicles."""
    return Fleet.objects.all().prefetch_related('manager', 'members')

@transaction.atomic
def create_fleet_and_setup_profile(data, created_by_user):
    """
    Creates a new Fleet Manager User and Fleet in a single transaction.
    
    This service:
    1. Validates the requesting user has permission (SUPER_ADMIN, OEM, or RANDD)
    2. Creates a new User account for the fleet manager
    3. Creates a RoleUser profile with FLEET role
    4. Creates the Fleet entry linking to the new manager
    5. Logs the action
    
    Args:
        data (dict): Dictionary containing:
            - username: Fleet manager's username
            - email: Fleet manager's email
            - password: Fleet manager's password
            - first_name: Fleet manager's first name
            - last_name: Fleet manager's last name
            - phone: Fleet manager's phone number
            - fleet_name: Name of the fleet
            - fleet_description: Description of the fleet (optional)
        created_by_user: The User object creating the fleet (must be SUPER_ADMIN/OEM/RANDD)
    
    Returns:
        Fleet: The created fleet object
        
    Raises:
        PermissionError: If user doesn't have permission to create fleets
        ValueError: If required data is missing or invalid
    """
    
    # 1. Validate permissions - only SUPER_ADMIN, OEM, or RANDD can create fleets
    try:
        creator_role = created_by_user.role_profile.role
        if creator_role not in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            raise PermissionError(
                f"Only SUPER_ADMIN, OEM, or RANDD can create fleets. Your role: {creator_role}"
            )
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    # 2. Extract and validate fleet manager data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    
    # Extract fleet data
    fleet_name = data.get('fleet_name', '').strip()
    fleet_description = data.get('fleet_description', '').strip()
    
    # 3. Validate required fields
    if not all([username, email, password, first_name, last_name, phone, fleet_name]):
        raise ValueError(
            "Missing required fields. Required: username, email, password, "
            "first_name, last_name, phone, fleet_name"
        )
    
    # 4. Validate username uniqueness
    if User.objects.filter(username=username).exists():
        raise ValueError(f"Username '{username}' already exists")
    
    # 5. Validate email uniqueness
    if User.objects.filter(email=email).exists():
        raise ValueError(f"Email '{email}' already exists")
    
    # 6. Validate fleet name uniqueness
    if Fleet.objects.filter(name=fleet_name).exists():
        raise ValueError(f"Fleet name '{fleet_name}' already exists")
    
    # 7. Validate password strength
    try:
        validate_password(password)
    except ValidationError as e:
        raise ValueError(f"Password validation failed: {', '.join(e.messages)}")
    
    try:
        # 8. Create the Fleet Manager User
        manager_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # 9. Create RoleUser Profile for the fleet manager
        role_profile = RoleUser.objects.create(
            user=manager_user,
            role='FLEET',
            phone=phone,
            is_active=True
        )
        
        # 10. Create the Fleet Entry
        fleet = Fleet.objects.create(
            name=fleet_name,
            description=fleet_description,
            manager=manager_user
        )
        
        # 11. Log the fleet creation
        AccessLog.objects.create(
            user=created_by_user,
            action='create_fleet',
            resource='Fleet',
            resource_id=str(fleet.id),
            success=True,
            details=f"Created fleet '{fleet_name}' with manager '{username}' ({email})"
        )
        
        logger.info(
            f"Fleet '{fleet_name}' created successfully by {created_by_user.username}. "
            f"Manager: {username} ({email})"
        )
        
        return fleet
        
    except Exception as e:
        logger.error(f"Error creating fleet: {str(e)}")
        raise e

@transaction.atomic
def update_fleet(fleet_id, data, updated_by_user):
    """
    Updates fleet information (name and description only).
    Fleet manager cannot be changed after creation.
    
    Args:
        fleet_id: ID of the fleet to update
        data: Dictionary with 'name' and/or 'description'
        updated_by_user: User making the update
        
    Returns:
        Fleet: Updated fleet object
        
    Raises:
        PermissionError: If user doesn't have permission
        ValueError: If fleet not found or data invalid
    """
    
    # Validate permissions
    try:
        user_role = updated_by_user.role_profile.role
        fleet = Fleet.objects.get(id=fleet_id)
        
        # SUPER_ADMIN, OEM, RANDD can update any fleet
        # FLEET managers can only update their own fleet
        if user_role in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            pass  # Has permission
        elif user_role == 'FLEET' and fleet.manager == updated_by_user:
            pass  # Manager updating their own fleet
        else:
            raise PermissionError("You don't have permission to update this fleet")
            
    except Fleet.DoesNotExist:
        raise ValueError(f"Fleet with ID {fleet_id} not found")
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    # Update fields
    if 'name' in data:
        new_name = data['name'].strip()
        if not new_name:
            raise ValueError("Fleet name cannot be empty")
        # Check name uniqueness (excluding current fleet)
        if Fleet.objects.filter(name=new_name).exclude(id=fleet_id).exists():
            raise ValueError(f"Fleet name '{new_name}' already exists")
        fleet.name = new_name
    
    if 'description' in data:
        fleet.description = data['description'].strip()
    
    fleet.save()
    
    # Log the update
    AccessLog.objects.create(
        user=updated_by_user,
        action='update_fleet',
        resource='Fleet',
        resource_id=str(fleet.id),
        success=True,
        details=f"Updated fleet '{fleet.name}'"
    )
    
    logger.info(f"Fleet {fleet.name} updated by {updated_by_user.username}")
    return fleet

@transaction.atomic
def delete_fleet(fleet_id, deleted_by_user):
    """
    Deletes a fleet. Only SUPER_ADMIN, OEM, or RANDD can delete fleets.
    This does NOT delete the manager user account.
    
    Args:
        fleet_id: ID of the fleet to delete
        deleted_by_user: User performing the deletion
        
    Raises:
        PermissionError: If user doesn't have permission
        ValueError: If fleet not found
    """
    
    # Validate permissions - only SUPER_ADMIN, OEM, RANDD
    try:
        user_role = deleted_by_user.role_profile.role
        if user_role not in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            raise PermissionError("Only SUPER_ADMIN, OEM, or RANDD can delete fleets")
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    try:
        fleet = Fleet.objects.get(id=fleet_id)
        fleet_name = fleet.name
        manager_username = fleet.manager.username
        
        # Delete the fleet (manager user remains)
        fleet.delete()
        
        # Log the deletion
        AccessLog.objects.create(
            user=deleted_by_user,
            action='delete_fleet',
            resource='Fleet',
            resource_id=str(fleet_id),
            success=True,
            details=f"Deleted fleet '{fleet_name}' (manager: {manager_username})"
        )
        
        logger.info(f"Fleet '{fleet_name}' deleted by {deleted_by_user.username}")
        
    except Fleet.DoesNotExist:
        raise ValueError(f"Fleet with ID {fleet_id} not found")

@transaction.atomic
def add_member_to_fleet(fleet_id, member_id, added_by_user):
    """
    Adds a member (USER role) to a fleet.
    
    Args:
        fleet_id: ID of the fleet
        member_id: ID of the user to add as member
        added_by_user: User performing the action
        
    Returns:
        Fleet: Updated fleet object
        
    Raises:
        PermissionError: If user doesn't have permission
        ValueError: If fleet or member not found, or member has wrong role
    """
    
    # Validate permissions
    try:
        user_role = added_by_user.role_profile.role
        fleet = Fleet.objects.get(id=fleet_id)
        
        # SUPER_ADMIN, OEM, RANDD can add to any fleet
        # FLEET managers can only add to their own fleet
        if user_role in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            pass
        elif user_role == 'FLEET' and fleet.manager == added_by_user:
            pass
        else:
            raise PermissionError("You don't have permission to add members to this fleet")
            
    except Fleet.DoesNotExist:
        raise ValueError(f"Fleet with ID {fleet_id} not found")
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    # Validate member
    try:
        member = User.objects.get(id=member_id)
        
        # Only USER role can be fleet members
        if member.role_profile.role != 'USER':
            raise ValueError("Only users with USER role can be fleet members")
        
        # Check if already a member
        if fleet.members.filter(id=member_id).exists():
            raise ValueError(f"User '{member.username}' is already a member of this fleet")
        
        # Add member to fleet
        fleet.members.add(member)
        
        # Log the action
        AccessLog.objects.create(
            user=added_by_user,
            action='add_fleet_member',
            resource='Fleet',
            resource_id=str(fleet.id),
            success=True,
            details=f"Added member '{member.username}' to fleet '{fleet.name}'"
        )
        
        logger.info(
            f"Member '{member.username}' added to fleet '{fleet.name}' "
            f"by {added_by_user.username}"
        )
        
        return fleet
        
    except User.DoesNotExist:
        raise ValueError(f"User with ID {member_id} not found")

@transaction.atomic
def remove_member_from_fleet(fleet_id, member_id, removed_by_user):
    """
    Removes a member from a fleet.
    
    Args:
        fleet_id: ID of the fleet
        member_id: ID of the member to remove
        removed_by_user: User performing the action
        
    Returns:
        Fleet: Updated fleet object
        
    Raises:
        PermissionError: If user doesn't have permission
        ValueError: If fleet or member not found
    """
    
    # Validate permissions
    try:
        user_role = removed_by_user.role_profile.role
        fleet = Fleet.objects.get(id=fleet_id)
        
        # SUPER_ADMIN, OEM, RANDD can remove from any fleet
        # FLEET managers can only remove from their own fleet
        if user_role in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            pass
        elif user_role == 'FLEET' and fleet.manager == removed_by_user:
            pass
        else:
            raise PermissionError("You don't have permission to remove members from this fleet")
            
    except Fleet.DoesNotExist:
        raise ValueError(f"Fleet with ID {fleet_id} not found")
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    # Validate and remove member
    try:
        member = User.objects.get(id=member_id)
        
        if not fleet.members.filter(id=member_id).exists():
            raise ValueError(f"User '{member.username}' is not a member of this fleet")
        
        # Remove member from fleet
        fleet.members.remove(member)
        
        # Log the action
        AccessLog.objects.create(
            user=removed_by_user,
            action='remove_fleet_member',
            resource='Fleet',
            resource_id=str(fleet.id),
            success=True,
            details=f"Removed member '{member.username}' from fleet '{fleet.name}'"
        )
        
        logger.info(
            f"Member '{member.username}' removed from fleet '{fleet.name}' "
            f"by {removed_by_user.username}"
        )
        
        return fleet
        
    except User.DoesNotExist:
        raise ValueError(f"User with ID {member_id} not found")

@transaction.atomic
def assign_vehicle_to_fleet(fleet_id, vin, assigned_by_user):
    """
    Assigns a vehicle to a fleet's inventory.
    This makes the vehicle available for the fleet manager to assign to members.
    
    Args:
        fleet_id: ID of the fleet
        vin: Vehicle Identification Number
        assigned_by_user: User performing the action
        
    Returns:
        FleetVehicle: Created fleet vehicle object
        
    Raises:
        PermissionError: If user doesn't have permission
        ValueError: If fleet not found or vehicle already assigned
    """
    
    # Validate permissions
    try:
        user_role = assigned_by_user.role_profile.role
        fleet = Fleet.objects.get(id=fleet_id)
        
        # Only SUPER_ADMIN, OEM, RANDD can assign vehicles to fleet inventory
        if user_role not in ['SUPER_ADMIN', 'OEM', 'RANDD']:
            raise PermissionError(
                "Only SUPER_ADMIN, OEM, or RANDD can assign vehicles to fleet inventory"
            )
            
    except Fleet.DoesNotExist:
        raise ValueError(f"Fleet with ID {fleet_id} not found")
    except ObjectDoesNotExist:
        raise PermissionError("User role not assigned")
    
    # Check if vehicle is already in this fleet
    if FleetVehicle.objects.filter(fleet_manager=fleet.manager, vin=vin, is_active=True).exists():
        raise ValueError(f"Vehicle {vin} is already in fleet '{fleet.name}'")
    
    # Create fleet vehicle entry
    fleet_vehicle = FleetVehicle.objects.create(
        fleet_manager=fleet.manager,
        vin=vin,
        fleet_name=fleet.name,
        is_active=True
    )
    
    # Log the action
    AccessLog.objects.create(
        user=assigned_by_user,
        action='assign_vehicle_to_fleet',
        resource='FleetVehicle',
        resource_id=vin,
        success=True,
        details=f"Assigned vehicle {vin} to fleet '{fleet.name}'"
    )
    
    logger.info(
        f"Vehicle {vin} assigned to fleet '{fleet.name}' by {assigned_by_user.username}"
    )
    
    return fleet_vehicle

@transaction.atomic
def assign_vehicle_to_member(manager_user, member_id, vin):
    """
    Fleet manager assigns a vehicle from their fleet inventory to a fleet member.
    The vehicle must already be in the fleet's inventory.
    
    Args:
        manager_user: The fleet manager User object
        member_id: ID of the member to assign vehicle to
        vin: Vehicle Identification Number
        
    Returns:
        tuple: (VehicleOwnership object, created boolean)
        
    Raises:
        PermissionError: If user is not fleet manager or vehicle not in fleet
        ValueError: If member or vehicle not found, or member not in fleet
    """
    
    # 1. Validate Manager Role
    try:
        role = manager_user.role_profile.role
        if role != 'FLEET':
            raise PermissionError('Only fleet managers can assign vehicles to members')
    except ObjectDoesNotExist:
        raise PermissionError('User role not assigned')
    
    # 2. Validate Input Data
    if not member_id or not vin:
        raise ValueError('member_id and vin are required')
    
    # 3. Validate member exists and is USER role
    try:
        member = User.objects.get(id=member_id)
        if member.role_profile.role != 'USER':
            raise ValueError('Member must have USER role')
    except User.DoesNotExist:
        raise ValueError('Member not found')
    
    # 4. Validate member is in manager's fleet
    fleet = Fleet.objects.filter(manager=manager_user).first()
    if not fleet:
        raise ValueError('You are not managing any fleet')
    
    if not fleet.members.filter(id=member_id).exists():
        raise ValueError(f"User '{member.username}' is not a member of your fleet")
    
    # 5. Check if vehicle is in the manager's fleet inventory
    fleet_vehicle = FleetVehicle.objects.filter(
        fleet_manager=manager_user,
        vin=vin,
        is_active=True
    ).first()
    
    if not fleet_vehicle:
        raise PermissionError(
            f"Vehicle {vin} is not in your fleet inventory. "
            "Contact SUPER_ADMIN/OEM/RANDD to add vehicles to your fleet."
        )
    
    # 6. Perform Assignment
    ownership, created = VehicleOwnership.objects.get_or_create(
        user=member,
        vin=vin,
        defaults={'is_primary': False}
    )
    
    # 7. Log the action
    AccessLog.objects.create(
        user=manager_user,
        action='assign_fleet_vehicle_to_member',
        resource='VehicleOwnership',
        resource_id=vin,
        success=True,
        details=f"Assigned vehicle {vin} to member '{member.username}' in fleet '{fleet.name}'"
    )
    
    logger.info(
        f"Fleet manager '{manager_user.username}' assigned vehicle {vin} "
        f"to member '{member.username}'"
    )
    
    return ownership, created

@transaction.atomic
def unassign_vehicle_from_member(manager_user, member_id, vin):
    """
    Fleet manager unassigns a vehicle from a fleet member.
    
    Args:
        manager_user: The fleet manager User object
        member_id: ID of the member to unassign vehicle from
        vin: Vehicle Identification Number
        
    Raises:
        PermissionError: If user is not fleet manager
        ValueError: If member or ownership not found
    """
    
    # Validate Manager Role
    try:
        role = manager_user.role_profile.role
        if role != 'FLEET':
            raise PermissionError('Only fleet managers can unassign vehicles')
    except ObjectDoesNotExist:
        raise PermissionError('User role not assigned')
    
    # Validate member
    try:
        member = User.objects.get(id=member_id)
    except User.DoesNotExist:
        raise ValueError('Member not found')
    
    # Validate member is in manager's fleet
    fleet = Fleet.objects.filter(manager=manager_user).first()
    if not fleet or not fleet.members.filter(id=member_id).exists():
        raise ValueError(f"User '{member.username}' is not in your fleet")
    
    # Remove ownership
    try:
        ownership = VehicleOwnership.objects.get(user=member, vin=vin)
        ownership.delete()
        
        # Log the action
        AccessLog.objects.create(
            user=manager_user,
            action='unassign_fleet_vehicle_from_member',
            resource='VehicleOwnership',
            resource_id=vin,
            success=True,
            details=f"Unassigned vehicle {vin} from member '{member.username}'"
        )
        
        logger.info(
            f"Fleet manager '{manager_user.username}' unassigned vehicle {vin} "
            f"from member '{member.username}'"
        )
        
    except VehicleOwnership.DoesNotExist:
        raise ValueError(f"Member '{member.username}' does not have vehicle {vin} assigned")