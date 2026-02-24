# core/urls.py
# Core App URL Configuration - API Endpoints Only

from django.urls import path

# ========================================
# USER MANAGEMENT IMPORTS
# ========================================
from core.api.vehicle_insights_views import (
    BMSTelemetryView, EnvironmentalImpactView, LatestVehicleLocationView, LocationHistoryView,
    MCUTelemetryView, MaintenanceScheduleView, PerformanceMetricsView,
    VehicleHealthView, VehicleInsightsView, VehicleOverviewView,
    VehicleTripsView
)
from core.api import app_views
from core.api import fleet_views
from core.api.user_management_views import (
    UserLoginView,
    UserLogoutView,
    TokenRefreshView,
    CreateUserView,
    UpdateUserView,
    ListUsersView,
    UserProfileView,
    DealerSellVehicleView,
    FleetAssignVehicleToMemberView
)

# ========================================
# VEHICLE CONTROL IMPORTS (C2 FIX)
# ========================================
from core.api.vehicle_control_views import (
    VehicleControlView,
    ImmobilizerControlView,
    HornControlView,
    MQTTStatusView
)

# ========================================
# RBAC (Role-Based Access Control) IMPORTS
# ========================================
from core.api.rbac_views import (
    VehicleInfoAccessView,
    VehicleRawDataAccessView,
    VehicleControlAccessView,
    UserPermissionsView,
    AssignVehicleView,
    UnassignVehicleView
)

# ========================================
# LIVE DATA IMPORTS
# ========================================
from core.api.live_data_views import (
    LiveDashboardView,
    LiveFaultsView,
    LiveBMSView,
    LiveAlertsView,
    AvailableControlsView,
    TripManagementView,
    LiveDataStatusView,
    CompleteLiveDataView
)

# ========================================
# VEHICLE STATIC DATA IMPORTS
# ========================================
from core.api.vehicle_static_data_views import (
    VehicleInfoView,
    VehicleSpecsView,
    CompleteVehicleDataView,
    VehiclesListView,
    VehicleServiceStatusView,
    VehicleBasicInfoView
)
from core.api.vehicle_views import VehicleRegistrationAPIView
from core.api.dealer_views import DealerCreateAPIView, DealerDashboardAPIView, DealerListAPIView

