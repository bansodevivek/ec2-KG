// Main Dashboard Component - Refactored

import { useState, lazy, Suspense, useEffect, Component, ReactNode } from 'react';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
// Lazy load components to reduce initial bundle size
const DashboardContent = lazy(() => import('./components/DashboardContent'));
const LiveTracking = lazy(() => import('./components/LiveTracking'));
const VehicleInsights = lazy(() => import('./components/VehicleInsights'));
const FaultAnalysis = lazy(() => import('./components/FaultAnalysis'));
const Reports = lazy(() => import('./components/Reports'));
const DeviceManagement = lazy(() => import('./components/DeviceManagement'));
const FotaUpdates = lazy(() => import('./components/FotaUpdates'));
const Configure = lazy(() => import('./components/Configure'));
const EnterpriseSettings = lazy(() => import('./components/EnterpriseSettings'));
const AddVehicle = lazy(() => import('./components/AddVehicle'));
const DealerManagement = lazy(() => import('./components/DealerManagement'));
const CustomerManagement = lazy(() => import('./components/CustomerManagement'));
const FleetManagement = lazy(() => import('./components/FleetManagement'));
const SupportConnect = lazy(() => import('./components/SupportConnect'));
const VehicleAssignment = lazy(() => import('./components/VehicleAssignment'));
import { useAuth } from './hooks/useAuth';
// import { useDeviceStats } from './hooks/useDeviceStats'; // Hook removed
import { Alert, Vehicle } from './types';
import { apiClient } from './api/client';
import { API_BASE_URL } from './api/config';
import {
  MENU_ITEMS,
  QUICK_ACTIONS,
  INITIAL_SALES_DATA,
  INITIAL_ENVIRONMENTAL_DATA,
  RECENT_ALERTS,
  FLEET_VEHICLES,
  RECENT_TRIPS,
  PERFORMANCE_METRICS,
  VEHICLE_INSIGHTS,
  FAULT_CODES,
  FAULT_CODE_ANALYSIS
} from './constants';
// ============================================================================
// ERROR BOUNDARY — catches render-time errors in page components so the entire
// app doesn't go blank (e.g. getTemplateId throwing when model is empty).
// ============================================================================
class PageErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('PageErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '16px', padding: '32px'
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred on this page.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: '#2563eb', color: '#fff', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_MAP_CENTER: [number, number] = [19.0760, 72.8777];

const extractVehiclesFromResponse = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.vehicles)) return payload.vehicles;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const isTimeoutError = (error: any) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return error?.code === 'ECONNABORTED' || message.includes('timeout');
};

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (value?: string): Vehicle['status'] => {
  const normalized = (value ?? '').toLowerCase();
  if (/charge/.test(normalized)) return 'charging';
  if (/maint|service|offline|fault|error/.test(normalized)) return 'maintenance';
  if (/idle|parked|stopped|off/.test(normalized)) return 'idle';
  if (/active|running|online|moving|engaged|driving/.test(normalized)) return 'active';
  return 'idle';
};

const parseVehicleLocation = (vehicle: any, fallbackCenter: [number, number]): Vehicle['location'] => {
  const latCandidate =
    vehicle.location?.lat ??
    vehicle.latitude ??
    vehicle.lat ??
    vehicle.geo_lat ??
    vehicle.geoLatitude ??
    vehicle.coords?.latitude ??
    fallbackCenter[0];
  const lngCandidate =
    vehicle.location?.lng ??
    vehicle.longitude ??
    vehicle.lng ??
    vehicle.geo_lng ??
    vehicle.geoLongitude ??
    vehicle.coords?.longitude ??
    fallbackCenter[1];

  const lat = toNumber(latCandidate, fallbackCenter[0]);
  const lng = toNumber(lngCandidate, fallbackCenter[1]);

  return { lat, lng };
};

