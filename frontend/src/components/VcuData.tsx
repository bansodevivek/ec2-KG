// VCU Telemetry Dashboard

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Vehicle } from '../types';

interface VcuDataProps {
  darkMode: boolean;
  vehicleInsights: any[];
  vehicles: Vehicle[];
  selectedVehicle?: any;
}

type VcuPoint = {
  ts: number;
  batteryPower: number;
  brakeStatus: number;
  latitude: number;
  longitude: number;
  tripDistance: number;
  tripDuration: number;
  idleTime: number;
  speed: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const chartTheme = (darkMode: boolean) => ({
  grid: darkMode ? 'rgba(148,163,184,0.2)' : 'rgba(15,23,42,0.1)',
  axis: darkMode ? '#94a3b8' : '#64748b',
  area: '#22c55e'
});

// Custom marker icon for vehicle
const getVehicleIcon = (speed: number) => {
  const color = speed > 30 ? 'green' : speed > 10 ? 'orange' : 'blue';

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



const VcuData: React.FC<VcuDataProps> = ({ darkMode, vehicleInsights, vehicles, selectedVehicle: propSelectedVehicle }) => {
  const stepSeconds = 8;
  const maxPoints = 60;
  const tickRef = useRef(0);
  const [selectedVehicle] = useState(propSelectedVehicle || vehicleInsights[0]);

  const matchedFleetVehicle = useMemo(() => {
    if (!selectedVehicle) return undefined;
    return vehicles.find(vehicle =>
      vehicle.licensePlate === selectedVehicle.licensePlate ||
      vehicle.id === selectedVehicle.id ||
      vehicle.name === selectedVehicle.vehicle
    );
  }, [vehicles, selectedVehicle]);

  const baseLocation = useMemo(() => {
    return matchedFleetVehicle?.location ?? { lat: 12.9716, lng: 77.5946 };
  }, [matchedFleetVehicle]);

  const baseSpeed = clamp(selectedVehicle?.avgSpeed ?? 30, 15, 60);
  const utilization = clamp(selectedVehicle?.utilizationRate ?? 80, 50, 100) / 100;

  const buildInitial = () => {
    const now = Date.now();
    const series: VcuPoint[] = [];
    let speed = clamp(baseSpeed * 0.6, 8, 45);
    let tripDistance = 0;
    let tripDuration = 0;
    let idleTime = 0;

    for (let i = maxPoints - 1; i >= 0; i -= 1) {
      const ts = now - i * stepSeconds * 1000;
      const phase = (maxPoints - i) % 90;
      const isDriving = phase < 60;

      const targetSpeed = isDriving ? baseSpeed + 18 * utilization + 16 * Math.sin((maxPoints - i) / 6) : 0;
      speed = clamp(speed + (targetSpeed - speed) * 0.22, 0, 120);

      const accel = clamp((speed - (series[series.length - 1]?.speed ?? speed)) / stepSeconds / 3.6, -3, 3);
      const brakeStatus = accel < -0.4 ? clamp(Math.abs(accel) * 28, 0, 100) : 0;
      const batteryPower = clamp(accel * 18 + speed * 0.25 - 5, -60, 60);

      if (speed > 1) {
        const deltaKm = (speed * stepSeconds) / 3600;
        tripDistance += deltaKm;
        tripDuration += stepSeconds / 60;
      }

      idleTime = clamp(idleTime + (speed < 1 ? 0.8 : -0.15), 0, 100);

      series.push({
        ts,
        batteryPower,
        brakeStatus,
        latitude: baseLocation.lat,
        longitude: baseLocation.lng,
        tripDistance,
        tripDuration,
        idleTime,
        speed
      });
    }
    return series;
  };

  const [series, setSeries] = useState<VcuPoint[]>(() => buildInitial());

  useEffect(() => {
    setSeries(buildInitial());
  }, [baseSpeed, utilization, baseLocation.lat, baseLocation.lng]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setSeries(prev => {
        const last = prev[prev.length - 1];
        const ts = Date.now();
        const phase = tickRef.current % 90;
        const isDriving = phase < 60;
        const isCharging = phase >= 75;

        const targetSpeed = isDriving ? baseSpeed + 18 * utilization + 18 * Math.sin(tickRef.current / 6) : 0;
        const speed = clamp(last.speed + (targetSpeed - last.speed) * 0.2, 0, 120);

        const accel = clamp((speed - last.speed) / stepSeconds / 3.6, -3, 3);
        const brakeStatus = accel < -0.4 ? clamp(Math.abs(accel) * 28, 0, 100) : 0;
        const batteryPower = clamp(accel * 18 + speed * 0.25 - 5, -60, 60);

        let tripDistance = last.tripDistance;
        let tripDuration = last.tripDuration;
        if (phase === 0) {
          tripDistance = 0;
          tripDuration = 0;
        }
        if (!isCharging) {
          tripDuration += stepSeconds / 60;
        }
        if (speed > 1) {
          const deltaKm = (speed * stepSeconds) / 3600;
          tripDistance += deltaKm;
        }

        const idleTime = clamp(last.idleTime + (speed < 1 ? 0.8 : -0.15), 0, 100);

        const nextPoint: VcuPoint = {
          ts,
          batteryPower,
          brakeStatus,
          latitude: baseLocation.lat,
          longitude: baseLocation.lng,
          tripDistance,
          tripDuration,
          idleTime,
          speed
        };

        return [...prev.slice(1), nextPoint];
      });
    }, stepSeconds * 1000);
    return () => clearInterval(interval);
  }, [baseSpeed, utilization, stepSeconds, baseLocation.lat, baseLocation.lng]);

  const commonChartProps = useMemo(() => {
    const theme = chartTheme(darkMode);
    return {
      gridStroke: theme.grid,
      axisStroke: theme.axis,
      areaColor: theme.area
    };
  }, [darkMode]);

  const latest = series[series.length - 1];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: number }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className={`rounded-lg border px-3 py-2 text-xs ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <div className="font-semibold mb-1">{formatTime(label as number)}</div>
        {payload.map((p, idx) => (
          <div key={idx} className={`font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  };

  const renderArea = (
    title: string,
    dataKey: keyof VcuPoint,
    unit: string,
    min: number,
    max: number
  ) => (
    <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900/60' : 'bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time telemetry</p>
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Range: {min}–{max} {unit}
        </div>
      </div>
      <div className="h-56 min-h-[14rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={commonChartProps.gridStroke} strokeDasharray="4 4" />
            <XAxis
              dataKey="ts"
              tickFormatter={formatTime}
              stroke={commonChartProps.axisStroke}
              tick={{ fontSize: 11 }}
              minTickGap={24}
            />
            <YAxis
              domain={[min, max]}
              stroke={commonChartProps.axisStroke}
              tick={{ fontSize: 11 }}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              name={`${title} (${unit})`}
              stroke={commonChartProps.areaColor}
              fill={commonChartProps.areaColor}
              fillOpacity={0.18}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>VCU Telemetry</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Vehicle Control Unit telemetry dashboard
          </p>
        </div>
      </div>

      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900/60' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Live GPS Map</h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle position and telemetry</p>
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {latest ? `${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}` : 'Locating…'}
          </div>
        </div>
        <div className="h-96 rounded-lg overflow-hidden">
          {latest && (
            <MapContainer
              center={[latest.latitude, latest.longitude]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={[latest.latitude, latest.longitude]}
                icon={getVehicleIcon(latest.speed)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold text-lg mb-2">
                      {selectedVehicle?.vehicle || 'Vehicle'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedVehicle?.licensePlate || 'N/A'}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Speed:</span>
                        <span className="font-semibold">{latest.speed.toFixed(0)} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Battery Power:</span>
                        <span className="font-semibold">{latest.batteryPower.toFixed(1)} kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trip Distance:</span>
                        <span className="font-semibold">{latest.tripDistance.toFixed(2)} km</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderArea('Battery Power', 'batteryPower', 'kW', -60, 60)}
        {renderArea('Brake Status', 'brakeStatus', '%', 0, 100)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderArea('Trip Distance', 'tripDistance', 'km', 0, 120)}
        {renderArea('Trip Duration', 'tripDuration', 'min', 0, 120)}
      </div>

      {renderArea('Idle Time', 'idleTime', '%', 0, 100)}
    </main>
  );
};

export default VcuData;
