import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export interface UserProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  department?: string;
  job_title?: string;
  [key: string]: any;
}

export const updateUserProfile = async (userData: any) => {
  // Endpoint: /api/users/update/
  // Base URL is configured as /api (or full url ending in /api)
  // So we use /users/update/ to append to base URL
  return apiClient.put<{ user: UserProfileData }>(API_ENDPOINTS.USERS_UPDATE, userData);
};

// inside your api/user.ts
export const createUser = async (payload: any) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.USERS_CREATE, payload);
    return response; // Returns { data: ... } on success
  } catch (error) {
    // Re-throw to let the component handle it
    throw error;
  }
};

export const fetchUsers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.USERS_LIST);
    return response; // Returns { data: [...users] } on success
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};