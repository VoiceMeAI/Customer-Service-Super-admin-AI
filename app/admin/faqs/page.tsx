"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, HelpCircle } from "lucide-react"

const mockFaqs = [
  {
    id: 1,
    question: "What are your check-in and check-out hours?",
    category: "General",
    status: "active",
    answer: "Check-in is from 3:00 PM and check-out is at 11:00 AM.",
  },
  {
    id: 2,
    question: "Do you offer room service?",
    category: "Services",
    status: "active",
    answer: "Yes, we offer 24/7 room service with a diverse menu.",
  },
  {
    id: 3,
    question: "Is parking available?",
    category: "Facilities",
    status: "active",
    answer: "Yes, we have complimentary valet parking for all guests.",
  },
  {
    id: 4,
    question: "What is your cancellation policy?",
    category: "Booking",
    status: "active",
    answer: "Free cancellation up to 24 hours before check-in.",
  },
  {
    id: 5,
    question: "Do you have a swimming pool?",
    category: "Facilities",
    status: "draft",
    answer: "Yes, we have an outdoor heated pool open from 6 AM to 10 PM.",
  },
  {
    id: 6,
    question: "Can I bring my pet?",
    category: "General",
    status: "active",
    answer: "We welcome pets in select rooms with a $50 per night fee.",
  },
]

const categories = ["All", "General", "Services", "Facilities", "Booking"]

export default function FaqsPage() {
  const [faqs, setFaqs] = useState(mockFaqs)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalPages = Math.ceil(filteredFaqs.length / pageSize)
  const paginatedFaqs = filteredFaqs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleDelete = (id: number) => {
    setFaqs(faqs.filter((faq) => faq.id !== id))
  }

  return (
    <AdminLayout title="FAQs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Manage FAQs</h2>
            <p className="text-sm text-muted-foreground">Configure questions your AI assistant can answer</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New FAQ</DialogTitle>
                <DialogDescription>Add a question and answer for your AI assistant to use.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input id="question" placeholder="Enter the question" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c !== "All")
                        .map((category) => (
                          <SelectItem key={category} value={category.toLowerCase()}>
                            {category}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea id="answer" placeholder="Enter the answer" className="min-h-32 rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Add FAQ
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
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
              >
                <SelectTrigger className="w-full rounded-xl sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* FAQs Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Question</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedFaqs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No FAQs found.
                      </td>
                    </tr>
                  ) : (
                    paginatedFaqs.map((faq) => (
                    <tr key={faq.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{faq.question}</p>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{faq.answer}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          {faq.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            faq.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {faq.status}
                        </span>
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
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(faq.id)}>
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
            {filteredFaqs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredFaqs.length}
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
