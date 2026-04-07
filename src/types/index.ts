// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar_url?: string;
  role: 'user' | 'venue_staff' | 'venue_admin' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  venue_id?: string; // Changed back to snake_case for backend consistency
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

// Venue types
export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  website?: string;
  type: 'bar' | 'club' | 'restaurant' | 'hotel' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  logo_url?: string;
  opening_hours?: Record<string, unknown>;
  schedule?: CollectionHours;
  created_at: string;
  updated_at: string;
}

// Collection schedule types (for venue collection hours)
export interface TimeSlot {
  open: string;
  close: string;
}

export interface CollectionHours {
  [key: string]: TimeSlot[];
}

// Item types
export interface Item {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  status: ItemStatus;
  venue_id: string;
  staff_id: string;
  date_found: string;
  images: string[];
  tags: string[];
  color?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  location_found?: string;
  is_verified: boolean;
  claim_count: number;
  venue?: Venue;
  created_at: string;
  updated_at: string;
}

export type ItemCategory = 
  | 'phones'
  | 'wallets'
  | 'keys'
  | 'bags'
  | 'clothing'
  | 'jewelry'
  | 'electronics'
  | 'cards'
  | 'documents'
  | 'other';

export type ItemStatus =
  | 'available'
  | 'claimed'
  | 'paid'
  | 'collected'
  | 'collected_code'
  | 'collected_nocode'
  | 'collected_courier'
  | 'expired';

// Claim types
export interface Claim {
  id: string;
  item_id: string;
  customer_name?: string;
  customer_email?: string;
  user_id: string;
  status: ClaimStatus;
  payment_id?: string;
  payment_status: PaymentStatus;
  pickup_code: string;
  notes?: string;
  query_id?: string;
  search_description?: string;
  room_number?: string;
  dates_of_stay?: {
    checkin: string;
    checkout: string;
  };
  booking_reference?: string;
  verification_questions?: Record<string, unknown>;
  verification_answers?: Record<string, unknown>;
  collected_at?: string;
  expires_at?: string;
  item?: Item;
  user?: User;
  created_at: string;
  updated_at: string;
}

export type ClaimStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Form types
export interface CreateItemForm {
  title: string;
  description: string;
  category: ItemCategory;
  dateFound: string;
  tags: string[];
  color?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  locationFound?: string;
  images?: File[];
}

export interface UpdateVenueForm {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  type?: 'bar' | 'club' | 'restaurant' | 'hotel' | 'other';
  openingHours?: Record<string, unknown>;
  schedule?: CollectionHours;
}