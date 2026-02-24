import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS, insightsUrl } from './config';

/**
 * Validate VIN format before making API calls.
 * Rejects values that look like vehicle names (contain spaces) or are too short.
 */
const isValidVin = (vin: string): boolean => {
  if (!vin || vin.trim().length < 5) return false;
  if (/\s/.test(vin)) return false;
  return true;
};

// ============================================================================
// VEHICLE CONTROL / REGISTRATION (unchanged paths)
// ============================================================================

export interface VehicleControlPayload {
  vehicleId: string;
  command?: string;
  [key: string]: any;
}

export interface VehicleImmobilizerPayload {
  vehicle_id: string;
  action: 'immobilize' | 'mobilize';
}

export interface VehicleHornPayload {
  vehicle_id: string;
  duration?: number;
}

export interface CreateVehiclePayload {
  [key: string]: any;
}

export interface RegisterVehicleEOLPayload {
  template_id: number;
  vin: string;
  vcu_id: string;
  battery_serial_number: string;
  cluster_id: string;
  motor_serial_number: string;
  controller_serial_number: string;
  charger_serial_number: string;
  colour: string;
}

export const createVehicle = async (data: CreateVehiclePayload) => {
  const response = await apiClient.post(API_ENDPOINTS.VEHICLE_CREATE, data);
  return response.data;
};

export const registerVehicleEOL = async (data: RegisterVehicleEOLPayload) => {
  console.log('🔧 registerVehicleEOL called');
  console.log('📍 Full URL:', API_ENDPOINTS.VEHICLE_REGISTER_EOL);
  console.log('📦 Data:', data);

  try {
    const response = await apiClient.post(API_ENDPOINTS.VEHICLE_REGISTER_EOL, data);
    console.log('from try BLOCK>>>>>', data)

    if (response.error) {
      console.error('❌ API returned error:', response.error);
      console.log("hi from KG>>>>", response);
      return { error: response.error };
    }

    console.log('✅ Registration successful:', response.data);
    return response;
  } catch (error: any) {
    console.error('❌ Registration failed with exception:', error);

    if (error.response) {
      console.error('📛 HTTP Status:', error.response.status);
      console.error('📛 Response Data:', error.response.data);
      console.error('📛 Response Headers:', error.response.headers);

      return {
        error: error.message || 'Request failed',
        status: error.response.status,
        details: error.response.data
      };
    } else if (error.request) {
      console.error('📛 No response received:', error.request);
      return {
        error: 'No response from server',
        details: 'Network error or server not responding'
      };
    } else {
      console.error('📛 Error setting up request:', error.message);
      return {
        error: error.message || 'Request setup failed',
        details: error.toString()
      };
    }
  }
};

export const controlVehicle = async (data: VehicleControlPayload) => {
  const response = await apiClient.post(API_ENDPOINTS.VEHICLE_CONTROL, data);
  return response.data;
};

export const immobilizeVehicle = async (data: VehicleImmobilizerPayload) => {
  const response = await apiClient.post(API_ENDPOINTS.VEHICLE_IMMOBILIZER, data);
  return response.data;
};

export const honkHorn = async (data: VehicleHornPayload) => {
  const response = await apiClient.post(API_ENDPOINTS.VEHICLE_HORN, data);
  return response.data;
};

export const getMqttStatus = async () => {
  const response = await apiClient.get(API_ENDPOINTS.MQTT_STATUS);
  return response.data;
};

export interface AssignVehiclePayload {
  type: string;
  dealer_code: string;
  vehicles: Array<{ vin: string }>;
}

