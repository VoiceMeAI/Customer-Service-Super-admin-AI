"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, CheckCircle, AlertTriangle, TrendingUp, Plus, Settings, Users } from "lucide-react"

const stats = [
  { name: "Total Chats", value: "1,284", change: "+12%", icon: MessageSquare, color: "bg-blue-500" },
  { name: "Resolved", value: "1,089", change: "+8%", icon: CheckCircle, color: "bg-primary" },
  { name: "Escalated", value: "195", change: "-3%", icon: AlertTriangle, color: "bg-amber-500" },
  { name: "AI Success Rate", value: "84.8%", change: "+2.1%", icon: TrendingUp, color: "bg-cyan-500" },
]

const recentActivity = [
  { id: 1, user: "Guest #1247", action: "Asked about check-in time", time: "2 min ago", status: "resolved" },
  { id: 2, user: "Guest #1246", action: "Requested room service", time: "8 min ago", status: "resolved" },
  { id: 3, user: "Guest #1245", action: "Complained about noise", time: "15 min ago", status: "escalated" },
  { id: 4, user: "Guest #1244", action: "Asked for spa booking", time: "22 min ago", status: "resolved" },
  { id: 5, user: "Guest #1243", action: "Requested late checkout", time: "35 min ago", status: "resolved" },
]

const quickActions = [
  { name: "Add FAQ", icon: Plus, href: "/admin/faqs" },
  { name: "Manage Staff", icon: Users, href: "/admin/staff" },
  { name: "Widget Settings", icon: Settings, href: "/admin/widget" },
]

export default function DashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm text-primary">{stat.change} from last week</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 rounded-2xl">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest chat interactions with your AI assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`/diverse-group-avatars.png?height=40&width=40&query=avatar ${activity.id}`}
                        />
                        <AvatarFallback>G{activity.id}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{activity.user}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          activity.status === "resolved"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {activity.status}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.name}
                  variant="outline"
                  className="w-full justify-start rounded-xl bg-transparent"
                  asChild
                >
                  <a href={action.href}>
                    <action.icon className="mr-3 h-5 w-5" />
                    {action.name}
                  </a>
                </Button>
              ))}

              <div className="pt-4">
                <Card className="rounded-xl bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-foreground">Need help?</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Check our documentation or contact support.</p>
                    <Button variant="link" className="mt-2 h-auto p-0 text-primary">
                      View Documentation
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
