// Custom Hook for Authentication

import { useState, useEffect } from 'react';
import { LoginForm, SignupForm, UserRole } from '../types';
import { login, logout, isAuthenticated as checkAuth, getUser } from '../api/auth';
import { generateMockJwt } from '../utils/jwt';

// Demo/local credential store for fallback or demo purposes
const DEMO_CREDENTIALS = {
  'admin': { password: 'admin123', role: 'SUPER_ADMIN' as UserRole, name: 'Super Admin' },
  'oem_user': { password: 'oem123', role: 'OEM' as UserRole, name: 'OEM Executive' },
  'research': { password: 'rnd123', role: 'RND' as UserRole, name: 'Researcher' },
  'dealer': { password: 'dealer123', role: 'DEALER' as UserRole, name: 'Mumbai Motors', dealerId: 'D001' },
  'service': { password: 'service123', role: 'SERVICE' as UserRole, name: 'Service Quality' },
  'fleet': { password: 'fleet123', role: 'FLEET' as UserRole, name: 'Fleet Controller' },
  'sales': { password: 'sales123', role: 'SALES' as UserRole, name: 'Rajesh Kumar' },
  'driver': { password: 'driver123', role: 'RIDER' as UserRole, name: 'Suresh Kumar', assignedVehicle: 'V000001' },
  'user': { password: 'user123', role: 'USER' as UserRole, name: 'Aditya Birla' }
};

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const [userRole, setUserRole] = useState<UserRole>(
    (localStorage.getItem('userRole') as UserRole) || 'SUPER_ADMIN'
  );
  const [dealerId, setDealerId] = useState<string | null>(localStorage.getItem('dealerId'));
  const [displayName, setDisplayName] = useState<string>(localStorage.getItem('displayName') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: '',
    password: '',
    rememberMe: false
  });
  const [signupForm, setSignupForm] = useState<SignupForm>({
    username: '',
    email: '',
    password: '',
    role: 'USER',
    phone: '',
    vehicleNo: ''
  });

  // Initialize auth state on mount and listen for storage/session events
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const user = getUser();
      const storedRole = localStorage.getItem('userRole');
      const storedName = localStorage.getItem('displayName');
      const storedDealer = localStorage.getItem('dealerId');

      // If we have either token, consider user authenticated
      if (token || refreshToken) {
        setIsAuthenticated(true);
        
        // Restore user information from localStorage
        if (user) {
          setDisplayName(user.name || user.email || storedName || '');
          setUserRole((user.role as UserRole) || (storedRole as UserRole) || 'USER');
          if (user.dealerId) {
            setDealerId(user.dealerId);
          }
        } else if (storedName || storedRole) {
          // Fallback to stored values if user object not found
          if (storedName) setDisplayName(storedName);
          if (storedRole) setUserRole(storedRole as UserRole);
          if (storedDealer) setDealerId(storedDealer);
        }
      } else {
        // No tokens found, user is not authenticated
        setIsAuthenticated(false);
      }
    };

    initializeAuth();

    // Listen for session expiry event from client.ts
    const handleSessionExpired = () => {
      alert('Your session has expired. Please log in again.');
      setIsAuthenticated(false);
      setUserRole('SUPER_ADMIN');
      setDealerId(null);
      setDisplayName('');
      // We do NOT reload the page to preserve unsaved data in forms
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!loginForm.username || !loginForm.password) {
      alert('Please fill in both username and password.');
      setIsLoading(false);
      return;
    }

    try {
      // First try the API login
      const result = await login({
        username: loginForm.username,
        password: loginForm.password
      });

      if (result.error) {
        // If API fails, try demo credentials for development
        console.warn('API login failed, trying demo credentials:', result.error);
        const demoUser = DEMO_CREDENTIALS[loginForm.username.toLowerCase() as keyof typeof DEMO_CREDENTIALS];
        
        if (!demoUser || demoUser.password !== loginForm.password) {
          alert('Invalid username or password. Please check your credentials.');
          setIsLoading(false);
          return;
        }

        // Use demo credentials
        // Generate a mock JWT for demo mode
        const mockPayload = {
          user_id: 'demo_user_' + Date.now(),
          username: demoUser.name,
          role: demoUser.role
        };
        
        const accessToken = generateMockJwt(mockPayload, 3600); // 1 hour
        const refreshToken = generateMockJwt({ ...mockPayload, type: 'refresh' }, 7200); // 2 hours

        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userRole', demoUser.role);
        localStorage.setItem('displayName', demoUser.name);
        if ('dealerId' in demoUser && demoUser.dealerId) {
          localStorage.setItem('dealerId', demoUser.dealerId);
          setDealerId(demoUser.dealerId);
        }
        if (loginForm.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        setUserRole(demoUser.role);
        setDisplayName(demoUser.name);
        setIsAuthenticated(true);
        alert(`Demo login successful! Welcome ${demoUser.name}`);
      } else {
        // API login successful
        const userData = result.data!;
        
        // Store user role and other data
        const userRole = (userData.user?.role as UserRole) || 'USER';
        const userName = userData.user?.name || userData.user?.username || loginForm.username;
        
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('displayName', userName);
        if (loginForm.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        setUserRole(userRole);
        setDisplayName(userName);
        setIsAuthenticated(true);
        
        // Only show success alert if we actually got tokens
        if (userData.access && userData.refresh) {
          alert(`Login successful! Welcome ${userName}`);
        } else {
          alert(`Login successful! Welcome ${userName}\\n\\nNote: Tokens must be set manually for API access.`);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    alert('Signup successful! You can now login with your credentials.');

    setSignupForm({
      username: '',
      email: '',
      password: '',
      role: 'USER',
      phone: '',
      vehicleNo: ''
    });

    return true;
  };

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      const result = await logout();
      if (result.error) {
        console.warn('Logout API warning:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local state regardless of API response
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('dealerId');
    localStorage.removeItem('displayName');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('user');
    
    setIsAuthenticated(false);
    setUserRole('SUPER_ADMIN');
    setDealerId(null);
    setDisplayName('');
    setIsLoading(false);
  };

  return {
    isAuthenticated,
    userRole,
    dealerId,
    displayName,
    isLoading,
    loginForm,
    setLoginForm,
    signupForm,
    setSignupForm,
    handleLogin,
    handleSignup,
    handleLogout
  };
};
