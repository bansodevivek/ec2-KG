import React, { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  Hash,
  Cpu,
  Battery,
  Smartphone,
  Plus,
  X,
  Building2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Search,
  Truck
} from 'lucide-react';
import { DEALER_DATA } from '../constants';
import { UserRole } from '../types';
import { fetchDealers, createDealer, fetchDealerDashboard, addCustomer, Dealer, DealerDashboardData } from '../api/dealers';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { assignVehicle } from '../api/vehicle';

interface DealerManagementProps {
  darkMode: boolean;
  userRole: UserRole;
}

const DealerManagement: React.FC<DealerManagementProps> = ({ darkMode, userRole }) => {
  const [dealer, setDealer] = useState(DEALER_DATA[0]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | '2-wheeler' | '3-wheeler'>('all');

  // API state
  const [apiDealers, setApiDealers] = useState<Dealer[]>([]);
  const [selectedDealerCode, setSelectedDealerCode] = useState<string | null>(null);
  const [isLoadingDealers, setIsLoadingDealers] = useState(false);
  const [dealerError, setDealerError] = useState<string | null>(null);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<DealerDashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Assign vehicle modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignVins, setAssignVins] = useState<string[]>([]);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  // Add Dealer Info Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Add Customer Modal State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [customerSuccess, setCustomerSuccess] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerForm, setCustomerForm] = useState({
    vin: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_pincode: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_price: ''
  });
  const [customerFormErrors, setCustomerFormErrors] = useState<Record<string, string>>({});

  const [newDealer, setNewDealer] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    referenceNo: '',
    dealerCode: '',
    dealershipName: '',
    forPartyCreation: '',
    address: '',
    state: '',
    zone: '',
    location: '',
    pincode: '',
    gstNo: '',
    loiDate: '',
    loiValidUpto: '',
    leadStatus: 'Digital' as 'Digital' | 'Newspaper' | 'Scouting'
  });

  const canAddDealer = ['SUPER_ADMIN', 'OEM', 'RND', 'SALES'].includes(userRole);

  // Fetch dealers from API
  useEffect(() => {
    const loadDealers = async () => {
      setIsLoadingDealers(true);
      setDealerError(null);
      try {
        const result = await fetchDealers();
        if (result.success) {
          setApiDealers(result.data || []);
        } else {
          setDealerError(result.error || 'Failed to fetch dealers');
          setApiDealers([]);
        }
      } catch (err) {
        console.error('Error loading dealers:', err);
        setDealerError('Failed to load dealers');
        setApiDealers([]);
      } finally {
        setIsLoadingDealers(false);
      }
    };

    loadDealers();
  }, []);

  // Get selected dealer from API data
  const selectedApiDealer = selectedDealerCode
    ? apiDealers.find(d => d.dealer_code === selectedDealerCode)
    : null;

  // Fetch dashboard data when dealer is selected
  useEffect(() => {
    const loadDashboard = async () => {
      if (!selectedApiDealer) {
        setDashboardData(null);
        return;
      }

      if (!selectedApiDealer.dealer_code) {
        setDashboardError('Dealer code is missing. Dashboard requires a valid dealer code.');
        setDashboardData(null);
        return;
      }

      const dealerCode = selectedApiDealer.dealer_code;

      setIsLoadingDashboard(true);
      setDashboardError(null);
      try {
        const result = await fetchDealerDashboard(dealerCode);
        if (result.success && result.data) {
          setDashboardData(result.data);
        } else {
          setDashboardError(result.error || 'Failed to fetch dashboard data');
          setDashboardData(null);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setDashboardError('Failed to load dashboard');
        setDashboardData(null);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    loadDashboard();
  }, [selectedApiDealer]);

  const getStatusColor = (status: string) => {
    return status === 'assigned'
      ? 'text-green-400 bg-green-500/20'
      : 'text-orange-400 bg-orange-500/20';
  };

  const getStatusIcon = (status: string) => {
    return status === 'assigned' ? CheckCircle : Clock;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Username validation
    if (!newDealer.username.trim()) errors.username = 'Username is required';
    else if (newDealer.username.length < 3) errors.username = 'Username must be at least 3 characters';

    // Password validation
    if (!newDealer.password.trim()) errors.password = 'Password is required';
    else if (newDealer.password.length < 6) errors.password = 'Password must be at least 6 characters';

    // Email validation
    if (!newDealer.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(newDealer.email)) errors.email = 'Invalid email format';

    // First Name validation
    if (!newDealer.firstName.trim()) errors.firstName = 'First name is required';

    // Last Name validation
    if (!newDealer.lastName.trim()) errors.lastName = 'Last name is required';

    // Phone validation
    if (!newDealer.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^\+?91\s?\d{10}$|^\d{10}$/.test(newDealer.phone)) errors.phone = 'Invalid phone format (e.g. 9876543210)';

    // Reference No validation
    if (!newDealer.referenceNo.trim()) errors.referenceNo = 'Reference number is required';

    // Dealer Code validation
    if (!newDealer.dealerCode.trim()) errors.dealerCode = 'Dealer code is required';

    // Dealership Name validation
    if (!newDealer.dealershipName.trim()) errors.dealershipName = 'Dealership name is required';

    // For Party Creation validation
    if (!newDealer.forPartyCreation.trim()) errors.forPartyCreation = 'Party creation info is required';

    // Address validation
    if (!newDealer.address.trim()) errors.address = 'Address is required';

    // State validation
    if (!newDealer.state.trim()) errors.state = 'State is required';

    // Zone validation
    if (!newDealer.zone.trim()) errors.zone = 'Zone is required';

    // Location validation
    if (!newDealer.location.trim()) errors.location = 'Location is required';

    // Pincode validation
    if (!newDealer.pincode.trim()) errors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(newDealer.pincode)) errors.pincode = 'Pincode must be 6 digits';

    // GST No validation
    if (!newDealer.gstNo.trim()) errors.gstNo = 'GST number is required';
    else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(newDealer.gstNo))
      errors.gstNo = 'Invalid GST format (e.g. 27AAPFU0939F1ZV)';

    // LOI Date validation
    if (!newDealer.loiDate) errors.loiDate = 'LOI date is required';

    // LOI Valid Upto validation
    if (!newDealer.loiValidUpto) errors.loiValidUpto = 'LOI valid upto date is required';
    else if (newDealer.loiDate && new Date(newDealer.loiValidUpto) <= new Date(newDealer.loiDate))
      errors.loiValidUpto = 'LOI valid upto must be after LOI date';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractVehiclesFromResponse = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.vehicles)) return payload.vehicles;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const getVehicleVin = (vehicle: any) => {
    return vehicle?.vin || vehicle?.vehicle_id || vehicle?.id || '';
  };

  const getVehicleLabel = (vehicle: any) => {
    const vin = getVehicleVin(vehicle);
    const model = vehicle?.model_name || vehicle?.model || vehicle?.name || '';
    return model ? `${vin} - ${model}` : vin;
  };

  const fetchAvailableVehicles = async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
      const list = extractVehiclesFromResponse(response.data);
      setAvailableVehicles(list);
    } catch (err: any) {
      console.error('Failed to fetch vehicles:', err);
      setVehiclesError('Failed to load vehicles');
      setAvailableVehicles([]);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const resetAssignState = () => {
    setAssignVins([]);
    setAssignError('');
    setAssignSuccess('');
    setIsAssigning(false);
  };

  const toggleVinSelection = (vin: string) => {
    setAssignVins((prev) =>
      prev.includes(vin) ? prev.filter((item) => item !== vin) : [...prev, vin]
    );
  };

  const handleAssignVehicles = async () => {
    if (!selectedApiDealer?.dealer_code) {
      setAssignError('Select a dealer before assigning vehicles.');
      return;
    }

    if (assignVins.length === 0) {
      setAssignError('Add at least one VIN.');
      return;
    }

    setAssignError('');
    setAssignSuccess('');
    setIsAssigning(true);

    try {
      const payload = {
        type: 'dealer',
        dealer_code: selectedApiDealer.dealer_code,
        vehicles: assignVins.map((vin) => ({ vin }))
      };

      const response = await assignVehicle(payload);

      if (response?.success === false) {
        setAssignError(response.error || response.message || 'Failed to assign vehicles');
        return;
      }

      setAssignSuccess(response?.message || 'Vehicles assigned successfully');
      setTimeout(() => {
        setShowAssignModal(false);
        resetAssignState();
      }, 1200);
    } catch (error: any) {
      console.error('Failed to assign vehicles:', error);
      const apiError = error?.response?.data?.error;
      setAssignError(apiError || error?.message || 'Failed to assign vehicles');
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Add Customer Handler ──────────────────────────────────
  const validateCustomerForm = () => {
    const errors: Record<string, string> = {};
    if (!customerForm.vin) errors.vin = 'Please select a vehicle VIN';
    if (!customerForm.customer_name.trim()) errors.customer_name = 'Customer name is required';
    if (!customerForm.customer_email.trim()) errors.customer_email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(customerForm.customer_email)) errors.customer_email = 'Invalid email format';
    if (!customerForm.customer_phone.trim()) errors.customer_phone = 'Phone is required';
    else if (!/^\+?91\s?\d{10}$|^\d{10}$/.test(customerForm.customer_phone)) errors.customer_phone = 'Invalid phone (e.g. 9876543210)';
    if (!customerForm.customer_address.trim()) errors.customer_address = 'Address is required';
    if (!customerForm.customer_city.trim()) errors.customer_city = 'City is required';
    if (!customerForm.customer_state.trim()) errors.customer_state = 'State is required';
    if (!customerForm.customer_pincode.trim()) errors.customer_pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(customerForm.customer_pincode)) errors.customer_pincode = 'Must be 6 digits';
    if (!customerForm.sale_date) errors.sale_date = 'Sale date is required';
    if (!customerForm.sale_price.trim()) errors.sale_price = 'Sale price is required';
    else if (isNaN(Number(customerForm.sale_price)) || Number(customerForm.sale_price) <= 0) errors.sale_price = 'Enter a valid price';
    setCustomerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm()) return;
    if (!selectedApiDealer?.dealer_code) return;

    setIsSubmittingCustomer(true);
    setCustomerError('');
    setCustomerSuccess('');

    const result = await addCustomer({
      dealer_code: selectedApiDealer.dealer_code,
      ...customerForm
    });

    if (result.success) {
      setCustomerSuccess('Customer added and vehicle marked as sold!');
      // Refresh dashboard to update inventory
      const dashResult = await fetchDealerDashboard(selectedApiDealer.dealer_code);
      if (dashResult.success && dashResult.data) setDashboardData(dashResult.data);
      setTimeout(() => {
        setShowCustomerModal(false);
        setCustomerSuccess('');
        setCustomerForm({
          vin: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          customer_city: '',
          customer_state: '',
          customer_pincode: '',
          sale_date: new Date().toISOString().split('T')[0],
          sale_price: ''
        });
        setCustomerFormErrors({});
      }, 1800);
    } else {
      setCustomerError(result.error || 'Failed to add customer');
    }
    setIsSubmittingCustomer(false);
  };


  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Prepare API payload
      const payload = {
        username: newDealer.username,
        password: newDealer.password,
        email: newDealer.email,
        first_name: newDealer.firstName,
        last_name: newDealer.lastName,
        phone: newDealer.phone,
        reference_no: newDealer.referenceNo,
        dealer_code: newDealer.dealerCode,
        dealership_name: newDealer.dealershipName,
        for_party_creation: newDealer.forPartyCreation,
        dealer_address: newDealer.address,
        state: newDealer.state,
        zone: newDealer.zone,
        location: newDealer.location,
        pin_code: newDealer.pincode,
        gst_no: newDealer.gstNo,
        loi_date: newDealer.loiDate,
        loi_valid_upto: newDealer.loiValidUpto,
        lead_status: newDealer.leadStatus
      };

      const result = await createDealer(payload);

      if (result.success) {
        setSuccessMessage('Dealer successfully registered!');

        // Refresh dealer list
        const dealersResult = await fetchDealers();
        if (dealersResult.success) {
          setApiDealers(dealersResult.data || []);
        }

        // Reset form
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMessage('');
          setNewDealer({
            username: '',
            password: '',
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            referenceNo: '',
            dealerCode: '',
            dealershipName: '',
            forPartyCreation: '',
            address: '',
            state: '',
            zone: '',
            location: '',
            pincode: '',
            gstNo: '',
            loiDate: '',
            loiValidUpto: '',
            leadStatus: 'Digital'
          });
        }, 2000);
      } else {
        setFormErrors({ submit: result.error || 'Failed to register dealer. Please try again.' });
      }
    } catch (error) {
      setFormErrors({ submit: 'Failed to register dealer. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Dealer Management
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage dealer network and vehicle inventory distribution
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <Users size={20} />
            <span className="font-semibold">{apiDealers.length || DEALER_DATA.length} Active Dealers</span>
          </div>
          {canAddDealer && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus size={20} />
              Add Dealer Info
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dealer List */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Dealer Partners
          </h2>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search dealers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 transition-all outline-none ${searchQuery ? 'border-blue-500' : ''} ${darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
            />
          </div>
          {isLoadingDealers ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : dealerError ? (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{dealerError}</p>
            </div>
          ) : (() => {
            const filteredDealers = apiDealers.filter(d => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                d.dealership_name?.toLowerCase().includes(query) ||
                d.dealer_code?.toLowerCase().includes(query) ||
                d.location?.toLowerCase().includes(query) ||
                d.state?.toLowerCase().includes(query) ||
                d.partner_name?.toLowerCase().includes(query) ||
                d.mobile_no?.includes(query)
              );
            });

            if (filteredDealers.length === 0) {
              return (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Search size={48} className="mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No dealers found matching your search' : 'No dealers available'}</p>
                </div>
              );
            }

            return (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredDealers.map((d) => (
                  <div
                    key={d.dealer_code}
                    onClick={() =>
                      setSelectedDealerCode((prev) => (prev === d.dealer_code ? null : d.dealer_code))
                    }
                    className={`p-4 rounded-xl cursor-pointer transition-all ${selectedDealerCode === d.dealer_code
                      ? darkMode
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-blue-50 border-2 border-blue-500'
                      : darkMode
                        ? 'bg-gray-700/30 hover:bg-gray-700/50 border-2 border-transparent'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {d.dealership_name}
                      </h3>
                      <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {d.dealer_code}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin size={14} />
                        <span>{d.location || 'N/A'}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Phone size={14} />
                        <span>{d.mobile_no || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Dealer Details & Vehicle Inventory */}
        <div className="lg:col-span-2 space-y-6">
          {selectedApiDealer ? (
            <>
              {/* Dealer Information */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedApiDealer.dealership_name}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ref: {selectedApiDealer.reference_no}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        resetAssignState();
                        fetchAvailableVehicles();
                        setShowAssignModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
                    >
                      <Truck size={18} />
                      Assign Vehicle
                    </button>
                    <button
                      onClick={() => {
                        setCustomerError('');
                        setCustomerSuccess('');
                        setCustomerFormErrors({});
                        setCustomerForm(f => ({ ...f, vin: dashboardData?.inventory?.[0]?.vin || '' }));
                        setShowCustomerModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"
                    >
                      <Users size={18} />
                      Add Customer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Building2 className="text-blue-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dealer Code</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.dealer_code}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Users className="text-green-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Partner Name</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.partner_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Mail className="text-purple-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.email_id || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Phone className="text-orange-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mobile</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.mobile_no || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <MapPin className="text-blue-400" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <MapPin className="text-green-400" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>State</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApiDealer.state || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Status */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <CheckCircle size={20} className="text-green-500" />
                  Dealer Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${selectedApiDealer.lead_status === 'active'
                    ? darkMode
                      ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30'
                      : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'
                    : darkMode
                      ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30'
                      : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${selectedApiDealer.lead_status === 'active'
                        ? darkMode
                          ? 'text-green-300'
                          : 'text-green-700'
                        : darkMode
                          ? 'text-yellow-300'
                          : 'text-yellow-700'
                        }`}>Lead Status</span>
                      <CheckCircle size={18} className={selectedApiDealer.lead_status === 'active' ? 'text-green-500' : 'text-yellow-500'} />
                    </div>
                    <p className={`text-2xl font-bold capitalize ${selectedApiDealer.lead_status === 'active'
                      ? darkMode
                        ? 'text-green-400'
                        : 'text-green-600'
                      : darkMode
                        ? 'text-yellow-400'
                        : 'text-yellow-600'
                      }`}>
                      {selectedApiDealer.lead_status || 'N/A'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30' : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Reference Number</span>
                      <Hash size={18} className="text-purple-500" />
                    </div>
                    <p className={`text-xl font-bold font-mono ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {selectedApiDealer.reference_no}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard Section */}
              {isLoadingDashboard ? (
                <div className={`p-12 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} flex items-center justifycenter`}>
                  <Loader2 size={40} className="animate-spin text-blue-500" />
                </div>
              ) : dashboardError ? (
                <div className={`p-6 rounded-2xl flex items-start gap-3 ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                  }`}>
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{dashboardError}</p>
                </div>
              ) : dashboardData ? (
                <>
                  {/* Statistics Cards */}
                    <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Package size={20} className="text-blue-500" />
                      Sales & Delivery Statistics
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Assigned</span>
                          <Package size={18} className="text-blue-500" />
                        </div>
                        <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {dashboardData.statistics.total_assigned}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Total Sold</span>
                          <CheckCircle size={18} className="text-green-500" />
                        </div>
                        <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {dashboardData.statistics.total_sold}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30' : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Total Inventory</span>
                          <Package size={18} className="text-purple-500" />
                        </div>
                        <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {dashboardData.statistics.total_inventory}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Inventory */}
                  {dashboardData.inventory && dashboardData.inventory.length > 0 && (
                      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Truck size={20} className="text-orange-500" />
                        Current Inventory
                      </h3>

                      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {dashboardData.inventory.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl flex items-center justify-between ${darkMode
                              ? 'bg-gray-700/30 hover:bg-gray-700/50'
                              : 'bg-gray-50 hover:bg-gray-100'
                              } transition-colors border ${darkMode ? 'border-gray-600/30' : 'border-gray-200'}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Hash size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.vin}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Building2 size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{item.dealer_name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{item.assigned_date}</span>
                                </div>
                              </div>
                            </div>
                            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Inline Add Customer Form ─────────────────────────── */}
                    <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-5">
                      <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Users size={20} className="text-emerald-500" />
                        Add Customer
                      </h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        Record Vehicle Sale
                      </span>
                    </div>

                    {/* Feedback banners */}
                    {customerSuccess && (
                      <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300">
                        <CheckCircle size={18} className="flex-shrink-0" />
                        <span className="font-semibold text-sm">{customerSuccess}</span>
                      </div>
                    )}
                    {customerError && (
                      <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span className="text-sm">{customerError}</span>
                      </div>
                    )}

                    <form onSubmit={handleAddCustomer} className="space-y-5">
                      {/* VIN dropdown */}
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Vehicle VIN <span className="text-red-500">*</span>
                          <span className={`ml-2 text-xs font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            (only unsold inventory shown)
                          </span>
                        </label>
                        {dashboardData?.inventory && dashboardData.inventory.length > 0 ? (
                          <select
                            value={customerForm.vin}
                            onChange={e => setCustomerForm(f => ({ ...f, vin: e.target.value }))}
                            className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all font-mono text-sm ${customerFormErrors.vin
                                ? 'border-red-500'
                                : darkMode
                                  ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white'
                                  : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                              }`}
                          >
                            <option value="">— Select a VIN —</option>
                            {dashboardData.inventory.map(item => (
                              <option key={item.vin} value={item.vin}>{item.vin}</option>
                            ))}
                          </select>
                        ) : (
                          <div className={`px-4 py-3 rounded-xl border-2 text-sm ${darkMode ? 'border-gray-700 text-gray-400 bg-gray-800' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                            No available inventory — assign vehicles to this dealer first.
                          </div>
                        )}
                        {customerFormErrors.vin && <p className="text-red-500 text-xs mt-1">{customerFormErrors.vin}</p>}
                      </div>

                      {/* Customer Details */}
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Customer Details
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Name */}
                          <div className="md:col-span-2">
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name *</label>
                            <input
                              type="text"
                              placeholder="e.g. Rahul Sharma"
                              value={customerForm.customer_name}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_name: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_name ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_name && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_name}</p>}
                          </div>
                          {/* Email */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email *</label>
                            <input
                              type="email"
                              placeholder="customer@email.com"
                              value={customerForm.customer_email}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_email: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_email ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_email && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_email}</p>}
                          </div>
                          {/* Phone */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Phone *</label>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              value={customerForm.customer_phone}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_phone: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_phone ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_phone && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_phone}</p>}
                          </div>
                          {/* Address */}
                          <div className="md:col-span-2">
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Address *</label>
                            <input
                              type="text"
                              placeholder="Street address"
                              value={customerForm.customer_address}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_address: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_address ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_address && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_address}</p>}
                          </div>
                          {/* City */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>City *</label>
                            <input
                              type="text"
                              placeholder="e.g. Pune"
                              value={customerForm.customer_city}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_city: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_city ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_city && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_city}</p>}
                          </div>
                          {/* State */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>State *</label>
                            <input
                              type="text"
                              placeholder="e.g. Maharashtra"
                              value={customerForm.customer_state}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_state: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_state ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_state && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_state}</p>}
                          </div>
                          {/* Pincode */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pincode *</label>
                            <input
                              type="text"
                              placeholder="e.g. 411001"
                              maxLength={6}
                              value={customerForm.customer_pincode}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_pincode: e.target.value.replace(/\D/g, '') }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_pincode ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.customer_pincode && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_pincode}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Sale Details */}
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          Sale Details
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Sale Date */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Date *</label>
                            <input
                              type="date"
                              value={customerForm.sale_date}
                              onChange={e => setCustomerForm(f => ({ ...f, sale_date: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_date ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.sale_date && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_date}</p>}
                          </div>
                          {/* Sale Price */}
                          <div>
                            <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Price (₹) *</label>
                            <input
                              type="number"
                              placeholder="e.g. 95000"
                              min="1"
                              value={customerForm.sale_price}
                              onChange={e => setCustomerForm(f => ({ ...f, sale_price: e.target.value }))}
                              className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_price ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 focus:border-emerald-500 bg-gray-50 text-gray-900'
                                }`}
                            />
                            {customerFormErrors.sale_price && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_price}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isSubmittingCustomer || !dashboardData?.inventory?.length}
                          className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingCustomer ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={18} />
                              Add Customer &amp; Mark as Sold
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                </>
              ) : null}
            </>
          ) : (
            <div className={`p-12 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} flex flex-col items-center justify-center`}>
              <Building2 size={64} className={`mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a dealer to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isAssigning && setShowAssignModal(false)}></div>

          <div className={`relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <div className={`px-6 py-5 flex items-center justify-between border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Assign Vehicles</h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Dealer: {selectedApiDealer?.dealer_code || 'N/A'}
                </p>
              </div>
              <button
                disabled={isAssigning}
                onClick={() => setShowAssignModal(false)}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {assignError && (
                <div className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{assignError}</div>
              )}
              {assignSuccess && (
                <div className="text-green-600 bg-green-100 p-3 rounded-md text-sm">{assignSuccess}</div>
              )}

              <div className="space-y-2">
                <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Available Vehicles (not assigned)
                </label>

                {isLoadingVehicles ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={16} /> Loading vehicles...
                  </div>
                ) : vehiclesError ? (
                  <div className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{vehiclesError}</div>
                ) : (() => {
                  const assignedVins = new Set(
                    (dashboardData?.inventory || []).map((item) => item.vin)
                  );
                  const unassigned = availableVehicles.filter((vehicle) => {
                    const vin = getVehicleVin(vehicle);
                    return vin && !assignedVins.has(vin);
                  });

                  if (unassigned.length === 0) {
                    return (
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No unassigned vehicles available.
                      </div>
                    );
                  }

                  return (
                    <div className={`max-h-64 overflow-y-auto rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {unassigned.map((vehicle) => {
                        const vin = getVehicleVin(vehicle);
                        const checked = assignVins.includes(vin);
                        return (
                          <label
                            key={vin}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b last:border-b-0 ${darkMode
                              ? 'border-gray-800 hover:bg-gray-800/60'
                              : 'border-gray-100 hover:bg-gray-50'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVinSelection(vin)}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm`}>
                              {getVehicleLabel(vehicle)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className={`px-4 py-2 rounded-xl border-2 transition-all ${darkMode
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={handleAssignVehicles}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60"
                >
                  {isAssigning ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Dealer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setShowAddModal(false)}></div>

          <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
            {/* Modal Header */}
            <div className={`px-8 py-6 flex items-center justify-between border-b ${darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                  <Building2 className="text-white" size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add New Dealer</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Register a new partner to the network</p>
                </div>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddDealer} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {successMessage ? (
                <div className={`flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in fade-in zoom-in`}>
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20">
                    <ShieldCheck className="text-green-500" size={40} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Registration Successful!</h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{successMessage}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Account Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Username */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Username*</label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="e.g. dealer123"
                            value={newDealer.username}
                            onChange={(e) => setNewDealer({ ...newDealer, username: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.username ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.username && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.username}</p>}
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password*</label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="password"
                            placeholder="Min 6 characters"
                            value={newDealer.password}
                            onChange={(e) => setNewDealer({ ...newDealer, password: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.password ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.password && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.password}</p>}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email*</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="email"
                            placeholder="dealer@example.com"
                            value={newDealer.email}
                            onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.email ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.email && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.email}</p>}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone*</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="tel"
                            placeholder="9876543210"
                            value={newDealer.phone}
                            onChange={(e) => setNewDealer({ ...newDealer, phone: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.phone ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.phone && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.phone}</p>}
                      </div>

                      {/* First Name */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>First Name*</label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="First Name"
                            value={newDealer.firstName}
                            onChange={(e) => setNewDealer({ ...newDealer, firstName: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.firstName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.firstName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.firstName}</p>}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Last Name*</label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={newDealer.lastName}
                            onChange={(e) => setNewDealer({ ...newDealer, lastName: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.lastName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.lastName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.lastName}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Dealer Information Section */}
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Dealer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reference No */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reference No.*</label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="e.g. REF2024001"
                            value={newDealer.referenceNo}
                            onChange={(e) => setNewDealer({ ...newDealer, referenceNo: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.referenceNo ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.referenceNo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.referenceNo}</p>}
                      </div>

                      {/* Dealer Code */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealer Code*</label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Unique Code (e.g. D005)"
                            value={newDealer.dealerCode}
                            onChange={(e) => setNewDealer({ ...newDealer, dealerCode: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.dealerCode ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.dealerCode && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.dealerCode}</p>}
                      </div>

                      {/* Dealership Name */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealership Name*</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="e.g. Kinetic Mumbai Central"
                            value={newDealer.dealershipName}
                            onChange={(e) => setNewDealer({ ...newDealer, dealershipName: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.dealershipName ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.dealershipName && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.dealershipName}</p>}
                      </div>

                      {/* For Party Creation */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>For Party Creation*</label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Party creation information"
                            value={newDealer.forPartyCreation}
                            onChange={(e) => setNewDealer({ ...newDealer, forPartyCreation: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.forPartyCreation ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.forPartyCreation && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.forPartyCreation}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Address Details</h3>
                    <div className="space-y-4">
                      {/* Dealer's Address */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dealer's Address*</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                          <textarea
                            placeholder="Plot No, Street, Landmark..."
                            rows={2}
                            value={newDealer.address}
                            onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none resize-none ${formErrors.address ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          ></textarea>
                        </div>
                        {formErrors.address && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.address}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* State */}
                        <div className="space-y-1.5">
                          <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>State*</label>
                          <input
                            type="text"
                            placeholder="State"
                            value={newDealer.state}
                            onChange={(e) => setNewDealer({ ...newDealer, state: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.state ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                          {formErrors.state && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.state}</p>}
                        </div>

                        {/* Zone */}
                        <div className="space-y-1.5">
                          <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Zone*</label>
                          <select
                            value={newDealer.zone}
                            onChange={(e) => setNewDealer({ ...newDealer, zone: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.zone ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          >
                            <option value="">Select Zone</option>
                            <option value="North">North</option>
                            <option value="South">South</option>
                            <option value="East">East</option>
                            <option value="West">West</option>
                            <option value="Central">Central</option>
                          </select>
                          {formErrors.zone && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.zone}</p>}
                        </div>

                        {/* Location */}
                        <div className="space-y-1.5">
                          <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location*</label>
                          <input
                            type="text"
                            placeholder="City"
                            value={newDealer.location}
                            onChange={(e) => setNewDealer({ ...newDealer, location: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.location ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                          {formErrors.location && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.location}</p>}
                        </div>

                        {/* Pin Code */}
                        <div className="space-y-1.5">
                          <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pin Code*</label>
                          <input
                            type="text"
                            placeholder="6 Digits"
                            maxLength={6}
                            value={newDealer.pincode}
                            onChange={(e) => setNewDealer({ ...newDealer, pincode: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.pincode ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                          {formErrors.pincode && <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.pincode}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legal & Business Details */}
                  <div className="space-y-4">
                    <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Legal & Business Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* GST No */}
                      <div className="space-y-1.5 md:col-span-3">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>GST No.*</label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="e.g. 27AAPFU0939F1ZV"
                            maxLength={15}
                            value={newDealer.gstNo}
                            onChange={(e) => setNewDealer({ ...newDealer, gstNo: e.target.value.toUpperCase() })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.gstNo ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.gstNo && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.gstNo}</p>}
                      </div>

                      {/* LOI Date */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>LOI Date*</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="date"
                            value={newDealer.loiDate}
                            onChange={(e) => setNewDealer({ ...newDealer, loiDate: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.loiDate ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.loiDate && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.loiDate}</p>}
                      </div>

                      {/* LOI Valid Upto */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>LOI Valid Upto*</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="date"
                            value={newDealer.loiValidUpto}
                            onChange={(e) => setNewDealer({ ...newDealer, loiValidUpto: e.target.value })}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.loiValidUpto ? 'border-red-500' : darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                          />
                        </div>
                        {formErrors.loiValidUpto && <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {formErrors.loiValidUpto}</p>}
                      </div>

                      {/* Lead Status */}
                      <div className="space-y-1.5">
                        <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lead Status*</label>
                        <select
                          value={newDealer.leadStatus}
                          onChange={(e) => setNewDealer({ ...newDealer, leadStatus: e.target.value as 'Digital' | 'Newspaper' | 'Scouting' })}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${darkMode ? 'bg-gray-800 border-gray-700 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-blue-500 text-gray-900'}`}
                        >
                          <option value="Digital">Digital</option>
                          <option value="Newspaper">Newspaper</option>
                          <option value="Scouting">Scouting</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </form>

            {/* Modal Footer */}
            {!successMessage && (
              <div className={`p-8 border-t flex flex-col sm:flex-row gap-4 items-center justify-between ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
                {formErrors.submit ? (
                  <div className="flex items-center gap-2 text-sm text-red-500 flex-1">
                    <AlertCircle size={16} />
                    {formErrors.submit}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ShieldCheck size={14} className="text-green-500" />
                    Secure Registration Platform
                  </div>
                )}
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Registering...
                      </>
                    ) : 'Register Dealer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ ADD CUSTOMER MODAL ══════════════ */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSubmittingCustomer && setShowCustomerModal(false)}
          />
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'
              }`}
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-5 flex items-center justify-between border-b flex-shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'
                }`}
            >
              <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Users size={22} className="text-emerald-500" />
                  Add Customer
                </h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Dealer: <span className="font-semibold">{selectedApiDealer?.dealership_name}</span> — record a vehicle sale
                </p>
              </div>
              <button
                disabled={isSubmittingCustomer}
                onClick={() => setShowCustomerModal(false)}
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCustomer} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6">
                {/* Success / Error banners */}
                {customerSuccess && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CheckCircle size={20} />
                    <span className="font-semibold">{customerSuccess}</span>
                  </div>
                )}
                {customerError && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                    <AlertCircle size={20} />
                    <span>{customerError}</span>
                  </div>
                )}

                {/* VIN Dropdown — only unsold vehicles */}
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Vehicle VIN <span className="text-red-500">*</span>
                  </label>
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Only vehicles currently in this dealer's inventory (not yet sold) are shown.
                  </p>
                  {dashboardData?.inventory && dashboardData.inventory.length > 0 ? (
                    <select
                      value={customerForm.vin}
                      onChange={e => setCustomerForm(f => ({ ...f, vin: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none font-mono ${customerFormErrors.vin ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500' : 'border-gray-200 focus:border-emerald-500'
                        } ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    >
                      <option value="">— Select a VIN —</option>
                      {dashboardData.inventory.map(item => (
                        <option key={item.vin} value={item.vin}>
                          {item.vin}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={`px-4 py-3 rounded-xl border-2 text-sm ${darkMode ? 'border-gray-700 text-gray-400 bg-gray-800' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                      No available inventory for this dealer. Assign vehicles first.
                    </div>
                  )}
                  {customerFormErrors.vin && (
                    <p className="text-red-500 text-xs mt-1">{customerFormErrors.vin}</p>
                  )}
                </div>

                {/* Customer Details */}
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Customer Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div className="md:col-span-2">
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={customerForm.customer_name}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_name: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_name ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_name && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_name}</p>}
                    </div>
                    {/* Email */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email *</label>
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={customerForm.customer_email}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_email: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_email ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_email && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_email}</p>}
                    </div>
                    {/* Phone */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Phone *</label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={customerForm.customer_phone}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_phone: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_phone ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_phone && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_phone}</p>}
                    </div>
                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Address *</label>
                      <input
                        type="text"
                        placeholder="Street address"
                        value={customerForm.customer_address}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_address: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_address ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_address && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_address}</p>}
                    </div>
                    {/* City */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>City *</label>
                      <input
                        type="text"
                        placeholder="e.g. Pune"
                        value={customerForm.customer_city}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_city: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_city ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_city && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_city}</p>}
                    </div>
                    {/* State */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>State *</label>
                      <input
                        type="text"
                        placeholder="e.g. Maharashtra"
                        value={customerForm.customer_state}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_state: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_state ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_state && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_state}</p>}
                    </div>
                    {/* Pincode */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pincode *</label>
                      <input
                        type="text"
                        placeholder="e.g. 411001"
                        maxLength={6}
                        value={customerForm.customer_pincode}
                        onChange={e => setCustomerForm(f => ({ ...f, customer_pincode: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_pincode ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.customer_pincode && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_pincode}</p>}
                    </div>
                  </div>
                </div>

                {/* Sale Details */}
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Sale Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sale Date */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Date *</label>
                      <input
                        type="date"
                        value={customerForm.sale_date}
                        onChange={e => setCustomerForm(f => ({ ...f, sale_date: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_date ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.sale_date && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_date}</p>}
                    </div>
                    {/* Sale Price */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Price (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 95000"
                        min="1"
                        value={customerForm.sale_price}
                        onChange={e => setCustomerForm(f => ({ ...f, sale_price: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_price ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'
                          }`}
                      />
                      {customerFormErrors.sale_price && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_price}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-4 border-t flex gap-3 justify-end flex-shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
                <button
                  type="button"
                  disabled={isSubmittingCustomer}
                  onClick={() => setShowCustomerModal(false)}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer || !dashboardData?.inventory?.length}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingCustomer ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Add Customer &amp; Mark as Sold
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerManagement;
