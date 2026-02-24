import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  ChevronDown,
  User,
  Truck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  DRIVER_PERFORMANCE
} from '../constants';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { UserRole } from '../types';

interface ReportsProps {
  darkMode: boolean;
  vehicleInsights: any[];
  faultCodes: any[];
  userRole: UserRole;
}

const Reports: React.FC<ReportsProps> = ({ darkMode, vehicleInsights, faultCodes, userRole }) => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [apiVehicles, setApiVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
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

  const tabs = [
    { id: 'vehicles', label: 'Vehicle Performance', icon: Truck },
    ...(userRole === 'SUPER_ADMIN' || userRole === 'RND' || userRole === 'FLEET'
      ? [{ id: 'drivers', label: 'Driver Efficiency', icon: User }]
      : []),
    { id: 'faults', label: 'Fault Incidents', icon: AlertTriangle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'vehicles':
        if (isLoadingVehicles) {
          return (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="animate-spin" size={48} />
              <p className="ml-4">Loading vehicles...</p>
            </div>
          );
        }
        if (vehiclesError) {
          return <div className="text-red-500 bg-red-100 p-4 rounded-md">{vehiclesError}</div>;
        }
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Trips</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Distance</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Utilization</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Health Score</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {apiVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className={`border-b last:border-0 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <td className="p-4">
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.model_name || vehicle.model || 'N/A'}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {vehicle.vin || 'N/A'}
                      </div>
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {vehicle.totalTrips || 0}
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {(vehicle.totalDistance || 0).toLocaleString()} km
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {vehicle.utilizationRate || 0}%
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                          <div
                            className={`h-2 rounded-full ${(vehicle.healthScore || 85) > 90 ? 'bg-green-500' :
                              (vehicle.healthScore || 85) > 75 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${vehicle.healthScore || 85}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {vehicle.healthScore || 85}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(vehicle.uptime || 95) > 95
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                        {(vehicle.uptime || 95) > 95 ? 'Optimal' : 'Attention'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'drivers':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Driver Name</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Rating</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Trips</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Efficiency</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Incidents</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {DRIVER_PERFORMANCE.map((driver) => (
                  <tr
                    key={driver.id}
                    className={`border-b last:border-0 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <td className={`p-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {driver.name}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-orange-500 font-semibold">
                        ★ {driver.rating}
                      </span>
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {driver.totalTrips}
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {driver.efficiency}%
                    </td>
                    <td className={`p-4 ${driver.incidents === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {driver.incidents}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${driver.status === 'excellent'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : driver.status === 'good'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                        {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'faults':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Code</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Description</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Severity</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                  <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {faultCodes.map((fault) => (
                  <tr
                    key={fault.id}
                    className={`border-b last:border-0 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <td className="p-4 font-mono text-blue-600 font-semibold">{fault.code}</td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {fault.description}
                    </td>
                    <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {fault.vehicle}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fault.severity === 'high' ? 'bg-red-100 text-red-800' :
                        fault.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {fault.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fault.status === 'active' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                        }`}>
                        {fault.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={`p-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {fault.firstDetected.split(' ')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            System Reports
          </h2>

          <div className="flex gap-4">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'
              }`}>
              <Calendar size={18} />
              Last 30 Days
              <ChevronDown size={16} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition border-2 ${activeTab === tab.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : `border-transparent ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`
                  }`}
              >
                <Icon size={24} className="mb-2" />
                <span className={`font-medium text-sm ${activeTab === tab.id ? '' : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className={`rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default Reports;
