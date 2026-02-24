// BMS Telemetry Dashboard — fetches real data from backend

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getBMSTelemetry,
  BMSTelemetryResponse,
  BMSTelemetryMetric,
  BMSTimeRange,
} from '../api/vehicle';
import { AlertCircle, Loader2, Clock, RefreshCw, BarChart3, Database } from 'lucide-react';

// ── Props ──────────────────────────────────────────────────────────────
interface BmsDataProps {
  darkMode: boolean;
  vehicleInsights: any[];
  selectedVehicle?: any;
}

// ── Shared chart point type ────────────────────────────────────────────
type BmsChartPoint = {
  ts: number;           // epoch ms
  label: string;        // formatted time label
  temperature: number;
  performance: number;
  torque: number;
  power: number;
  rangeLeft: number;
  idleTime: number;
};

// ── Time range options ─────────────────────────────────────────────────
const TIME_RANGE_OPTIONS: { value: BMSTimeRange; label: string }[] = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
];

// ── Chart colors per metric ────────────────────────────────────────────
const CHART_COLORS: Record<string, { stroke: string; fill: string }> = {
  temperature: { stroke: '#ef4444', fill: '#ef4444' },   // red
  performance: { stroke: '#22c55e', fill: '#22c55e' },   // green
  torque: { stroke: '#f59e0b', fill: '#f59e0b' },   // amber
  power: { stroke: '#3b82f6', fill: '#3b82f6' },   // blue
  rangeLeft: { stroke: '#8b5cf6', fill: '#8b5cf6' },   // violet
  idleTime: { stroke: '#06b6d4', fill: '#06b6d4' },   // cyan
};

