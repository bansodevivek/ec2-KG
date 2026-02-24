// Header Component

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Sun, Moon, Bell, User, ChevronDown, LogOut, Menu, Settings } from 'lucide-react';
import { MenuItem } from '../types';
import Profile from './Profile';

interface HeaderProps {
  darkMode: boolean;
  notifications: number;
  showUserMenu: boolean;
  currentPage: string;
  menuItems: MenuItem[];
  userRole: string;
  username?: string;
  displayName?: string;
  setDarkMode: (mode: boolean) => void;
  setCurrentPage: (page: string) => void;
  setShowUserMenu: (show: boolean) => void;
  handleLogout: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  darkMode,
  notifications,
  showUserMenu,
  currentPage,
  menuItems,
  userRole,
  username,
  displayName,
  setDarkMode,
  setCurrentPage,
  setShowUserMenu,
  handleLogout,
  setSidebarOpen
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuId = useId();
  const menuButtonId = `${userMenuId}-button`;
  const menuId = `${userMenuId}-menu`;

  const toggleUserMenu = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, [setShowUserMenu]);

  const closeUserMenu = useCallback(() => {
    setShowUserMenu(false);
  }, [setShowUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu, setShowUserMenu]);
  const getDisplayName = () => {
    switch (userRole) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'OEM': return 'OEM';
      case 'RND': return 'Research';
      case 'DEALER': return 'Dealer';
      case 'SERVICE': return 'Service';
      case 'FLEET': return 'Fleet Manager';
      case 'USER': return 'End User';
      default: return 'User';
    }
  }

  const getDisplayRole = () => {
    switch (userRole) {
      case 'SUPER_ADMIN': return 'System Administrator';
      case 'OEM': return 'OEM Partner';
      case 'RND': return 'Research Department';
      case 'DEALER': return 'Dealer Partner';
      case 'SERVICE': return 'Service Engineer';
      case 'FLEET': return 'Fleet Manager';
      case 'USER': return 'Valued Customer';
      default: return 'Kinetic Green';
    }
  }

  return (
    <header className={`sticky top-0 z-30 w-full ${darkMode
        ? 'bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50'
        : 'bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg'
      }`}>
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className={`text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r truncate ${darkMode
              ? 'from-white to-gray-300'
              : 'from-gray-900 to-gray-700'
            } bg-clip-text text-transparent`}>
            {menuItems.find(m => m.id === currentPage)?.label || 'Dashboard'}
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 sm:p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'}`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <div className="relative">
            <button className={`p-1.5 sm:p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} relative`} aria-label="Notifications">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              id={menuButtonId}
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              aria-controls={menuId}
              onClick={toggleUserMenu}
              className={`flex items-center space-x-1 sm:space-x-2 md:space-x-3 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 ${darkMode
                  ? 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 border border-gray-700'
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200'
                } shadow-lg hover:shadow-xl`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="text-left hidden lg:block">
                <p className={`text-xs sm:text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {username || getDisplayName()}
                </p>
                <p className={`text-[10px] sm:text-xs uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{getDisplayRole()}</p>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 hidden sm:block" />
            </button>

            <div
              id={menuId}
              role="menu"
              aria-labelledby={menuButtonId}
              aria-hidden={!showUserMenu}
              className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} origin-top-right transform transition ease-out duration-200 ${showUserMenu ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              <button
                role="menuitem"
                onClick={() => {
                  setShowProfile(true);
                  closeUserMenu();
                }}
                className={`w-full flex items-center space-x-2 px-4 py-3 hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700 text-white' : ''} rounded-t-lg`}
              >
                <Settings className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <hr className={`${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
              <button
                role="menuitem"
                onClick={handleLogout}
                className={`w-full flex items-center space-x-2 px-4 py-3 hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700 text-white' : ''} rounded-b-lg`}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <Profile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        darkMode={darkMode}
        userRole={userRole}
        username={username}
        displayName={displayName}
        onProfileUpdate={(data) => {
          console.log('Profile updated:', data);
          // Handle profile update logic here
        }}
        onPasswordChange={(data) => {
          console.log('Password change requested:', data);
          // Handle password change logic here
        }}
        onDeleteAccount={() => {
          console.log('Account deletion requested');
          // Handle account deletion logic here
          handleLogout(); // Logout after account deletion
        }}
      />
    </header>
  );
};

export default Header;
