"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * AuthInitializer
 *
 * Because the Zustand auth store uses `skipHydration: true`, it never reads
 * localStorage on the server (which would crash Next.js 15 dev mode due to
 * the broken `--localstorage-file` Node.js shim).
 *
 * This component is a "use client" component placed in the root layout.
 * Its sole job is to call `rehydrate()` once the app mounts in the browser,
 * which triggers Zustand to read the persisted auth state from localStorage
 * and restore user + token.  The `onRehydrateStorage` callback in the store
 * then re-syncs the axios Authorization header with the restored token.
 */
export function AuthInitializer() {
  useEffect(() => {
    // Trigger client-side hydration now that localStorage is available.
    // This restores the previously logged-in user and token from storage.
    useAuthStore.persist.rehydrate();
  }, []);

  // Renders nothing — this component only runs a side-effect.
  return null;
}
