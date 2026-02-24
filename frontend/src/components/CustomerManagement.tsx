import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  UserPlus,
  Search,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { UserRole } from '../types';
import { fetchDealers, fetchDealerDashboard, addCustomer, Dealer, DealerDashboardData } from '../api/dealers';

interface CustomerManagementProps {
  darkMode: boolean;
  userRole: UserRole;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ darkMode, userRole }) => {
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

  // Add Customer Form State
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

  // Fetch dealers on mount
  useEffect(() => {
    loadDealers();
  }, []);

  // Auto-load first dealer's dashboard on initial load
  useEffect(() => {
    if (apiDealers.length > 0 && !selectedDealerCode) {
      const firstCode = apiDealers[0].dealer_code;
      setSelectedDealerCode(firstCode);
      loadDealerDashboard(firstCode);
    }
  }, [apiDealers, selectedDealerCode]);

  const loadDealers = async () => {
    setIsLoadingDealers(true);
    setDealerError(null);
    const result = await fetchDealers();
    setIsLoadingDealers(false);
    if (result.success) {
      setApiDealers(result.data ?? []);
    } else {
      setDealerError(result.error || 'Failed to load dealers');
    }
  };

  const loadDealerDashboard = async (code: string) => {
    if (!code) return;
    setIsLoadingDashboard(true);
    setDashboardError(null);
    const result = await fetchDealerDashboard(code);
    setIsLoadingDashboard(false);
    if (result.success && result.data) {
      setDashboardData(result.data);
    } else {
      setDashboardError(result.error || 'Failed to load dealer dashboard');
    }
  };

  const handleDealerChange = (code: string) => {
    setSelectedDealerCode(code);
    resetCustomerForm();
    loadDealerDashboard(code);
  };

  const resetCustomerForm = () => {
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
    setCustomerSuccess('');
    setCustomerError('');
  };

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
    if (!selectedDealerCode) return;

    setIsSubmittingCustomer(true);
    setCustomerError('');
    setCustomerSuccess('');

    const result = await addCustomer({
      dealer_code: selectedDealerCode,
      ...customerForm
    });

    if (result.success) {
      setCustomerSuccess('Customer added and vehicle marked as sold!');
      // Refresh dashboard to update inventory
      const dashResult = await fetchDealerDashboard(selectedDealerCode);
      if (dashResult.success && dashResult.data) setDashboardData(dashResult.data);
      setTimeout(() => {
        resetCustomerForm();
      }, 1800);
    } else {
      setCustomerError(result.error || 'Failed to add customer');
    }
    setIsSubmittingCustomer(false);
  };

  const selectedApiDealer = apiDealers.find(d => d.dealer_code === selectedDealerCode);

  const filteredDealers = apiDealers.filter(dealer =>
    dealer.dealership_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dealer.dealer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dealer.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Customer Management
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Add new customers and mark vehicles as sold
          </p>
        </div>
      </div>

      {/* Dealer Selection */}
      <div className={`rounded-2xl border-2 p-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Users className="text-emerald-500" size={24} />
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Select Dealer
          </h2>
        </div>

        {/* Search Dealers */}
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
          <input
            type="text"
            placeholder="Search dealers by name, code, or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all ${darkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-500' : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'}`}
          />
        </div>

        {isLoadingDealers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : dealerError ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle size={20} />
            <span>{dealerError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
            {filteredDealers.map(dealer => (
              <button
                key={dealer.id}
                onClick={() => handleDealerChange(dealer.dealer_code)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${selectedDealerCode === dealer.dealer_code
                  ? darkMode
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-emerald-500 bg-emerald-50'
                  : darkMode
                    ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
              >
                <div className="font-semibold text-sm">{dealer.dealership_name}</div>
                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Code: {dealer.dealer_code} • {dealer.location || 'Location N/A'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Form */}
      {selectedApiDealer && (
        <div className={`rounded-2xl border-2 p-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="text-blue-500" size={24} />
            <div>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add New Customer
              </h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Dealer: <span className="font-semibold">{selectedApiDealer.dealership_name}</span>
              </p>
            </div>
          </div>

          {isLoadingDashboard ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : dashboardError ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertCircle size={20} />
              <span>{dashboardError}</span>
            </div>
          ) : (
            <form onSubmit={handleAddCustomer} className="space-y-6">
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

              {/* VIN Selection */}
              <div>
                <label className={`text-sm font-semibold mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Package size={16} />
                  Vehicle VIN <span className="text-red-500">*</span>
                </label>
                <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Only vehicles currently in this dealer's inventory (not yet sold) are shown.
                </p>
                {dashboardData?.inventory && dashboardData.inventory.length > 0 ? (
                  <select
                    title="Select Vehicle VIN"
                    value={customerForm.vin}
                    onChange={e => setCustomerForm(f => ({ ...f, vin: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none font-mono ${customerFormErrors.vin ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
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
                    No available inventory for this dealer. Assign vehicles to dealer first.
                  </div>
                )}
                {customerFormErrors.vin && <p className="text-red-500 text-xs mt-1">{customerFormErrors.vin}</p>}
              </div>

              {/* Customer Details */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Users size={16} />
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customerForm.customer_name}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_name: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_name ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_name && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_name}</p>}
                  </div>
                  {/* Email */}
                  <div>
                    <label className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Mail size={14} />
                      Email *
                    </label>
                    <input
                      type="email"
                      placeholder="customer@email.com"
                      value={customerForm.customer_email}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_email: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_email ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_email && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_email}</p>}
                  </div>
                  {/* Phone */}
                  <div>
                    <label className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Phone size={14} />
                      Phone *
                    </label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={customerForm.customer_phone}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_phone: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_phone ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_phone && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_phone}</p>}
                  </div>
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin size={14} />
                      Address *
                    </label>
                    <input
                      type="text"
                      placeholder="Street address"
                      value={customerForm.customer_address}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_address: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_address ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_address && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_address}</p>}
                  </div>
                  {/* City */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>City *</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune"
                      value={customerForm.customer_city}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_city: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_city ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_city && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_city}</p>}
                  </div>
                  {/* State */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>State *</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={customerForm.customer_state}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_state: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_state ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.customer_state && <p className="text-red-500 text-xs mt-1">{customerFormErrors.customer_state}</p>}
                  </div>
                  {/* Pincode */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pincode *</label>
                    <input
                      type="text"
                      placeholder="e.g. 411001"
                      maxLength={6}
                      value={customerForm.customer_pincode}
                      onChange={e => setCustomerForm(f => ({ ...f, customer_pincode: e.target.value.replace(/\D/g, '') }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.customer_pincode ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
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
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Date *</label>
                    <input
                      type="date"
                      title="Sale Date"
                      value={customerForm.sale_date}
                      onChange={e => setCustomerForm(f => ({ ...f, sale_date: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_date ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.sale_date && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_date}</p>}
                  </div>
                  {/* Sale Price */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sale Price (₹) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 95000"
                      min="1"
                      value={customerForm.sale_price}
                      onChange={e => setCustomerForm(f => ({ ...f, sale_price: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 outline-none transition-all text-sm ${customerFormErrors.sale_price ? 'border-red-500' : darkMode ? 'border-gray-700 focus:border-emerald-500 bg-gray-800 text-white' : 'border-gray-200 focus:border-emerald-500 bg-white text-gray-900'}`}
                    />
                    {customerFormErrors.sale_price && <p className="text-red-500 text-xs mt-1">{customerFormErrors.sale_price}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetCustomerForm}
                  disabled={isSubmittingCustomer}
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  Reset
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
                      Add Customer & Mark as Sold
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;