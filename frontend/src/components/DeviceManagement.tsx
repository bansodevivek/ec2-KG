import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  RefreshCcw, 
  Power, 
  MoreVertical,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Download,
  Volume2
} from 'lucide-react';
import { Vehicle } from '../types';
import { immobilizeVehicle, honkHorn, getMqttStatus } from '../api/vehicle';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';

interface DeviceManagementProps {
  darkMode: boolean;
  vehicles: Vehicle[];
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({ darkMode, vehicles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [apiVehicles, setApiVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [immobilizedMap, setImmobilizedMap] = useState<Record<string, boolean>>({});

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

  // Generate device data based on total vehicles
  const sourceVehicles = apiVehicles.length > 0 ? apiVehicles : vehicles;
  const devices = sourceVehicles.map((vehicle: any) => ({
    vehicleId: vehicle.id || vehicle.vin,
    vehicleName: vehicle.name || vehicle.model_name || vehicle.model || 'Vehicle',
    vehiclePlate: vehicle.licensePlate || vehicle.vin || 'N/A',
    type: 'Telematics Unit Gen 3',
    firmware: vehicle.id === 'V004' ? 'v2.3.9' : 'v2.4.1',
    status: vehicle.status === 'maintenance' ? 'offline' : 'online',
    lastSync: vehicle.lastUpdate,
    signalStrength: Math.floor(Math.random() * (100 - 70) + 70), // Random signal 70-100%
    batteryVoltage: '12.4V'
  }));

  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    updateAvailable: devices.filter(d => d.firmware !== 'v2.4.1').length
  };

  const handleToggleImmobilize = async (vehicleId: string) => {
    const isImmobilized = immobilizedMap[vehicleId] === true;
    const nextAction = isImmobilized ? 'mobilize' : 'immobilize';
    const confirmMessage = isImmobilized
      ? 'Are you sure you want to mobilize (power on) this vehicle?'
      : 'Are you sure you want to immobilize (power off) this vehicle?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🚗 Sending vehicle control:', vehicleId, nextAction);
      const response = await immobilizeVehicle({ vehicle_id: vehicleId, action: nextAction as 'immobilize' | 'mobilize' });
      console.log('✅ Vehicle control response:', response);

      setImmobilizedMap(prev => ({
        ...prev,
        [vehicleId]: !isImmobilized,
      }));

      const successMessage =
        nextAction === 'immobilize'
          ? 'Vehicle immobilization command sent successfully. The vehicle is now powered off.'
          : 'Vehicle mobilization command sent successfully. The vehicle is now powered on.';

      alert(successMessage);
    } catch (e: any) {
      console.error('❌ Failed to send vehicle control command:', e);
      alert(`Failed to ${nextAction} vehicle: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleHorn = async (vehicleId: string) => {
    try {
      console.log('📢 Honking horn for vehicle:', vehicleId);
      const response = await honkHorn({ vehicle_id: vehicleId });
      console.log('✅ Horn response:', response);
      alert('Horn command sent successfully. The vehicle horn should sound shortly.');
    } catch (e: any) {
      console.error('❌ Failed to send horn command:', e);
      alert(`Failed to send horn command: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleMqttStatus = async () => {
    try {
      console.log('🔍 Checking MQTT status...');
      const status = await getMqttStatus();
      console.log('✅ MQTT Status:', status);
      alert(`MQTT Status: ${JSON.stringify(status.data, null, 2)}`);
    } catch (e: any) {
      console.error('❌ Failed to check MQTT status:', e);
      alert(`Failed to check MQTT status: ${e.response?.data?.error || e.message}`);
    }
  };

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-blue-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Devices</p>
              <h3 className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Cpu size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-green-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Online</p>
              <h3 className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.online}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>
              <Wifi size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-red-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Offline</p>
              <h3 className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.offline}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <WifiOff size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Update Available</p>
              <h3 className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.updateAvailable}</h3>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
              <RefreshCcw size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Device Mobilization</h2>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={20} />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Filter devices by status"
                className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>

              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {vehiclesError && (
          <div className="px-6 pb-4 text-sm text-red-500">{vehiclesError}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle Info</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Firmware</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Connectivity</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Last Sync</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr 
                  key={device.vehicleId}
                  className={`border-b last:border-0 ${
                    darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <td className="p-4">
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{device.vehicleName}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{device.vehiclePlate}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{device.firmware}</span>
                       {device.firmware !== 'v2.4.1' && (
                         <span className="flex h-2 w-2 rounded-full bg-yellow-500" title="Update Available"></span>
                       )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                      device.status === 'online'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {device.status.toLocaleUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`w-1 rounded-sm ${
                              (device.signalStrength / 25) >= bar
                                ? 'h-3 bg-blue-500'
                                : 'h-3 bg-gray-300 dark:bg-gray-600'
                            }`}
                          ></div>
                        ))}
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {device.signalStrength}%
                      </span>
                    </div>
                  </td>
                  <td className={`p-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {device.lastSync}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleImmobilize(device.vehicleId)}
                        className={`p-2 rounded-lg transition ${
                          darkMode
                            ? immobilizedMap[device.vehicleId]
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-green-400'
                            : immobilizedMap[device.vehicleId]
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`} title={immobilizedMap[device.vehicleId] ? 'Mobilize Vehicle' : 'Immobilize Vehicle'}>
                        <Power size={18} />
                      </button>
                      <button 
                        onClick={() => handleHorn(device.vehicleId)}
                        className={`p-2 rounded-lg transition ${
                        darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                      }`} title="Honk Horn">
                        <Volume2 size={18} />
                      </button>
                      <button 
                        onClick={handleMqttStatus}
                        className={`p-2 rounded-lg transition ${
                        darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                      }`} title="Check Status">
                        <RefreshCcw size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {filteredDevices.length} of {devices.length} devices
          </span>
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded border text-sm disabled:opacity-50 ${
              darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`} disabled>Previous</button>
            <button className={`px-3 py-1 rounded border text-sm disabled:opacity-50 ${
              darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`} disabled>Next</button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DeviceManagement;
