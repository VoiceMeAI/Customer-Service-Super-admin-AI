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
//
// KEY: We use `skipHydration: true` so Zustand NEVER calls storage.getItem
// on the server.  Hydration is triggered manually in AuthInitializer via
// useAuthStore.persist.rehydrate() inside a useEffect, which only runs in
// the browser — this is the official Zustand v5 + Next.js SSR pattern.
//
// Without skipHydration, Next.js 15 dev mode passes `--localstorage-file`
// to Node.js which creates a broken `localStorage` shim.  Zustand's persist
// middleware was calling getItem() against that shim during SSR, causing
// "localStorage.getItem is not a function" and HTTP 500 on every page load.
// ─────────────────────────────────────────────────────────────────────────────

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
      // createJSONStorage with a lazy factory that is only evaluated in the
      // browser.  Because skipHydration: true prevents any server-side call
      // to storage.getItem/setItem/removeItem, this factory will never run in
      // Node.js — so we don't need a typeof window guard here.
      storage: createJSONStorage(() => localStorage),
      // Only persist what we need — token, user, and auth flag.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // ⬇︎  THIS is the fix:
      // Skip server-side hydration entirely.  AuthInitializer (a client
      // component) calls useAuthStore.persist.rehydrate() in useEffect, which
      // runs only in the browser after localStorage is available.
      skipHydration: true,
      // After localStorage is read on the client, re-sync the axios interceptor
      // with the restored token so API requests include the Authorization header.
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    },
  ),
);
