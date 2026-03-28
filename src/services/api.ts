import { ApiResponse, PaginatedResponse, User, Venue, Item, Claim } from '@/types';

// Specific payload returned by AI feature extraction endpoint
interface ExtractedItemFeatures {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  color?: string;
  brand?: string;
  model?: string;
  locationFound?: string;
}

// Get API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || 'API request failed',
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  // Auth endpoints (venue-specific authentication)
  auth: {
    login: async (email: string, password: string) => {
      return apiRequest<ApiResponse<{ user: User; token: string; refreshToken: string }>>('/venue-auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    logout: async () => {
      return apiRequest<ApiResponse<null>>('/venue-auth/logout', {
        method: 'POST',
      });
    },

    me: async () => {
      return apiRequest<ApiResponse<User>>('/venue-auth/me');
    },

    refresh: async (refreshToken: string) => {
      return apiRequest<ApiResponse<{ token: string }>>('/venue-auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    register: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      venue_id: string; // Changed to snake_case for backend consistency
      phoneNumber?: string;
      role?: string;
    }) => {
      return apiRequest<ApiResponse<{ user: User; token: string; refreshToken: string }>>('/venue-auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return apiRequest<ApiResponse<null>>('/venue-auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    forgotPassword: async (email: string) => {
      return apiRequest<ApiResponse<null>>('/venue-auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    verifyResetToken: async (token: string, email: string) => {
      return apiRequest<ApiResponse<{ valid: boolean }>>('/venue-auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({ token, email }),
      });
    },

    resetPassword: async (token: string, newPassword: string, email: string) => {
      return apiRequest<ApiResponse<null>>('/venue-auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword, email }),
      });
    },

    adminDeleteUser: async (id: string) => {
      return apiRequest<ApiResponse<null>>(`/venue-auth/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Venue endpoints
  venues: {
    getById: async (id: string) => {
      return apiRequest<ApiResponse<Venue>>(`/venues/${id}`);
    },

    // Get venue data for the authenticated venue staff member
    getMyVenue: async () => {
      return apiRequest<ApiResponse<Venue>>('/venues/my-venue');
    },

    update: async (id: string, data: Partial<Venue>) => {
      return apiRequest<ApiResponse<Venue>>(`/venues/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getAll: async (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Venue>>>(`/venues${queryString}`);
    },

    // Create staff member (venue_admin only)
    createStaff: async (venueId: string, data: any) => {
      return apiRequest<ApiResponse<User>>(`/venues/${venueId}/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Update staff member (venue_admin only)
    updateStaff: async (venueId: string, userId: string, data: Partial<User>) => {
      return apiRequest<ApiResponse<User>>(`/venues/${venueId}/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // Delete staff member (venue_admin only)
    deleteStaff: async (venueId: string, userId: string) => {
      return apiRequest<ApiResponse<{ message: string }>>(`/venues/${venueId}/users/${userId}`, {
        method: 'DELETE',
      });
    },

    // Get staff members
    getStaff: async (venueId: string) => {
      return apiRequest<ApiResponse<User[]>>(`/venues/${venueId}/staff`);
    },

    // Admin endpoints
    adminGetAll: async (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Venue>>>(`/venues/admin/all${queryString}`);
    },

    adminGetStats: async () => {
      return apiRequest<ApiResponse<{ total: number; pending: number; approved: number; rejected: number; suspended: number }>>('/venues/admin/stats');
    },

    adminGetById: async (id: string) => {
      return apiRequest<ApiResponse<Venue>>(`/venues/admin/${id}`);
    },

    adminCreate: async (data: Partial<Venue>) => {
      return apiRequest<ApiResponse<Venue>>('/venues/admin', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    adminUpdateStatus: async (id: string, status: string) => {
      return apiRequest<ApiResponse<Venue>>(`/venues/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    adminDelete: async (id: string) => {
      return apiRequest<ApiResponse<null>>(`/venues/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Item endpoints
  items: {
    getAll: async (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Item>>>(`/items${queryString}`);
    },

    getById: async (id: string) => {
      return apiRequest<ApiResponse<Item>>(`/items/${id}`);
    },

    create: async (data: Partial<Item>) => {
      return apiRequest<ApiResponse<Item>>('/items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: Partial<Item>) => {
      return apiRequest<ApiResponse<Item>>(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string, reason?: string) => {
      return apiRequest<ApiResponse<null>>(`/items/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    // Get items for a specific venue
    getByVenue: async (venueId: string, params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Item>>>(`/items/venue/${venueId}${queryString}`);
    },

    // Extract features from uploaded image
    extractFeatures: async (image: File) => {
      const formData = new FormData();
      formData.append('image', image);

      const token = getAuthToken();
      if (!token) {
        throw new ApiError('Access token is missing', 401);
      }

      return apiRequest<ApiResponse<ExtractedItemFeatures>>('/items/extract-features', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
  },

  // Claim endpoints
  claims: {
    getAll: async (params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Claim>>>(`/claims${queryString}`);
    },

    getById: async (id: string) => {
      return apiRequest<ApiResponse<Claim>>(`/claims/${id}`);
    },

    // Update claim status (currently supports 'approved' or 'rejected')
    updateStatus: async (id: string, status: 'approved' | 'rejected') => {
      return apiRequest<ApiResponse<Claim>>(`/claims/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    markCollected: async (id: string, method?: string) => {
      return apiRequest<ApiResponse<Claim>>(`/claims/${id}/collect`, {
        method: 'POST',
        body: JSON.stringify({ collection_method: method }),
      });
    },

    // Get claims for a specific venue
    getByVenue: async (venueId: string, params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Claim>>>(`/claims/venue/${venueId}${queryString}`);
    },
  },

  // Audit log endpoints
  audit: {
    getByEntity: async (entityType: string, entityId: string) => {
      return apiRequest<ApiResponse<any[]>>(`/audit?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`);
    },

    getAll: async (limit: number = 100) => {
      return apiRequest<ApiResponse<any[]>>(`/audit?limit=${limit}`);
    },
  },

  // File upload endpoints
  upload: {
    image: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const token = getAuthToken();
      return fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new ApiError(
            data.error || 'Upload failed',
            response.status,
            data
          );
        }
        return data;
      });
    },
  },

  // Generic POST method
  post: async <TResponse, TBody = unknown>(endpoint: string, body: TBody, options: RequestInit = {}) => {
    return apiRequest<ApiResponse<TResponse>>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...options,
    });
  },
};

export { ApiError };