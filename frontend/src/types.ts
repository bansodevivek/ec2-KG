// Type Definitions for Connected Auto Dashboard

export type UserRole = 'SUPER_ADMIN' | 'OEM' | 'RND' | 'DEALER' | 'SERVICE' | 'FLEET' | 'SALES' | 'RIDER' | 'USER';

export interface LoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupForm {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  vehicleNo: string;
}

export interface DeviceStats {
  active: number;
  faulty: number;
  inactive: number;
  total: number;
}

export interface SalesData {
  sold: number;
  inventory: number;
  percentage: number;
}

export interface EnvironmentalData {
  co2Saved: number;
  totalKm: number;
  treesEquivalent: number;
}

export interface MenuItem {
  icon: any;
  label: string;
  id: string;
  subItems?: MenuItem[];
}

export interface QuickAction {
  icon: any;
  label: string;
  color: string;
}

export interface Alert {
  id: number;
  type: 'critical' | 'warning' | 'info' | 'resolved';
  title: string;
  vehicle: string;
  timestamp: string;
  location: string;
  status: 'active' | 'pending' | 'resolved';
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  status: 'active' | 'charging' | 'idle' | 'maintenance';
  battery: number;
  speed: number;
  location: { lat: number; lng: number };
  driver: string;
  lastUpdate: string;
  odometer: number;
  health: number;
  dealerId?: string;
}

export interface FaultCode {
  id: string;
  code: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  vehicle: string;
  occurrences: number;
  firstDetected: string;
  lastDetected: string;
  status: 'active' | 'resolved' | 'investigating';
}

export interface Trip {
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

export interface VehicleTripsData {
  success: boolean;
  vin: string;
  total_count: number;
  trips: Trip[];
}

export interface ChargingStation {
  id: string;
  name: string;
  location: string;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  fastChargers: number;
  normalChargers: number;
  status: 'operational' | 'full' | 'maintenance';
}

export interface DriverPerformance {
  id: string;
  name: string;
  rating: number;
  totalTrips: number;
  totalDistance: number;
  efficiency: number;
  incidents: number;
  status: 'excellent' | 'good' | 'average';
}

export interface DailyStats {
  day: string;
  trips: number;
  distance: number;
  efficiency: number;
  incidents: number;
}

export interface PerformanceMetrics {
  dailyStats: DailyStats[];
  weeklyTotals: {
    totalTrips: number;
    totalDistance: number;
    avgEfficiency: number;
    totalIncidents: number;
  };
}

export interface VehicleInsight {
  id: string;
  vehicle: string;
  licensePlate: string;
  totalTrips: number;
  totalDistance: number;
  avgSpeed: number;
  fuelEfficiency: number;
  uptime: number;
  maintenanceCost: number;
  revenue: number;
  utilizationRate: number;
  lastService: string;
  nextService: string;
  healthScore: number;
  batteryHealth: number;
  tireCondition: number;
  brakeHealth: number;
  co2Saved: number;
  monthlyTrend: {
    month: string;
    trips: number;
    distance: number;
    revenue: number;
  }[];
}

export interface FaultCodeAnalysis {
  summary: {
    totalFaults: number;
    activeFaults: number;
    resolvedFaults: number;
    criticalFaults: number;
    avgResolutionTime: number;
  };
  byCategory: {
    category: string;
    count: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  bySeverity: {
    severity: 'high' | 'medium' | 'low';
    count: number;
    percentage: number;
  }[];
  topFaults: {
    code: string;
    description: string;
    occurrences: number;
    affectedVehicles: number;
    avgResolutionTime: number;
    lastOccurrence: string;
  }[];
  monthlyTrend: {
    month: string;
    total: number;
    resolved: number;
    active: number;
  }[];
  vehicleDistribution: {
    vehicle: string;
    faultCount: number;
    criticalCount: number;
    status: 'healthy' | 'attention' | 'critical';
  }[];
}
