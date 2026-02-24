import React, { useState } from 'react';
import {
  Headphones,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  FileText,
  Send,
  Car,
  User as UserIcon,
  CheckSquare
} from 'lucide-react';
import { UserRole } from '../types';

interface SupportConnectProps {
  darkMode: boolean;
  userRole: UserRole;
  username: string;
}

interface CustomerComplaint {
  id: string;
  customerName: string;
  licensePlate: string;
  vinNumber: string;
  complaintAbout: string;
  complaintDetails: string;
  status: 'submitted' | 'in-review' | 'resolved';
  submittedAt: string;
  submittedBy: string;
}

interface SupportTicket {
  id: string;
  customerName: string;
  licensePlate: string;
  vinNumber: string;
  complaintAbout: string;
  complaintDetails: string;
  category: 'technical' | 'billing' | 'general' | 'service' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  responses: {
    id: string;
    author: string;
    message: string;
    timestamp: string;
  }[];
}

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 'CMP-001',
    customerName: 'Rajesh Kumar',
    licensePlate: 'MH-01-AB-1234',
    vinNumber: 'MA1KG12345678901',
    complaintAbout: 'Battery Issue',
    complaintDetails: 'The vehicle battery is not charging properly. It shows 45% and does not increase even after 2 hours of charging.',
    category: 'technical',
    priority: 'high',
    status: 'in-progress',
    createdBy: 'customer@example.com',
    createdAt: '2026-01-27T10:30:00',
    updatedAt: '2026-01-28T09:15:00',
    assignedTo: 'Service Team',
    responses: [
      {
        id: 'R001',
        author: 'Service Team',
        message: 'We have scheduled a technician visit for tomorrow. Please ensure the vehicle is available at the registered address.',
        timestamp: '2026-01-27T14:20:00'
      }
    ]
  },
  {
    id: 'CMP-002',
    customerName: 'Priya Sharma',
    licensePlate: 'DL-08-CD-2345',
    vinNumber: 'MA1KG12345678920',
    complaintAbout: 'Brake Noise',
    complaintDetails: 'Strange noise coming from brakes when applying them. The noise started 2 days ago.',
    category: 'service',
    priority: 'medium',
    status: 'open',
    createdBy: 'customer2@example.com',
    createdAt: '2026-01-28T08:00:00',
    updatedAt: '2026-01-28T08:00:00',
    responses: []
  },
  {
    id: 'CMP-003',
    customerName: 'Amit Patel',
    licensePlate: 'KA-01-MN-3456',
    vinNumber: 'MA1KG12345678940',
    complaintAbout: 'Low Performance',
    complaintDetails: 'Vehicle is not reaching the expected speed. Maximum speed achieved is only 40 km/h instead of 60 km/h.',
    category: 'performance',
    priority: 'high',
    status: 'resolved',
    createdBy: 'customer3@example.com',
    createdAt: '2026-01-25T11:00:00',
    updatedAt: '2026-01-27T18:30:00',
    assignedTo: 'Technical Team',
    responses: [
      {
        id: 'R002',
        author: 'Technical Team',
        message: 'Motor controller firmware has been updated. Please test the vehicle and confirm if the issue is resolved.',
        timestamp: '2026-01-27T18:30:00'
      }
    ]
  }
];

