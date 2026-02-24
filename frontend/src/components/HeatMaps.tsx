// Heat Maps Dashboard
// Using D3 for color scaling and interpolation because it provides fine-grained control
// over continuous gradients without adding a heavy charting framework.

import React, { useEffect, useMemo, useState } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlGn } from 'd3-scale-chromatic';

interface HeatMapsProps {
  // Enables dark theme styling for the heat map dashboard.
  darkMode: boolean;
  // Vehicle insight data used to drive the heat map baselines and selection UI.
  vehicleInsights: any[];
  // Selected vehicle to display heat data for
  selectedVehicle?: any;
}

type Grid = number[][];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Smooths heat values using neighbor averaging for a softer gradient.
const smoothGrid = (grid: Grid, passes: number) => {
  let current = grid;
  for (let p = 0; p < passes; p += 1) {
    const next: Grid = current.map((row, y) =>
      row.map((value, x) => {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const ny = y + dy;
            const nx = x + dx;
            if (current[ny] && current[ny][nx] !== undefined) {
              sum += current[ny][nx];
              count += 1;
            }
          }
        }
        return sum / count;
      })
    );
    current = next;
  }
  return current;
};

// Builds a heat grid with clamped values between 0-100.
// xCount: number of columns, yCount: number of rows, base: value generator per cell.
const buildHeatGrid = (xCount: number, yCount: number, base: (x: number, y: number) => number) => {
  const grid: Grid = [];
  for (let y = 0; y < yCount; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < xCount; x += 1) {
      row.push(clamp(base(x, y), 0, 100));
    }
    grid.push(row);
  }
  return smoothGrid(grid, 2).map(row => row.map(v => clamp(v, 0, 100)));
};

