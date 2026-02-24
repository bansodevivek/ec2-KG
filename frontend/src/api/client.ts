import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import { isDemoToken, isTokenExpired, decodeToken, generateMockJwt } from '../utils/jwt';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

const DEFAULT_TIMEOUT_MS = 20000;
const RETRY_COUNT = 2;
const RETRY_BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableAxiosError = (error: AxiosError, method: string) => {
  if (method !== 'GET') return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return error.code === 'ECONNABORTED' || message.includes('timeout') || !error.response;
};

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT_MS,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle 401 errors and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          const currentToken = localStorage.getItem('authToken');
          const isDemo = currentToken && currentToken.startsWith('demo_token_');

          if (isDemo) {
            console.warn('🔒 Demo mode: 401 error detected but session will be preserved');
            console.warn('📝 This is expected - demo tokens cannot access the real API');
            // For demo mode, return a friendly error without triggering logout
            return Promise.resolve({
              data: null,
              status: 401,
              statusText: 'Demo Mode - API not available',
              headers: {},
              config: error.config
            } as AxiosResponse);
          }

          console.log('🔄 Real API mode: Attempting token refresh for 401 error');

          // Check if already refreshing
          if (this.isRefreshing) {
            console.log('⏳ Token refresh already in progress, queuing request...');
            // Queue the request until token is refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.axiosInstance(originalRequest);
            }).catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Import refreshAuthToken dynamically to avoid circular dependency
            const { refreshAuthToken } = await import('./auth');
            const result = await refreshAuthToken();

            if (result.error || !result.data) {
              throw new Error(result.error || 'Token refresh failed');
            }

            const newToken = result.data.access;
            
            // Process queued requests with new token
            this.processQueue(newToken, null);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            
            // Process queue with error
            this.processQueue(null, refreshError);

            // Clear tokens and logout
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            localStorage.removeItem('displayName');
            localStorage.removeItem('dealerId');

            // Emit event for logout
            window.dispatchEvent(new Event('auth:session-expired'));

            return Promise.reject(new Error('Session expired'));
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(token: string | null, error: any) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private async request<T>(
    endpoint: string,
    options: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method ?? 'GET').toString().toUpperCase();
    const maxAttempts = method === 'GET' ? RETRY_COUNT + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response: AxiosResponse<T> = await this.axiosInstance({
          url: endpoint,
          ...options,
        });

        return { data: response.data };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const shouldRetry = isRetryableAxiosError(error, method) && attempt < maxAttempts - 1;
          if (shouldRetry) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(3, attempt);
            await sleep(delay);
            continue;
          }

          console.error('🔴 API Error Details:', {
            url: endpoint,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers
          });

          // Throw the error with full response data for proper error handling
          throw error;
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error('Network error occurred');
      }
    }

    throw new Error('Network error occurred');
  }

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', data });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', data });
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();