// Use relative URL for development (proxy) or full URL for production
//export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
export const API_BASE_URL = 'http://203.16.202.48:8000/api';

// Alias for backward compatibility
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/login/`,
  LOGOUT: `${API_BASE_URL}/logout/`,
  REFRESH_TOKEN: `${API_BASE_URL}/token/refresh/`,
  VEHICLE_CONTROL: `${API_BASE_URL}/vehicle/control/`,
  VEHICLE_IMMOBILIZER: `${API_BASE_URL}/vehicle/immobilizer/`,
  VEHICLE_HORN: `${API_BASE_URL}/vehicle/horn/`,
  MQTT_STATUS: `${API_BASE_URL}/mqtt/status/`,
  VEHICLE_CREATE: `${API_BASE_URL}/vehicles/`,
  VEHICLE_REGISTER_EOL: `${API_BASE_URL}/vehicles/register-eol/`,
  USERS_CREATE: `${API_BASE_URL}/users/create/`,
  USERS_UPDATE: `${API_BASE_URL}/users/update/`,
  USERS_LIST: `${API_BASE_URL}/users/`,
  FLEETS_MEMBERS: `${API_BASE_URL}/fleets/members/`,
  RBAC_ASSIGN_VEHICLE: `${API_BASE_URL}/rbac/assign-vehicle/`,
  FLEETS_ASSIGN_MEMBER: `${API_BASE_URL}/fleets/vehicles/assign-member/`,
};

// ============================================================================
// VEHICLE INSIGHTS API ENDPOINTS (new unified paths)
// ============================================================================

/**
 * Build a vehicle insights URL for a given VIN and sub-path.
 * Base pattern: /api/insights/vehicle/<vin>/<sub-path>/
 */
export const insightsUrl = (vin: string, subPath?: string): string => {
  const encodedVin = encodeURIComponent(vin);
  const base = `${API_BASE_URL}/insights/vehicle/${encodedVin}`;
  return subPath ? `${base}/${subPath}/` : `${base}/`;
};

/**
 * All available insights sub-paths (all GET endpoints):
 *
 *   insightsUrl(vin)                 → /api/insights/vehicle/<vin>/              (full insights)
 *   insightsUrl(vin, 'overview')     → /api/insights/vehicle/<vin>/overview/     (overview)
 *   insightsUrl(vin, 'trips')        → /api/insights/vehicle/<vin>/trips/        (trips)
 *   insightsUrl(vin, 'environmental')→ /api/insights/vehicle/<vin>/environmental/(environmental)
 *   insightsUrl(vin, 'health')       → /api/insights/vehicle/<vin>/health/       (health)
 *   insightsUrl(vin, 'performance')  → /api/insights/vehicle/<vin>/performance/  (performance)
 *   insightsUrl(vin, 'maintenance')  → /api/insights/vehicle/<vin>/maintenance/  (maintenance)
 *   insightsUrl(vin, 'mcu-telemetry')→ /api/insights/vehicle/<vin>/mcu-telemetry/(MCU telemetry)
 *   insightsUrl(vin, 'bms-telemetry')→ /api/insights/vehicle/<vin>/bms-telemetry/(BMS telemetry)
 *   insightsUrl(vin, 'location')     → /api/insights/vehicle/<vin>/location/     (location history)
 */
