// Recent Trips Component — displays trips from /api/insights/vehicle/<vin>/trips/

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Loader2, Battery, Gauge, Zap, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { getVehicleTrips, VehicleTripsResponse, VehicleTripItem } from '../api/vehicle';

interface RecentTripsProps {
  vin?: string;
  darkMode: boolean;
}

// Simple VIN validation: must exist, no spaces, and at least 5 chars
const isValidVin = (value: string | undefined): boolean => {
  if (!value || value.trim().length < 5) return false;
  if (/\s/.test(value)) return false;
  return true;
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const RecentTrips: React.FC<RecentTripsProps> = ({ vin, darkMode }) => {
  const [tripsData, setTripsData] = useState<VehicleTripsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchTripsData = async () => {
      if (!vin) {
        setLoading(false);
        return;
      }

      if (!isValidVin(vin)) {
        console.warn(`⚠️ Skipping trips fetch — invalid VIN format: "${vin}"`);
        setTripsData(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await getVehicleTrips(vin);
        setTripsData(data);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          setTripsData(null);
          setError(null);
        } else {
          setError(err.message || 'Failed to fetch trip data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTripsData();
  }, [vin]);

  // ── No VIN ──────────────────────────────────────────────────────────
  if (!vin) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Trips</h3>
        <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select a vehicle to view trip data</p>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading trip data...</span>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Error Loading Trips</h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const trips = tripsData?.trips ?? [];
  const totalCount = tripsData?.total_count ?? 0;

  // Compute summary stats from the trips array
  const totalDistance = trips.reduce((sum, t) => sum + t.distance_km, 0);
  const avgEfficiency = trips.length > 0
    ? trips.reduce((sum, t) => sum + t.efficiency_wh_km, 0) / trips.length
    : 0;
  const avgSpeed = trips.length > 0
    ? trips.reduce((sum, t) => sum + t.avg_speed_kmh, 0) / trips.length
    : 0;

  // Show first 5 or all
  const visibleTrips = showAll ? trips : trips.slice(0, 5);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {trips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Total Trips</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {totalCount}
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                <Gauge className="text-purple-500" size={20} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Total Distance</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {totalDistance.toFixed(1)} km
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <Zap className="text-green-500" size={20} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Avg Efficiency</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {avgEfficiency.toFixed(1)} Wh/km
                </p>
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                <Gauge className="text-amber-500" size={20} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Avg Speed</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {avgSpeed.toFixed(1)} km/h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip List */}
      {trips.length > 0 ? (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Trips
            </h3>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {visibleTrips.length} of {totalCount}
            </span>
          </div>

          <div className="space-y-4">
            {visibleTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} darkMode={darkMode} />
            ))}
          </div>

          {/* Show More / Less */}
          {trips.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={`w-full mt-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {showAll ? (
                <>
                  <ChevronUp size={16} /> Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={16} /> Show All {totalCount} Trips
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Recent Trips</h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No trips found for this vehicle</p>
        </div>
      )}
    </div>
  );
};

// ── Individual Trip Card ──────────────────────────────────────────────
const TripCard: React.FC<{ trip: VehicleTripItem; darkMode: boolean }> = ({ trip, darkMode }) => {
  const socDelta = trip.start_soc - trip.end_soc;

  return (
    <div
      className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'
        } hover:shadow-md transition-shadow`}
    >
      {/* Header: Trip ID + Date + Duration */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Trip #{trip.id}
          </h4>
          <p className="text-sm text-gray-500">
            {formatDateTime(trip.start_time)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {formatDuration(trip.duration_seconds)}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-gray-500">Distance</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {trip.distance_km.toFixed(1)} km
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg Speed</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {trip.avg_speed_kmh.toFixed(1)} km/h
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Max Speed</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {trip.max_speed_kmh.toFixed(1)} km/h
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Efficiency</p>
          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {trip.efficiency_wh_km.toFixed(1)} Wh/km
          </p>
        </div>
      </div>

      {/* Footer: SOC + Time range */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <span className="text-xs text-gray-500">
          {formatTime(trip.start_time)} → {formatTime(trip.end_time)}
        </span>

        <div className="flex items-center gap-3">
          {/* SOC change badge */}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'
            }`}>
            <Battery size={12} className={darkMode ? 'text-green-400' : 'text-green-600'} />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {trip.start_soc.toFixed(1)}% → {trip.end_soc.toFixed(1)}%
            </span>
          </div>

          {/* SOC consumed */}
          <div className={`text-xs px-2 py-1 rounded-full ${socDelta < 10 ? 'bg-green-100 text-green-700'
            : socDelta < 20 ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
            }`}>
            −{socDelta.toFixed(1)}% SOC
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentTrips;