const SupportConnect: React.FC<SupportConnectProps> = ({ darkMode, userRole, username }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Customer complaint form state
  const [complaintForm, setComplaintForm] = useState({
    customerName: '',
    licensePlate: '',
    vinNumber: '',
    complaintAbout: '',
    complaintDetails: ''
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Dealer request form state
  const [dealerRequestForm, setDealerRequestForm] = useState({
    requestType: 'vehicle-order' as 'vehicle-order' | 'vehicle-update' | 'requirement' | 'other',
    subject: '',
    details: '',
    quantity: '',
    vehicleModel: ''
  });
  const [showDealerSuccessMessage, setShowDealerSuccessMessage] = useState(false);

  // Admin response state
  const [newResponse, setNewResponse] = useState('');

  // Role-based access control — all roles have full access
  const isDealer = false; // Dealer-specific OEM Connect view disabled; everyone sees full panel
  const canViewComplaints = true;
  const canRespond = true;

  // Filter tickets (only for admin/service users)
  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery && !ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ticket.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ticket.vinNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ticket.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (filterStatus !== 'all' && ticket.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return darkMode ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100';
      case 'in-progress': return darkMode ? 'text-yellow-400 bg-yellow-500/20' : 'text-yellow-600 bg-yellow-100';
      case 'resolved': return darkMode ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100';
      case 'closed': return darkMode ? 'text-gray-400 bg-gray-500/20' : 'text-gray-600 bg-gray-100';
      default: return darkMode ? 'text-gray-400 bg-gray-500/20' : 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'critical': return darkMode ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100';
      case 'high': return darkMode ? 'text-orange-400 bg-orange-500/20' : 'text-orange-600 bg-orange-100';
      case 'medium': return darkMode ? 'text-yellow-400 bg-yellow-500/20' : 'text-yellow-600 bg-yellow-100';
      case 'low': return darkMode ? 'text-green-400 bg-green-500/20' : 'text-green-600 bg-green-100';
      default: return darkMode ? 'text-gray-400 bg-gray-500/20' : 'text-gray-600 bg-gray-100';
    }
  };

  const handleSubmitComplaint = () => {
    const newTicket: SupportTicket = {
      id: `CMP-${String(tickets.length + 1).padStart(3, '0')}`,
      ...complaintForm,
      category: 'general',
      priority: 'medium',
      status: 'open',
      createdBy: username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };

    setTickets([newTicket, ...tickets]);
    setComplaintForm({
      customerName: '',
      licensePlate: '',
      vinNumber: '',
      complaintAbout: '',
      complaintDetails: ''
    });
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  const handleSendResponse = () => {
    if (!selectedTicket || !newResponse.trim()) return;

    const response = {
      id: `R${String(selectedTicket.responses.length + 1).padStart(3, '0')}`,
      author: username,
      message: newResponse,
      timestamp: new Date().toISOString()
    };

    const updatedTicket = {
      ...selectedTicket,
      responses: [...selectedTicket.responses, response],
      updatedAt: new Date().toISOString()
    };

    setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setNewResponse('');
  };

  const handleSubmitDealerRequest = () => {
    const newTicket: SupportTicket = {
      id: `REQ-${String(tickets.length + 1).padStart(3, '0')}`,
      customerName: username, // Dealer name
      licensePlate: 'N/A',
      vinNumber: 'N/A',
      complaintAbout: `${dealerRequestForm.requestType.replace('-', ' ').toUpperCase()}: ${dealerRequestForm.subject}`,
      complaintDetails: `Request Type: ${dealerRequestForm.requestType.replace('-', ' ').toUpperCase()}\n\n${dealerRequestForm.requestType === 'vehicle-order' ? `Vehicle Model: ${dealerRequestForm.vehicleModel}\nQuantity: ${dealerRequestForm.quantity}\n\n` : ''}Details:\n${dealerRequestForm.details}`,
      category: dealerRequestForm.requestType === 'vehicle-order' ? 'general' : 'service',
      priority: dealerRequestForm.requestType === 'vehicle-order' ? 'high' : 'medium',
      status: 'open',
      createdBy: username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };

    setTickets([newTicket, ...tickets]);
    setDealerRequestForm({
      requestType: 'vehicle-order',
      subject: '',
      details: '',
      quantity: '',
      vehicleModel: ''
    });
    setShowDealerSuccessMessage(true);
    setTimeout(() => setShowDealerSuccessMessage(false), 5000);
  };

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  // Dealer View (OEM Communication & Orders)
  if (isDealer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            OEM Connect
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Request vehicle orders, updates, and communicate with OEM
          </p>
        </div>

        {/* Success Message */}
        {showDealerSuccessMessage && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/20 border border-green-500/50' : 'bg-green-50 border border-green-200'} flex items-center gap-3`}>
            <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
            <div>
              <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Request Submitted Successfully!
              </p>
              <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                OEM team will review your request and respond within 24-48 hours.
              </p>
            </div>
          </div>
        )}

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
                <Phone className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>OEM Hotline</p>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>+91 1800-OEM-HELP</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-500/20' : 'bg-green-200'}`}>
                <Mail className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>OEM Email</p>
                <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>dealers@kineticgreen.com</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-200'}`}>
                <MessageSquare className={`${darkMode ? 'text-purple-400' : 'text-purple-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dealer Portal</p>
                <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>24/7 Access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Submit Request to OEM
          </h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Request Type *
              </label>
              <select
                value={dealerRequestForm.requestType}
                onChange={(e) => setDealerRequestForm({ ...dealerRequestForm, requestType: e.target.value as any })}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              >
                <option value="vehicle-order">Vehicle Order</option>
                <option value="vehicle-update">Vehicle Update Request</option>
                <option value="requirement">Requirement / Inquiry</option>
                <option value="other">Other</option>
              </select>
            </div>

            {dealerRequestForm.requestType === 'vehicle-order' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Car size={16} className="inline mr-2" />
                    Vehicle Model *
                  </label>
                  <select
                    value={dealerRequestForm.vehicleModel}
                    onChange={(e) => setDealerRequestForm({ ...dealerRequestForm, vehicleModel: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  >
                    <option value="">Select Model</option>
                    <option value="Kinetic Zulu">Kinetic Zulu</option>
                    <option value="Kinetic Zoom">Kinetic Zoom</option>
                    <option value="Kinetic Cargo Pro">Kinetic Cargo Pro</option>
                    <option value="Kinetic Cargo Max">Kinetic Cargo Max</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dealerRequestForm.quantity}
                    onChange={(e) => setDealerRequestForm({ ...dealerRequestForm, quantity: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Subject *
              </label>
              <input
                type="text"
                value={dealerRequestForm.subject}
                onChange={(e) => setDealerRequestForm({ ...dealerRequestForm, subject: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                placeholder={dealerRequestForm.requestType === 'vehicle-order' ? 'e.g., Bulk order for Q1 2026' : 'Brief description of your request'}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Details *
              </label>
              <textarea
                value={dealerRequestForm.details}
                onChange={(e) => setDealerRequestForm({ ...dealerRequestForm, details: e.target.value })}
                rows={5}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                placeholder="Provide detailed information about your request..."
              />
            </div>

            <button
              onClick={handleSubmitDealerRequest}
              disabled={
                !dealerRequestForm.subject ||
                !dealerRequestForm.details ||
                (dealerRequestForm.requestType === 'vehicle-order' && (!dealerRequestForm.vehicleModel || !dealerRequestForm.quantity))
              }
              className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={20} />
              Submit Request to OEM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Customer View (Simple Complaint Form)
  if (!canViewComplaints) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Customer Support
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Submit your complaint and we'll get back to you soon
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-500/20 border border-green-500/50' : 'bg-green-50 border border-green-200'} flex items-center gap-3`}>
            <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
            <div>
              <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Complaint Submitted Successfully!
              </p>
              <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                Our team will review your complaint and get back to you within 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
                <Phone className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Call Support</p>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>+91 1800-123-4567</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-500/20' : 'bg-green-200'}`}>
                <Mail className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email Support</p>
                <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>support@kineticgreen.com</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-200'}`}>
                <MessageSquare className={`${darkMode ? 'text-purple-400' : 'text-purple-600'}`} size={24} />
              </div>
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Live Chat</p>
                <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Available 24/7</p>
              </div>
            </div>
          </div>
        </div>

        {/* Complaint Form */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Submit Your Complaint
          </h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <UserIcon size={16} className="inline mr-2" />
                Your Name *
              </label>
              <input
                type="text"
                value={complaintForm.customerName}
                onChange={(e) => setComplaintForm({ ...complaintForm, customerName: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Car size={16} className="inline mr-2" />
                  License Plate Number *
                </label>
                <input
                  type="text"
                  value={complaintForm.licensePlate}
                  onChange={(e) => setComplaintForm({ ...complaintForm, licensePlate: e.target.value.toUpperCase() })}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  placeholder="MH-01-AB-1234"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FileText size={16} className="inline mr-2" />
                  VIN Number *
                </label>
                <input
                  type="text"
                  value={complaintForm.vinNumber}
                  onChange={(e) => setComplaintForm({ ...complaintForm, vinNumber: e.target.value.toUpperCase() })}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                  placeholder="MA1KG12345678901"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Complaint About *
              </label>
              <input
                type="text"
                value={complaintForm.complaintAbout}
                onChange={(e) => setComplaintForm({ ...complaintForm, complaintAbout: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                placeholder="Brief description (e.g., Battery Issue, Brake Problem)"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Complaint Details *
              </label>
              <textarea
                value={complaintForm.complaintDetails}
                onChange={(e) => setComplaintForm({ ...complaintForm, complaintDetails: e.target.value })}
                rows={5}
                className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                placeholder="Please provide detailed information about your complaint..."
              />
            </div>

            <button
              onClick={handleSubmitComplaint}
              disabled={!complaintForm.customerName || !complaintForm.licensePlate || !complaintForm.vinNumber || !complaintForm.complaintAbout || !complaintForm.complaintDetails}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={20} />
              Submit Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Service View (Full Ticket Management System)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Support & Connect - {canRespond ? 'Admin Panel' : 'Monitoring Panel'}
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {canRespond ? 'Manage customer complaints and support tickets' : 'View customer complaints and support tickets (Read-Only)'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Complaints</p>
              <p className={`text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{ticketStats.total}</p>
            </div>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <FileText className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Open</p>
              <p className={`text-3xl font-bold mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{ticketStats.open}</p>
            </div>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <AlertCircle className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Progress</p>
              <p className={`text-3xl font-bold mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{ticketStats.inProgress}</p>
            </div>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
              <Clock className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} size={24} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</p>
              <p className={`text-3xl font-bold mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{ticketStats.resolved}</p>
            </div>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <CheckCircle className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className={`lg:col-span-1 p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Customer Complaints
          </h2>

          {/* Search and Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, plate, VIN..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border`}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Tickets List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${selectedTicket?.id === ticket.id
                  ? darkMode
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-green-50 border-2 border-green-500'
                  : darkMode
                    ? 'bg-gray-700/50 hover:bg-gray-700 border-2 border-transparent'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {ticket.customerName}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      {ticket.id} • {ticket.licensePlate}
                    </p>
                  </div>
                </div>

                <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {ticket.complaintAbout}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('-', ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                </div>

                <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                <p>No complaints found</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className={`lg:col-span-2 p-6 rounded-2xl ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          {selectedTicket ? (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.complaintAbout}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                      Complaint ID: {selectedTicket.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Customer & Vehicle Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Customer Name</p>
                    <p className={`font-semibold text-sm mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.customerName}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>License Plate</p>
                    <p className={`font-semibold text-sm mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.licensePlate}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>VIN Number</p>
                    <p className={`font-semibold text-sm mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.vinNumber}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Submitted</p>
                    <p className={`font-semibold text-sm mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Complaint Details */}
              <div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Complaint Details</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedTicket.complaintDetails}
                </p>
              </div>

              {/* Responses */}
              <div>
                <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Team Responses ({selectedTicket.responses.length})
                </h3>

                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar mb-4">
                  {selectedTicket.responses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-4 rounded-xl ${darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {response.author}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(response.timestamp).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {response.message}
                      </p>
                    </div>
                  ))}

                  {selectedTicket.responses.length === 0 && (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No responses yet</p>
                    </div>
                  )}
                </div>

                {/* Response Input */}
                {canRespond && selectedTicket.status !== 'closed' && (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendResponse()}
                      placeholder="Type your response to the customer..."
                      className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    />
                    <button
                      onClick={handleSendResponse}
                      disabled={!newResponse.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center h-full ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Headphones size={64} className="mb-4 opacity-50" />
              <p className="text-lg">Select a complaint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportConnect;
