import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { ProtectedRoute } from "@/components/protected-route"

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

/**
 * AdminLayout - Layout wrapper for admin pages
 * 
 * This component:
 * - Wraps content with ProtectedRoute to ensure authentication
 * - Provides consistent layout (Sidebar + TopNav) for all admin pages
 * - All pages using this layout are automatically protected
 */
export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <TopNav title={title} />
        <main className="ml-64 pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
