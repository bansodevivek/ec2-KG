import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Truck, Cpu, Battery, FileText, Hash, User, Phone, CreditCard, MapPin, Scan, QrCode, Palette, AlertCircle, CheckCircle, Loader, Search, Plus, Info, ClipboardList, Trash2 } from 'lucide-react';
import { Vehicle } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { registerVehicleEOL, deleteVehicle } from '../api/vehicle';
import { getAvailableModels, getVariantsForModel, getTemplateId, isValidCombination } from '../utils/vehicleTemplates';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { FLEET_VEHICLES } from '../constants';

interface AddVehicleProps {
  onAdd: (vehicle: Partial<Vehicle> & { 
    model: string; 
    variant: string; 
    vin: string; 
    vcu_id: string; 
    battery_serial_number: string; 
    cluster_id: string; 
    motor_serial_number: string; 
    controller_serial_number: string; 
    charger_serial_number: string; 
    colour: string 
  }) => void;
  darkMode: boolean;
  userRole?: string;
}

const AddVehicle: React.FC<AddVehicleProps> = ({ onAdd, darkMode, userRole }) => {
  const isDealer = userRole === 'DEALER';
  const isDetailsRole = userRole === 'USER' || userRole === 'RIDER';

  // Generate mock data for dealers
  const generateMockVIN = () => `KINETIC-ARIS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const [formData, setFormData] = useState({
    model: '',
    variant: '',
    vin: isDealer ? generateMockVIN() : '',
    vcu_id: '',
    battery_serial_number: '',
    cluster_id: '',
    motor_serial_number: '',
    controller_serial_number: '',
    charger_serial_number: '',
    colour: '',
    licensePlate: '',
    type: 'Scooter',
    status: 'idle' as const,
    // Dealer-specific fields
    customerName: '',
    customerPhone: '',
    customerAadhaar: '',
    customerAddress: ''
  });

  const [availableVariants, setAvailableVariants] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanField, setActiveScanField] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Vehicle Inventory state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Vehicle Info/Specs state
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showInfoSpecs, setShowInfoSpecs] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'specs'>('info');
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [vehicleSpecs, setVehicleSpecs] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTimeoutError = (err: any) => {
    const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
    return err?.code === 'ECONNABORTED' || message.includes('timeout');
  };

  const buildMockInventory = () => (FLEET_VEHICLES as Vehicle[]).map(vehicle => ({
    id: vehicle.id,
    vin: vehicle.licensePlate || vehicle.id,
    model_name: vehicle.name,
    model: vehicle.type,
    variant: '',
    battery_type: '',
    status: vehicle.status,
    licensePlate: vehicle.licensePlate
  }));

  const startScanning = (field: string) => {
    setActiveScanField(field);
    setIsScanning(true);
  };

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const response = await apiClient.get(`${API_BASE_URL}/rbac/vehicles/`);
      console.log('API Response:', response);

      let vehicleData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          vehicleData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          vehicleData = response.data.results;
        } else if (response.data.vehicles && Array.isArray(response.data.vehicles)) {
          vehicleData = response.data.vehicles;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          vehicleData = response.data.data;
        }
      }
      setVehicles(vehicleData);
    } catch (err: any) {
      console.error('Failed to fetch vehicles:', err);
      if (isTimeoutError(err)) {
        setVehicles(buildMockInventory());
        setVehiclesError('API timeout. Showing mock vehicle inventory.');
      } else {
        setVehiclesError('Failed to load vehicle inventory');
        setVehicles([]);
      }
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = Array.isArray(vehicles) ? vehicles.filter(vehicle => {
    const searchLower = searchQuery.toLowerCase();
    return (
      vehicle.vin?.toLowerCase().includes(searchLower) ||
      vehicle.model_name?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.variant?.toLowerCase().includes(searchLower) ||
      vehicle.battery_type?.toLowerCase().includes(searchLower)
    );
  }) : [];

  const fetchVehicleDetails = async (vin: string) => {
    setIsLoadingDetails(true);

    // Fetch info
    try {
      const infoUrl = `${API_BASE_URL}/vehicle-static/info/${vin}/`;
      const infoResponse = await apiClient.get(infoUrl);
      let vehicleData = infoResponse.data;
      if (vehicleData && vehicleData.data) {
        vehicleData = vehicleData.data;
      }
      setVehicleInfo(vehicleData || null);
    } catch (err: any) {
      console.error('Failed to fetch vehicle info:', err);
      if (err.response?.status === 404) {
        setVehicleInfo({ _error: 'Information not available for this vehicle' });
      } else {
        setVehicleInfo({ _error: 'Failed to load vehicle information' });
      }
    }

    // Fetch specs
    try {
      const specsUrl = `${API_BASE_URL}/vehicle-static/specs/${vin}/`;
      const specsResponse = await apiClient.get(specsUrl);
      let specsData = specsResponse.data;
      if (specsData && specsData.data) {
        specsData = specsData.data;
      }
      setVehicleSpecs(specsData || null);
    } catch (err: any) {
      console.error('Failed to fetch vehicle specs:', err);
      if (err.response?.status === 404) {
        setVehicleSpecs({ _error: 'Specifications not available for this vehicle.' });
      } else {
        setVehicleSpecs({ _error: 'Failed to load vehicle specifications' });
      }
    }

    setIsLoadingDetails(false);
  };

  const handleViewDetails = (vehicle: any, tab: 'info' | 'specs') => {
    setSelectedVehicle(vehicle);
    setActiveTab(tab);
    setShowInfoSpecs(true);
    fetchVehicleDetails(vehicle.vin);
  };

  const handleCloseDetails = () => {
    setShowInfoSpecs(false);
    setSelectedVehicle(null);
    setVehicleInfo(null);
    setVehicleSpecs(null);
  };

  // Delete vehicle handlers
  const handleDeleteClick = (vehicle: any) => {
    setVehicleToDelete(vehicle);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVehicleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      console.log(`🗑️ Attempting to delete vehicle: ${vehicleToDelete.vin}`);
      
      const result = await deleteVehicle(vehicleToDelete.vin);

      if (result.success) {
        console.log('✅ Vehicle deleted successfully');
        
        // Close the confirmation modal
        setShowDeleteConfirm(false);
        setVehicleToDelete(null);
        
        // Show success message
        setSuccess(true);
        
        // Refresh vehicle list
        await fetchVehicles();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to delete vehicle');
      }
    } catch (err: any) {
      console.error('❌ Delete failed:', err);
      setError(err.message || 'Failed to delete vehicle. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isScanning && activeScanField) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log(`Scan successful for ${activeScanField}:`, decodedText);
          setFormData(prev => ({ ...prev, [activeScanField]: decodedText }));
          stopScanning();
        },
        (errorMessage) => { /* ignore */ }
      ).catch(err => {
        console.error("Unable to start scanning", err);
      });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning, activeScanField]);

  const stopScanning = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          setIsScanning(false);
          setActiveScanField(null);
        }).catch(err => {
          console.error("Failed to stop scanner", err);
          setIsScanning(false);
          setActiveScanField(null);
        });
      } else {
        setIsScanning(false);
        setActiveScanField(null);
      }
    } else {
      setIsScanning(false);
      setActiveScanField(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // If model is changed, update available variants and reset variant selection
    if (name === 'model') {
      const variants = getVariantsForModel(value);
      setAvailableVariants(variants);
      setFormData(prev => ({
        ...prev,
        model: value,
        variant: '' // Reset variant when model changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Check if user has permission (super admin or OEM)
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'OEM') {
        throw new Error('Unauthorized: Only Super Admin and OEM users can register vehicles');
      }

      // Validate model and variant are selected
      if (!formData.model || !formData.variant) {
        throw new Error('Please select both vehicle model and variant');
      }

      // Frontend validation - ensure all required fields are non-empty
      const requiredFields = [
        { name: 'vin', label: 'VIN Number', value: formData.vin },
        { name: 'vcu_id', label: 'VCU ID', value: formData.vcu_id },
        { name: 'battery_serial_number', label: 'Battery Serial Number', value: formData.battery_serial_number },
        { name: 'cluster_id', label: 'Cluster ID', value: formData.cluster_id },
        { name: 'motor_serial_number', label: 'Motor Serial Number', value: formData.motor_serial_number },
        { name: 'controller_serial_number', label: 'Controller Serial Number', value: formData.controller_serial_number },
        { name: 'charger_serial_number', label: 'Charger Serial Number', value: formData.charger_serial_number },
        { name: 'colour', label: 'Colour', value: formData.colour },
      ];

      const missingFields = requiredFields.filter(field => !field.value || field.value.trim() === '');
      
      if (missingFields.length > 0) {
        const fieldNames = missingFields.map(f => f.label).join(', ');
        throw new Error(`Please fill in all required fields: ${fieldNames}`);
      }

      // Get specs_template_id from model-variant combination
      let specsTemplateId: number;
      try {
        specsTemplateId = getTemplateId(formData.model, formData.variant);
        console.log(`✅ Mapped ${formData.model} ${formData.variant} → specs_template_id: ${specsTemplateId}`);
      } catch (err: any) {
        throw new Error(`Invalid vehicle configuration: ${err.message}`);
      }

      // Prepare registration payload with specs_template_id
      const registrationPayload = {
        specs_template_id: specsTemplateId, // This is the ID from core_vehiclespecstemplate
        vin: formData.vin.trim(),
        vcu_id: formData.vcu_id.trim(),
        battery_serial_number: formData.battery_serial_number.trim(),
        cluster_id: formData.cluster_id.trim(),
        motor_serial_number: formData.motor_serial_number.trim(),
        controller_serial_number: formData.controller_serial_number.trim(),
        charger_serial_number: formData.charger_serial_number.trim(),
        colour: formData.colour.trim(),
      };

      console.log('🚀 Sending vehicle registration to API...');
      console.log('👤 User Role:', userRole);
      console.log('📋 Form Model:', formData.model, '| Form Variant:', formData.variant);
      console.log('✅ Converted to specs_template_id:', specsTemplateId);
      console.log('\n📦 PAYLOAD INSPECTION:');
      Object.entries(registrationPayload).forEach(([key, value]) => {
        const isEmpty = value === '' || value === null || value === undefined;
        console.log(`  ${key}: ${JSON.stringify(value)} ${isEmpty ? '⚠️ EMPTY!' : ''}`);
      });
      console.log('\n📤 Complete JSON to Backend:');
      console.log(JSON.stringify(registrationPayload, null, 2));
      console.log('🔗 Endpoint: /api/vehicles/register-eol/\n');

      // Call the API
      const response = await registerVehicleEOL(registrationPayload);
      console.log('✅ API Response:', response);

      if (!response || response.error) {
        if ((response as any)?.details) {
          console.error('❌ Backend Validation Errors:', (response as any).details);
        }
        throw new Error(response?.error || 'Vehicle registration failed');
      }

      setSuccess(true);
      console.log('🎉 Vehicle registered successfully!');

      // Call the original onAdd callback
      onAdd(formData);

      // Refresh vehicle inventory
      fetchVehicles();

      // Hide form and reset after 2 seconds
      setTimeout(() => {
        setShowForm(false);
        setFormData({
          model: '',
          variant: '',
          vin: isDealer ? generateMockVIN() : '',
          vcu_id: '',
          battery_serial_number: '',
          cluster_id: '',
          motor_serial_number: '',
          controller_serial_number: '',
          charger_serial_number: '',
          colour: '',
          licensePlate: '',
          type: 'Scooter',
          status: 'idle' as const,
          customerName: '',
          customerPhone: '',
          customerAadhaar: '',
          customerAddress: ''
        });
        setAvailableVariants([]);
        setSuccess(false);
      }, 2000);

    } catch (err: any) {
      console.error('❌ Vehicle registration error:', err);

      let errorMessage = 'Failed to register vehicle. Please try again.';

      if (err.details) {
        console.error('📛 Backend validation errors:', err.details);
        if (typeof err.details === 'string') {
          errorMessage = err.details;
        } else if (err.details.message) {
          errorMessage = err.details.message;
        } else if (err.details.detail) {
          errorMessage = err.details.detail;
        } else if (Array.isArray(err.details)) {
          errorMessage = err.details.join(', ');
        } else {
          const errors = Object.entries(err.details)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
            .join('\n');
          errorMessage = errors || JSON.stringify(err.details, null, 2);
        }
      } else if (err.response?.data) {
        const errorData = err.response.data;
        console.error('📛 Backend error details:', errorData);
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          const errors = Object.entries(errorData)
            .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
            .join('\n');
          errorMessage = errors || JSON.stringify(errorData, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Add New Vehicle Button */}
      {!showForm && (userRole === 'SUPER_ADMIN' || userRole === 'OEM') && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all hover:scale-105 active:scale-95 ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            <Plus size={20} />
            Add New Vehicle
          </button>
        </div>
      )}

      {/* Success Message (for deletions) */}
      {success && !showForm && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
        }`}>
          <CheckCircle size={20} className="text-green-500" />
          <div className="flex-1">
            <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
              Success!
            </h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
              Vehicle deleted successfully
            </p>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className={`${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-500 hover:text-green-700'}`}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Error Message (for deletions) */}
      {error && !showForm && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
          darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
              Deletion Failed
            </h4>
            <p className={`text-sm mt-1 whitespace-pre-wrap ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Vehicle Registration Form */}
      {showForm && (
        <div className={`mb-6 rounded-2xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header */}
          <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Add New Vehicle
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter vehicle details for EOL registration
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                  setSuccess(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Close form"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Permission Notice */}
          {userRole !== 'SUPER_ADMIN' && userRole !== 'OEM' && (
            <div className={`m-6 p-4 rounded-xl flex items-start gap-3 ${
              darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className={`font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Access Restricted
                </h4>
                <p className={`text-sm mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                  Only Super Admin and OEM users can register vehicles. Current role: {userRole || 'Unknown'}
                </p>
              </div>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <Truck size={16} />
                Vehicle Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Model Selection */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Vehicle Model *
                  </label>
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    className={`w-full p-3 rounded-xl border ${
                      darkMode
                        ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white'
                        : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                  >
                    <option value="">Select Model</option>
                    {getAvailableModels().map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Variant Selection */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Variant *
                  </label>
                  <select
                    name="variant"
                    value={formData.variant}
                    onChange={handleChange}
                    required
                    disabled={!formData.model}
                    className={`w-full p-3 rounded-xl border ${
                      darkMode
                        ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white disabled:opacity-50'
                        : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900 disabled:opacity-50'
                    } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                  >
                    <option value="">{formData.model ? 'Select Variant' : 'Select Model First'}</option>
                    {availableVariants.map(variant => (
                      <option key={variant} value={variant}>{variant}</option>
                    ))}
                  </select>
                </div>

                {/* VIN Number */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    VIN Number {isDealer && <span className="text-xs text-gray-500">(Pre-assigned)</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="vin"
                      value={formData.vin}
                      onChange={handleChange}
                      required
                      readOnly={isDealer}
                      placeholder="e.g. KINETICARIS2026005"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${isDealer ? 'opacity-75' : ''}`}
                    />
                    {!isDealer && (
                      <button
                        type="button"
                        onClick={() => startScanning('vin')}
                        className={`p-3 rounded-xl border ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                            : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                        } transition-all`}
                        title="Scan VIN"
                      >
                        <Scan size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* VCU ID */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    VCU ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="vcu_id"
                      value={formData.vcu_id}
                      onChange={handleChange}
                      required
                      placeholder="e.g. VCU-V4-002"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => startScanning('vcu_id')}
                      className={`p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                      } transition-all`}
                      title="Scan VCU ID"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                {/* Cluster ID */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Cluster ID
                  </label>
                  <input
                    type="text"
                    name="cluster_id"
                    value={formData.cluster_id}
                    onChange={handleChange}
                    required
                    placeholder="e.g. CL-V4-002"
                    className={`w-full p-3 rounded-xl border ${
                      darkMode
                        ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                  />
                </div>

                {/* Colour */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Colour
                  </label>
                  <input
                    type="text"
                    name="colour"
                    value={formData.colour}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Red"
                    className={`w-full p-3 rounded-xl border ${
                      darkMode
                        ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Hardware Serial Numbers */}
            <div className={`h-px w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <Cpu size={16} />
                Hardware Components
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Battery Serial Number */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Battery Serial Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="battery_serial_number"
                      value={formData.battery_serial_number}
                      onChange={handleChange}
                      required
                      placeholder="e.g. BATT-SN-1122"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => startScanning('battery_serial_number')}
                      className={`p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                      } transition-all`}
                      title="Scan Battery S/N"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                {/* Motor Serial Number */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Motor Serial Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="motor_serial_number"
                      value={formData.motor_serial_number}
                      onChange={handleChange}
                      required
                      placeholder="e.g. MOT-77"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => startScanning('motor_serial_number')}
                      className={`p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                      } transition-all`}
                      title="Scan Motor S/N"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                {/* Controller Serial Number */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Controller Serial Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="controller_serial_number"
                      value={formData.controller_serial_number}
                      onChange={handleChange}
                      required
                      placeholder="e.g. CONT-88"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => startScanning('controller_serial_number')}
                      className={`p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                      } transition-all`}
                      title="Scan Controller S/N"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                {/* Charger Serial Number */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Charger Serial Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="charger_serial_number"
                      value={formData.charger_serial_number}
                      onChange={handleChange}
                      required
                      placeholder="e.g. CHG-10"
                      className={`flex-1 p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => startScanning('charger_serial_number')}
                      className={`p-3 rounded-xl border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-blue-400 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-200 text-blue-600 hover:bg-gray-100'
                      } transition-all`}
                      title="Scan Charger S/N"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-4 rounded-xl flex items-start gap-3 ${
                darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    Registration Failed
                  </h4>
                  <p className={`text-sm mt-1 whitespace-pre-wrap ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className={`${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                  title="Dismiss error"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
              }`}>
                <CheckCircle size={20} className="text-green-500" />
                <div className="flex-1">
                  <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    Success!
                  </h4>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                    Vehicle registered successfully
                  </p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    model: '',
                    variant: '',
                    vin: isDealer ? generateMockVIN() : '',
                    vcu_id: '',
                    battery_serial_number: '',
                    cluster_id: '',
                    motor_serial_number: '',
                    controller_serial_number: '',
                    charger_serial_number: '',
                    colour: '',
                    licensePlate: '',
                    type: 'Scooter',
                    status: 'idle' as const,
                    customerName: '',
                    customerPhone: '',
                    customerAadhaar: '',
                    customerAddress: ''
                  });
                  setAvailableVariants([]);
                  setError(null);
                  setSuccess(false);
                }}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (userRole !== 'SUPER_ADMIN' && userRole !== 'OEM')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium shadow-lg transition-all ${
                  isSubmitting || (userRole !== 'SUPER_ADMIN' && userRole !== 'OEM')
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-500/20'
                } text-white`}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Register Vehicle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <QrCode size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Scanning {activeScanField?.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-400">Align the barcode/QR code within the frame</p>
                </div>
              </div>
              <button
                onClick={stopScanning}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                title="Close scanner"
              >
                <X size={24} />
              </button>
            </div>
            <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
              <div id="reader" className="w-full h-full"></div>
            </div>
            <div className="p-6 text-center">
              <button
                onClick={stopScanning}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium"
              >
                Cancel Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertCircle size={24} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Delete Vehicle
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Are you sure you want to delete this vehicle?
              </p>
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      VIN:
                    </span>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {vehicleToDelete.vin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Model:
                    </span>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {vehicleToDelete.model_name || `${vehicleToDelete.model} ${vehicleToDelete.variant}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex gap-3 justify-end`}>
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                  isDeleting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                } text-white shadow-lg`}
              >
                {isDeleting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Vehicle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Inventory Section */}
      <div className={`p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className={`pb-4 mb-6 flex justify-between items-center border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isDetailsRole ? 'Vehicle Details' : 'Vehicle Inventory'}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-64">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600 focus:border-blue-500 text-white'
                  : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'
              } focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoadingVehicles && (
          <div className="flex justify-center items-center py-12">
            <Loader size={32} className="animate-spin text-blue-500" />
          </div>
        )}

        {/* Error State */}
        {vehiclesError && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${
            darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
          }`}>
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>{vehiclesError}</p>
          </div>
        )}

        {/* Vehicle Table */}
        {!isLoadingVehicles && !vehiclesError && (
          <div className="overflow-x-auto">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <Truck size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchQuery ? 'No vehicles found matching your search' : 'No vehicles registered yet'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 font-semibold text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>VIN</th>
                    <th className={`text-left py-3 px-4 font-semibold text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Model Name</th>
                    <th className={`text-left py-3 px-4 font-semibold text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Model</th>
                    <th className={`text-left py-3 px-4 font-semibold text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Variant</th>
                    <th className={`text-right py-3 px-4 font-semibold text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle, index) => (
                    <tr
                      key={vehicle.id || index}
                      className={`border-b ${
                        darkMode ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <td className={`py-3 px-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {vehicle.vin || 'N/A'}
                      </td>
                      <td className={`py-3 px-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {vehicle.model_name || 'N/A'}
                      </td>
                      <td className={`py-3 px-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {vehicle.model || 'N/A'}
                      </td>
                      <td className={`py-3 px-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {vehicle.variant || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(vehicle, 'info')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              darkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            }`}
                            title="View Info"
                          >
                            <Info size={14} />
                            Info
                          </button>
                          <button
                            onClick={() => handleViewDetails(vehicle, 'specs')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              darkMode
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                            title="View Specs"
                          >
                            <ClipboardList size={14} />
                            Specs
                          </button>
                          {/* Delete Button - Only for SUPER_ADMIN */}
                          {userRole === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleDeleteClick(vehicle)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                darkMode
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-red-100 hover:bg-red-200 text-red-700'
                              }`}
                              title="Delete Vehicle"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Results count */}
        {searchQuery && filteredVehicles.length > 0 && (
          <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
          </div>
        )}
      </div>

      {/* Vehicle Info/Specs Modal */}
      {showInfoSpecs && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Vehicle Details - {selectedVehicle.vin}
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedVehicle.model_name || `${selectedVehicle.model} ${selectedVehicle.variant}`}
                  </p>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'info'
                      ? darkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white'
                      : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Info size={16} />
                  Info
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'specs'
                      ? darkMode
                        ? 'bg-green-600 text-white'
                        : 'bg-green-600 text-white'
                      : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ClipboardList size={16} />
                  Specs
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {isLoadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <Loader size={32} className="animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* Info Tab */}
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      {vehicleInfo?._error ? (
                        <div className="text-center py-12">
                          <AlertCircle size={48} className={`mx-auto mb-4 ${
                            darkMode ? 'text-gray-600' : 'text-gray-300'
                          }`} />
                          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {vehicleInfo._error}
                          </p>
                        </div>
                      ) : vehicleInfo ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(vehicleInfo)
                            .filter(([key]) => !key.startsWith('_'))
                            .map(([key, value]: [string, any]) => {
                              let displayValue = 'N/A';
                              if (value === null || value === undefined) {
                                displayValue = 'N/A';
                              } else if (typeof value === 'boolean') {
                                displayValue = value ? '✓ Yes' : '✗ No';
                              } else if (typeof value === 'number') {
                                displayValue = String(value);
                              } else {
                                displayValue = String(value);
                              }

                              return (
                                <div
                                  key={key}
                                  className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                                >
                                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                                    darkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div className={`text-sm font-medium ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {displayValue}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <AlertCircle size={48} className={`mx-auto mb-4 ${
                            darkMode ? 'text-gray-600' : 'text-gray-300'
                          }`} />
                          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No information available
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Specs Tab */}
                  {activeTab === 'specs' && (
                    <div className="space-y-4">
                      {vehicleSpecs?._error ? (
                        <div className="text-center py-12">
                          <AlertCircle size={48} className={`mx-auto mb-4 ${
                            darkMode ? 'text-gray-600' : 'text-gray-300'
                          }`} />
                          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {vehicleSpecs._error}
                          </p>
                        </div>
                      ) : vehicleSpecs ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(vehicleSpecs)
                            .filter(([key]) => !key.startsWith('_'))
                            .map(([key, value]: [string, any]) => {
                              let displayValue = 'N/A';
                              if (value === null || value === undefined) {
                                displayValue = 'N/A';
                              } else if (typeof value === 'boolean') {
                                displayValue = value ? '✓ Yes' : '✗ No';
                              } else if (typeof value === 'number') {
                                displayValue = String(value);
                              } else {
                                displayValue = String(value);
                              }

                              return (
                                <div
                                  key={key}
                                  className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                                >
                                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                                    darkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div className={`text-sm font-medium ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {displayValue}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <AlertCircle size={48} className={`mx-auto mb-4 ${
                            darkMode ? 'text-gray-600' : 'text-gray-300'
                          }`} />
                          <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No specifications available
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddVehicle;