# ========================================
# CORE APP URL PATTERNS
# ========================================
urlpatterns = [
    # ========================================
    # AUTHENTICATION - JWT
    # ========================================
    path('api/login/', UserLoginView.as_view(), name='login'),
    path('api/logout/', UserLogoutView.as_view(), name='logout'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ========================================
    # USER MANAGEMENT
    # ========================================
    path('api/users/create/', CreateUserView.as_view(), name='create_user'),
    path('api/users/update/', UpdateUserView.as_view(), name='update_own_profile'),
    path('api/users/update/<int:user_id>/', UpdateUserView.as_view(), name='update_user'),
    path('api/user/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/users/', ListUsersView.as_view(), name='list_users'),
    path('api/dealer/sell-vehicle/', DealerSellVehicleView.as_view(), name='dealer_sell_vehicle'),

    # Vehicle registration
    path('api/vehicles/register-eol/', VehicleRegistrationAPIView.as_view(), name='register-eol'),
    path('api/vehicles/delete/<str:vin>/', VehicleRegistrationAPIView.as_view(), name='delete-vehicle'),
    path('api/vehicles/search/<str:query_term>/', VehicleRegistrationAPIView.as_view()),
    
    # ========================================
    # FLEET MANAGEMENT (M9 FIX: consistent indentation)
    # ========================================
    path('api/fleets/', fleet_views.FleetListCreateView.as_view(), name='fleet-list-create'),
    path('api/fleets/<int:pk>/', fleet_views.FleetDetailView.as_view(), name='fleet-detail'),
    path('api/fleets/members/', fleet_views.FleetMemberManagementView.as_view(), name='fleet-member-management'),
    path('api/fleets/vehicles/inventory/', fleet_views.FleetVehicleInventoryView.as_view(), name='fleet-vehicle-inventory'),
    path('api/fleets/vehicles/assign-member/', fleet_views.FleetAssignVehicleToMemberView.as_view(), name='fleet-assign-vehicle-to-member'),

    # ========================================
    # DEALER MANAGEMENT
    # ========================================
    path('api/dealers/', DealerListAPIView.as_view(), name='dealer_list'),
    path('api/dealers/create/', DealerCreateAPIView.as_view(), name='dealer-create'),
    path('api/dealers/dashboard/', DealerDashboardAPIView.as_view(), name='dealer-dashboard'),
    path('api/dealers/dashboard/<str:dealer_code>/', DealerDashboardAPIView.as_view(), name='dealer-dashboard-specific'),

    # ========================================
    # VEHICLE CONTROL - MQTT  (C2 FIX: uncommented)
    # ========================================
    path('api/vehicle/control/', VehicleControlView.as_view(), name='vehicle_control'),
    path('api/vehicle/immobilizer/', ImmobilizerControlView.as_view(), name='immobilizer_control'),
    path('api/vehicle/horn/', HornControlView.as_view(), name='horn_control'),
    path('api/mqtt/status/', MQTTStatusView.as_view(), name='mqtt_status'),
    
    # ========================================
    # RBAC - ROLE-BASED ACCESS CONTROL
    # ========================================
    path('api/rbac/vehicles/', VehicleInfoAccessView.as_view(), name='rbac_vehicles'),
    path('api/rbac/raw-data/', VehicleRawDataAccessView.as_view(), name='rbac_raw_data'),
    path('api/rbac/raw-data/<str:vin>/', VehicleRawDataAccessView.as_view(), name='rbac_raw_data_vin'),
    path('api/rbac/control/', VehicleControlAccessView.as_view(), name='rbac_control'),
    path('api/rbac/permissions/', UserPermissionsView.as_view(), name='rbac_permissions'),
    path('api/rbac/assign-vehicle/', AssignVehicleView.as_view(), name='rbac_assign_vehicle'),
    path('api/rbac/unassign-vehicle/', UnassignVehicleView.as_view(), name='rbac_unassign_vehicle'),
    
    # ========================================
    # VEHICLE STATIC DATA
    # ========================================
    path('api/vehicle-static/info/<str:vin>/', VehicleInfoView.as_view(), name='vehicle_static_info'),
    path('api/vehicle-static/specs/<str:vin>/', VehicleSpecsView.as_view(), name='vehicle_static_specs'),
    path('api/vehicle-static/complete/<str:vin>/', CompleteVehicleDataView.as_view(), name='vehicle_static_complete'),
    path('api/vehicle-static/list/', VehiclesListView.as_view(), name='vehicle_static_list'),
    path('api/vehicle-static/service-status/<str:vin>/', VehicleServiceStatusView.as_view(), name='vehicle_static_service_status'),
    path('api/vehicle-static/basic/<str:vin>/', VehicleBasicInfoView.as_view(), name='vehicle_static_basic'),
    
    # ========================================
    # LIVE DATA - ROLE-BASED ACCESS
    # ========================================
    path('api/live/dashboard/', LiveDashboardView.as_view(), name='live_dashboard'),
    path('api/live/faults/', LiveFaultsView.as_view(), name='live_faults'),
    path('api/live/bms/', LiveBMSView.as_view(), name='live_bms'),
    path('api/live/alerts/', LiveAlertsView.as_view(), name='live_alerts'),
    path('api/live/available-controls/', AvailableControlsView.as_view(), name='live_available_controls'),
    path('api/live/trip/', TripManagementView.as_view(), name='trip_management'),
    path('api/live/status/', LiveDataStatusView.as_view(), name='live_data_status'),
    path('api/live/complete/', CompleteLiveDataView.as_view(), name='live_complete'),

    # ========================================
    # MOBILE APP API ENDPOINTS
    # ========================================
    path('api/app/vehicles/', app_views.AppVehicleListView.as_view(), name='app-vehicle-list'),
    path('api/app/vehicles/<str:vcu_id>/', app_views.AppVehicleDetailView.as_view(), name='app-vehicle-detail'),
    path('api/app/vehicles/<str:vcu_id>/live/', app_views.AppLiveTelemetryView.as_view(), name='app-live-telemetry'),
    path('api/app/vehicles/<str:vcu_id>/info/', app_views.AppVehicleInfoView.as_view(), name='app-vehicle-info'),
    path('api/app/vehicles/<str:vcu_id>/alerts/', app_views.AppAlertsView.as_view(), name='app-alerts'),
    path('api/app/vehicles/<str:vcu_id>/alerts/active/', app_views.AppActiveAlertsView.as_view(), name='app-active-alerts'),
    path('api/app/vehicles/<str:vcu_id>/alerts/<int:alert_id>/acknowledge/', app_views.AppAcknowledgeAlertView.as_view(), name='app-acknowledge-alert'),
    path('api/app/vehicles/<str:vcu_id>/trips/', app_views.AppTripsView.as_view(), name='app-trips'),
    path('api/app/vehicles/<str:vcu_id>/trips/<int:trip_id>/', app_views.AppTripDetailView.as_view(), name='app-trip-detail'),
    path('api/app/vehicles/<str:vcu_id>/control/', app_views.AppVehicleControlView.as_view(), name='app-vehicle-control'),
    path('api/app/vehicles/<str:vcu_id>/control/status/<str:command_id>/', app_views.AppVehicleControlStatusView.as_view(), name='app-control-status'),
    path('api/app/vehicles/<str:vcu_id>/control/history/', app_views.AppVehicleControlHistoryView.as_view(), name='app-control-history'),

    # ========================================
    # VEHICLE INSIGHTS (M8 FIX: added api/ prefix)
    # ========================================
    path('api/insights/vehicle/<str:vin>/', VehicleInsightsView.as_view(), name='vehicle-insights'),
    path('api/insights/vehicle/<str:vin>/overview/', VehicleOverviewView.as_view(), name='vehicle-overview'),
    path('api/insights/vehicle/<str:vin>/trips/', VehicleTripsView.as_view(), name='vehicle-trips'),
    path('api/insights/vehicle/<str:vin>/environmental/', EnvironmentalImpactView.as_view(), name='environmental-impact'),
    path('api/insights/vehicle/<str:vin>/health/', VehicleHealthView.as_view(), name='vehicle-health'),
    path('api/insights/vehicle/<str:vin>/performance/', PerformanceMetricsView.as_view(), name='performance-metrics'),
    path('api/insights/vehicle/<str:vin>/maintenance/', MaintenanceScheduleView.as_view(), name='maintenance-schedule'),
    path('api/insights/vehicle/<str:vin>/mcu-telemetry/', MCUTelemetryView.as_view(), name='mcu-telemetry'),
    path('api/insights/vehicle/<str:vin>/bms-telemetry/', BMSTelemetryView.as_view(), name='bms-telemetry'),
    path('api/insights/vehicle/<str:vin>/location/', LocationHistoryView.as_view(), name='location-history'),
    path('api/insights/vehicle/<str:vin>/location/latest/', LatestVehicleLocationView.as_view(), name='latest-location'),
]