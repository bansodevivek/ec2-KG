// Fleet Overview Component

import React from 'react';
import { Battery, Gauge, MapPin, Activity } from 'lucide-react';
import { Vehicle } from '../types';

interface FleetOverviewProps {
  vehicles: Vehicle[];
  darkMode: boolean;
}

const FleetOverview: React.FC<FleetOverviewProps> = ({ vehicles, darkMode }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'charging':
        return 'bg-blue-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-500';
    if (battery > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`glass rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Fleet Overview</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All →</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-4 rounded-lg border ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            } hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)} animate-pulse`}></div>
                <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {vehicle.status.toUpperCase()}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                vehicle.health > 90 ? 'bg-green-100 text-green-700' :
                vehicle.health > 75 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {vehicle.health}% Health
              </span>
            </div>
            
            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{vehicle.name}</h4>
            <p className="text-sm text-gray-500 mb-3">{vehicle.licensePlate}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Battery className={`w-4 h-4 ${getBatteryColor(vehicle.battery)}`} />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Battery</span>
                </div>
                <span className={`font-semibold ${getBatteryColor(vehicle.battery)}`}>{vehicle.battery}%</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-blue-500" />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Speed</span>
                </div>
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.speed} km/h</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Driver</span>
                </div>
                <span className={`font-semibold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.driver}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {vehicle.odometer.toLocaleString()} km
                </span>
                <span>{vehicle.lastUpdate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FleetOverview;
