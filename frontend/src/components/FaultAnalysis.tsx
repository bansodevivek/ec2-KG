import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Filter, 
  Search, 
  BarChart2, 
  PieChart 
} from 'lucide-react';
// import { FAULT_CODE_ANALYSIS, FAULT_CODES } from '../constants'; // Removed

interface FaultAnalysisProps {
  darkMode: boolean;
  faultCodes: any[];
  faultCodeAnalysis: any;
}

const FaultAnalysis: React.FC<FaultAnalysisProps> = ({ darkMode, faultCodes, faultCodeAnalysis }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'low': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600';
      case 'investigating': return 'text-orange-600';
      case 'resolved': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredFaults = faultCodes.filter(fault => {
    const matchesFilter = filter === 'all' || fault.status === filter;
    const matchesSearch = 
      fault.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Faults</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {faultCodeAnalysis.summary.totalFaults}
              </p>
            </div>
            <Activity className="text-blue-600" size={32} />
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Faults</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {faultCodeAnalysis.summary.activeFaults}
              </p>
            </div>
            <AlertTriangle className="text-red-600" size={32} />
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Resolved</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {faultCodeAnalysis.summary.resolvedFaults}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Resolution Time</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {faultCodeAnalysis.summary.avgResolutionTime} hrs
              </p>
            </div>
            <Clock className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fault Distribution */}
        <div className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center gap-2`}>
            <BarChart2 size={24} />
            Fault Distribution by Category
          </h3>
          <div className="space-y-4">
            {faultCodeAnalysis.byCategory.map((category: any) => (
              <div key={category.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{category.category}</span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                    {category.count} faults ({category.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Critical Faults */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 flex items-center gap-2`}>
            <AlertTriangle size={24} />
            Top Critical Faults
          </h3>
          <div className="space-y-4">
            {faultCodeAnalysis.topFaults.map((fault: any) => (
              <div 
                key={fault.code}
                className={`p-4 rounded-lg border-l-4 border-red-500 ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-red-500">{fault.code}</span>
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full dark:bg-red-900/30 dark:text-red-300">
                    {fault.occurrences} occurrences
                  </span>
                </div>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {fault.description}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Affected Vehicles: {fault.affectedVehicles}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fault Logs */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Fault Logs
          </h3>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Details</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Severity</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Occurrences</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Last Detected</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaults.map((fault) => (
                <tr 
                  key={fault.id}
                  className={`border-b last:border-0 ${
                    darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <td className="p-4">
                    <div>
                      <span className="font-bold text-blue-600">{fault.code}</span>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {fault.description}
                      </p>
                    </div>
                  </td>
                  <td className={`p-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {fault.vehicle}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(fault.severity)}`}>
                      {fault.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className={`p-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {fault.occurrences}
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1 font-medium ${getStatusColor(fault.status)}`}>
                      {fault.status === 'resolved' && <CheckCircle size={16} />}
                      {fault.status === 'active' && <AlertTriangle size={16} />}
                      {fault.status === 'investigating' && <Activity size={16} />}
                      {fault.status.charAt(0).toUpperCase() + fault.status.slice(1)}
                    </span>
                  </td>
                  <td className={`p-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {fault.lastDetected}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default FaultAnalysis;
