// Sidebar Component

import React, { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { MenuItem } from '../types';
import logo from '../assets/kg_logo.png';
import whiteLogo from '../assets/white_logo.png';

interface SidebarProps {
  sidebarOpen: boolean;
  darkMode: boolean;
  currentPage: string;
  menuItems: MenuItem[];
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  darkMode,
  currentPage,
  menuItems,
  setSidebarOpen,
  setCurrentPage
}) => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } ${darkMode
          ? 'bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50'
          : 'bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl'
        } flex flex-col ${sidebarOpen ? 'overflow-hidden' : 'overflow-visible md:overflow-hidden'}`}>
        <div className={`flex ${sidebarOpen ? 'flex-row items-center justify-between' : 'flex-col items-center justify-center gap-4'} p-4 ${darkMode ? 'border-b border-gray-800/50' : 'border-b border-gray-200/50'
          }`}>
          <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center w-full'}`}>
            <div className={`flex items-center justify-center transform hover:scale-110 transition-transform duration-300 ${sidebarOpen ? 'h-10 w-auto' : 'h-8 w-auto'}`}>
              <img src={darkMode ? whiteLogo : logo} alt="Kinetic Green" className={`${sidebarOpen ? 'h-10' : 'h-8'} w-auto object-contain drop-shadow-lg`} />
            </div>
            {sidebarOpen && (
              <span className={`font-bold text-lg bg-gradient-to-r ${darkMode ? 'from-green-400 to-emerald-400' : 'from-green-600 to-emerald-600'
                } bg-clip-text text-transparent`}>Kinetic Green</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-xl transition-all duration-300 ${darkMode
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.subItems && item.subItems.length > 0) {
                    toggleMenu(item.id);
                  } else {
                    setCurrentPage(item.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }
                }}
                className={`relative w-full flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-300 group ${currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage))
                  ? darkMode
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                  : darkMode
                    ? 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:text-green-700'
                  }`}
              >
                <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center w-full'}`}>
                  {(currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage))) && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-white/30 rounded-r-full"></div>
                  )}
                  <item.icon className={`w-5 h-5 transition-all duration-300 flex-shrink-0 ${currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage))
                    ? 'scale-110 drop-shadow-lg'
                    : 'group-hover:scale-110'
                    }`} />
                  {sidebarOpen && <span className="font-semibold whitespace-nowrap">{item.label}</span>}
                </div>

                {sidebarOpen && item.subItems && item.subItems.length > 0 && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${expandedMenus[item.id] ? 'rotate-180' : ''}`}
                  />
                )}

                {/* Hover Glow Effect */}
                {!sidebarOpen && currentPage !== item.id && (
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-current/5 pointer-events-none"></div>
                )}
              </button>

              {/* Submenu Items */}
              {sidebarOpen && item.subItems && expandedMenus[item.id] && (
                <div className="ml-4 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => {
                        setCurrentPage(subItem.id);
                        // Close sidebar on mobile after selection
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-300 ${currentPage === subItem.id
                        ? darkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-blue-100 text-blue-700'
                        : darkMode
                          ? 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-200'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    >
                      <subItem.icon className="w-4 h-4" />
                      <span className="text-sm">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
