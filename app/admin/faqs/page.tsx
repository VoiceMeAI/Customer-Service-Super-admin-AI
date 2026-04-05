"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/ui/pagination"
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, HelpCircle,
  RefreshCw, ArrowLeft, Eye, Tag, Hash, Calendar, Globe,
  GlobeLock, Loader2,
} from "lucide-react"
import {
  useFaqs, useFaqById, useCreateFaq, useUpdateFaq, useDeleteFaq, usePublishFaq,
} from "@/lib/hooks/use-faqs"
import {
  faqFormSchema, FAQ_FORM_DEFAULTS, CATEGORY_OPTIONS, type FaqFormValues,
} from "@/lib/validations/faq"
import type { FaqItem } from "@/lib/api/types"

export default function FaqsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // ─── Filters ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ─── URL-driven page mode ───────────────────────────────────────────────
  type PageMode = "list" | "view" | "edit"
  const [pageMode, setPageMode] = useState<PageMode>("list")
  const [activeId, setActiveId] = useState<string | null>(null)

  // ─── Dialog visibility ──────────────────────────────────────────────────
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // ─── React Query ────────────────────────────────────────────────────────
  const faqsQuery = useFaqs({ page: currentPage, limit: pageSize })
  const faqs = faqsQuery.data?.items ?? []
  const pagination = faqsQuery.data?.pagination ?? {
    page: 1, limit: 10, total: 0, totalPages: 0,
  }

  const detailQuery = useFaqById(activeId)
  const viewingFaq = detailQuery.data ?? null

  const createMutation = useCreateFaq()
  const updateMutation = useUpdateFaq()
  const deleteMutation = useDeleteFaq()
  const publishMutation = usePublishFaq()

  // ─── Forms ──────────────────────────────────────────────────────────────
  const createForm = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: FAQ_FORM_DEFAULTS,
  })

  const editForm = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: FAQ_FORM_DEFAULTS,
  })

  // ─── URL sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get("id")
    const mode = searchParams.get("mode")

    if (mode === "view" && id) {
      setPageMode("view")
      setActiveId(id)
    } else if (mode === "edit" && id) {
      setPageMode("edit")
      setActiveId(id)
      setIsEditDialogOpen(true)
    } else {
      setPageMode("list")
      setActiveId(null)
      setIsEditDialogOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Pre-fill edit form when detail data loads
  useEffect(() => {
    if (pageMode === "edit" && viewingFaq) {
      editForm.reset({
        question: viewingFaq.question ?? "",
        answer: viewingFaq.answer ?? "",
        category: viewingFaq.category ?? "",
        tagsInput: (viewingFaq.tags ?? []).join(", "),
        sortOrder: viewingFaq.sortOrder ?? 0,
        isPublished: viewingFaq.isPublished ?? true,
        isActive: viewingFaq.isActive ?? true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, viewingFaq])

  // ─── Derived ────────────────────────────────────────────────────────────
  const allCategories = ["All", ...CATEGORY_OPTIONS]
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const isPublishingFaq = (id: string | undefined) =>
    publishMutation.isPending && publishMutation.variables?.id === id

  // ─── Navigation ─────────────────────────────────────────────────────────
  const handleViewFaq = (faq: FaqItem) => {
    const id = faq._id ?? faq.id
    if (!id) return
    router.push(`/admin/faqs?id=${id}&mode=view`, { scroll: false })
  }

  const handleEditFaq = (faq: FaqItem) => {
    const id = faq._id ?? faq.id
    if (!id) return
    router.push(`/admin/faqs?id=${id}&mode=edit`, { scroll: false })
  }

  const handleBackToList = () => {
    router.push("/admin/faqs", { scroll: false })
  }

  // ─── Create ─────────────────────────────────────────────────────────────
  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      createForm.reset(FAQ_FORM_DEFAULTS)
      createMutation.reset()
    }
  }

  const onCreateSubmit = (values: FaqFormValues) => {
    const tags = values.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    createMutation.mutate(
      {
        question: values.question.trim(),
        answer: values.answer.trim(),
        category: values.category || null,
        tags,
        sortOrder: values.sortOrder,
        isPublished: values.isPublished,
        isActive: values.isActive,
      },
      {
        onSuccess: () => {
          handleCreateOpenChange(false)
        },
      },
    )
  }

  // ─── Edit ───────────────────────────────────────────────────────────────
  const handleEditOpenChange = (open: boolean) => {
    if (!open) {
      updateMutation.reset()
      handleBackToList()
    }
  }

  const onEditSubmit = (values: FaqFormValues) => {
    if (!activeId) return

    const tags = values.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    updateMutation.mutate(
      {
        id: activeId,
        payload: {
          question: values.question.trim(),
          answer: values.answer.trim(),
          category: values.category || null,
          tags,
          sortOrder: values.sortOrder,
          isPublished: values.isPublished,
          isActive: values.isActive,
        },
      },
      {
        onSuccess: () => handleBackToList(),
      },
    )
  }

  // ─── Publish ────────────────────────────────────────────────────────────
  const handleTogglePublish = (faq: FaqItem) => {
    const id = faq._id ?? faq.id
    if (!id || publishMutation.isPending) return
    publishMutation.mutate({ id, isPublished: !faq.isPublished })
  }

  // ─── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteRequest = (id: string | undefined) => {
    if (!id) return
    setPendingDeleteId(id)
    deleteMutation.reset()
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setPendingDeleteId(null)
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (pageMode === "view") {
    return (
      <AdminLayout title="FAQ Detail">
        <div className="space-y-6">
          {/* Back + title row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="rounded-xl" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">FAQ Detail</h2>
                <p className="text-sm text-muted-foreground">Read-only view of the selected FAQ</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {detailQuery.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {detailQuery.error.message || "Failed to load FAQ details."}
            </div>
          )}

          {detailQuery.isLoading ? (
            <Card className="rounded-2xl">
              <CardContent className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-full animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : viewingFaq ? (
            <div className="space-y-4">
              {/* Question & Answer */}
              <Card className="rounded-2xl">
                <CardContent className="space-y-6 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {viewingFaq.isActive !== undefined && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          viewingFaq.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {viewingFaq.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                    {viewingFaq.isPublished !== undefined && (
                      <button
                        type="button"
                        disabled={isPublishingFaq(viewingFaq._id ?? viewingFaq.id)}
                        onClick={() => handleTogglePublish(viewingFaq)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                          viewingFaq.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                        title={viewingFaq.isPublished ? "Click to unpublish" : "Click to publish"}
                      >
                        {isPublishingFaq(viewingFaq._id ?? viewingFaq.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : viewingFaq.isPublished ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <GlobeLock className="h-3 w-3" />
                        )}
                        {viewingFaq.isPublished ? "Published" : "Unpublished"}
                      </button>
                    )}
                    {viewingFaq.category && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {viewingFaq.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</p>
                    <p className="text-base font-semibold text-foreground">{viewingFaq.question}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{viewingFaq.answer}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Metadata</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Tags */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Tag className="h-3 w-3" /> Tags
                      </div>
                      {viewingFaq.tags && viewingFaq.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {viewingFaq.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags</p>
                      )}
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Hash className="h-3 w-3" /> Sort Order
                      </div>
                      <p className="text-sm text-foreground">{viewingFaq.sortOrder ?? 0}</p>
                    </div>

                    {/* Created */}
                    {viewingFaq.createdAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Created
                        </div>
                        <p className="text-sm text-foreground">
                          {new Date(viewingFaq.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Updated */}
                    {viewingFaq.updatedAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Last Updated
                        </div>
                        <p className="text-sm text-foreground">
                          {new Date(viewingFaq.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* ID */}
                    {(viewingFaq._id ?? viewingFaq.id) && (
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
                        <p className="font-mono text-xs text-muted-foreground">{viewingFaq._id ?? viewingFaq.id}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </AdminLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AdminLayout title="FAQs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Manage FAQs</h2>
            <p className="text-sm text-muted-foreground">Configure questions your AI assistant can answer</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => faqsQuery.refetch()}
              disabled={faqsQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${faqsQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>

            {/* ─── Create FAQ Dialog ──────────────────────────────────── */}
            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateOpenChange}>
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

                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
                    <div className="space-y-4 py-4">
                      {/* Question */}
                      <FormField
                        control={createForm.control}
                        name="question"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter the question (min 3 characters)"
                                className="rounded-xl"
                                maxLength={500}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Answer */}
                      <FormField
                        control={createForm.control}
                        name="answer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Answer <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the answer (min 3 characters)"
                                className="min-h-28 rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Category */}
                      <FormField
                        control={createForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Select category (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tags */}
                      <FormField
                        control={createForm.control}
                        name="tagsInput"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Comma-separated tags, e.g. pricing, refund"
                                className="rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Sort Order */}
                      <FormField
                        control={createForm.control}
                        name="sortOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sort Order</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                className="rounded-xl"
                                value={field.value}
                                onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Published toggle */}
                      <FormField
                        control={createForm.control}
                        name="isPublished"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border px-4 py-3">
                            <div className="space-y-0.5">
                              <FormLabel>Published</FormLabel>
                              <p className="text-xs text-muted-foreground">Visible to end users</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Active toggle */}
                      <FormField
                        control={createForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-xl border px-4 py-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <p className="text-xs text-muted-foreground">Used by the AI assistant</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* API error */}
                      {createMutation.error && (
                        <p className="text-sm text-destructive">
                          {createMutation.error.message || "Failed to create FAQ. Please try again."}
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCreateOpenChange(false)}
                        className="rounded-xl"
                        disabled={createMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-xl" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Saving..." : "Add FAQ"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Fetch error banner */}
        {faqsQuery.error && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{faqsQuery.error.message || "Failed to load FAQs."}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-destructive hover:text-destructive"
              onClick={() => faqsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full rounded-xl sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  {faqsQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="bg-card">
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-14 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4 text-right"><div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" /></td>
                      </tr>
                    ))
                  ) : filteredFaqs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        {searchQuery || selectedCategory !== "All"
                          ? "No FAQs match your filters."
                          : 'No FAQs yet. Click "Add FAQ" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const faqId = faq._id ?? faq.id
                      return (
                        <tr key={faqId} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <HelpCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">{faq.question}</p>
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{faq.answer}</p>
                                {faq.tags && faq.tags.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {faq.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {faq.category ? (
                              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                                {faq.category}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  faq.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {faq.isActive ? "active" : "inactive"}
                              </span>
                              <button
                                type="button"
                                disabled={isPublishingFaq(faqId)}
                                onClick={() => handleTogglePublish(faq)}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                                  faq.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                                }`}
                                title={faq.isPublished ? "Click to unpublish" : "Click to publish"}
                              >
                                {isPublishingFaq(faqId) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : faq.isPublished ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <GlobeLock className="h-3 w-3" />
                                )}
                                {faq.isPublished ? "published" : "unpublished"}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewFaq(faq)}>
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditFaq(faq)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleTogglePublish(faq)}
                                  disabled={isPublishingFaq(faqId)}
                                >
                                  {isPublishingFaq(faqId) ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : faq.isPublished ? (
                                    <GlobeLock className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Globe className="mr-2 h-4 w-4" />
                                  )}
                                  {faq.isPublished ? "Unpublish" : "Publish"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRequest(faqId)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {pagination.total > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.limit}
                totalItems={pagination.total}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Edit FAQ Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>Update the question and answer details.</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
                <div className="space-y-4 py-4">
                  {/* Question */}
                  <FormField
                    control={editForm.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter the question (min 3 characters)"
                            className="rounded-xl"
                            maxLength={500}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Answer */}
                  <FormField
                    control={editForm.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Answer <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the answer (min 3 characters)"
                            className="min-h-28 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <FormField
                    control={editForm.control}
                    name="tagsInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Comma-separated tags, e.g. pricing, refund"
                            className="rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sort Order */}
                  <FormField
                    control={editForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            className="rounded-xl"
                            value={field.value}
                            onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Published toggle */}
                  <FormField
                    control={editForm.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div className="space-y-0.5">
                          <FormLabel>Published</FormLabel>
                          <p className="text-xs text-muted-foreground">Visible to end users</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Active toggle */}
                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <p className="text-xs text-muted-foreground">Used by the AI assistant</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* API error */}
                  {updateMutation.error && (
                    <p className="text-sm text-destructive">
                      {updateMutation.error.message || "Failed to update FAQ. Please try again."}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditOpenChange(false)}
                    className="rounded-xl"
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open && !deleteMutation.isPending) {
          setDeleteDialogOpen(false)
          setPendingDeleteId(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteMutation.error && (
            <p className="text-sm text-destructive">
              {deleteMutation.error.message || "Failed to delete FAQ. Please try again."}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPendingDeleteId(null)
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
