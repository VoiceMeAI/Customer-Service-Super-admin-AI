"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Component that guards routes requiring authentication
 * 
 * What it does:
 * 1. Checks if user is authenticated using Zustand store
 * 2. Shows loading state while checking
 * 3. Redirects to login page if not authenticated
 * 4. Renders children if authenticated
 * 
 * Usage:
 * Wrap any component/page that requires authentication:
 * <ProtectedRoute>
 *   <YourProtectedContent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isStoreLoading } = useAuthStore();

  useEffect(() => {
    // Only redirect if store has finished loading (not in initial loading state)
    // This prevents flash of login page when auth state is being restored from localStorage
    if (!isStoreLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isStoreLoading, router]);

  // Show loading state while checking authentication
  // This handles the initial load when Zustand is restoring state from localStorage
  if (isStoreLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
