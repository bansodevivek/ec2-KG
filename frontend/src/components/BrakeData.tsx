// Brake Data Component (IPC Data)

import React, { useEffect, useState } from 'react';

interface BrakeDataProps {
  darkMode: boolean;
  vehicleInsights: any[];
}

const BrakeData: React.FC<BrakeDataProps> = ({ darkMode, vehicleInsights }) => {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleInsights[0]);

  useEffect(() => {
    if (vehicleInsights.length > 0 && (!selectedVehicle || !vehicleInsights.find(v => v.id === selectedVehicle.id))) {
      setSelectedVehicle(vehicleInsights[0]);
    }
  }, [vehicleInsights, selectedVehicle]);

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>IPC Data</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Inter-Process Communication - Brake System Telemetry</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
            <div className={`text-xs ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Status</div>
            <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Normal</div>
          </div>
        </div>
      </div>

      {vehicleInsights.length > 0 && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'} rounded-xl p-4`}>
          <div className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle Selection</div>
          <div className="flex gap-3 overflow-x-auto">
            {vehicleInsights.map(vehicle => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelectedVehicle(vehicle)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg border transition ${
                  selectedVehicle?.id === vehicle.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : darkMode
                    ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div className="font-semibold">{vehicle.vehicle}</div>
                  <div className="text-xs text-gray-500">{vehicle.licensePlate}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">Brake Health</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedVehicle?.brakeHealth ?? '--'}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Avg Speed</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedVehicle?.avgSpeed ?? '--'} km/h
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Trips</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedVehicle?.totalTrips ?? '--'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default BrakeData;
