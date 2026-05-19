import { ApiResponse, PaginatedResponse, User, Venue, Item, Claim, CreateItemForm } from '@/types';

export type ParcelTier = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface AiParcelDimensions {
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

// Specific payload returned by AI feature extraction endpoint
export interface ExtractedItemFeatures {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  color?: string;
  brand?: string;
  model?: string;
  locationFound?: string;
  /** AI's t-shirt size pick. */
  parcel_tier?: ParcelTier;
  /** AI's upper-bound dim estimate (after bubble wrap + box). */
  ai_dimensions?: AiParcelDimensions;
  fragility?: 'high' | 'medium' | 'low';
  packaging_plan?: string;
}

/**
 * The backend returns dimension data nested under ai_dimensions.
 * Flatten them to top-level Item fields for use in the UI.
 */
function flattenItem(raw: Record<string, unknown>): Item {
  const dims = raw.ai_dimensions as
    | { weight_kg?: number; length_cm?: number; width_cm?: number; height_cm?: number }
    | undefined;
  return {
    ...raw,
    weight_kg: dims?.weight_kg,
    length_cm: dims?.length_cm,
    width_cm: dims?.width_cm,
    height_cm: dims?.height_cm,
  } as Item;
}

// Get API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'https://staging-api.vfetch.co.uk/api';

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

// Helper function to make API requests
// Cookies (access_token, refresh_token) are httpOnly and sent automatically by the browser.

// Tracks an in-flight refresh so concurrent 401s share one refresh attempt.
let refreshPromise: Promise<void> | null = null;

async function attemptTokenRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/venue-auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok) throw new Error('refresh_failed');
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const config: RequestInit = {
    credentials: 'include',
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (response.status === 401 && !isRetry && !endpoint.includes('/venue-auth/')) {
    try {
      await attemptTokenRefresh();
      return apiRequest<T>(endpoint, options, true);
    } catch {
      // Refresh failed — fall through to throw the original 401
    }
  }

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
    createStaff: async (venueId: string, data: Record<string, unknown>) => {
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

    getEarnings: async (venueId: string, months = 6) => {
      return apiRequest<ApiResponse<{
        months: Array<{ month: string; claim_count: number; gross_pence: number; platform_fee_pence: number; net_pence: number }>;
      }>>(`/venues/${venueId}/earnings?months=${months}`);
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
      const resp = await apiRequest<ApiResponse<Item>>(`/items/${id}`);
      if (resp.success && resp.data) {
        resp.data = flattenItem(resp.data as unknown as Record<string, unknown>);
      }
      return resp;
    },

    create: async (data: CreateItemForm) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'images' && value) {
          (value as File[]).forEach(file => formData.append('images', file));
        } else if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          // Multipart can only carry strings/Blobs — JSON-encode nested objects
          // (e.g. aiDimensions). The backend has a customSanitizer that JSON.parses
          // these fields back into objects before express-validator runs.
          if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value as string);
          }
        }
      });
      return apiRequest<ApiResponse<Item>>('/items', {
        method: 'POST',
        body: formData,
      });
    },

    update: async (id: string, data: Partial<Item>) => {
      // Re-nest flat dimension fields back into ai_dimensions for the backend.
      const { weight_kg, length_cm, width_cm, height_cm, ...rest } = data;
      const hasDims = [weight_kg, length_cm, width_cm, height_cm].some(v => v !== undefined);
      const payload: Record<string, unknown> = { ...rest };
      if (hasDims) {
        payload.ai_dimensions = {
          ...(rest.ai_dimensions ?? {}),
          ...(weight_kg !== undefined && { weight_kg }),
          ...(length_cm !== undefined && { length_cm }),
          ...(width_cm !== undefined && { width_cm }),
          ...(height_cm !== undefined && { height_cm }),
        };
      }
      const resp = await apiRequest<ApiResponse<Item>>(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (resp.success && resp.data) {
        resp.data = flattenItem(resp.data as unknown as Record<string, unknown>);
      }
      return resp;
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
      const resp = await apiRequest<ApiResponse<PaginatedResponse<Item>>>(`/items/venue/${venueId}${queryString}`);
      if (resp.success && resp.data?.data) {
        resp.data.data = resp.data.data.map((item) =>
          flattenItem(item as unknown as Record<string, unknown>)
        );
      }
      return resp;
    },

    // Extract features from 1–2 images in a single AI call
    extractFeatures: async (images: File[]) => {
      const formData = new FormData();
      images.forEach(img => formData.append('image', img));

      return apiRequest<ApiResponse<ExtractedItemFeatures>>('/items/extract-features', {
        method: 'POST',
        body: formData,
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
    updateStatus: async (id: string, status: 'approved' | 'rejected', reason?: string) => {
      return apiRequest<ApiResponse<Claim>>(`/claims/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      });
    },

    markCollected: async (id: string, method?: string, pickupCode?: string) => {
      return apiRequest<ApiResponse<Claim>>(`/claims/${id}/collect`, {
        method: 'POST',
        body: JSON.stringify({
          collection_mode: method,
          ...(pickupCode ? { pickupCode } : {}),
        }),
      });
    },

    // Get claims for a specific venue
    getByVenue: async (venueId: string, params?: Record<string, string | number>) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<Claim>>>(`/claims/venue/${venueId}${queryString}`);
    },
  },

  // Notification endpoints
  notifications: {
    getAll: async (params?: { isRead?: boolean; limit?: number; page?: number }) => {
      const qp = new URLSearchParams();
      if (params?.isRead !== undefined) qp.set('isRead', String(params.isRead));
      if (params?.limit) qp.set('limit', String(params.limit));
      if (params?.page) qp.set('page', String(params.page));
      const qs = qp.toString() ? `?${qp.toString()}` : '';
      return apiRequest<ApiResponse<PaginatedResponse<{
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: string;
        data?: Record<string, unknown>;
        is_read: boolean;
        created_at: string;
      }>>>(`/notifications${qs}`);
    },

    getUnreadCount: async () => {
      return apiRequest<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    },

    markAsRead: async (id: string) => {
      return apiRequest<ApiResponse<null>>(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    },

    markAllAsRead: async () => {
      return apiRequest<ApiResponse<null>>('/notifications/mark-all-read', {
        method: 'PATCH',
      });
    },

    delete: async (id: string) => {
      return apiRequest<ApiResponse<null>>(`/notifications/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Audit log endpoints
  audit: {
    getByEntity: async (entityType: string, entityId: string) => {
      return apiRequest<ApiResponse<Record<string, unknown>[]>>(`/audit?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`);
    },

    getAll: async (limit: number = 100) => {
      return apiRequest<ApiResponse<Record<string, unknown>[]>>(`/audit?limit=${limit}`);
    },
  },

  // File upload endpoints
  upload: {
    image: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      return apiRequest<ApiResponse<{ url: string }>>('/upload/image', {
        method: 'POST',
        body: formData,
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
