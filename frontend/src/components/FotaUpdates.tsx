import React, { useEffect, useState } from 'react';
import {
  Wifi,
  Cloud,
  CheckCircle,
  AlertTriangle,
  Clock,
  UploadCloud,
  Play,
  Pause,
  RotateCcw,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import { Vehicle } from '../types';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';

interface FotaUpdatesProps {
  darkMode: boolean;
  vehicles: Vehicle[];
}

const FotaUpdates: React.FC<FotaUpdatesProps> = ({ darkMode, vehicles }) => {
  const [activeTab, setActiveTab] = useState('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiVehicles, setApiVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

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

  // Generate mock FOTA status based on fleet data
  const sourceVehicles = apiVehicles.length > 0 ? apiVehicles : vehicles;

  const vehicleUpdates = sourceVehicles.map((vehicle: any, index) => {
    // Deterministic status based on index
    let status = 'completed';
    let progress = 100;
    let currentVersion = 'v2.4.1';
    let targetVersion = 'v2.4.1';

    if (index === 1) { // Vehicle 2
      status = 'available';
      progress = 0;
      currentVersion = 'v2.3.9';
      targetVersion = 'v2.4.1';
    } else if (index === 3) { // Vehicle 4
      status = 'in-progress';
      progress = 45;
      currentVersion = 'v2.3.9';
      targetVersion = 'v2.4.1';
    } else if (index === 5) { // Vehicle 6
      status = 'failed';
      progress = 0;
      currentVersion = 'v2.3.5';
      targetVersion = 'v2.4.1';
    }

    return {
      id: vehicle.id || vehicle.vin || `vehicle-${index}`,
      vehicleName: vehicle.name || vehicle.model_name || vehicle.model || 'Vehicle',
      licensePlate: vehicle.licensePlate || vehicle.vin || 'N/A',
      currentVersion,
      targetVersion,
      status,
      progress,
      lastCheck: '2 hours ago'
    };
  });

  const filteredUpdates = vehicleUpdates.filter(v =>
    (v.vehicleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.licensePlate || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    upToDate: vehicleUpdates.filter(v => v.status === 'completed').length,
    updatesPending: vehicleUpdates.filter(v => v.status === 'available').length,
    inProgress: vehicleUpdates.filter(v => v.status === 'in-progress').length,
    failed: vehicleUpdates.filter(v => v.status === 'failed').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'in-progress': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'available': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
      case 'failed': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'in-progress': return <UploadCloud size={16} />;
      case 'available': return <Clock size={16} />;
      case 'failed': return <AlertTriangle size={16} />;
      default: return null;
    }
  };

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-green-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>System Status</p>
              <h3 className={`text-xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Operational</h3>
              <p className="text-xs text-green-500 mt-2">Latest Version: v2.4.1</p>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>
              <Cloud size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-blue-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Updates In Progress</p>
              <h3 className={`text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.inProgress}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <UploadCloud size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Updates</p>
              <h3 className={`text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.updatesPending}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-red-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Failed Updates</p>
              <h3 className={`text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.failed}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Software Updates
            </h2>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={20} />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <UploadCloud size={18} />
                Install New Update
              </button>
            </div>
          </div>
        </div>

        {isLoadingVehicles && vehicleUpdates.length === 0 && (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="animate-spin" size={48} />
            <p className="ml-4">Loading vehicles...</p>
          </div>
        )}

        {vehiclesError && (
          <div className="px-6 pb-4 text-sm text-red-500">{vehiclesError}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Version</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Target Version</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Progress</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Last Check</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUpdates.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className={`border-b last:border-0 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <td className="p-4">
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {vehicle.vehicleName}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {vehicle.licensePlate}
                    </div>
                  </td>
                  <td className={`p-4 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {vehicle.currentVersion}
                  </td>
                  <td className={`p-4 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {vehicle.targetVersion}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${getStatusColor(vehicle.status)}`}>
                      {getStatusIcon(vehicle.status)}
                      {vehicle.status.toUpperCase().replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-4 w-48">
                    {vehicle.status === 'in-progress' ? (
                      <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Downloading</span>
                          <span className="font-medium text-blue-500">{vehicle.progress}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${vehicle.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</span>
                    )}
                  </td>
                  <td className={`p-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {vehicle.lastCheck}
                  </td>
                  <td className="p-4">
                    {vehicle.status === 'available' && (
                      <button className="text-blue-500 hover:text-blue-600 font-medium text-sm flex items-center gap-1">
                        <Play size={14} /> Install
                      </button>
                    )}
                    {vehicle.status === 'in-progress' && (
                      <button className="text-yellow-500 hover:text-yellow-600 font-medium text-sm flex items-center gap-1">
                        <Pause size={14} /> Pause
                      </button>
                    )}
                    {vehicle.status === 'failed' && (
                      <button className="text-red-500 hover:text-red-600 font-medium text-sm flex items-center gap-1">
                        <RotateCcw size={14} /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default FotaUpdates;
