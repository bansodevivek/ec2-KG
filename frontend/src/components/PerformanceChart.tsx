// Performance Chart Component

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { PerformanceMetrics } from '../types';

interface PerformanceChartProps {
  metrics: PerformanceMetrics;
  darkMode: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ metrics, darkMode }) => {
  const maxTrips = Math.max(...metrics.dailyStats.map(d => d.trips));
  
  return (
    <div className={`glass rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Performance</h3>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <span className="text-sm font-semibold text-green-500">+12.5%</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-6">
        <div className="flex items-end justify-between h-48 space-x-2">
          {metrics.dailyStats.map((stat, idx) => {
            const height = (stat.trips / maxTrips) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {stat.trips} trips
                    </div>
                  </div>
                </div>
                <span className={`text-xs mt-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stat.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Trips</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {metrics.weeklyTotals.totalTrips.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Distance</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {metrics.weeklyTotals.totalDistance.toLocaleString()} km
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Avg Efficiency</p>
          <p className={`text-lg font-bold text-green-500`}>
            {metrics.weeklyTotals.avgEfficiency}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Incidents</p>
          <p className={`text-lg font-bold ${
            metrics.weeklyTotals.totalIncidents > 20 ? 'text-red-500' : 'text-yellow-500'
          }`}>
            {metrics.weeklyTotals.totalIncidents}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
