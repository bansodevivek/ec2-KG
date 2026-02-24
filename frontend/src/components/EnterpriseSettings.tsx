import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Key,
  Plus,
  MoreVertical,
  Download,
  CheckCircle,
  Copy,
  ShieldCheck,
  Globe
} from 'lucide-react';
import TeamMembers from './TeamMembers';
import { UserRole } from '../types';

interface EnterpriseSettingsProps {
  darkMode: boolean;
  userRole?: UserRole;
}

const EnterpriseSettings: React.FC<EnterpriseSettingsProps> = ({ darkMode, userRole }) => {
  const [activeTab, setActiveTab] = useState('organization');

  // Mock Organization Data
  const [orgDetails, setOrgDetails] = useState({
    name: 'Kinetic Green Energy & Power Solutions Ltd.',
    domain: 'kineticgreen.com',
    taxId: 'GSTIN27AABCV1234H1Z1',
    address: 'D-Block, MIDC, Chinchwad, Pune, Maharashtra 411019',
    contactEmail: 'admin@kineticgreen.com',
    contactPhone: '+91 20 6614 2049'
  });

  // Mock Billing Data
  const invoices = [
    { id: 'INV-2024-001', date: 'Jan 01, 2024', amount: '₹45,000', status: 'Paid' },
    { id: 'INV-2023-012', date: 'Dec 01, 2023', amount: '₹45,000', status: 'Paid' },
    { id: 'INV-2023-011', date: 'Nov 01, 2023', amount: '₹42,500', status: 'Paid' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'organization':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Organization Profile</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Save Changes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Company Name</label>
                <input
                  type="text"
                  value={orgDetails.name}
                  onChange={(e) => setOrgDetails({ ...orgDetails, name: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Business Domain</label>
                <input
                  type="text"
                  value={orgDetails.domain}
                  onChange={(e) => setOrgDetails({ ...orgDetails, domain: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tax ID (GSTIN)</label>
                <input
                  type="text"
                  value={orgDetails.taxId}
                  readOnly
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Primary Address</label>
                <textarea
                  value={orgDetails.address}
                  onChange={(e) => setOrgDetails({ ...orgDetails, address: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 'team':
        return <TeamMembers darkMode={darkMode} userRole={userRole} />;

      case 'billing':
        return (
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold border-b pb-2 ${darkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
              Subscription & Billing
            </h3>

            <div className={`p-6 rounded-xl border-l-4 border-blue-600 ${darkMode ? 'bg-gray-700/30' : 'bg-blue-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Enterprise Plan</h4>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Unlimited vehicles, 3 years data retention, Priority Support
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">ACTIVE</span>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-gray-600 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Next Billing Date</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Feb 01, 2024</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Estimated Amount</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>₹45,000 + GST</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Invoice History</h4>
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <th className="pb-3 pl-2">Invoice ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className={`border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <td className={`py-3 pl-2 font-mono text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{invoice.id}</td>
                      <td className={`py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{invoice.date}</td>
                      <td className={`py-3 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{invoice.amount}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle size={12} /> {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button className="p-1 hover:text-blue-600 transition text-gray-400">
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        {/* Sidebar */}
        <div className={`w-full md:w-64 flex-shrink-0 border-r ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="p-6">
            <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Enterprise</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('organization')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'organization'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Building2 size={18} />
                Organization
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'team'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <Users size={18} />
                Team Members
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
              >
                <CreditCard size={18} />
                Billing & Plan
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 relative">
          {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default EnterpriseSettings;