export interface AssignVehicleResponse {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export const assignVehicle = async (payload: AssignVehiclePayload): Promise<AssignVehicleResponse> => {
  const response = await apiClient.post('/rbac/assign-vehicle/', payload);
  return response.data as AssignVehicleResponse;
};

export interface AssignVehicleToUserPayload {
  member_id: number;
  vin: string;
}

export interface AssignVehicleToUserResponse {
  success: boolean;
  message: string;
  assignment?: {
    vin: string;
    member_id: number;
    created: boolean;
  };
}

export const assignVehicleToUser = async (payload: AssignVehicleToUserPayload): Promise<AssignVehicleToUserResponse> => {
  const response = await apiClient.post('/fleets/vehicles/assign-member/', payload);
  return response.data as AssignVehicleToUserResponse;
};

// ============================================================================
// DELETE VEHICLE
// ============================================================================

export const deleteVehicle = async (vin: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    console.log(`🗑️ Deleting vehicle with VIN: ${vin}`);

    const response = await apiClient.delete(`${API_BASE_URL}/vehicles/delete/${vin}/`);

    console.log('✅ Vehicle deleted successfully:', response.data);

    return {
      success: true,
      message: response.data?.message || 'Vehicle deleted successfully'
    };
  } catch (err: any) {
    console.error('❌ Failed to delete vehicle:', err);

    let errorMessage = 'Failed to delete vehicle. Please try again.';

    if (err.response?.data) {
      const errorData = err.response.data;
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } else if (err.message) {
      errorMessage = err.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// ============================================================================
// VEHICLE INSIGHTS APIs — NEW unified paths
// Base: /api/insights/vehicle/<vin>/
// All endpoints are GET
// ============================================================================

// --- MAINTENANCE ---
// Endpoint: /api/insights/vehicle/<vin>/maintenance/

export interface MaintenanceItem {
  item: string;
  interval_km: number;
  next_at: number;
}

export interface ServiceStatusData {
  success: boolean;
  vin: string;
  odometer_km: number;
  next_service_km: number;
  km_until_service: number;
  service_interval_km: number;
  maintenance_items: MaintenanceItem[];
}

// The response IS the data (no wrapper)
export type ServiceStatusResponse = ServiceStatusData;

export const getServiceStatus = async (vin: string): Promise<ServiceStatusResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getServiceStatus skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }
  const response = await apiClient.get(insightsUrl(vin, 'maintenance'));
  return response.data as ServiceStatusResponse;
};

// --- HEALTH ---
// Endpoint: /api/insights/vehicle/<vin>/health/

export interface VehicleHealthBattery {
  soc: number;
  pack_voltage: number;
  pack_current: number;
  battery_health_pct: number;
}

export interface VehicleHealthMotor {
  controller_temp: number;
  motor_temp: number;
}

export interface VehicleHealthData {
  success: boolean;
  vin: string;
  battery_health: VehicleHealthBattery;
  motor: VehicleHealthMotor;
  tyres: any | null;
}

// Keep VehicleHealthResponse as an alias for backward compatibility
export type VehicleHealthResponse = VehicleHealthData;

export const getVehicleHealth = async (vin: string): Promise<VehicleHealthResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getVehicleHealth skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'health'));
    return response.data as VehicleHealthResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No health data found for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch health for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// --- MCU TELEMETRY ---
// Endpoint: /api/insights/vehicle/<vin>/mcu-telemetry/?time_range=1w
// Supported time_range values: 1h, 6h, 1d, 1w, 1m

export interface MCUTelemetryDataPoint {
  timestamp: string;
  value: number;
  sample_count: number;
}

export interface MCUTelemetryMetric {
  range: string;
  data: MCUTelemetryDataPoint[];
}

export interface MCUSamplingInfo {
  method: string;
  interval_seconds: number;
  interval_label: string;
  target_points: number;
  actual_points: number;
}

export interface MCUTelemetryResponse {
  success: boolean;
  vin: string;
  time_range: string;
  sampling: MCUSamplingInfo;
  data_points: number;
  total_records: number;
  vehicle_speed?: MCUTelemetryMetric;
  motor_temperature?: MCUTelemetryMetric;
  controller_temperature?: MCUTelemetryMetric;
  motor_rpm?: MCUTelemetryMetric;
  motor_voltage?: MCUTelemetryMetric;
  motor_torque?: MCUTelemetryMetric;
  power_generation?: MCUTelemetryMetric;
}

export type MCUTimeRange = '1h' | '6h' | '1d' | '1w' | '1m';

export const getMCUTelemetry = async (
  vin: string,
  timeRange: MCUTimeRange = '1w'
): Promise<MCUTelemetryResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getMCUTelemetry skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const url = `${insightsUrl(vin, 'mcu-telemetry')}?time_range=${timeRange}`;
    const response = await apiClient.get(url);
    return response.data as MCUTelemetryResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No MCU telemetry data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch MCU telemetry for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// --- BMS TELEMETRY ---
// Endpoint: /api/insights/vehicle/<vin>/bms-telemetry/?time_range=1w
// Supported time_range values: 1h, 6h, 1d, 1w, 1m

export interface BMSTelemetryDataPoint {
  timestamp: string;
  value: number;
  sample_count: number;
}

export interface BMSTelemetryMetric {
  range: string;
  data: BMSTelemetryDataPoint[];
}

export interface BMSSamplingInfo {
  method: string;
  interval_seconds: number;
  interval_label: string;
  target_points: number;
  actual_points: number;
}

export interface BMSTelemetryResponse {
  success: boolean;
  vin: string;
  time_range: string;
  sampling: BMSSamplingInfo;
  data_points: number;
  total_records: number;
  battery_temperature?: BMSTelemetryMetric;
  battery_performance?: BMSTelemetryMetric;
  battery_torque?: BMSTelemetryMetric;
  battery_power?: BMSTelemetryMetric;
  range_left_on_battery?: BMSTelemetryMetric;
  idle_time?: BMSTelemetryMetric;
}

export type BMSTimeRange = '1h' | '6h' | '1d' | '1w' | '1m';

export const getBMSTelemetry = async (
  vin: string,
  timeRange: BMSTimeRange = '1w'
): Promise<BMSTelemetryResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getBMSTelemetry skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const url = `${insightsUrl(vin, 'bms-telemetry')}?time_range=${timeRange}`;
    const response = await apiClient.get(url);
    return response.data as BMSTelemetryResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No BMS telemetry data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch BMS telemetry for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// --- TRIPS ---
// Endpoint: /api/insights/vehicle/<vin>/trips/

export interface VehicleTripItem {
  id: number;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_seconds: number;
  start_soc: number;
  end_soc: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  efficiency_wh_km: number;
}

