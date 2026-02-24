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
  Truck,
  Plus,
  X,
  Building2,
  ShieldCheck,
  AlertCircle,
  Search,
  Loader2,
  User,
  RefreshCw,
  Edit2,
  Trash2,
  UserPlus
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  createFleet, 
  getAllFleets, 
  updateFleet, 
  deleteFleet, 
  CreateFleetPayload, 
  UpdateFleetPayload, 
  Fleet, 
  getFleetById,
  getFleetMembers,
  addMemberToFleet,
  removeFleetMember
} from '../api/fleets';
import { createUser } from '../api/user';
import { assignVehicleToUser } from '../api/vehicle';
import { apiClient } from '../api/client';

interface FleetManagementProps {
  darkMode: boolean;
  userRole: UserRole;
}

interface FleetOperator {
  fleet_id: string;
  fleet_code: string;
  company_name: string;
  fleet_manager_name: string;
  email_id: string;
  mobile_no: string;
  state: string;
  location: string;
  total_vehicles: number;
  active_vehicles: number;
  operator_status: string;
}

const FleetManagement: React.FC<FleetManagementProps> = ({ darkMode, userRole }) => {
  const [fleetOperators, setFleetOperators] = useState<FleetOperator[]>([]);
  const [selectedFleetCode, setSelectedFleetCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFleet, setEditingFleet] = useState<FleetOperator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Member Management State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [fleetMembers, setFleetMembers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newMemberData, setNewMemberData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'RIDER'
  });

  // Vehicle Assignment State
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [assignVins, setAssignVins] = useState<string[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [isAssigningVehicle, setIsAssigningVehicle] = useState(false);
  const [assignVehicleError, setAssignVehicleError] = useState('');
  const [assignVehicleSuccess, setAssignVehicleSuccess] = useState(false);

  // Fetch fleets from GET /api/fleets/
  const fetchFleets = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      
      const fleets = await getAllFleets();
      
      if (fleets.length === 0) {
        setFetchError('No fleets found. Create a new fleet to get started.');
      }
      
      // Map Fleet[] to FleetOperator[]
      const mappedFleets: FleetOperator[] = fleets.map((fleet: Fleet) => {
        return {
          fleet_id: fleet.id.toString(),
          fleet_code: `FLEET-${fleet.id}`,
          company_name: fleet.name,
          fleet_manager_name: fleet.manager_username,
          email_id: fleet.manager_email,
          mobile_no: fleet.manager_phone,
          state: '',
          location: '',
          total_vehicles: fleet.member_count,
          active_vehicles: fleet.member_count,
          operator_status: 'active'
        };
      });
      
      setFleetOperators(mappedFleets);
    } catch (error: any) {
      console.error('❌ Failed to fetch fleets:', error);
      setFetchError(error.message || 'Failed to load fleets');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fleets on component mount
  useEffect(() => {
    fetchFleets();
  }, []);

  // Form state for POST /api/fleets/
  const [formData, setFormData] = useState<CreateFleetPayload>({
    fleet_name: '',
    fleet_description: '',
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    state: '',
    location: '',
    fleet_code: '',
  });

  // Edit form state for PUT /api/fleets/{id}/
  const [editFormData, setEditFormData] = useState<UpdateFleetPayload>({
    fleet_name: '',
    fleet_description: '',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // POST /api/fleets/
      const response = await createFleet(formData);
      setSubmitSuccess(true);
      
      // Refresh fleet list after creation
      await fetchFleets();
      
      // Reset form and close modal after 2 seconds
      setTimeout(() => {
        setShowAddModal(false);
        setFormData({
          fleet_name: '',
          fleet_description: '',
          username: '',
          password: '',
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          state: '',
          location: '',
          fleet_code: '',
        });
        setSubmitSuccess(false);
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to create fleet');
      console.error('❌ Failed to create fleet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setShowAddModal(false);
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };

  // Handle edit fleet - open modal with existing data
  const handleEditFleet = async (fleet: FleetOperator) => {
    // Refresh fleet list to ensure we have latest data
    await fetchFleets();
    
    setEditingFleet(fleet);
    setEditFormData({
      fleet_name: fleet.company_name,
      fleet_description: '',
    });
    setShowEditModal(true);
  };

  // Handle edit form change
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit edit fleet form
  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFleet) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const fleetId = parseInt(editingFleet.fleet_id);
      
      console.log('🔧 Fleet Edit Form Submission');
      console.log('Editing Fleet:', editingFleet);
      console.log('Fleet ID (parsed):', fleetId);
      console.log('Edit Form Data:', editFormData);
      
      // Verify fleet exists in current list
      const fleetExists = fleetOperators.some(f => f.fleet_id === editingFleet.fleet_id);
      if (!fleetExists) {
        throw new Error(`Fleet ID ${fleetId} is not in the current fleet list. The fleet may have been deleted. Please refresh the page.`);
      }
      
      // Validate that at least fleet_name is provided
      if (!editFormData.fleet_name || editFormData.fleet_name.trim() === '') {
        throw new Error('Fleet name is required');
      }
      
      // Clean payload - remove empty fields
      const cleanPayload: UpdateFleetPayload = {
        fleet_name: editFormData.fleet_name.trim()
      };
      
      if (editFormData.fleet_description && editFormData.fleet_description.trim()) {
        cleanPayload.fleet_description = editFormData.fleet_description.trim();
      }
      
      console.log('Clean payload being sent:', cleanPayload);
      
      const response = await updateFleet(fleetId, cleanPayload);
      console.log('✅ Fleet updated successfully:', response);
      setSubmitSuccess(true);
      
      // Refresh fleet list after update
      console.log('🔄 Refreshing fleet list...');
      await fetchFleets();
      console.log('✅ Fleet list refreshed');
      
      // Reset and close modal after 2 seconds
      setTimeout(() => {
        setShowEditModal(false);
        setEditingFleet(null);
        setEditFormData({
          fleet_name: '',
          fleet_description: '',
        });
        setSubmitSuccess(false);
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to update fleet');
      console.error('❌ Failed to update fleet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeEditModal = () => {
    if (!isSubmitting) {
      setShowEditModal(false);
      setEditingFleet(null);
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };

  // Handle delete fleet
  const handleDeleteFleet = async (fleet: FleetOperator) => {
    const confirmMessage = `Are you sure you want to delete fleet "${fleet.company_name}"? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const fleetId = parseInt(fleet.fleet_id);
      
      const response = await deleteFleet(fleetId);
      
      // Show success message from server
      if (response.success) {
        alert(response.message);
      }
      
      // Refresh fleet list after deletion
      await fetchFleets();
      
      // Clear selection if deleted fleet was selected
      if (selectedFleetCode === fleet.fleet_code) {
        setSelectedFleetCode(null);
      }
    } catch (error: any) {
      alert(`Failed to delete fleet: ${error.message}`);
      console.error('❌ Failed to delete fleet:', error);
    }
  };

  // Member Management Functions
  const loadFleetMembers = async (fleetId: string) => {
    try {
      const members = await getFleetMembers(parseInt(fleetId));
      setFleetMembers(members || []);
    } catch (error) {
      console.error('Failed to load fleet members:', error);
      setFleetMembers([]);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFleet) return;

    if (!newMemberData.username || !newMemberData.email || !newMemberData.first_name || !newMemberData.last_name || !newMemberData.password) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    if (newMemberData.password !== newMemberData.password_confirm) {
      setSubmitError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the user
      const createUserPayload = {
        username: newMemberData.username,
        email: newMemberData.email,
        password: newMemberData.password,
        password_confirm: newMemberData.password_confirm,
        first_name: newMemberData.first_name,
        last_name: newMemberData.last_name,
        phone: newMemberData.phone,
        role: newMemberData.role
      };

      const createResponse = await createUser(createUserPayload);
      const responseData = createResponse?.data as any;
      const createdUserId =
        responseData?.user?.id ??
        responseData?.id ??
        responseData?.user_id;

      if (!createdUserId) {
        throw new Error('User created, but no user ID returned');
      }

      // Step 2: Add the user to the fleet
      await addMemberToFleet({
        fleet_id: parseInt(selectedFleet.fleet_id),
        member_id: parseInt(createdUserId.toString())
      });

      setSubmitSuccess(true);

      setTimeout(async () => {
        await loadFleetMembers(selectedFleet.fleet_id);
        setShowAddMemberModal(false);
        setNewMemberData({
          username: '',
          email: '',
          password: '',
          password_confirm: '',
          first_name: '',
          last_name: '',
          phone: '',
          role: 'RIDER'
        });
        setSubmitSuccess(false);
      }, 1500);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message || error?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from this fleet?`)) {
      return;
    }

    try {
      const response = await removeFleetMember(parseInt(selectedFleet!.fleet_id), parseInt(memberId));
      await loadFleetMembers(selectedFleet!.fleet_id);
      alert(response.message || 'Member removed successfully');
    } catch (error: any) {
      alert(`Failed to remove member: ${error.message}`);
    }
  };

  const handleMemberFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Vehicle Assignment Functions
  const fetchAvailableVehiclesForFleet = async () => {
    try {
      const response = await apiClient.get('/rbac/vehicles/');
      console.log('Available vehicles response:', response.data);
      
      // Handle different response structures
      let vehicles = [];
      if (Array.isArray(response.data)) {
        vehicles = response.data;
      } else if (response.data?.vehicles && Array.isArray(response.data.vehicles)) {
        vehicles = response.data.vehicles;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        vehicles = response.data.data;
      }
      
      setAvailableVehicles(vehicles);
    } catch (error) {
      console.error('Failed to fetch available vehicles:', error);
      setAvailableVehicles([]);
    }
  };

  const handleOpenAssignVehicleModal = () => {
    setShowAssignVehicleModal(true);
    setSelectedUserId(null);
    setAssignVins([]);
    setAssignVehicleError('');
    setAssignVehicleSuccess(false);
    fetchAvailableVehiclesForFleet();
  };

  const toggleVinSelectionForFleet = (vin: string) => {
    setAssignVins(prev =>
      prev.includes(vin)
        ? prev.filter(v => v !== vin)
        : [...prev, vin]
    );
  };

  const handleAssignVehiclesToUser = async () => {
    if (!selectedUserId) {
      setAssignVehicleError('Please select a user');
      return;
    }

    if (assignVins.length === 0) {
      setAssignVehicleError('Please select at least one vehicle');
      return;
    }

    setIsAssigningVehicle(true);
    setAssignVehicleError('');
    setAssignVehicleSuccess(false);

    try {
      // Assign each vehicle individually
      const assignmentPromises = assignVins.map(vin => 
        assignVehicleToUser({
          member_id: selectedUserId,
          vin: vin
        })
      );

      const responses = await Promise.all(assignmentPromises);
      
      // Check if all assignments succeeded
      const failedAssignments = responses.filter(r => !r.success);
      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments.map(r => r.message).join(', ');
        throw new Error(errorMessages || 'Failed to assign some vehicles');
      }

      setAssignVehicleSuccess(true);
      setTimeout(() => {
        setShowAssignVehicleModal(false);
        setSelectedUserId(null);
        setAssignVins([]);
        setAssignVehicleSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to assign vehicles:', error);
      const apiError = error?.response?.data?.error;
      setAssignVehicleError(apiError || error?.message || 'Failed to assign vehicles');
    } finally {
      setIsAssigningVehicle(false);
    }
  };

  const canAddFleet = ['SUPER_ADMIN', 'OEM', 'RND', 'SALES'].includes(userRole);

  // Get selected fleet operator
  const selectedFleet = selectedFleetCode
    ? fleetOperators.find(f => f.fleet_code === selectedFleetCode)
    : null;

  // Load members when a fleet is selected
  useEffect(() => {
    if (selectedFleet) {
      loadFleetMembers(selectedFleet.fleet_id);
    } else {
      setFleetMembers([]);
    }
  }, [selectedFleet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Fleet Management
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage fleet operators and vehicle assignments
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <Truck size={20} />
            <span className="font-semibold">{fleetOperators.length} Fleet Operators</span>
          </div>
          {canAddFleet && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus size={20} />
              Add Fleet Operator
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Operators List */}
        <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Fleet Operators
              </h2>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                GET /api/fleets/
              </p>
            </div>
            <button
              onClick={fetchFleets}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-all ${
                darkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh fleets"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search fleet operators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 transition-all outline-none ${searchQuery ? 'border-blue-500' : ''} ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Loader2 size={48} className="mx-auto mb-4 animate-spin text-blue-500" />
              <p className="font-medium">Loading fleets...</p>
              <p className="text-sm mt-1">GET /api/fleets/</p>
            </div>
          )}

          {/* Error State */}
          {fetchError && !isLoading && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Failed to load fleets</p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-red-400/80' : 'text-red-600'}`}>{fetchError}</p>
                  <button
                    onClick={fetchFleets}
                    className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fleet List */}
          {!isLoading && !fetchError && (() => {
            const filteredFleets = fleetOperators.filter(f => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                f.company_name?.toLowerCase().includes(query) ||
                f.fleet_code?.toLowerCase().includes(query) ||
                f.location?.toLowerCase().includes(query) ||
                f.state?.toLowerCase().includes(query) ||
                f.fleet_manager_name?.toLowerCase().includes(query) ||
                f.mobile_no?.includes(query)
              );
            });

            if (filteredFleets.length === 0) {
              return (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Search size={48} className="mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No fleet operators found matching your search' : 'No fleet operators available'}</p>
                </div>
              );
            }

            return (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFleets.map((f) => (
                  <div
                    key={f.fleet_code}
                    className={`p-4 rounded-xl transition-all ${selectedFleetCode === f.fleet_code
                      ? darkMode
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-blue-50 border-2 border-blue-500'
                      : darkMode
                        ? 'bg-gray-700/30 hover:bg-gray-700/50 border-2 border-transparent'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div 
                        onClick={() => setSelectedFleetCode(f.fleet_code)}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {f.company_name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                          {f.fleet_code}
                        </div>
                        {canAddFleet && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditFleet(f);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode 
                                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              }`}
                              title="Edit Fleet"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFleet(f);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode 
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                              title="Delete Fleet"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div 
                      onClick={() => setSelectedFleetCode(f.fleet_code)}
                      className="space-y-1 text-sm cursor-pointer"
                    >
                      <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Truck size={14} />
                        <span>{f.active_vehicles}/{f.total_vehicles} vehicles</span>
                      </div>
                      <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <MapPin size={14} />
                        <span>{f.location || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Fleet Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedFleet ? (
            <>
              {/* Fleet Overview */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedFleet.company_name}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fleet ID: {selectedFleet.fleet_id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Building2 className="text-blue-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fleet Code</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.fleet_code}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Users className="text-green-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fleet Manager</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.fleet_manager_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Mail className="text-purple-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.email_id || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Phone className="text-orange-500" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mobile</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.mobile_no || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <MapPin className="text-blue-400" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <MapPin className="text-green-400" size={20} />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>State</p>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFleet.state || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fleet Statistics */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Truck size={20} className="text-blue-500" />
                  Fleet Statistics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Vehicles</span>
                      <Package size={18} className="text-blue-500" />
                    </div>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {selectedFleet.total_vehicles}
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Active Vehicles</span>
                      <CheckCircle size={18} className="text-green-500" />
                    </div>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {selectedFleet.active_vehicles}
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Inactive</span>
                      <Clock size={18} className="text-orange-500" />
                    </div>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {selectedFleet.total_vehicles - selectedFleet.active_vehicles}
                    </p>
                  </div>
                </div>
              </div>

              {/* Operator Status */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'glass bg-gray-800/50' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <CheckCircle size={20} className="text-green-500" />
                  Operator Status
                </h3>

                <div className={`p-4 rounded-xl ${
                  selectedFleet.operator_status === 'active'
                    ? darkMode
                      ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30'
                      : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'
                    : darkMode
                      ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30'
                      : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      selectedFleet.operator_status === 'active'
                        ? darkMode ? 'text-green-300' : 'text-green-700'
                        : darkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>Status</span>
                    <CheckCircle size={18} className={selectedFleet.operator_status === 'active' ? 'text-green-500' : 'text-yellow-500'} />
                  </div>
                  <p className={`text-2xl font-bold capitalize ${
                    selectedFleet.operator_status === 'active'
                      ? darkMode ? 'text-green-400' : 'text-green-600'
                      : darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>
                    {selectedFleet.operator_status}
                  </p>
                </div>
              </div>

              {/* Members Section */}
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Users size={20} className="text-purple-500" />
                      Fleet Members
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                        darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {fleetMembers.length}
                      </span>
                    </h3>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      POST /api/fleets/members/
                    </p>
                  </div>
                  {(canAddFleet || userRole === 'FLEET') && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20"
                    >
                      <UserPlus size={18} />
                      Add Member
                    </button>
                  )}
                </div>

                {/* Search Members */}
                <div className="relative mb-4">
                  <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 transition-all outline-none ${memberSearchQuery ? 'border-purple-500' : ''} ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }`}
                  />
                </div>

                {/* Members List */}
                {fleetMembers.length === 0 ? (
                  <div className={`text-center py-12 ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-xl`}>
                    <Users size={48} className={`mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No members assigned yet
                    </p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Add members to manage this fleet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const filteredMembers = fleetMembers.filter(member => {
                        if (!memberSearchQuery.trim()) return true;
                        const query = memberSearchQuery.toLowerCase();
                        return (
                          member.username?.toLowerCase().includes(query) ||
                          member.email?.toLowerCase().includes(query) ||
                          member.first_name?.toLowerCase().includes(query) ||
                          member.last_name?.toLowerCase().includes(query) ||
                          member.phone?.includes(query)
                        );
                      });

                      if (filteredMembers.length === 0) {
                        return (
                          <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Search size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No members found matching your search</p>
                          </div>
                        );
                      }

                      return filteredMembers.map((member, index) => (
                        <div
                          key={member.id || index}
                          className={`p-4 rounded-xl transition-all ${
                            darkMode
                              ? 'bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                darkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                              }`}>
                                <User className={darkMode ? 'text-purple-400' : 'text-purple-600'} size={20} />
                              </div>
                              <div>
                                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {member.first_name} {member.last_name}
                                </h4>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  @{member.username}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right mr-2">
                                <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  <Mail size={14} />
                                  <span className="text-xs">{member.email}</span>
                                </div>
                                {member.phone && (
                                  <div className={`flex items-center gap-1 text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Phone size={14} />
                                    <span className="text-xs">{member.phone}</span>
                                  </div>
                                )}
                              </div>
                              {(canAddFleet || userRole === 'FLEET') && (
                                <button
                                  onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    darkMode 
                                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                                  }`}
                                  title="Remove Member"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Vehicle Assignment Section */}
              <div className={`p-6 rounded-2xl mt-6 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Truck size={20} className="text-blue-500" />
                      Assign Vehicle to User
                    </h3>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Assign vehicles to fleet members by VIN
                    </p>
                  </div>
                  {(canAddFleet || userRole === 'FLEET') && (
                    <button
                      onClick={handleOpenAssignVehicleModal}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Plus size={18} />
                      Assign Vehicle
                    </button>
                  )}
                </div>
              </div>

            </>
          ) : (
            <div className={`p-12 rounded-2xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} flex flex-col items-center justify-center`}>
              <Truck size={64} className={`mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a fleet operator to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Fleet Operator Modal with POST /api/fleets/ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <div className={`px-8 py-6 flex items-center justify-between border-b sticky top-0 z-10 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                  <Truck className="text-white" size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Fleet Operator</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>POST /api/fleets/ - Create fleet with manager</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close modal"
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-8">
              {/* Success Message */}
              {submitSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={20} />
                  <p className="text-green-400 font-medium">✅ Fleet and manager created successfully!</p>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-400 font-medium">❌ Failed to create fleet</p>
                    <p className="text-red-400/80 text-sm mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Fleet Information Section */}
              <div className="mb-8">
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Building2 size={20} className="text-blue-500" />
                  Fleet Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Fleet Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fleet_name"
                      value={formData.fleet_name}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., East Coast Fleet"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Fleet Code
                    </label>
                    <input
                      type="text"
                      name="fleet_code"
                      value={formData.fleet_code}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., FLEET-EAST-001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Description
                    </label>
                    <textarea
                      name="fleet_description"
                      value={formData.fleet_description}
                      onChange={handleFormChange}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none resize-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., Manages east coast vehicles"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., Maharashtra"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., Mumbai"
                    />
                  </div>
                </div>
              </div>

              {/* Fleet Manager Information Section */}
              <div className="mb-6">
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <User size={20} className="text-green-500" />
                  Fleet Manager Account
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="Manager's first name"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="Manager's last name"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., fleet_manager_east"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="Enter secure password"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="manager@company.com"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }`}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    isSubmitting
                      ? 'bg-blue-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white shadow-lg shadow-blue-500/20`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Creating Fleet...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Create Fleet (POST)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fleet Modal */}
      {showEditModal && editingFleet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Edit Fleet
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Update fleet name and description
                </p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={isSubmitting}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditFormSubmit} className="p-6">
              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-green-500" size={40} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Fleet Updated!
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    The fleet has been successfully updated.
                  </p>
                </div>
              ) : (
                <>
                  {/* Fleet Info */}
                  <div className={`p-4 rounded-xl mb-6 ${
                    darkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Building2 className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
                      <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Editing Fleet ID: {editingFleet.fleet_id}
                      </span>
                    </div>
                  </div>

                  {submitError && (
                    <div className={`p-4 rounded-xl mb-6 ${
                      darkMode ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-red-500 mt-0.5" size={20} />
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                              Failed to update fleet
                            </p>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-red-400/80' : 'text-red-600'}`}>
                              {submitError}
                            </p>
                          </div>
                        </div>
                        {submitError.includes('not found') && (
                          <button
                            onClick={async () => {
                              setSubmitError(null);
                              await fetchFleets();
                              closeEditModal();
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              darkMode
                                ? 'bg-red-500/30 text-red-300 hover:bg-red-500/40'
                                : 'bg-red-200 text-red-700 hover:bg-red-300'
                            }`}
                          >
                            Refresh List
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Fleet Code (Read-only) */}
                    <div>
                      <label htmlFor="edit-fleet-code" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Fleet Code
                      </label>
                      <input
                        id="edit-fleet-code"
                        type="text"
                        value={editingFleet.fleet_code}
                        disabled
                        aria-label="Fleet Code (read only)"
                        className={`w-full px-4 py-3 rounded-xl border-2 ${
                          darkMode
                            ? 'bg-gray-800/50 border-gray-700 text-gray-500'
                            : 'bg-gray-100 border-gray-200 text-gray-500'
                        }`}
                      />
                    </div>

                    {/* Fleet Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Fleet Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fleet_name"
                        value={editFormData.fleet_name}
                        onChange={handleEditFormChange}
                        required
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }`}
                        placeholder="e.g., Acme Fleet Services"
                      />
                    </div>

                    {/* Fleet Description */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Description
                      </label>
                      <textarea
                        name="fleet_description"
                        value={editFormData.fleet_description}
                        onChange={handleEditFormChange}
                        rows={3}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none resize-none ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }`}
                        placeholder="Brief description of the fleet..."
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      disabled={isSubmitting}
                      className={`flex-1 px-6 py-3 rounded-xl font-medium transition-colors ${
                        darkMode
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Update Fleet
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedFleet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setShowAddMemberModal(false)}></div>
          
          <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <div className={`px-8 py-6 flex items-center justify-between border-b sticky top-0 z-10 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-600/20">
                  <UserPlus className="text-white" size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Fleet Member</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Add a new member to {selectedFleet.company_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isSubmitting) {
                    setShowAddMemberModal(false);
                    setNewMemberData({
                      username: '',
                      email: '',
                      password: '',
                      password_confirm: '',
                      first_name: '',
                      last_name: '',
                      phone: '',
                      role: 'RIDER'
                    });
                  }
                }}
                disabled={isSubmitting}
                aria-label="Close modal"
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-8">
              {/* Success Message */}
              {submitSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={20} />
                  <p className="text-green-400 font-medium">✅ Member added successfully!</p>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-400 font-medium">❌ Failed to add member</p>
                    <p className="text-red-400/80 text-sm mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={newMemberData.first_name}
                      onChange={handleMemberFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                      }`}
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={newMemberData.last_name}
                      onChange={handleMemberFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={newMemberData.username}
                    onChange={handleMemberFormChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }`}
                    placeholder="johndoe"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={newMemberData.password}
                      onChange={handleMemberFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                      }`}
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password_confirm"
                      value={newMemberData.password_confirm}
                      onChange={handleMemberFormChange}
                      required
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                      }`}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newMemberData.email}
                    onChange={handleMemberFormChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }`}
                    placeholder="john.doe@company.com"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newMemberData.phone}
                    onChange={handleMemberFormChange}
                    required
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }`}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label htmlFor="member-role" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="member-role"
                    name="role"
                    value={newMemberData.role}
                    onChange={handleMemberFormChange}
                    required
                    aria-label="Select member role"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500'
                    }`}
                  >
                    <option value="RIDER">User</option>
                    <option value="FLEET">Fleet Manager</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setNewMemberData({
                      username: '',
                      email: '',
                      password: '',
                      password_confirm: '',
                      first_name: '',
                      last_name: '',
                      phone: '',
                      role: 'RIDER'
                    });
                  }}
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    isSubmitting
                      ? 'bg-purple-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  } text-white shadow-lg shadow-purple-500/20`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Adding Member...
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Vehicle to User Modal */}
      {showAssignVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignVehicleModal(false)}></div>
          
          <div className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <div className={`px-8 py-6 flex items-center justify-between border-b sticky top-0 z-10 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                  <Truck className="text-white" size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Assign Vehicle to User</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select user and vehicle(s) to assign</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignVehicleModal(false)}
                disabled={isAssigningVehicle}
                aria-label="Close modal"
                className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} ${isAssigningVehicle ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              {/* Success Message */}
              {assignVehicleSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={20} />
                  <p className="text-green-400 font-medium">✅ Vehicles assigned successfully!</p>
                </div>
              )}

              {/* Error Message */}
              {assignVehicleError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-red-400 font-medium">❌ Failed to assign vehicles</p>
                    <p className="text-red-400/80 text-sm mt-1">{assignVehicleError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Select User */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select User <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                    aria-label="Select user to assign vehicle"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'
                    }`}
                  >
                    <option value="">-- Select a user --</option>
                    {fleetMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} (@{member.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Vehicles */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Vehicle(s) <span className="text-red-500">*</span>
                  </label>
                  <div className={`border-2 rounded-xl p-4 max-h-64 overflow-y-auto ${
                    darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {!Array.isArray(availableVehicles) || availableVehicles.length === 0 ? (
                      <div className="text-center py-8">
                        <Truck size={40} className={`mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                          No vehicles available
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableVehicles.map((vehicle) => (
                          <label
                            key={vehicle.vin}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              assignVins.includes(vehicle.vin)
                                ? darkMode
                                  ? 'bg-blue-500/20 border-2 border-blue-500'
                                  : 'bg-blue-50 border-2 border-blue-500'
                                : darkMode
                                  ? 'bg-gray-700/30 hover:bg-gray-700/50'
                                  : 'bg-white hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={assignVins.includes(vehicle.vin)}
                              onChange={() => toggleVinSelectionForFleet(vehicle.vin)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {vehicle.vin}
                              </p>
                              {vehicle.model && (
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {vehicle.model}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {assignVins.length > 0 && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {assignVins.length} vehicle(s) selected
                    </p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowAssignVehicleModal(false)}
                  disabled={isAssigningVehicle}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } ${isAssigningVehicle ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignVehiclesToUser}
                  disabled={isAssigningVehicle || !selectedUserId || assignVins.length === 0}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    isAssigningVehicle || !selectedUserId || assignVins.length === 0
                      ? 'bg-blue-500 opacity-50 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white shadow-lg shadow-blue-500/20`}
                >
                  {isAssigningVehicle ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Assign Vehicle(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
