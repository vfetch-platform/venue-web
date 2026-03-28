import { create } from 'zustand';
import { User, Venue } from '@/types';
import { api, ApiError } from '@/services/api';

interface AuthState {
  user: User | null;
  venue: Venue | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setVenue: (venue: Venue) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  venue: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.auth.login(email, password);
      
      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data;
        
        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        // Fetch venue data based on user's venue_id
        let venue = null;
        if (user.venue_id) {
          try {
            const venueResponse = await api.venues.getMyVenue();
            if (venueResponse.success) {
              venue = venueResponse.data;
            }
          } catch (venueError) {
            console.warn('Failed to fetch venue data:', venueError);
          }
        }
        
        set({ 
          user, 
          venue,
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      let errorMessage = 'Login failed';
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    // Call logout API
    api.auth.logout().catch(console.error);
    
    // Clear local state
    set({ 
      user: null, 
      venue: null,
      isAuthenticated: false, 
      error: null 
    });
    
    // Clear tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await api.auth.me();
      
      if (response.success && response.data) {
        const user = response.data;
        
        // Fetch venue data based on user's venue_id
        let venue = null;
        if (user.venue_id) {
          try {
            const venueResponse = await api.venues.getMyVenue();
            if (venueResponse.success) {
              venue = venueResponse.data;
            }
          } catch (venueError) {
            console.warn('Failed to fetch venue data:', venueError);
          }
        }
        
        set({ 
          user, 
          venue,
          isAuthenticated: true, 
          isLoading: false,
          isInitialized: true,
        });
      } else {
        // Invalid token, clear it
        get().logout();
        set({ isInitialized: true });
      }
    } catch {
      // Invalid token, clear it
      get().logout();
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => set({ user }),
  setVenue: (venue: Venue) => set({ venue }),
  clearError: () => set({ error: null }),
}));