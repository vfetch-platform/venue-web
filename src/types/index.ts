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
  | 'reserved'
  | 'released'
  | 'expired';

// Claim types
export interface DeliveryTrackingInfo {
  provider_reference: string;
  tracking_url?: string;
  provider_status?: string;
}

export interface ClaimantSummary {
  full_name: string;
  email: string;
  phone?: string;
}

export interface Claim {
  id: string;
  item_id: string;
  venue_id: string;
  claimant_id?: string;
  claimant?: ClaimantSummary;
  status: ClaimStatus;
  workflow_state?: WorkflowState;
  payment_status: PaymentStatus;
  active_transaction_id?: string;
  pickup_code: string;
  collection_mode?: 'self_pickup' | 'courier';
  courier_provider?: string;
  delivery_address?: string;
  delivery_tracking_info?: DeliveryTrackingInfo;
  notes?: string;
  query_id?: string;
  search_description?: string;
  venue_interaction_context?: {
    sub_location?: string;
    reference_type?: string;
    reference_value?: string;
    started_at?: string;
    ended_at?: string;
  };
  decision_reason?: string;
  verification_questions?: Record<string, unknown>;
  verification_answers?: Record<string, unknown>;
  decided_at?: string;
  paid_at?: string;
  collected_at?: string;
  closed_at?: string;
  closed_reason?: 'claimant_cancelled' | 'expired';
  expires_at?: string;
  item?: Item;
  created_at: string;
  updated_at: string;
}

export type ClaimStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export type WorkflowState =
  | 'pending_review'
  | 'pending_cancelled'
  | 'approved_awaiting_payment'
  | 'approved_ready_for_pickup'
  | 'approved_courier_arranged'
  | 'approved_collected'
  | 'approved_cancelled'
  | 'approved_expired'
  | 'rejected';

export type PaymentStatus =
  | 'not_required'
  | 'awaiting_payment'
  | 'paid'
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