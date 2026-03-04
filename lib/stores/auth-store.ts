/**
 * Authentication Store using Zustand with Persist Middleware
 * 
 * This store manages:
 * - User authentication state (token, user data)
 * - Automatic persistence to localStorage
 * - Synchronization with axios interceptor
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from '@/lib/api/axios';

// ============================================================================
// STEP 1: Define User Type
// ============================================================================
/**
 * User type definition
 * Adjust these fields based on what your backend API returns
 */
export type User = {
  // MongoDB fields
  _id?: string;
  id?: string; // Some APIs return both _id and id
  __v?: number;
  
  // User identification
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  
  // Role information
  role?: string;
  roles?: string[]; // Array of roles
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  
  // Legacy/optional fields
  name?: string;
  businessName?: string;
  businessType?: string;
  
  // Add any other user fields your API returns
};

// ============================================================================
// STEP 2: Define Auth State Interface
// ============================================================================
/**
 * Interface for the authentication store state
 * 
 * State properties:
 * - user: The logged-in user object (or null if not logged in)
 * - token: The JWT/auth token string (or null if not logged in)
 * - isAuthenticated: Computed boolean (true if user and token exist)
 * 
 * Actions (methods):
 * - setAuth: Sets user and token (called after login/register)
 * - clearAuth: Clears user and token (called on logout)
 * - initialize: Syncs token with axios on app load
 */
interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  initialize: () => void;
}

// ============================================================================
// STEP 3: Create Zustand Store with Persist Middleware
// ============================================================================
/**
 * useAuthStore - The main authentication store
 * 
 * Zustand's `create` function creates a store hook
 * The `persist` middleware automatically saves state to localStorage
 * 
 * Syntax: create<StateType>()(persist(storeFunction, persistConfig))
 */
export const useAuthStore = create<AuthState>()(
  persist(
    // ========================================================================
    // STEP 4: Store Function - Defines State and Actions
    // ========================================================================
    /**
     * This function defines:
     * 1. Initial state values
     * 2. Action methods that update state
     * 
     * The `set` function is provided by Zustand to update state
     */
    (set) => ({
      // ----------------------------------------------------------------------
      // Initial State
      // ----------------------------------------------------------------------
      /**
       * When the app first loads, these are the default values
       */
      user: null,
      token: null,
      isAuthenticated: false,

      // ----------------------------------------------------------------------
      // Action: setAuth (Login/Register)
      // ----------------------------------------------------------------------
      /**
       * Called after successful login or registration
       * 
       * @param user - User object from API response
       * @param token - JWT token from API response
       * 
       * What it does:
       * 1. Updates Zustand state (triggers re-renders in components)
       * 2. Syncs token with axios interceptor (for API requests)
       * 3. Persist middleware automatically saves to localStorage
       */
      setAuth: (user: User, token: string) => {
        set({
          user,                    // Store user object
          token,                   // Store token string
          isAuthenticated: true,   // Set authenticated flag
        });
        
        // Sync token with axios interceptor
        // This ensures all API requests include the token
        setAuthToken(token);
      },

      // ----------------------------------------------------------------------
      // Action: clearAuth (Logout)
      // ----------------------------------------------------------------------
      /**
       * Called when user logs out
       * 
       * What it does:
       * 1. Clears Zustand state (triggers re-renders)
       * 2. Clears token from axios interceptor
       * 3. Persist middleware automatically clears localStorage
       */
      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        
        // Clear token from axios interceptor
        setAuthToken(null);
      },

      // ----------------------------------------------------------------------
      // Action: initialize (App Load)
      // ----------------------------------------------------------------------
      /**
       * Called when app loads to sync token with axios
       * 
       * Why needed:
       * - Zustand persist automatically restores state from localStorage
       * - But axios interceptor needs to be manually synced
       * - This ensures API requests work immediately after page refresh
       * 
       * Note: This is called manually in your app's root component
       */
      initialize: () => {
        // Get current state from store
        const state = useAuthStore.getState();
        
        // If token exists, sync with axios
        if (state.token) {
          setAuthToken(state.token);
        }
      },
    }),
    
    // ========================================================================
    // STEP 5: Persist Configuration
    // ========================================================================
    /**
     * Configuration object for persist middleware
     * This tells Zustand HOW to persist the state
     */
    {
      // ----------------------------------------------------------------------
      // name: Storage Key
      // ----------------------------------------------------------------------
      /**
       * The key used in localStorage
       * Your auth data will be stored as: localStorage['auth-storage']
       */
      name: 'auth-storage',

      // ----------------------------------------------------------------------
      // storage: Storage Engine
      // ----------------------------------------------------------------------
      /**
       * Specifies which storage to use
       * 
       * createJSONStorage(() => localStorage):
       * - Uses browser's localStorage
       * - Automatically handles JSON serialization/deserialization
       * - SSR-safe (checks if window exists)
       * 
       * Alternatives:
       * - sessionStorage: createJSONStorage(() => sessionStorage)
       * - Custom storage: You can create your own storage adapter
       */
      storage: createJSONStorage(() => localStorage),

      // ----------------------------------------------------------------------
      // partialize: What to Persist
      // ----------------------------------------------------------------------
      /**
       * Controls which parts of state are persisted
       * 
       * Why only token and user?
       * - isAuthenticated is a computed value (derived from token && user)
       * - No need to persist it - we can calculate it on load
       * - Saves storage space
       * 
       * If you return nothing, everything is persisted
       * If you return specific fields, only those are persisted
       */
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        // isAuthenticated is NOT persisted (it's computed)
      }),

      // ----------------------------------------------------------------------
      // onRehydrateStorage: Rehydration Callback
      // ----------------------------------------------------------------------
      /**
       * Called AFTER state is restored from localStorage
       * 
       * When does this run?
       * - On app load/refresh
       * - After Zustand reads from localStorage
       * - Before components render
       * 
       * Why sync with axios here?
       * - State is restored, but axios interceptor needs the token
       * - This ensures API requests work immediately
       * - Prevents race conditions
       * 
       * @param state - The restored state (or undefined if nothing was stored)
       */
      onRehydrateStorage: () => (state) => {
        // state might be undefined if localStorage is empty
        if (state?.token) {
          // Sync token with axios interceptor
          setAuthToken(state.token);
        }
      },
    }
  )
);