// ── Format timestamp for X-axis labels ─────────────────────────────────
const formatTimestamp = (ts: number, timeRange: BMSTimeRange): string => {
  const d = new Date(ts);
  if (timeRange === '1h' || timeRange === '6h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (timeRange === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // 1w, 1m → show date + time
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Chart theme ────────────────────────────────────────────────────────
const chartTheme = (darkMode: boolean) => ({
  grid: darkMode ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.08)',
  axis: darkMode ? '#94a3b8' : '#64748b',
});

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════

const BmsData: React.FC<BmsDataProps> = ({
  darkMode,
  vehicleInsights,
  selectedVehicle: propSelectedVehicle,
}) => {
  const selectedVehicle = propSelectedVehicle || vehicleInsights[0];

  // ── State ──────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<BMSTimeRange>('1w');
  const [bmsResponse, setBmsResponse] = useState<BMSTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Convert API response → chart data ──────────────────────────────
  const chartData: BmsChartPoint[] = useMemo(() => {
    if (!bmsResponse) return [];

    // Use any available metric as the reference for timestamps
    const refMetric: BMSTelemetryMetric | undefined =
      bmsResponse.battery_temperature ??
      bmsResponse.battery_performance ??
      bmsResponse.range_left_on_battery ??
      bmsResponse.battery_torque ??
      bmsResponse.battery_power ??
      bmsResponse.idle_time;

    if (!refMetric?.data?.length) return [];

    return refMetric.data.map((_, idx) => {
      const ts = new Date(refMetric.data[idx].timestamp).getTime();
      return {
        ts,
        label: formatTimestamp(ts, timeRange),
        temperature: bmsResponse.battery_temperature?.data?.[idx]?.value ?? 0,
        performance: bmsResponse.battery_performance?.data?.[idx]?.value ?? 0,
        torque: bmsResponse.battery_torque?.data?.[idx]?.value ?? 0,
        power: bmsResponse.battery_power?.data?.[idx]?.value ?? 0,
        rangeLeft: bmsResponse.range_left_on_battery?.data?.[idx]?.value ?? 0,
        idleTime: bmsResponse.idle_time?.data?.[idx]?.value ?? 0,
      };
    });
  }, [bmsResponse, timeRange]);

  // ── Fetch BMS data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const vin = selectedVehicle?.vin;
    if (!vin) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getBMSTelemetry(vin, timeRange);
      setBmsResponse(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError(`No BMS telemetry data found for VIN: ${vin}`);
      } else {
        setError(err?.message || 'Failed to fetch BMS telemetry data');
      }
      setBmsResponse(null);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle?.vin, timeRange]);

  // Fetch on mount and when VIN or timeRange changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Chart theme helpers ────────────────────────────────────────────
  const theme = useMemo(() => chartTheme(darkMode), [darkMode]);

  // ── Custom Tooltip ─────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${darkMode
          ? 'bg-gray-900 border-gray-700 text-gray-200'
          : 'bg-white border-gray-200 text-gray-800'
        }`}>
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: p.stroke || p.color }}
            />
            <span>{p.name}:</span>
            <span className="font-semibold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // ── Parse range string "20-65 °C" → { min, max, unit } ────────────
  const parseRange = (rangeStr?: string) => {
    if (!rangeStr) return { min: 0, max: 100, unit: '' };
    const match = rangeStr.match(/^(-?\d+\.?\d*)\s*[-–]\s*(-?\d+\.?\d*)\s*(.*)$/);
    if (match) {
      return { min: parseFloat(match[1]), max: parseFloat(match[2]), unit: match[3].trim() };
    }
    return { min: 0, max: 100, unit: rangeStr };
  };

  // ── Render a chart for one metric ──────────────────────────────────
  const renderChart = (
    title: string,
    dataKey: keyof BmsChartPoint,
    metric?: BMSTelemetryMetric,
    colorKey: string = 'temperature',
  ) => {
    const { min, max, unit } = parseRange(metric?.range);
    const colors = CHART_COLORS[colorKey] || CHART_COLORS.temperature;
    const hasData = chartData.length > 0;

    return (
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900/60' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {hasData
                ? `${metric?.data?.length ?? 0} data points • ${bmsResponse?.sampling?.interval_label || ''} intervals`
                : 'No data available'}
            </p>
          </div>
          {metric?.range && (
            <div className={`text-xs font-medium px-2 py-1 rounded ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
              Range: {metric.range}
            </div>
          )}
        </div>

        <div className="h-56">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  stroke={theme.axis}
                  tick={{ fontSize: 10 }}
                  minTickGap={30}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[min, max]}
                  stroke={theme.axis}
                  tick={{ fontSize: 11 }}
                  width={45}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  name={`${title} (${unit})`}
                  stroke={colors.stroke}
                  fill={colors.fill}
                  fillOpacity={0.15}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: colors.stroke }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: colors.stroke, fill: darkMode ? '#1e293b' : '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={`flex items-center justify-center h-full rounded-lg border-2 border-dashed ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
              }`}>
              <p className="text-sm">No data for this metric</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            BMS Telemetry
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Battery Management System • {selectedVehicle?.vin || 'No vehicle selected'}
          </p>
        </div>

        {/* ── Time Range Selector + Refresh ─────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
            <Clock size={14} className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${timeRange === opt.value
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-600 text-white shadow-md'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className={`p-2 rounded-lg transition-all ${darkMode
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Refresh data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Loading State ──────────────────────────────────────────── */}
      {loading && (
        <div className={`p-6 rounded-lg border-2 ${darkMode ? 'bg-blue-900/20 border-blue-600/40' : 'bg-blue-50 border-blue-200'
          }`}>
          <div className="flex items-center gap-3">
            <Loader2 className={`animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            <div>
              <p className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Fetching BMS telemetry data...
              </p>
              <p className={`text-sm ${darkMode ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
                Time range: {TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────── */}
      {error && !loading && (
        <div className={`p-6 rounded-lg border-2 ${darkMode ? 'bg-red-900/20 border-red-600/40' : 'bg-red-50 border-red-200'
          }`}>
          <div className="flex gap-3">
            <AlertCircle className={darkMode ? 'text-red-400' : 'text-red-600'} size={24} />
            <div>
              <p className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                Unable to Load BMS Data
              </p>
              <p className={`text-sm mt-1 ${darkMode ? 'text-red-400/70' : 'text-red-600/70'}`}>
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Metadata Banner ────────────────────────────────── */}
      {bmsResponse && !loading && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/15 border border-green-600/40' : 'bg-green-50 border border-green-200'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              ✅ Real BMS telemetry data loaded
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <BarChart3 size={13} />
                {bmsResponse.data_points} data points
              </span>
              <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Database size={13} />
                {bmsResponse.total_records?.toLocaleString()} total records
              </span>
              <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Clock size={13} />
                {bmsResponse.sampling?.interval_label || 'N/A'} intervals
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart('Battery Temperature', 'temperature', bmsResponse?.battery_temperature, 'temperature')}
        {renderChart('Battery Performance', 'performance', bmsResponse?.battery_performance, 'performance')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart('Battery Torque', 'torque', bmsResponse?.battery_torque, 'torque')}
        {renderChart('Battery Power', 'power', bmsResponse?.battery_power, 'power')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart('Range Left on Battery', 'rangeLeft', bmsResponse?.range_left_on_battery, 'rangeLeft')}
        {renderChart('Idle Time', 'idleTime', bmsResponse?.idle_time, 'idleTime')}
      </div>
    </main>
  );
};

export default BmsData;
