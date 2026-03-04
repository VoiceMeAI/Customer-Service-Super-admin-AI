"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/ui/pagination"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase } from "lucide-react"

const mockServices = [
  {
    id: 1,
    name: "Room Service",
    type: "Food & Beverage",
    price: "$25",
    description: "24/7 in-room dining",
    active: true,
  },
  {
    id: 2,
    name: "Spa Treatment",
    type: "Wellness",
    price: "$120",
    description: "Full body massage and treatments",
    active: true,
  },
  {
    id: 3,
    name: "Airport Transfer",
    type: "Transportation",
    price: "$50",
    description: "Luxury vehicle pickup and dropoff",
    active: true,
  },
  {
    id: 4,
    name: "Laundry Service",
    type: "Housekeeping",
    price: "$15",
    description: "Same-day laundry and dry cleaning",
    active: true,
  },
  {
    id: 5,
    name: "Gym Access",
    type: "Wellness",
    price: "Free",
    description: "24-hour fitness center access",
    active: false,
  },
  {
    id: 6,
    name: "Conference Room",
    type: "Business",
    price: "$200/hr",
    description: "Private meeting room with AV equipment",
    active: true,
  },
]

const serviceTypes = ["All", "Food & Beverage", "Wellness", "Transportation", "Housekeeping", "Business"]

export default function ServicesPage() {
  const [services, setServices] = useState(mockServices)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === "All" || service.type === selectedType
    return matchesSearch && matchesType
  })

  const totalPages = Math.ceil(filteredServices.length / pageSize)
  const paginatedServices = filteredServices.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleActive = (id: number) => {
    setServices(services.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
  }

  const handleDelete = (id: number) => {
    setServices(services.filter((s) => s.id !== id))
  }

  return (
    <AdminLayout title="Services">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Manage Services</h2>
            <p className="text-sm text-muted-foreground">Configure services your AI can help customers with</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Service</DialogTitle>
                <DialogDescription>Add a service that your AI assistant can help customers with.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input id="name" placeholder="Enter service name" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes
                          .filter((t) => t !== "All")
                          .map((type) => (
                            <SelectItem key={type} value={type.toLowerCase()}>
                              {type}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input id="price" placeholder="$0.00" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe the service" className="min-h-24 rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Add Service
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
              >
                <SelectTrigger className="w-full rounded-xl sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Services Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Service</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Active</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No services found.
                      </td>
                    </tr>
                  ) : (
                    paginatedServices.map((service) => (
                    <tr key={service.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          {service.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{service.price}</td>
                      <td className="px-6 py-4">
                        <Switch checked={service.active} onCheckedChange={() => toggleActive(service.id)} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredServices.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredServices.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
