import { apiClient } from './client';
import { API_BASE_URL, API_ENDPOINTS } from './config';

/**
 * Fleet interface matching backend response
 */
export interface Fleet {
  id: number;
  name: string;
  description: string;
  manager_id: number;
  manager_username: string;
  manager_email: string;
  manager_phone: string;
  members: any[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Payload for creating a new fleet
 * POST /api/fleets/
 */
export interface CreateFleetPayload {
  fleet_name: string;
  fleet_description?: string;
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  state?: string;
  location?: string;
  fleet_code?: string;
}

/**
 * Payload for updating an existing fleet
 * PUT /api/fleets/{id}/
 * Only fleet_name and fleet_description can be updated
 */
export interface UpdateFleetPayload {
  fleet_name?: string;
  fleet_description?: string;
}

/**
 * Response from fleet deletion API
 */
export interface DeleteFleetResponse {
  success: boolean;
  message: string;
}

/**
 * Response from fleet creation API
 */
export interface CreateFleetResponse {
  success: boolean;
  message: string;
  fleet: Fleet;
}

/**
 * POST /api/fleets/
 * Creates a new fleet with a fleet manager
 * Authorization: SUPERADMIN, OEM, RND, SALES
 * 
 * @param payload - Fleet and manager information
 * @returns Promise with fleet creation response
 */
export const createFleet = async (payload: CreateFleetPayload): Promise<CreateFleetResponse> => {
  try {
    const response = await apiClient.post<CreateFleetResponse>('/fleets/', payload);
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  } catch (error: any) {
    const backendErrors = error.response?.data;
    console.error('❌ Fleet creation failed:', backendErrors);

    // Format error message from backend validation errors
    let errorMessage = 'Failed to create fleet';
    if (typeof backendErrors === 'object' && backendErrors !== null) {
      const errors = Object.entries(backendErrors)
        .map(([key, val]: any) => {
          const msg = Array.isArray(val) ? val[0] : val;
          return `${key}: ${msg}`;
        })
        .join(' | ');
      if (errors) errorMessage = errors;
    } else if (backendErrors?.message) {
      errorMessage = backendErrors.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * GET /api/fleets/
 * Get all fleets (optional - for future use)
 */
export const getAllFleets = async (): Promise<Fleet[]> => {
  try {
    const response = await apiClient.get<Fleet[]>('/fleets/');
    return response.data ?? [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch fleets');
  }
};

/**
 * GET /api/fleets/{id}/
 * Get fleet by ID (optional - for future use)
 */
export const getFleetById = async (fleetId: number): Promise<Fleet> => {
  try {
    const response = await apiClient.get<Fleet>(`/fleets/${fleetId}/`);
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch fleet');
  }
};

/**
 * PUT /api/fleets/{id}/
 * Update fleet information
 * Authorization: SUPERADMIN, OEM, RND, SALES
 * 
 * @param fleetId - Fleet ID to update
 * @param payload - Updated fleet information
 * @returns Promise with updated fleet data
 */
export const updateFleet = async (fleetId: number, payload: UpdateFleetPayload): Promise<Fleet> => {
  try {
    console.log('🔄 Updating fleet via API...');
    console.log('Fleet ID:', fleetId);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Full URL:', `${API_BASE_URL}/fleets/${fleetId}/`);
    
    const response = await apiClient.put<Fleet>(`/fleets/${fleetId}/`, payload);
    
    console.log('✅ Fleet update response:', response);
    console.log('Response data:', response.data);
    console.log('Response status:', response.status);
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  } catch (error: any) {
    const backendErrors = error.response?.data;
    const statusCode = error.response?.status;

    console.error('❌ Fleet update failed:');
    console.error('Status Code:', statusCode);
    console.error('Error Response:', error.response);
    console.error('Backend Errors:', backendErrors);
    console.error('Full Error:', error);

    let errorMessage = 'Failed to update fleet';
    
    // Handle 404 specifically
    if (statusCode === 404) {
      errorMessage = `Fleet ID ${fleetId} not found. The fleet may have been deleted or doesn't exist. Please refresh the fleet list to see available fleets.`;
    } else if (statusCode === 403) {
      errorMessage = `Permission denied. Only SUPER_ADMIN, OEM, RND, or SALES roles can edit fleets.`;
    } else if (statusCode === 401) {
      errorMessage = `Authentication failed. Please log in again.`;
    } else if (typeof backendErrors === 'object' && backendErrors !== null) {
      const errors = Object.entries(backendErrors)
        .map(([key, val]: any) => {
          const msg = Array.isArray(val) ? val[0] : val;
          return `${key}: ${msg}`;
        })
        .join(' | ');
      if (errors) errorMessage = errors;
    } else if (backendErrors?.message) {
      errorMessage = backendErrors.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * DELETE /api/fleets/{id}/
 * Delete a fleet
 * Authorization: SUPERADMIN, OEM, RND, SALES
 * 
 * @param fleetId - Fleet ID to delete
 * @returns Promise with delete response
 */
export const deleteFleet = async (fleetId: number): Promise<DeleteFleetResponse> => {
  try {
    const response = await apiClient.delete<DeleteFleetResponse>(`/fleets/${fleetId}/`);
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  } catch (error: any) {
    const backendErrors = error.response?.data;
    console.error('❌ Fleet deletion failed:', backendErrors);

    let errorMessage = 'Failed to delete fleet';
    if (backendErrors?.message) {
      errorMessage = backendErrors.message;
    } else if (typeof backendErrors === 'string') {
      errorMessage = backendErrors;
    }

    throw new Error(errorMessage);
  }
};

/**
 * Fleet Member interface
 */
export interface FleetMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  role_display?: string;
}

/**
 * GET /api/fleets/members/
 * Get all members of a fleet
 * 
 * @param fleetId - Fleet ID (currently unused by endpoint)
 * @returns Promise with array of fleet members
 */
export const getFleetMembers = async (fleetId: number): Promise<FleetMember[]> => {
  // GET disabled by request: do not call the API here.
  // const response = await apiClient.get<FleetMember[]>('/fleets/members/');
  // return response.data ?? [];
  return [];
};

/**
 * POST /api/fleets/members/
 * Add an existing user as a member to a fleet
 * Authorization: SUPERADMIN, OEM, RND, SALES, FLEET
 * 
 * @param payload - Contains fleet_id and member_id
 * @returns Promise with success response
 */
export interface AddMemberToFleetPayload {
  fleet_id: number;
  member_id: number;
}

export const addMemberToFleet = async (payload: AddMemberToFleetPayload): Promise<any> => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.FLEETS_MEMBERS, payload);
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  } catch (error: any) {
    const backendErrors = error.response?.data;
    console.error('❌ Failed to add fleet member:', backendErrors);

    let errorMessage = 'Failed to add fleet member';
    if (typeof backendErrors === 'object' && backendErrors !== null) {
      const errors = Object.entries(backendErrors)
        .map(([key, val]: any) => {
          const msg = Array.isArray(val) ? val[0] : val;
          return `${key}: ${msg}`;
        })
        .join(' | ');
      if (errors) errorMessage = errors;
    } else if (backendErrors?.message) {
      errorMessage = backendErrors.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * DELETE /api/fleets/{id}/members/{member_id}/
 * Remove a member from a fleet
 * Authorization: SUPERADMIN, OEM, RND, SALES, FLEET
 * 
 * @param fleetId - Fleet ID
 * @param memberId - Member ID to remove
 * @returns Promise with delete response
 */
export const removeFleetMember = async (fleetId: number, memberId: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/fleets/${fleetId}/members/${memberId}/`);
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    return response.data;
  } catch (error: any) {
    const backendErrors = error.response?.data;
    console.error('❌ Failed to remove fleet member:', backendErrors);

    let errorMessage = 'Failed to remove fleet member';
    if (backendErrors?.message) {
      errorMessage = backendErrors.message;
    } else if (typeof backendErrors === 'string') {
      errorMessage = backendErrors;
    }

    throw new Error(errorMessage);
  }
};
