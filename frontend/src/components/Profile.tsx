import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Edit3, Key, Trash2, Save, X, Eye, EyeOff, Camera, Shield, Monitor, AlertTriangle, Lock } from 'lucide-react';
import { updateUserProfile } from '../api/user';
import { getAuthToken } from '../api/auth';
import { isTokenExpired } from '../utils/jwt';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  userRole: string;
  username?: string;
  displayName?: string;
  onProfileUpdate?: (data: any) => void;
  onPasswordChange?: (data: any) => void;
  onDeleteAccount?: () => void;
}

const Profile: React.FC<ProfileProps> = ({
  isOpen,
  onClose,
  darkMode,
  userRole,
  username,
  displayName,
  onProfileUpdate,
  onPasswordChange,
  onDeleteAccount
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    username: username || '',
    firstName: (displayName || username || '').split(' ')[0] || '',
    lastName: (displayName || username || '').split(' ').slice(1).join(' ') || '',
    email: `${username}@kineticgreen.com`,
    phone: '+91 9876543210',
    department: userRole === 'SUPER_ADMIN' ? 'Administration' :
      userRole === 'OEM' ? 'OEM Management' :
        userRole === 'RND' ? 'Research & Development' :
          userRole === 'DEALER' ? 'Dealer Management' :
            userRole === 'SERVICE' ? 'Service Department' :
              userRole === 'FLEET' ? 'Fleet Management' :
                userRole === 'SALES' ? 'Sales Team' : 'General',
    jobTitle: userRole === 'SUPER_ADMIN' ? 'System Administrator' :
      userRole === 'OEM' ? 'OEM Executive' :
        userRole === 'RND' ? 'Research Analyst' :
          userRole === 'DEALER' ? 'Dealer Manager' :
            userRole === 'SERVICE' ? 'Service Engineer' :
              userRole === 'FLEET' ? 'Fleet Controller' :
                userRole === 'SALES' ? 'Sales Executive' : 'User'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = async () => {
    console.log('🔵 Profile save initiated');

    try {
      const payload = {
        username: profileData.username,
        email: profileData.email,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone_number: profileData.phone,
        department: profileData.department,
        job_title: profileData.jobTitle
      };

      console.log('📦 Profile payload prepared:', payload);

      // Check for demo token
      const token = getAuthToken();
      console.log('🔑 Current token:', token ? `${token.substring(0, 20)}...` : 'null');

      if (token && token.startsWith('demo_token_')) {
        console.log('✅ Demo mode detected - bypassing API call');

        // Simulate success for demo mode
        if (onProfileUpdate) {
          console.log('📢 Calling onProfileUpdate callback');
          onProfileUpdate(profileData);
        }

        // Update local storage for demo persistence
        const currentUser = localStorage.getItem('user');
        console.log('👤 Current user from localStorage:', currentUser);

        if (currentUser) {
          const parsedUser = JSON.parse(currentUser);
          const updatedUser = {
            ...parsedUser,
            username: profileData.username,
            email: profileData.email,
            name: `${profileData.firstName} ${profileData.lastName}`,
            phone: profileData.phone
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('displayName', `${profileData.firstName} ${profileData.lastName}`);
          console.log('💾 LocalStorage updated with new profile data');
        }

        setIsEditing(false);
        console.log('✅ Profile save completed successfully (demo mode)');
        alert('✅ Demo Mode: Profile updated locally (not saved to server).');
        return;
      }

      console.log('🌐 Real API mode - making API call to update profile');

      // Check if token is expired
      if (token && isTokenExpired(token)) {
        console.log('Token expired during profile update');
        alert('Your session has expired. Please log in again.');
        return;
      }

      // For real API calls, just make the request
      const result = await updateUserProfile(payload);

      console.log('📥 API response received:', result);

      if (result.error) {
        // Don't logout on error, just show the error message
        console.error('❌ Profile update error:', result.error);
        alert(`Failed to update profile: ${result.error}\n\nYour session is still active.`);
        return;
      }

      console.log('✅ Profile update successful');

      if (onProfileUpdate) {
        console.log('📢 Calling onProfileUpdate callback');
        onProfileUpdate(profileData);
      }

      // Update local storage if needed
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        const parsedUser = JSON.parse(currentUser);
        const updatedUser = {
          ...parsedUser,
          username: profileData.username,
          email: profileData.email,
          name: `${profileData.firstName} ${profileData.lastName}`,
          phone: profileData.phone
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('displayName', `${profileData.firstName} ${profileData.lastName}`);
        console.log('💾 LocalStorage updated with new profile data');
      }

      setIsEditing(false);
      console.log('✅ Profile save completed successfully');
      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('❌ Profile update error (caught in try-catch):', error);
      // Don't logout on error, just show the error message
      alert('⚠️ An error occurred while updating profile. Your session is still active.');
    }
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    if (onPasswordChange) {
      onPasswordChange(passwordData);
    }
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Password changed successfully!');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (onDeleteAccount) {
        onDeleteAccount();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} relative animate-in fade-in zoom-in duration-200`}>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`w-full md:w-64 flex flex-col border-b md:border-b-0 md:border-r ${darkMode ? 'border-gray-700 bg-gray-850' : 'border-gray-100 bg-gray-50'}`}>
          <div className="p-6">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Settings
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your account
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'profile'
                ? `${darkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-50 text-green-700'}`
                : `${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                }`}
            >
              <User className="w-4 h-4" />
              <span>Profile Info</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'security'
                ? `${darkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-50 text-green-700'}`
                : `${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'danger'
                ? `${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`
                : `${darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <div className={`w-24 h-24 rounded-full ${darkMode ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-100 to-green-200'} flex items-center justify-center relative group cursor-pointer shadow-lg`}>
                    <User className={`w-12 h-12 ${darkMode ? 'text-white' : 'text-green-600'}`} />
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                      Profile Picture
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                      Click to upload a new profile picture (JPG, PNG up to 5MB)
                    </p>
                    <button className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      Change Picture
                    </button>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Username *
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                          } ${isEditing ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : ''}`}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                          } ${isEditing ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : ''}`}
                        placeholder="Enter your email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                          } ${isEditing ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : ''}`}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                          } ${isEditing ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : ''}`}
                        placeholder="Enter your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                          } ${isEditing ? 'focus:ring-2 focus:ring-green-500 focus:border-green-500' : ''}`}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Department
                      </label>
                      <input
                        type="text"
                        value={profileData.department}
                        disabled
                        className={`w-full px-4 py-3 border rounded-lg ${darkMode
                          ? 'bg-gray-800 border-gray-600 text-gray-400'
                          : 'bg-gray-50 border-gray-300 text-gray-500'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={profileData.jobTitle}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg ${darkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-400'
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                        }`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`flex justify-end space-x-3 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Cancel
                      </button>
                      <button
                        onClick={handleProfileSave}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Edit3 className="w-4 h-4 inline mr-2" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Password Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <Shield className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Password & Security
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Current Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all duration-200 ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500'
                            }`}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all duration-200 ${darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500'
                              }`}
                            placeholder="Enter a strong new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className={`w-full px-4 py-3 pr-10 border rounded-lg transition-all duration-200 ${darkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500'
                              }`}
                            placeholder="Confirm your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                      <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                        Password Requirements:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${passwordData.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          At least 8 characters
                        </div>
                        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(passwordData.newPassword) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          One uppercase letter
                        </div>
                        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(passwordData.newPassword) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          One lowercase letter
                        </div>
                        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(passwordData.newPassword) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          One number
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className={`border-t pt-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Two-Factor Authentication
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <button className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Enable 2FA
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className={`border-t pt-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Active Sessions
                  </h4>
                  <div className="space-y-3">
                    <div className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Monitor className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Current Session
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Chrome on Windows • Last active: Now
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-800'}`}>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Danger Zone
                  </h3>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  Irreversible actions for your account. Please proceed with caution.
                </p>

                <div className={`p-6 border rounded-lg transition-all duration-200 ${darkMode ? 'border-red-900/50 bg-red-900/10' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                        Delete Account
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                        Once you delete your account, there is no going back. All your data will be permanently removed.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>

                <div className={`p-6 border rounded-lg transition-all duration-200 ${darkMode ? 'border-orange-900/50 bg-orange-900/10' : 'border-orange-200 bg-orange-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                        Transfer Ownership
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                        Transfer this account to another user. You will lose administrative access.
                      </p>
                    </div>
                    <button
                      className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      <User className="w-4 h-4 inline mr-2" />
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Profile;