"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/**
 * Providers
 *
 * Client-side wrapper that supplies the React Query context to the entire app.
 * Lives here (separate from layout.tsx) because layout.tsx is a Server Component
 * in Next.js App Router and cannot hold client-side state like QueryClient.
 *
 * QueryClient config:
 *  - staleTime 30s  → don't refetch within 30 seconds of a successful fetch
 *  - retry 1        → retry failed requests once before surfacing an error
 *  - refetchOnWindowFocus true (default) → auto-refresh stale data when user
 *    tabs back into the app (replaces the manual "refresh" button pattern)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures a single QueryClient instance per component mount,
  // avoiding sharing state across server-side requests in Next.js.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 s — treat data as fresh for 30 seconds
            retry: 1,             // retry once on network errors
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
