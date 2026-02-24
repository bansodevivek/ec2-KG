// Vehicle Assignment Component for Fleet Managers
// Allows assigning drivers to vehicles and managing driver database

import React, { useState } from 'react';
import {
  Users,
  Truck,
  Plus,
  X,
  Save,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Search,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import { assignVehicle } from '../api/vehicle';

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  email: string;
  experience: string;
  status: 'active' | 'inactive';
  assignedVehicle?: string;
}

interface Assignment {
  id: string;
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  driverName: string;
  assignedDate: string;
  returnDate?: string;
  status: 'active' | 'completed';
}

interface VehicleAssignmentProps {
  darkMode: boolean;
  vehicles: any[];
}

const VehicleAssignment: React.FC<VehicleAssignmentProps> = ({ darkMode, vehicles }) => {
  // State for drivers database
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: 'D001',
      name: 'Rajesh Kumar',
      licenseNumber: 'DL-1420110012345',
      phone: '+91 9876543210',
      email: 'rajesh.kumar@example.com',
      experience: '5 years',
      status: 'active'
    },
    {
      id: 'D002',
      name: 'Amit Sharma',
      licenseNumber: 'DL-1420110067890',
      phone: '+91 9876543211',
      email: 'amit.sharma@example.com',
      experience: '3 years',
      status: 'active'
    }
  ]);

  // State for assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Modal states
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form states
  const [newDriver, setNewDriver] = useState({
    name: '',
    licenseNumber: '',
    phone: '',
    email: '',
    experience: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    vehicleId: '',
    driverId: '',
    assignedDate: new Date().toISOString().split('T')[0]
  });

  const [assignForm, setAssignForm] = useState({
    type: 'dealer',
    dealerCode: '',
    vin: ''
  });
  const [assignFormErrors, setAssignFormErrors] = useState<{ [key: string]: string }>({});
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Validation
  const validateDriverForm = () => {
    const errors: { [key: string]: string } = {};

    if (!newDriver.name.trim()) errors.name = 'Name is required';
    if (!newDriver.licenseNumber.trim()) errors.licenseNumber = 'License number is required';
    if (!newDriver.phone.trim()) errors.phone = 'Phone is required';
    else if (!/^(\+91)?[6-9]\d{9}$/.test(newDriver.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number';
    }
    if (!newDriver.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newDriver.email)) {
      errors.email = 'Invalid email format';
    }
    if (!newDriver.experience.trim()) errors.experience = 'Experience is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAssignmentForm = () => {
    const errors: { [key: string]: string } = {};

    if (!assignmentForm.vehicleId) errors.vehicleId = 'Please select a vehicle';
    if (!assignmentForm.driverId) errors.driverId = 'Please select a rider';
    if (!assignmentForm.assignedDate) errors.assignedDate = 'Date is required';

    // Check if vehicle is already assigned
    const existingAssignment = assignments.find(
      a => a.vehicleId === assignmentForm.vehicleId && a.status === 'active'
    );
    if (existingAssignment) {
      errors.vehicleId = 'Vehicle is already assigned';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add or update driver
  const handleSaveDriver = () => {
    if (!validateDriverForm()) return;

    if (editingDriver) {
      // Update existing driver
      setDrivers(drivers.map(d =>
        d.id === editingDriver.id
          ? { ...d, ...newDriver, status: 'active' }
          : d
      ));
      setSuccessMessage('Driver updated successfully!');
    } else {
      // Add new driver
      const driver: Driver = {
        id: `D${String(drivers.length + 1).padStart(3, '0')}`,
        ...newDriver,
        status: 'active'
      };
      setDrivers([...drivers, driver]);
      setSuccessMessage('Driver added successfully!');
    }

    setTimeout(() => {
      setShowAddDriverModal(false);
      setEditingDriver(null);
      resetDriverForm();
      setSuccessMessage('');
    }, 1500);
  };

  // Delete driver
  const handleDeleteDriver = (driverId: string) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      setDrivers(drivers.filter(d => d.id !== driverId));
    }
  };

  // Complete assignment
  const handleCompleteAssignment = (assignmentId: string) => {
    setAssignments(assignments.map(a =>
      a.id === assignmentId
        ? { ...a, status: 'completed' as const, returnDate: new Date().toISOString().split('T')[0] }
        : a
    ));
  };

  // Reset forms
  const resetDriverForm = () => {
    setNewDriver({
      name: '',
      licenseNumber: '',
      phone: '',
      email: '',
      experience: ''
    });
    setFormErrors({});
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      vehicleId: '',
      driverId: '',
      assignedDate: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
  };

  const resetAssignForm = () => {
    setAssignForm({
      type: 'dealer',
      dealerCode: '',
      vin: ''
    });
    setAssignFormErrors({});
    setAssignError('');
    setAssignSuccess('');
  };

  // Edit driver
  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setNewDriver({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      phone: driver.phone,
      email: driver.email,
      experience: driver.experience
    });
    setShowAddDriverModal(true);
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available vehicles (not currently assigned)
  const availableVehicles = vehicles.filter(v =>
    !assignments.some(a => a.vehicleId === v.id && a.status === 'active')
  );

  // Get available drivers (not currently assigned)
  const availableDrivers = drivers.filter(d =>
    !assignments.some(a => a.driverId === d.id && a.status === 'active')
  );

  const getVehicleVin = (vehicle: any) => {
    return vehicle?.vin || vehicle?.licensePlate || vehicle?.id || '';
  };

  const getVehicleLabel = (vehicle: any) => {
    const vin = getVehicleVin(vehicle);
    const model = vehicle?.model_name || vehicle?.model || vehicle?.name || '';
    return model ? `${vin} - ${model}` : vin;
  };

  const handleAssignVehicle = async () => {
    const errors: { [key: string]: string } = {};
    if (!assignForm.dealerCode.trim()) errors.dealerCode = 'Dealer code is required';
    if (!assignForm.vin) errors.vin = 'Please select a vehicle';

    setAssignFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAssignLoading(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const payload = {
        type: assignForm.type,
        dealer_code: assignForm.dealerCode.trim(),
        vehicles: [{ vin: assignForm.vin }]
      };

      const response = await assignVehicle(payload);

      if (response?.success === false) {
        setAssignError(response.message || 'Failed to assign vehicle');
        return;
      }

      setAssignSuccess(response?.message || 'Vehicle assigned successfully');
      setTimeout(() => {
        setShowAssignModal(false);
        resetAssignForm();
      }, 1200);
    } catch (error: any) {
      console.error('Failed to assign vehicle:', error);
      setAssignError(error?.message || 'Failed to assign vehicle');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <main className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Assign Vehicle to Rider
          </h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage riders and assign vehicles to your fleet
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingDriver(null);
              resetDriverForm();
              setShowAddDriverModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={18} />
            Add Rider
          </button>
          <button
            onClick={() => {
              resetAssignmentForm();
              resetAssignForm();
              const firstVin = availableVehicles.length > 0 ? getVehicleVin(availableVehicles[0]) : '';
              setAssignForm((prev) => ({ ...prev, vin: firstVin }));
              setShowAssignModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Truck size={18} />
            Assign Vehicle
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Riders</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{drivers.length}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Assignments</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
            <Truck className="text-green-500" size={32} />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available Vehicles</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{availableVehicles.length}</p>
            </div>
            <Truck className="text-orange-500" size={32} />
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available Riders</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{availableDrivers.length}</p>
            </div>
            <Users className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Rider Database */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Rider Database
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 outline-none`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Driver ID</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Name</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>License</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Experience</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className={`p-4 font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{driver.id}</td>
                  <td className={`p-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{driver.name}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{driver.licenseNumber}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{driver.phone}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{driver.email}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{driver.experience}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${driver.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                      {driver.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditDriver(driver)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* Add/Edit Driver Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingDriver ? 'Edit Rider' : 'Add New Rider'}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {editingDriver ? 'Update rider information' : 'Add a new rider to your database'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddDriverModal(false);
                  setEditingDriver(null);
                  resetDriverForm();
                }}
                className={`p-2 rounded-xl ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveDriver(); }} className="p-6 space-y-4">
              {successMessage ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20">
                    <CheckCircle className="text-green-500" size={40} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Success!</h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{successMessage}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Rider Name */}
                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rider Name*
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Kumar"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.name
                            ? 'border-red-500'
                            : darkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* License Number */}
                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      License Number*
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="e.g. DL-1420110012345"
                        value={newDriver.licenseNumber}
                        onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.licenseNumber
                            ? 'border-red-500'
                            : darkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                      />
                    </div>
                    {formErrors.licenseNumber && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {formErrors.licenseNumber}
                      </p>
                    )}
                  </div>

                  {/* Phone and Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Phone Number*
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="tel"
                          placeholder="+91 9876543210"
                          value={newDriver.phone}
                          onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.phone
                              ? 'border-red-500'
                              : darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email Address*
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="email"
                          placeholder="driver@example.com"
                          value={newDriver.email}
                          onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                          className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.email
                              ? 'border-red-500'
                              : darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                        />
                      </div>
                      {formErrors.email && (
                        <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Driving Experience*
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5 years"
                      value={newDriver.experience}
                      onChange={(e) => setNewDriver({ ...newDriver, experience: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${formErrors.experience
                          ? 'border-red-500'
                          : darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                    />
                    {formErrors.experience && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {formErrors.experience}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDriverModal(false);
                        setEditingDriver(null);
                        resetDriverForm();
                      }}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {editingDriver ? 'Update Rider' : 'Save Rider'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Assign Vehicle Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Assign Vehicle
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Assign a vehicle to a dealer
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  resetAssignForm();
                }}
                className={`p-2 rounded-xl ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignVehicle();
              }}
              className="p-6 space-y-4"
            >
              {assignSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20">
                    <CheckCircle className="text-green-500" size={32} />
                  </div>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{assignSuccess}</p>
                </div>
              ) : (
                <>
                  {assignError && (
                    <div className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{assignError}</div>
                  )}

                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Type
                    </label>
                    <select
                      value={assignForm.type}
                      onChange={(e) => setAssignForm({ ...assignForm, type: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                    >
                      <option value="dealer">Dealer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Dealer Code*
                    </label>
                    <input
                      type="text"
                      value={assignForm.dealerCode}
                      onChange={(e) => setAssignForm({ ...assignForm, dealerCode: e.target.value.toUpperCase() })}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${assignFormErrors.dealerCode
                        ? 'border-red-500'
                        : darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      placeholder="DC-PUNE-01"
                    />
                    {assignFormErrors.dealerCode && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {assignFormErrors.dealerCode}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Vehicle VIN*
                    </label>
                    <select
                      value={assignForm.vin}
                      onChange={(e) => setAssignForm({ ...assignForm, vin: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${assignFormErrors.vin
                        ? 'border-red-500'
                        : darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                    >
                      <option value="">Select a vehicle</option>
                      {availableVehicles.map((vehicle) => {
                        const vin = getVehicleVin(vehicle);
                        return (
                          <option key={vin} value={vin}>
                            {getVehicleLabel(vehicle)}
                          </option>
                        );
                      })}
                    </select>
                    {assignFormErrors.vin && (
                      <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {assignFormErrors.vin}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignModal(false);
                        resetAssignForm();
                      }}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${darkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={assignLoading}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {assignLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Assign
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Active Assignments */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Active Assignments
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Assignment ID</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vehicle</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Driver</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Assigned Date</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                <th className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.filter(a => a.status === 'active').map((assignment) => (
                <tr
                  key={assignment.id}
                  className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <td className={`p-4 font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{assignment.id}</td>
                  <td className={`p-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{assignment.vehicleName}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{assignment.driverName}</td>
                  <td className={`p-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{assignment.assignedDate}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleCompleteAssignment(assignment.id)}
                      className="px-3 py-1 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 text-sm"
                    >
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.filter(a => a.status === 'active').length === 0 && (
                <tr>
                  <td colSpan={6} className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No active assignments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default VehicleAssignment;
