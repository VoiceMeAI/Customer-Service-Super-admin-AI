"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * AuthInitializer - Component that initializes auth store on app load
 * 
 * What it does:
 * 1. Calls initialize() from auth store when app loads
 * 2. Syncs token with axios interceptor after state is restored from localStorage
 * 3. Ensures API requests work immediately after page refresh
 * 
 * This component is placed in the root layout so it runs on every page load.
 * It's a client component because it needs to access browser localStorage.
 */
export function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize auth store on app load
    // This syncs the token with axios interceptor if user was previously logged in
    initialize();
  }, [initialize]);

  // This component doesn't render anything
  return null;
}
