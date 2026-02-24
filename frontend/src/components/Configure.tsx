import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Globe,
  Save,
  Zap
} from 'lucide-react';

interface ConfigureProps {
  darkMode: boolean;
}

const Configure: React.FC<ConfigureProps> = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  // Mock Settings State
  const [settings, setSettings] = useState({
    general: {
      refreshRate: '30s',
      language: 'English (US)',
      timezone: 'Asia/Kolkata (GMT+5:30)',
      units: 'metric',
      autoLock: true
    },
    notifications: {
      emailAlerts: true,
      pushNotifications: true,
      smsAlerts: false,
      weeklyReport: true,
      maintenanceReminders: true
    },
    thresholds: {
      maxSpeed: 80,
      lowBattery: 20,
      highTemp: 45,
      tirePressureMin: 28,
      maintenanceInterval: 5000
    }
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold border-b pb-2 ${darkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              General Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Data Refresh Rate
                </label>
                <select
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  value={settings.general.refreshRate}
                  onChange={(e) => setSettings({ ...settings, general: { ...settings.general, refreshRate: e.target.value } })}
                >
                  <option value="10s">Every 10 seconds</option>
                  <option value="30s">Every 30 seconds</option>
                  <option value="1m">Every minute</option>
                  <option value="5m">Every 5 minutes</option>
                </select>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Controls how often the dashboard fetches new vehicle data.
                </p>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Time Zone
                </label>
                <select
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  value={settings.general.timezone}
                  onChange={(e) => setSettings({ ...settings, general: { ...settings.general, timezone: e.target.value } })}
                >
                  <option>Asia/Kolkata (GMT+5:30)</option>
                  <option>UTC (GMT+00:00)</option>
                  <option>America/New_York (GMT-05:00)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Language
                </label>
                <select
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  defaultValue="English (US)"
                >
                  <option>English (US)</option>
                  <option>Hindi</option>
                  <option>Marathi</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Measurement Units
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="units" className="accent-blue-600" checked={settings.general.units === 'metric'} onChange={() => { }} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Metric (km, °C)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="units" className="accent-blue-600" checked={settings.general.units === 'imperial'} onChange={() => { }} />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Imperial (mi, °F)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold border-b pb-2 ${darkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              Notification Channels
            </h3>

            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50 border-blue-100'} mb-4`}>
              <div className="flex gap-3">
                <Bell className="text-blue-500 mt-1" size={20} />
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Alert Delivery</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Configure how you want to receive critical vehicle alerts and system updates.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email Alerts</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Receive alerts via support@kinetic.com</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, emailAlerts: e.target.checked } })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Push Notifications</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time browser notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, pushNotifications: e.target.checked } })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>SMS Alerts</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Critical faults only (+91 ********89)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.smsAlerts}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, smsAlerts: e.target.checked } })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'thresholds':
        return (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold border-b pb-2 ${darkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              Alert Criteria & Limits
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`flex justify-between text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>Speed Limit Warning</span>
                  <span className="text-blue-500 font-bold">{settings.thresholds.maxSpeed} km/h</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="120"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  value={settings.thresholds.maxSpeed}
                  onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, maxSpeed: parseInt(e.target.value) } })}
                />
                <p className="text-xs text-gray-400">Triggers an alert if a vehicle exceeds this speed.</p>
              </div>

              <div className="space-y-2">
                <label className={`flex justify-between text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>Low Battery Warning</span>
                  <span className="text-red-500 font-bold">{settings.thresholds.lowBattery}%</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  value={settings.thresholds.lowBattery}
                  onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, lowBattery: parseInt(e.target.value) } })}
                />
                <p className="text-xs text-gray-400">Triggers a critical alert when SOC drops below this level.</p>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Maintenance Interval
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    value={settings.thresholds.maintenanceInterval}
                    onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, maintenanceInterval: parseInt(e.target.value) } })}
                  />
                  <span className={`absolute right-3 top-2.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>km</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Batt. Temp Threshold
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    value={settings.thresholds.highTemp}
                  />
                  <span className={`absolute right-3 top-2.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>°C</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      <div className={`rounded-xl shadow-lg flex flex-col md:flex-row min-h-[600px] overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>

        {/* Settings Sidebar */}
        <div className={`w-full md:w-64 flex-shrink-0 border-r ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="p-6">
            <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Globe size={18} />
                General
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Bell size={18} />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('thresholds')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'thresholds'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Zap size={18} />
                Thresholds
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Shield size={18} />
                Security
              </button>
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-8 relative">
          {renderContent()}

          {/* Action Footer */}
          <div className={`mt-12 pt-6 border-t flex justify-end gap-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50`}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Configure;
