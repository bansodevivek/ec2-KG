# core/models/__init__.py

from .VehicleInfo import VehicleInfo
from .rawcandata import VehicleRawData, AccessLog
from .vehicleSpecs import VehicleSpecs
from .DealerInformation import DealerInformation
from .fleet import Fleet
from .rolesUser import (
    RoleUser,
    VehicleOwnership,
    FleetVehicle,
    ServiceAssignment,
    DealerVehicle
)

__all__ = [
    'VehicleInfo',
    'VehicleRawData',
    'VehicleSpecs',
    'RoleUser',
    'VehicleOwnership',
    'FleetVehicle',
    'ServiceAssignment',
    'DealerVehicle',
    'AccessLog',
]