const HeatMaps: React.FC<HeatMapsProps> = ({ darkMode, vehicleInsights, selectedVehicle: propSelectedVehicle }) => {
  const [monitoringActive, setMonitoringActive] = useState(true);
  const [selectedVehicle] = useState(propSelectedVehicle || vehicleInsights[0]);

  // Utilization factor (0-1) derived from the selected vehicle.
  const utilization = clamp(selectedVehicle?.utilizationRate ?? 80, 50, 100) / 100;
  // Battery health factor (0-1) derived from the selected vehicle.
  const batteryHealth = clamp(selectedVehicle?.batteryHealth ?? 90, 70, 100) / 100;
  // Heat bias applied to the grids based on utilization and battery health.
  const heatBoost = 12 * (utilization - 0.6) + 10 * (1 - batteryHealth);
  // X-axis labels for time-based heat maps.
  const timeBuckets = ['00:00', '00:10', '00:20', '00:30', '00:40', '00:50', '01:00', '01:10', '01:20', '01:30'];
  // X-axis labels for battery cell index.
  const cellIndex = Array.from({ length: 24 }, (_, i) => `Cell ${i + 1}`);
  // Y-axis labels for cooling zones.
  const coolingZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'];
  // X-axis labels for power band heat maps.
  const powerBands = ['0-20', '20-40', '40-60', '60-80', '80-100'];
  // X-axis labels for speed band heat maps.
  const speedBands = ['0-20', '20-40', '40-60', '60-80', '80-100', '100-120'];
  // Y-axis labels for day buckets.
  const dayBuckets = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
  // X-axis labels for charging band heat maps.
  const chargeBands = ['0-10', '10-30', '30-50', '50-70', '70-90', '90-110'];
  // Y-axis labels for session buckets.
  const sessions = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5', 'Session 6', 'Session 7', 'Session 8'];

  const batteryHeat = useMemo(
    () =>
      buildHeatGrid(cellIndex.length, timeBuckets.length, (x, y) => {
        const core = 45 + 35 * Math.exp(-((x - 12) ** 2) / 30) * Math.exp(-((y - 4) ** 2) / 10);
        const drift = 6 * Math.sin(x / 6) + 5 * Math.sin(y / 3);
        return core + drift + heatBoost;
      }),
    [cellIndex.length, timeBuckets.length, heatBoost]
  );

  const coolingEfficiency = useMemo(
    () =>
      buildHeatGrid(timeBuckets.length, coolingZones.length, (x, y) => {
        const base = 75 + 10 * Math.cos(x / 2.5) - y * 4;
        const heatInverse = 100 - batteryHeat[Math.min(y + 2, batteryHeat.length - 1)][Math.min(x + 4, batteryHeat[0].length - 1)] * 0.6;
        return (base + heatInverse) / 2;
      }),
    [batteryHeat, coolingZones.length, timeBuckets.length]
  );

  const powerLoad = useMemo(
    () =>
      buildHeatGrid(powerBands.length, timeBuckets.length, (x, y) => {
        const bandBias = 18 + x * 12 + utilization * 8;
        const timeWave = 25 + 15 * Math.sin(y / 2.5);
        return bandBias + timeWave;
      }),
    [powerBands.length, timeBuckets.length, utilization]
  );

  const usageBehavior = useMemo(
    () =>
      buildHeatGrid(speedBands.length, dayBuckets.length, (x, y) => {
        const rush = y === 2 || y === 4 ? 18 + utilization * 6 : 6;
        const band = 22 + x * 8;
        return band + rush + 6 * Math.sin((x + y) / 2);
      }),
    [speedBands.length, dayBuckets.length, utilization]
  );

  const chargingBehavior = useMemo(
    () =>
      buildHeatGrid(chargeBands.length, sessions.length, (x, y) => {
        const fastChargeCluster = 28 + 35 * Math.exp(-((x - 4) ** 2) / 2.5) + (1 - batteryHealth) * 6;
        const sessionWave = 10 + 6 * Math.sin(y / 2);
        return fastChargeCluster + sessionWave;
      }),
    [chargeBands.length, sessions.length, batteryHealth]
  );

  const charts = [
    {
      title: 'Battery Heat',
      x: cellIndex,
      y: timeBuckets,
      grid: batteryHeat
    },
    {
      title: 'Cooling Efficiency',
      x: timeBuckets,
      y: coolingZones,
      grid: coolingEfficiency
    },
    {
      title: 'Power and Load Distribution',
      x: powerBands,
      y: timeBuckets,
      grid: powerLoad
    },
    {
      title: 'Usage and Driver Behaviour',
      x: speedBands,
      y: dayBuckets,
      grid: usageBehavior
    },
    {
      title: 'Charging Behaviour',
      x: chargeBands,
      y: sessions,
      grid: chargingBehavior
    }
  ];

  const colorScale = useMemo(() => scaleSequential(interpolateRdYlGn).domain([100, 0]), []);
  const [hover, setHover] = useState<{ value: number; x: string; y: string } | null>(null);

  const legendStops = Array.from({ length: 6 }, (_, i) => ({
    value: i * 20,
    color: colorScale(100 - i * 20)
  }));

  return (
    <>
      {/* Heat maps UI is intentionally hidden per request. */}
      {/*
      <main className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Heat Maps</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              EV telemetry heat map visualizations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMonitoringActive(prev => !prev)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              monitoringActive
                ? darkMode
                  ? 'bg-blue-900/30 border-blue-500/30 hover:bg-blue-900/50'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                : darkMode
                  ? 'bg-red-900/30 border-red-500/30 hover:bg-red-900/50'
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
            }`}
            aria-label={monitoringActive ? 'Pause monitoring' : 'Resume monitoring'}
          >
            <div className={`text-xs ${monitoringActive ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-red-300' : 'text-red-700')}`}>
              Status
            </div>
            <div className={`text-lg font-bold ${monitoringActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
              {monitoringActive ? 'Monitoring' : 'Paused'}
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map(chart => (
            <div key={chart.title} className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900/60' : 'bg-white shadow-sm'}`}>
              <div className="mb-4">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{chart.title}</h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Heat intensity by {chart.y[0]} and {chart.x[0]}</p>
              </div>
              <div className="overflow-x-auto">
                <svg width={chart.x.length * 26 + 90} height={chart.y.length * 26 + 60}>
                  {chart.x.map((label, i) => (
                    <text
                      key={`x-${label}`}
                      x={70 + i * 26 + 10}
                      y={20}
                      fontSize="9"
                      fill={darkMode ? '#94a3b8' : '#64748b'}
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  ))}
                  {chart.y.map((label, i) => (
                    <text
                      key={`y-${label}`}
                      x={10}
                      y={40 + i * 26}
                      fontSize="9"
                      fill={darkMode ? '#94a3b8' : '#64748b'}
                      textAnchor="start"
                    >
                      {label}
                    </text>
                  ))}

                  {chart.grid.map((row, y) =>
                    row.map((value, x) => (
                      <rect
                        key={`${chart.title}-${x}-${y}`}
                        x={70 + x * 26}
                        y={30 + y * 26}
                        width={24}
                        height={24}
                        rx={4}
                        fill={colorScale(value)}
                        onMouseEnter={() => setHover({ value, x: chart.x[x], y: chart.y[y] })}
                        onMouseLeave={() => setHover(null)}
                      />
                    ))
                  )}

                  {hover && (
                    <g>
                      <rect x={70} y={chart.y.length * 26 + 36} width={180} height={20} rx={6} fill={darkMode ? '#0f172a' : '#ffffff'} stroke={darkMode ? '#1f2937' : '#e2e8f0'} />
                      <text x={80} y={chart.y.length * 26 + 50} fontSize="10" fill={darkMode ? '#e2e8f0' : '#0f172a'}>
                        {hover.y} • {hover.x} • {hover.value}%
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>0%</span>
                <svg width={180} height={10} className="flex-1">
                  {legendStops.map((stop, idx) => (
                    <rect
                      key={stop.value}
                      x={idx * (180 / legendStops.length)}
                      y={0}
                      width={180 / legendStops.length}
                      height={10}
                      fill={stop.color}
                    />
                  ))}
                </svg>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>100%</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      */}
    </>
  );
};

export default HeatMaps;
