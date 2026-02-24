// Recent Alerts Component

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Alert } from '../types';

interface RecentAlertsProps {
  alerts: Alert[];
  darkMode: boolean;
}

const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts, darkMode }) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'critical':
        return darkMode ? 'bg-red-900/20' : 'bg-red-50';
      case 'warning':
        return darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50';
      case 'info':
        return darkMode ? 'bg-blue-900/20' : 'bg-blue-50';
      case 'resolved':
        return darkMode ? 'bg-green-900/20' : 'bg-green-50';
      default:
        return darkMode ? 'bg-gray-800' : 'bg-gray-50';
    }
  };

  return (
    <div className={`glass rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Alerts</h3>
        <span className="text-sm text-gray-500">Last 24 hours</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`${getAlertBg(alert.type)} p-4 rounded-lg transition-all hover:shadow-md`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {alert.title}
                  </h4>
                  <span className="text-xs text-gray-500">{alert.timestamp}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{alert.vehicle}</p>
                <p className="text-xs text-gray-500">📍 {alert.location}</p>
              </div>
              <div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  alert.status === 'active' ? 'bg-red-100 text-red-700' :
                  alert.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {alert.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentAlerts;
