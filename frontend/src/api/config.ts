// API_BASE_URL is intentionally empty here because the Axios client in client.ts
// already sets baseURL = VITE_API_BASE_URL (which is '/api').
// Components that call apiClient.get(`${API_BASE_URL}/path/`) will correctly produce '/path/'.
// DO NOT set this to '/api' again — that causes double-prefix: /api/api/...
export const API_BASE_URL = '';

// Full endpoint paths (used only for direct axios calls outside apiClient, e.g. in auth.ts)
export const API_ENDPOINTS = {
  LOGIN: `/api/login/`,
  LOGOUT: `/api/logout/`,
  REFRESH_TOKEN: `/api/token/refresh/`,
  VEHICLE_CONTROL: `/api/vehicle/control/`,
  VEHICLE_IMMOBILIZER: `/api/vehicle/immobilizer/`,
  VEHICLE_HORN: `/api/vehicle/horn/`,
  MQTT_STATUS: `/api/mqtt/status/`,
  VEHICLE_CREATE: `/api/vehicles/`,
  VEHICLE_REGISTER_EOL: `/api/vehicles/register-eol/`,
  USERS_CREATE: `/api/users/create/`,
  USERS_UPDATE: `/api/users/update/`,
  USERS_LIST: `/api/users/`,
  FLEETS_MEMBERS: `/api/fleets/members/`,
  RBAC_ASSIGN_VEHICLE: `/api/rbac/assign-vehicle/`,
  FLEETS_ASSIGN_MEMBER: `/api/fleets/vehicles/assign-member/`,
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
  const base = `/insights/vehicle/${encodedVin}`;
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