const normalizeFleetVehicle = (vehicle: any, fallbackCenter: [number, number], index: number): Vehicle => {
  const location = parseVehicleLocation(vehicle, fallbackCenter);
  return {
    id: vehicle.id?.toString() ?? vehicle.vehicle_id?.toString() ?? vehicle.vin ?? `vehicle-${index}`,
    name:
      vehicle.name ||
      vehicle.model_name ||
      `${vehicle.model ?? 'Vehicle'} ${vehicle.variant ?? ''}`.trim() ||
      'Vehicle',
    licensePlate: vehicle.licensePlate || vehicle.license_plate || vehicle.vin || 'N/A',
    type: vehicle.type || vehicle.vehicle_type || 'fleet',
    status: normalizeStatus(vehicle.status || vehicle.state || vehicle.vehicle_status),
    battery: toNumber(vehicle.battery ?? vehicle.battery_percentage ?? vehicle.soc ?? vehicle.battery_level, 0),
    speed: toNumber(vehicle.speed ?? vehicle.current_speed ?? vehicle.velocity ?? vehicle.drive_speed, 0),
    location,
    driver: vehicle.driver || vehicle.driver_name || 'Unassigned',
    lastUpdate: vehicle.last_update || vehicle.updated_at || vehicle.last_ping || 'Unknown',
    odometer: toNumber(vehicle.odometer ?? vehicle.total_distance ?? vehicle.mileage ?? vehicle.km, 0),
    health: toNumber(vehicle.health ?? vehicle.health_score ?? vehicle.battery_health ?? 100, 100),
    dealerId: vehicle.dealerId || vehicle.dealer_id
  };
};

