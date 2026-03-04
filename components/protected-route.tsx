"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // IMPORTANT: must start as `false` (not a lazy initializer).
  // On the server, Zustand's persist marks itself as hasHydrated=true even
  // without localStorage, so a lazy initializer would return true on the
  // server. The client then hydrates with hasHydrated=true + isAuthenticated=false
  // and the redirect effect fires immediately — logging the user out.
  //
  // Starting as false ensures server and client both render the spinner first
  // (no hydration mismatch). The useEffect below runs only on the client,
  // sets hasHydrated=true after localStorage has been read, and triggers a
  // re-render with the correct isAuthenticated value.
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    } else {
      return useAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
