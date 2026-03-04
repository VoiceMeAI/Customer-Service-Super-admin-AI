import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from '@/lib/api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  _id?: string;
  id?: string;
  __v?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  name?: string;
  businessName?: string;
  businessType?: string;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  initialize: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        setAuthToken(token);
      },

      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false });
        setAuthToken(null);
      },

      initialize: () => {
        const { token } = useAuthStore.getState();
        if (token) setAuthToken(token);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist everything — token, user AND isAuthenticated so the value
      // is immediately correct the moment localStorage is read.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // After localStorage is read, re-sync the axios interceptor with the
      // restored token so API requests include the Authorization header.
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    }
  )
);