const ConnectedAutoDashboard = () => {
  const {
    isAuthenticated,
    userRole,
    displayName,
    dealerId,
    loginForm,
    setLoginForm,
    signupForm,
    setSignupForm,
    handleLogin,
    handleSignup,
    handleLogout
  } = useAuth();

  // Use displayName from useAuth for the header
  const headerUsername = displayName || localStorage.getItem('displayName') || '';

  // State definitions moved up to be used in calculations if needed, or we just calculate derived state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return false;
  });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState(3);
  const [inventoryVehicles, setInventoryVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;
    const fetchInventoryVehicles = async () => {
      try {
        const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
        const payload = extractVehiclesFromResponse(response.data);
        const normalized = payload.map((vehicle, index) =>
          normalizeFleetVehicle(vehicle, DEFAULT_MAP_CENTER, index)
        );
        if (isMounted) {
          setInventoryVehicles(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch vehicle inventory for dashboard:', err);
        if (isMounted) {
          if (isTimeoutError(err)) {
            console.warn('Dashboard inventory request timed out. Using mock vehicles.');
            setInventoryVehicles(FLEET_VEHICLES as Vehicle[]);
          } else {
            setInventoryVehicles([]);
          }
        }
      }
    };

    fetchInventoryVehicles();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Data based on Role
  const filteredMenuItems = MENU_ITEMS
    .filter(item => item.roles.includes(userRole))
    .map(item => {
      if (
        item.id === 'add-vehicle' &&
        (userRole === 'USER' || userRole === 'RIDER' || userRole === 'FLEET')
      ) {
        return { ...item, label: 'Vehicle Details' };
      }
      return item;
    });

  const clientVehicleIds = ['V001', 'V002'];
  const sourceVehicles = inventoryVehicles.length > 0
    ? inventoryVehicles
    : (FLEET_VEHICLES as Vehicle[]);
  const filteredVehicles = sourceVehicles;

  // Heavy pages (map/device table) choke on thousands of rows; keep the UI lean
  const displayVehicles = filteredVehicles.slice(0, 300);

  // Calculate Device Stats based on Filtered Vehicles
  const deviceStats = {
    active: filteredVehicles.filter(v => v.status === 'active' || v.status === 'charging').length,
    faulty: filteredVehicles.filter(v => v.health < 80).length, // Heuristic for faulty
    inactive: filteredVehicles.filter(v => v.status === 'idle').length,
    total: filteredVehicles.length
  };

  const filteredAlerts = (RECENT_ALERTS as Alert[]);

  const filteredTrips = RECENT_TRIPS;

  const filteredVehicleInsights = VEHICLE_INSIGHTS;

  // Calculate specific data for the user
  const salesData = INITIAL_SALES_DATA;

  // Aggregate environmental data from insights if possible, or scale
  const totalCo2 = filteredVehicleInsights.reduce((acc, curr) => acc + curr.co2Saved, 0);
  const environmentalData = INITIAL_ENVIRONMENTAL_DATA;

  const filteredFaultCodes = FAULT_CODES;

  const filteredFaultAnalysis = {
    ...FAULT_CODE_ANALYSIS,
    summary: {
      ...FAULT_CODE_ANALYSIS.summary,
      totalFaults: filteredFaultCodes.length,
      activeFaults: filteredFaultCodes.filter(f => f.status === 'active').length,
      resolvedFaults: filteredFaultCodes.filter(f => f.status === 'resolved').length,
    },
    // Use filtered faults for top faults list
    topFaults: FAULT_CODE_ANALYSIS.topFaults.filter(tf =>
      filteredFaultCodes.some(ff => ff.code === tf.code)
    )
  };

  const [performanceMetrics] = useState(PERFORMANCE_METRICS);

  // Login Page
  if (!isAuthenticated) {
    return (
      <LoginPage
        loginForm={loginForm}
        showForgotPassword={showForgotPassword}
        darkMode={darkMode}
        setLoginForm={setLoginForm}
        setShowForgotPassword={setShowForgotPassword}
        handleLogin={handleLogin}
      />
    );
  }

  // Effect to reset page if current page is not allowed
  const isValidPage = filteredMenuItems.some(item => {
    if (item.id === currentPage) return true;
    if (item.subItems) {
      return item.subItems.some(sub => sub.id === currentPage);
    }
    return false;
  });

  if (!isValidPage && currentPage !== 'dashboard') {
    setCurrentPage('dashboard');
  }

  // Main Dashboard
  return (
    <div className={`h-screen w-screen overflow-hidden ${darkMode ? 'bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-900 to-black' : 'bg-white'} transition-colors duration-300`}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        darkMode={darkMode}
        currentPage={currentPage}
        menuItems={filteredMenuItems}
        setSidebarOpen={setSidebarOpen}
        setCurrentPage={setCurrentPage}
      />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'} ml-0 h-full flex flex-col`}>
        <Header
          darkMode={darkMode}
          notifications={notifications}
          showUserMenu={showUserMenu}
          currentPage={currentPage}
          menuItems={filteredMenuItems}
          userRole={userRole}
          username={headerUsername}
          displayName={displayName}
          setDarkMode={setDarkMode}
          setCurrentPage={setCurrentPage}
          setShowUserMenu={setShowUserMenu}
          handleLogout={handleLogout}
          setSidebarOpen={setSidebarOpen}
        />

        <PageErrorBoundary onReset={() => setCurrentPage('dashboard')}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <main className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {currentPage === 'dashboard' && (
              <DashboardContent
                darkMode={darkMode}
                deviceStats={deviceStats}
                salesData={salesData}
                environmentalData={environmentalData}
                quickActions={QUICK_ACTIONS}
                alerts={filteredAlerts}
                vehicles={displayVehicles}
                trips={filteredTrips}
                performanceMetrics={performanceMetrics}
              />
            )}

            {currentPage === 'tracking' && (
              <LiveTracking vehicles={displayVehicles} darkMode={darkMode} />
            )}

            {currentPage === 'insights' && (
              <VehicleInsights darkMode={darkMode} vehicleInsights={filteredVehicleInsights} />
            )}

            {currentPage === 'faults' && (
              <FaultAnalysis darkMode={darkMode} faultCodes={filteredFaultCodes} faultCodeAnalysis={filteredFaultAnalysis} />
            )}

            {currentPage === 'reports' && (
              <Reports darkMode={darkMode} vehicleInsights={filteredVehicleInsights} faultCodes={filteredFaultCodes} userRole={userRole} />
            )}

            {currentPage === 'devices' && (
              <DeviceManagement darkMode={darkMode} vehicles={displayVehicles} />
            )}

            {currentPage === 'fota' && (
              <FotaUpdates darkMode={darkMode} vehicles={filteredVehicles} />
            )}

            {currentPage === 'configure' && (
              <Configure darkMode={darkMode} />
            )}

            {currentPage === 'enterprise' && (
              <EnterpriseSettings darkMode={darkMode} userRole={userRole} />
            )}

            {currentPage === 'add-vehicle' && (
              <AddVehicle
                darkMode={darkMode}
                userRole={userRole}
                onAdd={async (vehicleData) => {
                  try {
                    console.log('Vehicle registration initiated...', vehicleData);
                    // The AddVehicle component handles the API call internally
                    // No need to call any API here
                    console.log('Vehicle registration completed');
                    setCurrentPage('dashboard');
                  } catch (error) {
                    console.error('Failed to add vehicle:', error);
                  }
                }}
              />
            )}

            {currentPage === 'dealer-management' && (
              <DealerManagement darkMode={darkMode} userRole={userRole} />
            )}

            {currentPage === 'customer-management' && (
              <CustomerManagement darkMode={darkMode} userRole={userRole} />
            )}

            {currentPage === 'fleet-management' && (
              <FleetManagement darkMode={darkMode} userRole={userRole} />
            )}

            {currentPage === 'support-connect' && (
              <SupportConnect darkMode={darkMode} userRole={userRole} username={headerUsername} />
            )}

            {currentPage === 'assign-vehicle' && (
              <VehicleAssignment darkMode={darkMode} vehicles={filteredVehicles} />
            )}
          </main>
        </Suspense>
        </PageErrorBoundary>
      </div>
    </div>
  );
};

export default ConnectedAutoDashboard;
