// Live Tracking Component with Interactive Map

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import L from 'leaflet';
import { Battery, Gauge, Navigation, User, AlertCircle, MapPin, Loader2, Search } from 'lucide-react';
import { Vehicle } from '../types';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { getVehicleLatestLocation, VehicleLatestLocation } from '../api/vehicle';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER: [number, number] = [19.0760, 72.8777];

// Helper component to recenter the map when the selected vehicle's location changes
const MapUpdater = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, 15, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const extractVehiclesFromResponse = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.vehicles)) return payload.vehicles;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (value?: string): Vehicle['status'] => {
  const normalized = (value ?? '').toLowerCase();
  if (/charge/.test(normalized)) return 'charging';
  if (/main|service|offline|fault|error/.test(normalized)) return 'maintenance';
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

interface LiveTrackingProps {
  vehicles: Vehicle[];
  darkMode: boolean;
}

const LiveTracking: React.FC<LiveTrackingProps> = ({ vehicles, darkMode }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [mapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [isClient, setIsClient] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([]);
  const [isFleetLoading, setIsFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);
  const [fleetSearch, setFleetSearch] = useState('');
  const [liveLocationData, setLiveLocationData] = useState<VehicleLatestLocation | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchFleetVehicles = useCallback(async () => {
    setIsFleetLoading(true);
    setFleetError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
      const payload = extractVehiclesFromResponse(response.data);
      if (payload.length === 0) {
        setFleetVehicles([]);
        return;
      }
      const normalized = payload.map((vehicle, index) =>
        normalizeFleetVehicle(vehicle, mapCenter, index)
      );
      setFleetVehicles(normalized);
    } catch (err: any) {
      console.error('Failed to fetch total vehicles for live tracking:', err);
      setFleetError('Unable to load total vehicles');
    } finally {
      setIsFleetLoading(false);
    }
  }, [mapCenter]);

  useEffect(() => {
    fetchFleetVehicles();
  }, [fetchFleetVehicles]);

  useEffect(() => {
    const sourceVehicles = fleetVehicles.length > 0 ? fleetVehicles : vehicles;
    if (sourceVehicles.length === 0) {
      setSelectedVehicle(null);
      return;
    }
    if (!selectedVehicle || !sourceVehicles.some(v => v.id === selectedVehicle.id)) {
      setSelectedVehicle(sourceVehicles[0]);
    }
  }, [fleetVehicles, vehicles, selectedVehicle]);

  // --- Live Location Polling for Selected Vehicle ---
  useEffect(() => {
    if (!selectedVehicle || !isClient) return;

    // The vehicle VIN is stored in licensePlate (which is set to vehicle.vin) or id
    const vin = selectedVehicle.licensePlate !== 'N/A' ? selectedVehicle.licensePlate : selectedVehicle.id;

    const fetchLiveLocation = async () => {
      try {
        const raw = await getVehicleLatestLocation(vin);
        // The API may return data at top-level or nested inside data/location
        const data: any = raw?.latitude !== undefined ? raw : (raw as any)?.data ?? (raw as any)?.location ?? raw;
        if (data && data.latitude !== undefined) {
          const loc: VehicleLatestLocation = {
            timestamp: data.timestamp ?? new Date().toISOString(),
            latitude: toNumber(data.latitude, 0),
            longitude: toNumber(data.longitude, 0),
            altitude: toNumber(data.altitude, 0),
            satellites: toNumber(data.satellites, 0),
            speed: toNumber(data.speed, 0),
            hdop: toNumber(data.hdop, 0)
          };
          setLiveLocationData(loc);

          // Update the selected vehicle's location and speed in real-time
          const updatedVehicle: Vehicle = {
            ...selectedVehicle,
            location: { lat: loc.latitude, lng: loc.longitude },
            speed: loc.speed,
            lastUpdate: new Date(loc.timestamp).toLocaleTimeString()
          };
          setSelectedVehicle(updatedVehicle);

          // Also update in the fleet list so the marker moves on the map
          setFleetVehicles(prev =>
            prev.map(v => v.id === selectedVehicle.id ? updatedVehicle : v)
          );
        }
      } catch {
        // Silently handle — the vehicle may not have location data yet
      }
    };

    // Fetch immediately, then poll every 5 seconds
    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 5000);
    return () => clearInterval(interval);
  }, [selectedVehicle?.id, isClient]);

  const vehiclesToRender = fleetVehicles.length > 0 ? fleetVehicles : vehicles;
  const filteredVehicles = vehiclesToRender.filter(vehicle => {
    const query = fleetSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      vehicle.name.toLowerCase().includes(query) ||
      vehicle.licensePlate.toLowerCase().includes(query) ||
      vehicle.driver.toLowerCase().includes(query) ||
      vehicle.status.toLowerCase().includes(query)
    );
  });

  // Custom marker icons based on vehicle status
  const getVehicleIcon = (status: string) => {
    const color = status === 'active' ? 'green' :
      status === 'charging' ? 'blue' :
        status === 'idle' ? 'orange' : 'red';

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.3"/>
          <circle cx="20" cy="20" r="12" fill="${color}"/>
          <path d="M 12 20 L 20 12 L 28 20 L 20 16 Z" fill="white"/>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'charging': return 'bg-blue-500';
      case 'idle': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-500';
    if (battery > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Vehicles</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehiclesToRender.filter(v => v.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Charging</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehiclesToRender.filter(v => v.status === 'charging').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Battery className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Idle</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehiclesToRender.filter(v => v.status === 'idle').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Maintenance</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehiclesToRender.filter(v => v.status === 'maintenance').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Map and Vehicle List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
          <div className="h-[60vh] min-h-[400px] relative">
            {!isClient ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
                key="live-tracking-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Fly map to selected vehicle's live location */}
                <MapUpdater center={
                  liveLocationData
                    ? [liveLocationData.latitude, liveLocationData.longitude]
                    : selectedVehicle
                      ? [selectedVehicle.location.lat, selectedVehicle.location.lng]
                      : null
                } />

                {filteredVehicles.length > 0 && filteredVehicles.map((vehicle) => (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.location.lat, vehicle.location.lng]}
                    icon={getVehicleIcon(vehicle.status)}
                    eventHandlers={{
                      click: () => setSelectedVehicle(vehicle)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">{vehicle.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{vehicle.licensePlate}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Driver:</span>
                            <span className="font-semibold">{vehicle.driver}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Battery:</span>
                            <span className={`font-semibold ${getBatteryColor(vehicle.battery)}`}>
                              {vehicle.battery}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Speed:</span>
                            <span className="font-semibold">{vehicle.speed} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${vehicle.status === 'active' ? 'bg-green-500' :
                              vehicle.status === 'charging' ? 'bg-blue-500' :
                                vehicle.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                              {vehicle.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
            {filteredVehicles.length === 0 && fleetSearch && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-semibold text-gray-600">
                No vehicles match "{fleetSearch}".
              </div>
            )}
          </div>
        </div>

        {/* Vehicle List Sidebar */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
          <div className="mb-3">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Total Vehicles ({filteredVehicles.length})
            </h3>
          </div>
          {fleetError && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-sm bg-red-50 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>{fleetError}. Showing cached data.</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <label className="sr-only">Search total vehicles</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, plate, driver, status"
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 pl-9 text-sm transition ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
              />
            </div>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar md:overflow-y-auto">
            {isFleetLoading && vehiclesToRender.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="mt-3">Fetching total vehicles from backend...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className={`text-center py-12 rounded-xl border ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'
                }`}>No vehicles match your search.</div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedVehicle?.id === vehicle.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : darkMode
                      ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700'
                      : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(vehicle.status)} animate-pulse`}></div>
                        <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {vehicle.name}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{vehicle.licensePlate}</p>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${vehicle.health > 90 ? 'bg-green-100 text-green-700' :
                      vehicle.health > 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {vehicle.health}%
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <Battery className={`w-3 h-3 ${getBatteryColor(vehicle.battery)}`} />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {vehicle.battery}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gauge className="w-3 h-3 text-blue-500" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {vehicle.speed} km/h
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-purple-500" />
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                        {vehicle.driver}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Navigation className="w-3 h-3 text-green-500" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        {vehicle.lastUpdate}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Vehicle Details - {selectedVehicle.name}
              </h3>
              {liveLocationData && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  LIVE
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">License Plate</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedVehicle.licensePlate}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Driver</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedVehicle.driver}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Battery Level</p>
              <p className={`font-semibold ${getBatteryColor(selectedVehicle.battery)}`}>
                {selectedVehicle.battery}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Speed</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedVehicle.speed} km/h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Odometer</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedVehicle.odometer.toLocaleString()} km
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Vehicle Health</p>
              <p className={`font-semibold ${selectedVehicle.health > 90 ? 'text-green-500' :
                selectedVehicle.health > 75 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                {selectedVehicle.health}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(selectedVehicle.status)}`}>
                {selectedVehicle.status.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Update</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedVehicle.lastUpdate}
              </p>
            </div>
          </div>

          {/* Live Location Data */}
          {liveLocationData && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                📡 Live GPS Data
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Latitude</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {(liveLocationData.latitude ?? 0).toFixed(4)}°
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Longitude</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {(liveLocationData.longitude ?? 0).toFixed(4)}°
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Altitude</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {liveLocationData.altitude ?? 0} m
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {liveLocationData.speed ?? 0} km/h
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Satellites</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {liveLocationData.satellites ?? 0}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">HDOP</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {liveLocationData.hdop ?? 0}
                  </p>
                </div>
                <div className={`p-3 rounded-lg col-span-2 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Timestamp</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {liveLocationData.timestamp ? new Date(liveLocationData.timestamp).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTracking;