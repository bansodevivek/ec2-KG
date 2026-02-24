// import React, { useState, useEffect } from 'react';
// import { LayoutDashboard, Map, TrendingUp, AlertTriangle, FileText, Cpu, Wifi, Settings, Building2, Users, Plus, MapPin, BarChart3, Menu, X, Bell, User, LogOut, Sun, Moon, ChevronDown, Search } from 'lucide-react';

// const ConnectedAutoDashboard = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [showForgotPassword, setShowForgotPassword] = useState(false);
//   const [loginForm, setLoginForm] = useState({ email: '', password: '', rememberMe: false });
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [darkMode, setDarkMode] = useState(false);
//   const [currentPage, setCurrentPage] = useState('dashboard');
//   const [showUserMenu, setShowUserMenu] = useState(false);
//   const [notifications, setNotifications] = useState(3);
  
//   // Real-time device stats (simulated WebSocket updates)
//   const [deviceStats, setDeviceStats] = useState({
//     active: 1247,
//     faulty: 23,
//     inactive: 156,
//     total: 1426
//   });

//   const [salesData, setSalesData] = useState({
//     sold: 8456,
//     inventory: 12000,
//     percentage: 70
//   });

//   const [environmentalData, setEnvironmentalData] = useState({
//     co2Saved: 12547,
//     totalKm: 856234,
//     treesEquivalent: 2845
//   });

//   // Simulate real-time updates
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setDeviceStats(prev => ({
//         ...prev,
//         active: prev.active + Math.floor(Math.random() * 3) - 1,
//         faulty: Math.max(0, prev.faulty + Math.floor(Math.random() * 2) - 1)
//       }));
//     }, 5000);
//     return () => clearInterval(interval);
//   }, []);

//   const handleLogin = (e) => {
//     e.preventDefault();
//     if (loginForm.email && loginForm.password) {
//       // Simulate JWT token storage
//       localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
//       localStorage.setItem('userRole', 'SuperAdmin');
//       if (loginForm.rememberMe) {
//         localStorage.setItem('rememberMe', 'true');
//       }
//       setIsAuthenticated(true);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     localStorage.removeItem('userRole');
//     setIsAuthenticated(false);
//     setShowUserMenu(false);
//   };

//   const menuItems = [
//     { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
//     { icon: Map, label: 'Live Tracking', id: 'tracking' },
//     { icon: TrendingUp, label: 'Vehicle Insights', id: 'insights' },
//     { icon: AlertTriangle, label: 'Fault Code Analysis', id: 'faults' },
//     { icon: FileText, label: 'Reports', id: 'reports' },
//     { icon: Cpu, label: 'Device Management', id: 'devices' },
//     { icon: Wifi, label: 'FOTA Updates', id: 'fota' },
//     { icon: Settings, label: 'Configure', id: 'configure' },
//     { icon: Building2, label: 'Enterprise Settings', id: 'enterprise' }
//   ];

//   const quickActions = [
//     { icon: Map, label: 'Live Tracking', color: 'bg-blue-500' },
//     { icon: BarChart3, label: 'Statistics', color: 'bg-green-500' },
//     { icon: MapPin, label: 'Route Replay', color: 'bg-purple-500' },
//     { icon: Plus, label: 'Add Users', color: 'bg-orange-500' },
//     { icon: Cpu, label: 'Device Mapping', color: 'bg-cyan-500' },
//     { icon: Users, label: 'User Management', color: 'bg-pink-500' }
//   ];

//   // Login Page
//   if (!isAuthenticated) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
//         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
//         <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-fade-in">
//           {!showForgotPassword ? (
//             <>
//               <div className="text-center mb-8">
//                 <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
//                   <Cpu className="w-8 h-8 text-white" />
//                 </div>
//                 <h1 className="text-3xl font-bold text-gray-900 mb-2">Connected Auto</h1>
//                 <p className="text-gray-600">SuperAdmin Dashboard</p>
//               </div>

//               <div className="space-y-6">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
//                   <input
//                     type="email"
//                     value={loginForm.email}
//                     onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
//                     onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                     placeholder="admin@connectedauto.com"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//                   <input
//                     type="password"
//                     value={loginForm.password}
//                     onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
//                     onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                     placeholder="••••••••"
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <label className="flex items-center cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={loginForm.rememberMe}
//                       onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
//                       className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//                     />
//                     <span className="ml-2 text-sm text-gray-700">Remember me</span>
//                   </label>
//                   <button
//                     onClick={() => setShowForgotPassword(true)}
//                     className="text-sm text-blue-600 hover:text-blue-700 font-medium"
//                   >
//                     Forgot password?
//                   </button>
//                 </div>

//                 <button
//                   onClick={handleLogin}
//                   className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition transform hover:scale-105 active:scale-95"
//                 >
//                   Sign In
//                 </button>
//               </div>

//               <div className="mt-6 text-center text-sm text-gray-600">
//                 <p>Demo credentials: admin@demo.com / admin123</p>
//               </div>
//             </>
//           ) : (
//             <>
//               <button
//                 onClick={() => setShowForgotPassword(false)}
//                 className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center"
//               >
//                 ← Back to Login
//               </button>
//               <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
//               <p className="text-gray-600 mb-6">Enter your email to receive reset instructions</p>
              
//               <div className="space-y-6">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
//                   <input
//                     type="email"
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
//                     placeholder="admin@connectedauto.com"
//                   />
//                 </div>
//                 <button
//                   onClick={() => alert('Reset link sent!')}
//                   className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
//                 >
//                   Send Reset Link
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   }

//   // Main Dashboard
//   return (
//     <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
//       {/* Sidebar */}
//       <aside className={`fixed left-0 top-0 h-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
//         <div className="flex items-center justify-between p-4 border-b border-gray-200">
//           {sidebarOpen && (
//             <div className="flex items-center space-x-2">
//               <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
//                 <Cpu className="w-6 h-6 text-white" />
//               </div>
//               <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>ConnectedAuto</span>
//             </div>
//           )}
//           <button
//             onClick={() => setSidebarOpen(!sidebarOpen)}
//             className={`p-2 rounded-lg hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
//           >
//             {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
//           </button>
//         </div>

//         <nav className="p-4 space-y-2">
//           {menuItems.map((item) => (
//             <button
//               key={item.id}
//               onClick={() => setCurrentPage(item.id)}
//               className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
//                 currentPage === item.id
//                   ? 'bg-blue-600 text-white'
//                   : darkMode
//                   ? 'text-gray-300 hover:bg-gray-700'
//                   : 'text-gray-700 hover:bg-gray-100'
//               }`}
//             >
//               <item.icon className="w-5 h-5" />
//               {sidebarOpen && <span className="font-medium">{item.label}</span>}
//             </button>
//           ))}
//         </nav>
//       </aside>

//       {/* Main Content */}
//       <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
//         {/* Header */}
//         <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-30`}>
//           <div className="flex items-center justify-between px-6 py-4">
//             <div className="flex items-center space-x-4 flex-1">
//               <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
//                 {menuItems.find(m => m.id === currentPage)?.label || 'Dashboard'}
//               </h1>
//             </div>

//             <div className="flex items-center space-x-4">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search..."
//                   className={`pl-10 pr-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'} focus:ring-2 focus:ring-blue-500 w-64`}
//                 />
//               </div>

//               <button
//                 onClick={() => setDarkMode(!darkMode)}
//                 className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'}`}
//               >
//                 {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
//               </button>

//               <div className="relative">
//                 <button className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} relative`}>
//                   <Bell className="w-5 h-5" />
//                   {notifications > 0 && (
//                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
//                       {notifications}
//                     </span>
//                   )}
//                 </button>
//               </div>

//               <div className="relative">
//                 <button
//                   onClick={() => setShowUserMenu(!showUserMenu)}
//                   className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
//                 >
//                   <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
//                     <User className="w-5 h-5 text-white" />
//                   </div>
//                   <div className="text-left hidden md:block">
//                     <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin User</p>
//                     <p className="text-xs text-gray-500">SuperAdmin</p>
//                   </div>
//                   <ChevronDown className="w-4 h-4" />
//                 </button>

//                 {showUserMenu && (
//                   <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
//                     <button
//                       onClick={handleLogout}
//                       className={`w-full flex items-center space-x-2 px-4 py-3 hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700 text-white' : ''} rounded-lg`}
//                     >
//                       <LogOut className="w-4 h-4" />
//                       <span>Logout</span>
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </header>

//         {/* Dashboard Content */}
//         {currentPage === 'dashboard' && (
//           <main className="p-6 space-y-6">
//             {/* Device Status Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//               <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//                     <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
//                   </div>
//                   <span className="text-green-500 text-sm font-semibold">+2.5%</span>
//                 </div>
//                 <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{deviceStats.active.toLocaleString()}</h3>
//                 <p className="text-gray-500 text-sm">Active Devices</p>
//               </div>

//               <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
//                     <AlertTriangle className="w-6 h-6 text-red-500" />
//                   </div>
//                   <span className="text-red-500 text-sm font-semibold">-1.2%</span>
//                 </div>
//                 <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{deviceStats.faulty}</h3>
//                 <p className="text-gray-500 text-sm">Faulty Devices</p>
//               </div>

//               <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
//                     <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
//                   </div>
//                   <span className="text-gray-500 text-sm font-semibold">0%</span>
//                 </div>
//                 <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{deviceStats.inactive}</h3>
//                 <p className="text-gray-500 text-sm">Inactive Devices</p>
//               </div>

//               <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
//                     <Cpu className="w-6 h-6 text-orange-500" />
//                   </div>
//                   <span className="text-orange-500 text-sm font-semibold">+5.8%</span>
//                 </div>
//                 <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{deviceStats.total.toLocaleString()}</h3>
//                 <p className="text-gray-500 text-sm">Total Devices</p>
//               </div>
//             </div>

//             {/* Inventory & Environmental Section */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* Sales & Inventory */}
//               <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
//                 <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Inventory & Sales</h3>
//                 <div className="flex items-center justify-center mb-6">
//                   <div className="relative w-48 h-48">
//                     <svg className="transform -rotate-90 w-48 h-48">
//                       <circle cx="96" cy="96" r="80" stroke={darkMode ? '#374151' : '#E5E7EB'} strokeWidth="16" fill="none" />
//                       <circle
//                         cx="96"
//                         cy="96"
//                         r="80"
//                         stroke="#3B82F6"
//                         strokeWidth="16"
//                         fill="none"
//                         strokeDasharray={`${2 * Math.PI * 80 * salesData.percentage / 100} ${2 * Math.PI * 80}`}
//                         strokeLinecap="round"
//                       />
//                     </svg>
//                     <div className="absolute inset-0 flex flex-col items-center justify-center">
//                       <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{salesData.percentage}%</span>
//                       <span className="text-sm text-gray-500">Sold</span>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-gray-500 text-sm mb-1">Vehicles Sold</p>
//                     <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{salesData.sold.toLocaleString()}</p>
//                   </div>
//                   <div>
//                     <p className="text-gray-500 text-sm mb-1">Total Inventory</p>
//                     <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{salesData.inventory.toLocaleString()}</p>
//                   </div>
//                 </div>
//               </div>

//               {/* Environmental Impact */}
//               <div className={`${darkMode ? 'bg-gradient-to-br from-green-800 to-emerald-900' : 'bg-gradient-to-br from-green-500 to-emerald-600'} rounded-xl shadow-lg p-6 text-white`}>
//                 <h3 className="text-xl font-bold mb-6">Environmental Impact</h3>
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur">
//                     <div>
//                       <p className="text-sm opacity-90 mb-1">CO₂ Saved</p>
//                       <p className="text-2xl font-bold">{environmentalData.co2Saved.toLocaleString()} kg</p>
//                     </div>
//                     <div className="text-4xl">🌱</div>
//                   </div>
//                   <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur">
//                     <div>
//                       <p className="text-sm opacity-90 mb-1">Total Distance</p>
//                       <p className="text-2xl font-bold">{environmentalData.totalKm.toLocaleString()} km</p>
//                     </div>
//                     <div className="text-4xl">🛵</div>
//                   </div>
//                   <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg backdrop-blur">
//                     <div>
//                       <p className="text-sm opacity-90 mb-1">Trees Equivalent</p>
//                       <p className="text-2xl font-bold">{environmentalData.treesEquivalent.toLocaleString()}</p>
//                     </div>
//                     <div className="text-4xl">🌳</div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Quick Actions */}
//             <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
//               <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Quick Actions</h3>
//               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//                 {quickActions.map((action, idx) => (
//                   <button
//                     key={idx}
//                     className={`flex flex-col items-center justify-center p-6 rounded-xl ${action.color} text-white transform hover:scale-105 transition-transform`}
//                   >
//                     <action.icon className="w-8 h-8 mb-2" />
//                     <span className="text-sm font-medium text-center">{action.label}</span>
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </main>
//         )}

//         {/* Other Pages Placeholder */}
//         {currentPage !== 'dashboard' && (
//           <main className="p-6">
//             <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center`}>
//               <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
//                 {menuItems.find(m => m.id === currentPage)?.label}
//               </h2>
//               <p className="text-gray-500 mb-6">This page is under construction</p>
//               <button
//                 onClick={() => setCurrentPage('dashboard')}
//                 className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//               >
//                 Back to Dashboard
//               </button>
//             </div>
//           </main>
//         )}
//       </div>

//       <style jsx>{`
//         @keyframes fade-in {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
//         .animate-fade-in {
//           animation: fade-in 0.5s ease-out;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default ConnectedAutoDashboard;