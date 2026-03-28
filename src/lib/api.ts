import { ApiResponse, PaginatedResponse, Item, Claim, Venue, CreateItemForm, UpdateVenueForm } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Don't set Content-Type for FormData, browser does it with boundary
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: Record<string, unknown>; token: string }>> {
    // TODO: Implement actual login API endpoint integration
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    // TODO: Implement logout endpoint in backend (/api/auth/logout POST)
    this.clearToken();
  }

  // Items endpoints
  async getVenueItems(
    venueId: string,
    params: {
      status?: string;
      category?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<PaginatedResponse<Item>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/items/venue/${venueId}?${searchParams}`);
  }

  async createItem(formData: CreateItemForm): Promise<ApiResponse<Item>> {
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'images' && value) {
        (value as File[]).forEach(file => {
          data.append('images', file);
        });
      } else if (key === 'tags' && Array.isArray(value)) {
        data.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        data.append(key, value as string);
      }
    });

    // The request method needs to be called without 'Content-Type' header for FormData
    return this.request('/items', {
      method: 'POST',
      body: data,
    });
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<ApiResponse<Item>> {
    return this.request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteItem(id: string): Promise<ApiResponse<void>> {
    return this.request(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Claims endpoints
  async getVenueClaims(
    venueId: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<PaginatedResponse<Claim>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/claims/venue/${venueId}?${searchParams}`);
  }

  async updateClaimStatus(id: string, status: 'approved' | 'rejected'): Promise<ApiResponse<Claim>> {
    return this.request(`/claims/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Venue endpoints
  async getVenue(id: string): Promise<ApiResponse<Venue>> {
    return this.request(`/venues/${id}`);
  }

  async updateVenue(id: string, updates: UpdateVenueForm): Promise<ApiResponse<Venue>> {
    return this.request(`/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Admin Venues endpoints
  async getAdminVenues(params: { status?: string; type?: string; city?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<PaginatedResponse<Venue>>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, value.toString());
    });
    return this.request(`/venues/admin/all?${searchParams}`);
  }

  async getAdminVenue(id: string): Promise<ApiResponse<Venue>> {
    return this.request(`/venues/admin/${id}`);
  }

  async createAdminVenue(data: Partial<Venue>): Promise<ApiResponse<Venue>> {
    return this.request('/venues/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminVenueStatus(id: string, status: string): Promise<ApiResponse<Venue>> {
    return this.request(`/venues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteAdminVenue(id: string): Promise<ApiResponse<void>> {
    return this.request(`/venues/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Venue Users endpoints
  async getVenueStaff(venueId: string): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request(`/venues/${venueId}/staff`);
  }

  async createVenueStaff(data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/venue-auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteVenueStaff(userId: string): Promise<ApiResponse<void>> {
    return this.request(`/venue-auth/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();