import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Battery, Gauge, IndianRupee, Calendar, AlertCircle, CheckCircle, Leaf, TreePine, Droplets, Cpu, Thermometer, Loader2, Search, Wifi, WifiOff, Car, Zap, Activity } from 'lucide-react';
import McuData from './McuData';
import VcuData from './VcuData';
import BmsData from './BmsData';
import HeatMaps from './HeatMaps';
import RecentTrips from './RecentTrips';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import {
  getServiceStatus, ServiceStatusData,
  getVehicleHealth, VehicleHealthData,
  getVehicleOverview, VehicleOverviewResponse,
  getEnvironmentalImpact, EnvironmentalImpactResponse,
  getPerformanceMetrics, PerformanceMetricsResponse,
} from '../api/vehicle';

interface VehicleInsightsProps {
  darkMode: boolean;
  vehicleInsights: any[];
}

const VehicleInsights: React.FC<VehicleInsightsProps> = ({ darkMode, vehicleInsights }) => {
  const [apiVehicles, setApiVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [activeEcuTab, setActiveEcuTab] = useState<'overview' | 'mcu' | 'vcu' | 'bms' | 'heatmaps'>('overview');
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');

  // --- Insights API state ---
  const [serviceStatus, setServiceStatus] = useState<ServiceStatusData | null>(null);
  const [serviceStatusLoading, setServiceStatusLoading] = useState(false);
  const [serviceStatusError, setServiceStatusError] = useState<string | null>(null);

  const [healthData, setHealthData] = useState<VehicleHealthData | null>(null);
  const [overviewData, setOverviewData] = useState<VehicleOverviewResponse | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalImpactResponse | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetricsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
      console.log('API Response:', response);

      let vehicleData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          vehicleData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          vehicleData = response.data.results;
        } else if (response.data.vehicles && Array.isArray(response.data.vehicles)) {
          vehicleData = response.data.vehicles;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          vehicleData = response.data.data;
        }
      }
      setApiVehicles(vehicleData);
      if (vehicleData.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vehicleData[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch vehicles:', err);
      setVehiclesError('Failed to load vehicle inventory');
      setApiVehicles([]);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Update selected vehicle when list changes
  useEffect(() => {
    if (apiVehicles.length > 0 && (!selectedVehicle || !apiVehicles.find(v => v.vin === selectedVehicle.vin))) {
      setSelectedVehicle(apiVehicles[0]);
    }
  }, [apiVehicles]);

  // Fetch ALL insights data when selectedVehicle changes
  useEffect(() => {
    const vin = selectedVehicle?.vin;
    if (!vin) {
      setServiceStatus(null);
      setServiceStatusError(null);
      setHealthData(null);
      setOverviewData(null);
      setEnvironmentalData(null);
      setPerformanceData(null);
      return;
    }

    let isMounted = true;

    const fetchAllInsights = async () => {
      setInsightsLoading(true);
      setServiceStatusLoading(true);
      setServiceStatusError(null);

      // Fetch all insights endpoints in parallel
      const results = await Promise.allSettled([
        getServiceStatus(vin),       // 0: maintenance
        getVehicleHealth(vin),       // 1: health
        getVehicleOverview(vin),     // 2: overview
        getEnvironmentalImpact(vin), // 3: environmental
        getPerformanceMetrics(vin),  // 4: performance
      ]);

      if (!isMounted) return;

      // --- Maintenance / Service Status ---
      if (results[0].status === 'fulfilled') {
        const res = results[0].value;
        if (res?.success) {
          setServiceStatus(res);
        } else {
          setServiceStatus(null);
          setServiceStatusError('Service status not available');
        }
      } else {
        setServiceStatus(null);
        setServiceStatusError('Failed to load service status');
      }

      // --- Health ---
      if (results[1].status === 'fulfilled') {
        const res = results[1].value;
        setHealthData(res?.success ? res : null);
      } else {
        setHealthData(null);
      }

      // --- Overview ---
      if (results[2].status === 'fulfilled') {
        setOverviewData(results[2].value);
      } else {
        setOverviewData(null);
      }

      // --- Environmental ---
      if (results[3].status === 'fulfilled') {
        setEnvironmentalData(results[3].value);
      } else {
        setEnvironmentalData(null);
      }

      // --- Performance ---
      if (results[4].status === 'fulfilled') {
        setPerformanceData(results[4].value);
      } else {
        setPerformanceData(null);
      }

      setServiceStatusLoading(false);
      setInsightsLoading(false);
    };

    fetchAllInsights();

    return () => {
      isMounted = false;
    };
  }, [selectedVehicle?.vin]);


  if (!selectedVehicle) return <div className="p-6">No vehicles available</div>;


  const _getHealthBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Filter vehicles based on search query
  const filteredVehicles = apiVehicles.filter(vehicle => {
    const searchLower = vehicleSearchQuery.toLowerCase();
    return (
      vehicle.vin?.toLowerCase().includes(searchLower) ||
      vehicle.model_name?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.variant?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* Vehicle Selector */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
          Vehicle Selection
        </h2>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by VIN, model, or variant..."
              value={vehicleSearchQuery}
              onChange={(e) => setVehicleSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border-2 transition-all outline-none ${darkMode
                ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white placeholder-gray-400'
                : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900 placeholder-gray-500'
                }`}
            />
          </div>
        </div>

        {isLoadingVehicles ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="animate-spin" size={48} />
            <p className="ml-4">Loading vehicles...</p>
          </div>
        ) : vehiclesError ? (
          <div className="text-red-500 bg-red-100 p-4 rounded-md">{vehiclesError}</div>
        ) : filteredVehicles.length === 0 ? (
          <div className={`text-center p-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {vehicleSearchQuery ? 'No vehicles found matching your search' : 'No vehicles available'}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto">
            {filteredVehicles.map((vehicle) => (
              <button
                key={vehicle.vin}
                onClick={() => setSelectedVehicle(vehicle)}
                className={`flex-shrink-0 px-6 py-4 rounded-lg border-2 transition ${selectedVehicle?.vin === vehicle.vin
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : darkMode
                    ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
              >
                <div className={`text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div className="font-semibold">{vehicle.vin}</div>
                  <div className="text-sm text-gray-500">{vehicle.model_name || vehicle.model || 'N/A'}</div>
                  <div className="text-xs text-gray-400">{vehicle.variant || ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ECU Data Tabs */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveEcuTab('overview')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeEcuTab === 'overview'
              ? 'bg-blue-600 text-white shadow-lg'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveEcuTab('mcu')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeEcuTab === 'mcu'
              ? 'bg-blue-600 text-white shadow-lg'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Cpu size={16} /> MCU Data
          </button>
          <button
            onClick={() => setActiveEcuTab('vcu')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeEcuTab === 'vcu'
              ? 'bg-blue-600 text-white shadow-lg'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Cpu size={16} /> VCU Data
          </button>
          <button
            onClick={() => setActiveEcuTab('bms')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeEcuTab === 'bms'
              ? 'bg-blue-600 text-white shadow-lg'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Battery size={16} /> BMS Data
          </button>
          {/* <button
            onClick={() => setActiveEcuTab('heatmaps')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeEcuTab === 'heatmaps'
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Thermometer size={16} /> Heat Maps
          </button> */}
        </div>
      </div>

      {/* Conditional Content Based on Active Tab */}
      {activeEcuTab === 'mcu' && (
        <McuData darkMode={darkMode} vehicleInsights={vehicleInsights} selectedVehicle={selectedVehicle} />
      )}

      {activeEcuTab === 'vcu' && (
        <VcuData darkMode={darkMode} vehicleInsights={vehicleInsights} vehicles={[]} selectedVehicle={selectedVehicle} />
      )}

      {activeEcuTab === 'bms' && (
        <BmsData darkMode={darkMode} vehicleInsights={vehicleInsights} selectedVehicle={selectedVehicle} />
      )}

      {activeEcuTab === 'heatmaps' && (
        <HeatMaps darkMode={darkMode} vehicleInsights={vehicleInsights} selectedVehicle={selectedVehicle} />
      )}

      {activeEcuTab === 'overview' && selectedVehicle && (
        <>

          {/* Vehicle Overview (from /api/insights/vehicle/<vin>/) */}
          {insightsLoading && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${darkMode ? 'bg-blue-900/20 border border-blue-600/40' : 'bg-blue-50 border border-blue-200'}`}>
              <Loader2 className={`animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={20} />
              <span className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Loading vehicle overview...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Model */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Model</p>
                  <p className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {overviewData?.model ?? selectedVehicle?.model ?? 'N/A'}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    VCU: {overviewData?.vcu_id ?? 'N/A'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <Car className="text-blue-500" size={28} />
                </div>
              </div>
            </div>

            {/* Online Status */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
                  <p className={`text-xl font-bold mt-1 ${overviewData?.status?.online ? 'text-green-500' : (darkMode ? 'text-gray-400' : 'text-gray-600')
                    }`}>
                    {overviewData?.status?.online ? 'Online' : 'Offline'}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {overviewData?.status?.last_seen
                      ? `Last seen: ${new Date(overviewData.status.last_seen).toLocaleString()}`
                      : 'Last seen: N/A'
                    }
                  </p>
                </div>
                <div className={`p-3 rounded-full ${overviewData?.status?.online ? (darkMode ? 'bg-green-900/30' : 'bg-green-50') : (darkMode ? 'bg-gray-700' : 'bg-gray-100')}`}>
                  {overviewData?.status?.online
                    ? <Wifi className="text-green-500" size={28} />
                    : <WifiOff className={darkMode ? 'text-gray-500' : 'text-gray-400'} size={28} />
                  }
                </div>
              </div>
            </div>

            {/* Speed */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Current Speed</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {overviewData?.latest_data?.speed?.toFixed(1) ?? '0.0'} <span className="text-sm font-normal text-gray-500">km/h</span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                  <Activity className="text-purple-500" size={28} />
                </div>
              </div>
            </div>

            {/* SOC (State of Charge) */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Battery SOC</p>
                  <p className={`text-2xl font-bold mt-1 ${(overviewData?.latest_data?.soc ?? 0) > 50 ? 'text-green-500'
                    : (overviewData?.latest_data?.soc ?? 0) > 20 ? 'text-yellow-500'
                      : 'text-red-500'
                    }`}>
                    {overviewData?.latest_data?.soc?.toFixed(1) ?? 'N/A'}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${(overviewData?.latest_data?.soc ?? 0) > 50 ? 'bg-green-500'
                        : (overviewData?.latest_data?.soc ?? 0) > 20 ? 'bg-yellow-500'
                          : 'bg-red-500'
                        }`}
                      style={{ width: `${Math.min(overviewData?.latest_data?.soc ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`p-3 rounded-full ml-4 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <Zap className="text-green-500" size={28} />
                </div>
              </div>
            </div>

            {/* Odometer */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Odometer</p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {overviewData?.latest_data?.odometer?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'} <span className="text-sm font-normal text-gray-500">km</span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                  <Gauge className="text-indigo-500" size={28} />
                </div>
              </div>
            </div>

            {/* Last Data Timestamp */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Last Data</p>
                  <p className={`text-sm font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {overviewData?.latest_data?.time
                      ? new Date(overviewData.latest_data.time).toLocaleString()
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                  <Calendar className="text-amber-500" size={28} />
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Impact (from /api/insights/vehicle/<vin>/environmental/) */}
          {environmentalData && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="text-green-500" size={22} />
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Environmental Impact
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="text-green-500" size={16} />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">CO₂ Saved</p>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {environmentalData.co2_saved_kg?.toFixed(1) ?? 'N/A'} <span className="text-sm font-normal">kg</span>
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TreePine className="text-green-500" size={16} />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Trees Equivalent</p>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {environmentalData.trees_equivalent?.toFixed(1) ?? 'N/A'} <span className="text-sm font-normal">trees</span>
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="text-blue-500" size={16} />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Fuel Saved</p>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {environmentalData.fuel_saved_liters?.toFixed(1) ?? 'N/A'} <span className="text-sm font-normal">liters</span>
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="text-purple-500" size={16} />
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Distance Covered</p>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {environmentalData.total_distance_km?.toFixed(1) ?? 'N/A'} <span className="text-sm font-normal">km</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Service Status (from /maintenance/ API) */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Service Status</h3>
              {serviceStatusLoading && <Loader2 className="animate-spin" size={20} />}
            </div>

            {serviceStatusError ? (
              <div className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{serviceStatusError}</div>
            ) : serviceStatus ? (
              <div className="space-y-5">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Odometer</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {serviceStatus.odometer_km?.toLocaleString()} km
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Next Service At</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {serviceStatus.next_service_km?.toLocaleString()} km
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">KM Until Service</p>
                    <p className={`text-lg font-bold ${(serviceStatus.km_until_service ?? 0) < 500 ? 'text-red-500' :
                      (serviceStatus.km_until_service ?? 0) < 1000 ? 'text-yellow-500' :
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                      {serviceStatus.km_until_service?.toLocaleString()} km
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Service Interval</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Every {serviceStatus.service_interval_km?.toLocaleString()} km
                    </p>
                  </div>
                </div>

                {/* Service Progress Bar */}
                {serviceStatus.service_interval_km > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Service progress</span>
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {((1 - (serviceStatus.km_until_service / serviceStatus.service_interval_km)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${(serviceStatus.km_until_service / serviceStatus.service_interval_km) < 0.1 ? 'bg-red-500' :
                          (serviceStatus.km_until_service / serviceStatus.service_interval_km) < 0.2 ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min(100, (1 - (serviceStatus.km_until_service / serviceStatus.service_interval_km)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Maintenance Items */}
                {serviceStatus.maintenance_items?.length > 0 && (
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔧 Upcoming Maintenance Items
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {serviceStatus.maintenance_items.map((mi, idx) => {
                        const kmLeft = mi.next_at - serviceStatus.odometer_km;
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {mi.item}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${kmLeft < 1000 ? 'bg-red-100 text-red-700' :
                                kmLeft < 3000 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                {kmLeft > 0 ? `${kmLeft.toLocaleString()} km left` : 'Due now'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Next at {mi.next_at.toLocaleString()} km • Every {mi.interval_km.toLocaleString()} km
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Select a vehicle to load service status.
              </div>
            )}
          </div>

          {/* Carbon Saved Section (from /environmental/ API) */}
          <div className={`${darkMode ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40' : 'bg-gradient-to-br from-green-50 to-emerald-50'} rounded-xl shadow-lg p-6 border-2 ${darkMode ? 'border-green-700/50' : 'border-green-200'}`}>
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center gap-2`}>
              <Leaf className="text-green-500" size={28} />
              Environmental Impact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CO2 Saved */}
              <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-center mb-3">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Leaf className="text-green-600" size={32} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-2">CO₂ Emissions Saved</p>
                <p className={`text-3xl font-bold text-green-600 mb-1`}>
                  {(environmentalData?.co2_saved_kg ?? 0).toFixed(1)} kg
                </p>
                <p className="text-xs text-gray-400">vs. conventional vehicles</p>
              </div>

              {/* Trees Equivalent */}
              <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-center mb-3">
                  <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    <TreePine className="text-emerald-600" size={32} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-2">Trees Equivalent</p>
                <p className={`text-3xl font-bold text-emerald-600 mb-1`}>
                  {(environmentalData?.trees_equivalent ?? 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">trees planted equivalent</p>
              </div>

              {/* Fuel Saved */}
              <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-center mb-3">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Droplets className="text-blue-600" size={32} />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-2">Fuel Saved</p>
                <p className={`text-3xl font-bold text-blue-600 mb-1`}>
                  {(environmentalData?.fuel_saved_liters ?? 0).toFixed(1)} L
                </p>
                <p className="text-xs text-gray-400">petrol/diesel saved</p>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
              <p className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                🌍 By choosing electric, this vehicle has contributed to a cleaner environment and reduced carbon footprint.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Metrics (from /health/ API) */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Vehicle Health
              </h3>

              {healthData ? (
                <div className="space-y-5">
                  {/* Battery Health */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔋 Battery Health
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">State of Charge</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {healthData.battery_health?.soc?.toFixed(1) ?? 'N/A'}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${(healthData.battery_health?.soc ?? 0) >= 60 ? 'bg-green-500' :
                              (healthData.battery_health?.soc ?? 0) >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${healthData.battery_health?.soc ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Battery Health</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {healthData.battery_health?.battery_health_pct?.toFixed(1) ?? 'N/A'}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${(healthData.battery_health?.battery_health_pct ?? 0) >= 80 ? 'bg-green-500' :
                              (healthData.battery_health?.battery_health_pct ?? 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${healthData.battery_health?.battery_health_pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Pack Voltage</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {healthData.battery_health?.pack_voltage?.toFixed(1) ?? 'N/A'} V
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Pack Current</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {healthData.battery_health?.pack_current?.toFixed(2) ?? 'N/A'} A
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Motor Health */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⚙️ Motor Health
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Motor Temperature</p>
                        <p className={`text-lg font-bold ${(healthData.motor?.motor_temp ?? 0) >= 80 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          (healthData.motor?.motor_temp ?? 0) >= 60 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {healthData.motor?.motor_temp?.toFixed(1) ?? 'N/A'} °C
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Controller Temperature</p>
                        <p className={`text-lg font-bold ${(healthData.motor?.controller_temp ?? 0) >= 80 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          (healthData.motor?.controller_temp ?? 0) >= 60 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {healthData.motor?.controller_temp?.toFixed(1) ?? 'N/A'} °C
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tyres - show if available */}
                  {healthData.tyres && (
                    <div>
                      <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        🛞 Tyre Health
                      </h4>
                      {typeof healthData.tyres === 'object' && healthData.tyres !== null ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <p className="text-xs text-gray-500">Front Pressure</p>
                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {healthData.tyres.front_pressure ?? 'N/A'}
                            </p>
                          </div>
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                            <p className="text-xs text-gray-500">Rear Pressure</p>
                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {healthData.tyres.rear_pressure ?? 'N/A'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {JSON.stringify(healthData.tyres)}
                        </p>
                      )}
                    </div>
                  )}
                  {healthData.tyres === null && (
                    <p className={`text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Tyre health data not available
                    </p>
                  )}
                </div>
              ) : (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Health data not available for this vehicle
                </p>
              )}
            </div>

            {/* Performance Metrics (from /performance/ API) */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Performance Metrics
                </h3>
                {performanceData?.period && (
                  <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    Period: {performanceData.period.replace('_', ' ')}
                  </span>
                )}
              </div>

              {performanceData ? (
                <div className="space-y-5">
                  {/* Speed */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🏎️ Speed
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Average</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {performanceData.speed?.avg_kmh?.toFixed(1) ?? 'N/A'} km/h
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Maximum</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {performanceData.speed?.max_kmh ?? 'N/A'} km/h
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Motor */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⚙️ Motor
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Avg Temp</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {performanceData.motor?.avg_temp?.toFixed(1) ?? 'N/A'} °C
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Max Temp</p>
                        <p className={`text-lg font-bold ${(performanceData.motor?.max_temp ?? 0) >= 80 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {performanceData.motor?.max_temp ?? 'N/A'} °C
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Avg RPM</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {performanceData.motor?.avg_rpm?.toFixed(0) ?? 'N/A'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Max RPM</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {performanceData.motor?.max_rpm ?? 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Controller */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔧 Controller
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Avg Temp</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {performanceData.controller?.avg_temp?.toFixed(1) ?? 'N/A'} °C
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Max Temp</p>
                        <p className={`text-lg font-bold ${(performanceData.controller?.max_temp ?? 0) >= 80 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {performanceData.controller?.max_temp ?? 'N/A'} °C
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Battery */}
                  <div>
                    <h4 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔋 Battery
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Avg Voltage</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {performanceData.battery?.avg_voltage?.toFixed(1) ?? 'N/A'} V
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Min SOC</p>
                        <p className={`text-lg font-bold ${(performanceData.battery?.min_soc ?? 100) < 20 ? (darkMode ? 'text-red-400' : 'text-red-600') :
                          darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {performanceData.battery?.min_soc?.toFixed(1) ?? 'N/A'}%
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">Max SOC</p>
                        <p className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {performanceData.battery?.max_soc?.toFixed(1) ?? 'N/A'}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Performance data not available for this vehicle
                </p>
              )}
            </div>
          </div>

          {/* Recent Trips */}
          <RecentTrips vin={selectedVehicle?.vin} darkMode={darkMode} />

          {/* Maintenance Schedule */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
              <Calendar size={24} />
              Maintenance Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <CheckCircle className="text-blue-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Current Odometer</p>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {serviceStatus ? `${serviceStatus.odometer_km?.toLocaleString()} km` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="text-orange-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Next Service</p>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {serviceStatus
                      ? `At ${serviceStatus.next_service_km?.toLocaleString()} km (${serviceStatus.km_until_service?.toLocaleString()} km left)`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default VehicleInsights;
