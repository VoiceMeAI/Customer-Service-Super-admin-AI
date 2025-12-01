"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, CheckCircle, AlertTriangle, Clock, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

const stats = [
  { name: "Total Conversations", value: "12,847", change: "+18%", trend: "up", icon: MessageSquare },
  { name: "Resolution Rate", value: "87.3%", change: "+4.2%", trend: "up", icon: CheckCircle },
  { name: "Avg. Response Time", value: "1.2s", change: "-0.3s", trend: "up", icon: Clock },
  { name: "Escalation Rate", value: "12.7%", change: "-2.1%", trend: "up", icon: AlertTriangle },
]

const chartData = [
  { date: "Mon", chats: 180, resolved: 156, escalated: 24 },
  { date: "Tue", chats: 220, resolved: 195, escalated: 25 },
  { date: "Wed", chats: 195, resolved: 172, escalated: 23 },
  { date: "Thu", chats: 240, resolved: 215, escalated: 25 },
  { date: "Fri", chats: 280, resolved: 252, escalated: 28 },
  { date: "Sat", chats: 165, resolved: 148, escalated: 17 },
  { date: "Sun", chats: 145, resolved: 130, escalated: 15 },
]

const topQueries = [
  { query: "Check-in time", count: 342, percentage: 26 },
  { query: "Room service menu", count: 287, percentage: 22 },
  { query: "WiFi password", count: 245, percentage: 19 },
  { query: "Checkout procedure", count: 198, percentage: 15 },
  { query: "Spa booking", count: 156, percentage: 12 },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d")

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Date Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
            <p className="text-sm text-muted-foreground">Track your AI assistant's effectiveness</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                  <span
                    className={`flex items-center text-sm font-medium ${
                      stat.trend === "up" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="mr-1 h-4 w-4" />
                    ) : (
                      <TrendingDown className="mr-1 h-4 w-4" />
                    )}
                    {stat.change}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chat Volume Chart */}
          <Card className="lg:col-span-2 rounded-2xl">
            <CardHeader>
              <CardTitle>Chat Volume</CardTitle>
              <CardDescription>Daily conversation trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="chats"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorChats)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Queries */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Top Queries</CardTitle>
              <CardDescription>Most common user questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topQueries.map((item, index) => (
                  <div key={item.query} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.query}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resolution Chart */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Resolution vs Escalation</CardTitle>
            <CardDescription>Compare resolved and escalated conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="escalated" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-chart-4" />
                <span className="text-sm text-muted-foreground">Escalated</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