export interface VehicleTripsResponse {
  success: boolean;
  vin: string;
  total_count: number;
  trips: VehicleTripItem[];
}

export const getVehicleTrips = async (vin: string): Promise<VehicleTripsResponse> => {
  const EMPTY_TRIPS: VehicleTripsResponse = {
    success: false,
    vin,
    total_count: 0,
    trips: [],
  };

  if (!isValidVin(vin)) {
    console.warn(`⚠️ getVehicleTrips skipped — invalid VIN: "${vin}"`);
    return EMPTY_TRIPS;
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'trips'));
    return response.data as VehicleTripsResponse;
  } catch (error: any) {
    const status = error?.response?.status;

    if (status === 404) {
      console.info(`ℹ️ No trip data found for VIN: ${vin}`);
      return EMPTY_TRIPS;
    }

    console.error(`❌ Failed to fetch trips for ${vin}:`, error?.message);
    throw error;
  }
};

// ============================================================================
// NEW: FULL VEHICLE INSIGHTS
// Path: /api/insights/vehicle/<vin>/
// ============================================================================

export interface VehicleInsightsResponse {
  [key: string]: any;
}

export const getVehicleInsights = async (vin: string): Promise<VehicleInsightsResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getVehicleInsights skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin));
    return response.data as VehicleInsightsResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No insights data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch insights for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// ============================================================================
// VEHICLE OVERVIEW
// Path: /api/insights/vehicle/<vin>/
// Returns: model, vcu_id, status (online/last_seen), latest_data (speed, soc, odometer, time)
// ============================================================================

export interface VehicleOverviewStatus {
  online: boolean;
  last_seen: string | null;
}

export interface VehicleOverviewLatestData {
  speed: number;
  soc: number;
  odometer: number;
  time: string;
}

export interface VehicleOverviewResponse {
  success: boolean;
  vin: string;
  model: string;
  vcu_id: string;
  status: VehicleOverviewStatus;
  latest_data: VehicleOverviewLatestData;
}

export const getVehicleOverview = async (vin: string): Promise<VehicleOverviewResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getVehicleOverview skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    // The overview data comes from the base insights endpoint
    const response = await apiClient.get(insightsUrl(vin));
    return response.data as VehicleOverviewResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No overview data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch overview for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// ============================================================================
// NEW: ENVIRONMENTAL IMPACT
// Path: /api/insights/vehicle/<vin>/environmental/
// ============================================================================

export interface EnvironmentalImpactResponse {
  success: boolean;
  vin: string;
  total_distance_km: number;
  co2_saved_kg: number;
  trees_equivalent: number;
  fuel_saved_liters: number;
}

export const getEnvironmentalImpact = async (vin: string): Promise<EnvironmentalImpactResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getEnvironmentalImpact skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'environmental'));
    return response.data as EnvironmentalImpactResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No environmental data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch environmental data for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// ============================================================================
// NEW: PERFORMANCE METRICS
// Path: /api/insights/vehicle/<vin>/performance/
// ============================================================================

export interface PerformanceMetricsResponse {
  success: boolean;
  vin: string;
  period: string;
  speed: {
    avg_kmh: number;
    max_kmh: number;
  };
  motor: {
    avg_temp: number;
    max_temp: number;
    avg_rpm: number;
    max_rpm: number;
  };
  controller: {
    avg_temp: number;
    max_temp: number;
  };
  battery: {
    avg_voltage: number;
    min_soc: number;
    max_soc: number;
  };
}

export const getPerformanceMetrics = async (vin: string): Promise<PerformanceMetricsResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getPerformanceMetrics skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'performance'));
    return response.data as PerformanceMetricsResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No performance data for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch performance for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// ============================================================================
// NEW: LOCATION HISTORY
// Path: /api/insights/vehicle/<vin>/location/
// ============================================================================

export interface LocationHistoryPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speed?: number;
}

export interface LocationHistoryResponse {
  locations?: LocationHistoryPoint[];
  [key: string]: any;
}

export const getLocationHistory = async (vin: string): Promise<LocationHistoryResponse> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getLocationHistory skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'location'));
    return response.data as LocationHistoryResponse;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) {
      console.info(`ℹ️ No location history for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch location history for ${vin}:`, error?.message);
    }
    throw error;
  }
};

// --- LIVE LOCATION ---
// Endpoint: /api/insights/vehicle/<vin>/location/latest/

export interface VehicleLatestLocation {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  satellites: number;
  speed: number;
  hdop: number;
}

export const getVehicleLatestLocation = async (vin: string): Promise<VehicleLatestLocation> => {
  if (!isValidVin(vin)) {
    console.warn(`⚠️ getVehicleLatestLocation skipped — invalid VIN: "${vin}"`);
    throw new Error(`Invalid VIN format: "${vin}"`);
  }

  try {
    const response = await apiClient.get(insightsUrl(vin, 'location/latest'));
    return response.data as VehicleLatestLocation;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.info(`ℹ️ No live location found for VIN: ${vin}`);
    } else {
      console.error(`❌ Failed to fetch latest location for ${vin}:`, error?.message);
    }
    throw error;
  }
};
