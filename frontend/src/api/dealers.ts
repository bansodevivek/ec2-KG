import { apiClient } from './client';
import { API_BASE_URL } from './config';

export interface Dealer {
  id?: number;
  reference_no: string;
  dealer_code: string;
  dealership_name: string;
  partner_name: string;
  email_id: string;
  mobile_no: string;
  state: string;
  location: string;
  lead_status: string;
}

export interface CreateDealerPayload {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  reference_no: string;
  dealer_code: string;
  dealership_name: string;
  for_party_creation: string;
  dealer_address: string;
  state: string;
  zone: string;
  location: string;
  pin_code: string;
  gst_no: string;
  loi_date: string;
  loi_valid_upto: string;
  lead_status: string;
}

export interface DealerInventoryItem {
  vin: string;
  dealer_name: string;
  assigned_date: string;
}

export interface DealerStatistics {
  total_assigned: number;
  total_sold: number;
  total_inventory: number;
}

export interface DealerDashboardData {
  statistics: DealerStatistics;
  inventory: DealerInventoryItem[];
  selling_history: DealerInventoryItem[];
}

export interface DealerDashboardResponse {
  success: boolean;
  data: DealerDashboardData;
}

/**
 * Fetch all dealers from the API
 * @returns Promise with dealers data
 */
export const fetchDealers = async () => {
  try {
    console.log('📍 Fetching dealers from:', `${API_BASE_URL}/dealers/`);

    const response = await apiClient.get(`${API_BASE_URL}/dealers/`);

    let dealersData: Dealer[] = [];
    const data: any = response.data;
    if (data) {
      if (Array.isArray(data)) {
        dealersData = data;
      } else if (data.results && Array.isArray(data.results)) {
        dealersData = data.results;
      } else if (data.dealers && Array.isArray(data.dealers)) {
        dealersData = data.dealers;
      } else if (data.data && Array.isArray(data.data)) {
        dealersData = data.data;
      }
    }

    console.log('✅ Dealers fetched successfully:', dealersData);

    return {
      success: true,
      data: dealersData || []
    };
  } catch (err: any) {
    console.error('❌ Failed to fetch dealers:', err);

    return {
      success: false,
      data: [],
      error: err.message || 'Failed to fetch dealers'
    };
  }
};

/**
 * Create a new dealer
 * @param dealerData - The dealer data to create
 * @returns Promise with creation result
 */
export const createDealer = async (dealerData: CreateDealerPayload) => {
  try {
    console.log('📍 Creating dealer at:', `${API_BASE_URL}/dealers/create/`);
    console.log('📦 Payload:', dealerData);

    const response = await apiClient.post(`${API_BASE_URL}/dealers/create/`, dealerData);

    console.log('✅ Dealer created successfully:', response.data);

    return {
      success: true,
      data: response.data
    };
  } catch (err: any) {
    console.error('❌ Failed to create dealer:', err);

    return {
      success: false,
      error: err.response?.data?.message || err.message || 'Failed to create dealer'
    };
  }
};

/**
 * Fetch dealer dashboard data (statistics and inventory)
 * @param dealerCode - The dealer code
 * @returns Promise with dashboard data
 */
export const fetchDealerDashboard = async (dealerCode: string) => {
  try {
    console.log('📍 Fetching dealer dashboard:', `${API_BASE_URL}/dealers/dashboard/${dealerCode}/`);

    const response = await apiClient.get<DealerDashboardResponse>(
      `${API_BASE_URL}/dealers/dashboard/${dealerCode}/`
    );

    if (response.data?.success && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    }

    return {
      success: false,
      error: 'No dashboard data received'
    };
  } catch (err: any) {
    console.error('❌ Failed to fetch dealer dashboard:', err);

    return {
      success: false,
      error: err.response?.data?.message || err.message || 'Failed to fetch dashboard data'
    };
  }
};

// ────────────────────────────────────────────────
// ADD CUSTOMER / SELL VEHICLE
// Endpoint: POST /api/dealers/sell-vehicle/
// ────────────────────────────────────────────────

export interface CustomerPayload {
  dealer_code: string;
  vin: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  sale_date: string;
  sale_price: string;
}

export const addCustomer = async (payload: CustomerPayload) => {
  try {
    console.log('📍 Selling vehicle / adding customer at:', `${API_BASE_URL}/dealers/sell-vehicle/`);
    console.log('📦 Payload:', payload);

    const response = await apiClient.post(`${API_BASE_URL}/dealers/sell-vehicle/`, payload);

    console.log('✅ Customer added successfully:', response.data);

    return { success: true, data: response.data };
  } catch (err: any) {
    console.error('❌ Failed to add customer:', err);

    return {
      success: false,
      error:
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to add customer'
    };
  }
};

