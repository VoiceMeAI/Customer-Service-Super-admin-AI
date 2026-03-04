"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Root Page - Smart redirect based on authentication state
 * 
 * What it does:
 * 1. Checks if user is authenticated using Zustand store
 * 2. Redirects to /admin/dashboard if authenticated
 * 3. Redirects to /admin/login if not authenticated
 * 4. Shows loading state while checking
 */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for store to finish loading (restoring from localStorage)
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/admin/dashboard");
      } else {
        router.push("/admin/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
