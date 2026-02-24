import axios from 'axios';
import { API_ENDPOINTS } from './config';
import { apiClient } from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    role?: string;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export const login = async (
  credentials: LoginCredentials
): Promise<{ data?: LoginResponse; error?: string }> => {
  try {
    const result = await apiClient.post<any>('/login/', credentials);

    if (result.error) {
      return { error: result.error };
    }

    const responseData = result.data!;
    
    // Handle different backend response formats
    // Format 1: {access, refresh, user} at root level
    // Format 2: {token: {access, refresh}, user}
    // Format 3: {tokens: {access, refresh}, user}
    const accessToken = responseData.access || responseData.token?.access || responseData.tokens?.access;
    const refreshToken = responseData.refresh || responseData.token?.refresh || responseData.tokens?.refresh;
    const userData = responseData.user;
    
    // Store tokens in localStorage
    if (accessToken) {
      localStorage.setItem('authToken', accessToken);
    } else {
      console.warn('⚠️ No access token in login response');
    }
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      console.warn('⚠️ No refresh token in login response');
    }

    // Store user data if available
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }

    // Return normalized format
    return { 
      data: {
        access: accessToken || '',
        refresh: refreshToken || '',
        user: userData || { id: '', username: credentials.username, email: '', name: credentials.username }
      } 
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

export const logout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    const result = await apiClient.post('/logout/', {});

    if (result.error) {
      return {
        success: true, // Still return success since we cleared local data
        error: result.error,
      };
    }

    return { success: true };
  } catch (error) {
    // Clear local storage even if network fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    return {
      success: true,
      error: error instanceof Error ? error.message : 'Network error during logout',
    };
  }
};

export interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

export const refreshAuthToken = async (): Promise<{ data?: RefreshTokenResponse; error?: string }> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return { error: 'No refresh token available' };
    }

    // Check if it's a demo token - demo tokens cannot be refreshed
    if (refreshToken.startsWith('demo_token_')) {
      return { error: 'Demo tokens cannot be refreshed' };
    }
    
    // Use axios directly to avoid interceptor recursion
    const response = await axios.post<RefreshTokenResponse>(
      API_ENDPOINTS.REFRESH_TOKEN,
      { refresh: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.data) {
      return { error: 'Token refresh failed' };
    }

    const tokenData = response.data;
    
    // Store new access token
    if (tokenData.access) {
      localStorage.setItem('authToken', tokenData.access);
    }
    
    // Store new refresh token if provided
    if (tokenData.refresh) {
      localStorage.setItem('refreshToken', tokenData.refresh);
    }

    return { data: tokenData };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        return { error: 'Refresh token expired or invalid' };
      }
    }
    
    return {
      error: error instanceof Error ? error.message : 'Network error during token refresh',
    };
  }
};

import { isTokenExpired, isDemoToken, decodeToken, generateMockJwt } from '../utils/jwt';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const refreshToken = localStorage.getItem('refreshToken');
  
  // If no token at all, not authenticated
  if (!token && !refreshToken) return false;

  // If we have a valid (non-expired) access token, we're authenticated
  if (token && !isTokenExpired(token)) return true;

  // If access token is expired but we have a refresh token, 
  // we're still considered authenticated (refresh will happen automatically)
  if (refreshToken) return true;

  return false;
};
