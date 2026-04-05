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
  Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase,
  RefreshCw, ArrowLeft, Eye, Globe, GlobeLock, Loader2,
  Calendar, Tag, Hash, MessageSquare,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  useServices, useServiceById, useCreateService, useUpdateService,
  useDeleteService, usePublishService,
} from "@/lib/hooks/use-services"
import {
  serviceFormSchema, SERVICE_FORM_DEFAULTS, SERVICE_CATEGORY_OPTIONS,
  SERVICE_CHANNEL_OPTIONS, type ServiceFormValues,
} from "@/lib/validations/service"
import type { ServiceItem } from "@/lib/api/types"

const allServiceCategories = ["All", ...SERVICE_CATEGORY_OPTIONS]

export default function ServicesPage() {
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
  const servicesQuery = useServices({ page: currentPage, limit: pageSize })
  const services = servicesQuery.data?.items ?? []
  const pagination = servicesQuery.data?.pagination ?? {
    page: 1, limit: 10, total: 0, totalPages: 0,
  }

  const detailQuery = useServiceById(activeId)
  const viewingService = detailQuery.data ?? null

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()
  const publishMutation = usePublishService()

  // ─── Forms ──────────────────────────────────────────────────────────────
  const createForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: SERVICE_FORM_DEFAULTS,
  })

  const editForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: SERVICE_FORM_DEFAULTS,
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
    if (pageMode === "edit" && viewingService) {
      editForm.reset({
        name: viewingService.name ?? "",
        description: viewingService.description ?? "",
        category: viewingService.category ?? "",
        tagsInput: (viewingService.tags ?? []).join(", "),
        sortOrder: viewingService.sortOrder ?? 0,
        isPublished: viewingService.isPublished ?? true,
        isActive: viewingService.isActive ?? true,
        channels: viewingService.channels ?? ["chat"],
        firstResponseMins: viewingService.sla?.firstResponseMins ?? 0,
        resolutionMins: viewingService.sla?.resolutionMins ?? 0,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, viewingService])

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const isPublishingService = (id: string | undefined) =>
    publishMutation.isPending && publishMutation.variables?.id === id

  // ─── Navigation ─────────────────────────────────────────────────────────
  const handleViewService = (service: ServiceItem) => {
    const id = service._id ?? service.id
    if (!id) return
    router.push(`/admin/services?id=${id}&mode=view`, { scroll: false })
  }

  const handleEditService = (service: ServiceItem) => {
    const id = service._id ?? service.id
    if (!id) return
    router.push(`/admin/services?id=${id}&mode=edit`, { scroll: false })
  }

  const handleBackToList = () => {
    router.push("/admin/services", { scroll: false })
  }

  // ─── Create ─────────────────────────────────────────────────────────────
  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      createForm.reset(SERVICE_FORM_DEFAULTS)
      createMutation.reset()
    }
  }

  const onCreateSubmit = (values: ServiceFormValues) => {
    const tags = (values.tagsInput ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    createMutation.mutate(
      {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        category: values.category || null,
        tags,
        sortOrder: values.sortOrder,
        isPublished: values.isPublished,
        isActive: values.isActive,
        channels: values.channels,
        sla: {
          firstResponseMins: values.firstResponseMins ?? 0,
          resolutionMins: values.resolutionMins ?? 0,
        },
      },
      {
        onSuccess: () => handleCreateOpenChange(false),
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

  const onEditSubmit = (values: ServiceFormValues) => {
    if (!activeId) return
    const tags = (values.tagsInput ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    updateMutation.mutate(
      {
        id: activeId,
        payload: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          category: values.category || null,
          tags,
          sortOrder: values.sortOrder,
          isPublished: values.isPublished,
          isActive: values.isActive,
          channels: values.channels,
          sla: {
            firstResponseMins: values.firstResponseMins ?? 0,
            resolutionMins: values.resolutionMins ?? 0,
          },
        },
      },
      {
        onSuccess: () => handleBackToList(),
      },
    )
  }

  // ─── Publish ────────────────────────────────────────────────────────────
  const handleTogglePublish = (service: ServiceItem) => {
    const id = service._id ?? service.id
    if (!id || publishMutation.isPending) return
    publishMutation.mutate({ id, isPublished: !service.isPublished })
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
      <AdminLayout title="Service Detail">
        <div className="space-y-6">
          {/* Back + title row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="rounded-xl" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Service Detail</h2>
                <p className="text-sm text-muted-foreground">Read-only view of the selected service</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {detailQuery.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {(detailQuery.error as Error).message || "Failed to load service details."}
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
          ) : viewingService ? (
            <div className="space-y-4">
              {/* Main info */}
              <Card className="rounded-2xl">
                <CardContent className="space-y-6 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {viewingService.isActive !== undefined && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        viewingService.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {viewingService.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                    {viewingService.isPublished !== undefined && (
                      <button
                        type="button"
                        disabled={isPublishingService(viewingService._id ?? viewingService.id)}
                        onClick={() => handleTogglePublish(viewingService)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                          viewingService.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        }`}
                        title={viewingService.isPublished ? "Click to unpublish" : "Click to publish"}
                      >
                        {isPublishingService(viewingService._id ?? viewingService.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : viewingService.isPublished ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <GlobeLock className="h-3 w-3" />
                        )}
                        {viewingService.isPublished ? "Published" : "Unpublished"}
                      </button>
                    )}
                    {viewingService.category && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {viewingService.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                    <p className="text-base font-semibold text-foreground">{viewingService.name}</p>
                  </div>

                  {viewingService.description && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{viewingService.description}</p>
                    </div>
                  )}

                  {/* Channels */}
                  {viewingService.channels && viewingService.channels.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Channels</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {viewingService.channels.map((ch) => (
                          <span key={ch} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />{ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
                      {viewingService.tags && viewingService.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {viewingService.tags.map((tag) => (
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
                      <p className="text-sm text-foreground">{viewingService.sortOrder ?? 0}</p>
                    </div>
                    {/* SLA */}
                    {viewingService.sla && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SLA</p>
                        <p className="text-sm text-foreground">
                          First response: {viewingService.sla.firstResponseMins ?? 0}m · Resolution: {viewingService.sla.resolutionMins ?? 0}m
                        </p>
                      </div>
                    )}
                    {viewingService.createdAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Created
                        </div>
                        <p className="text-sm text-foreground">{new Date(viewingService.createdAt).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingService.updatedAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Last Updated
                        </div>
                        <p className="text-sm text-foreground">{new Date(viewingService.updatedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {(viewingService._id ?? viewingService.id) && (
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
                        <p className="font-mono text-xs text-muted-foreground">{viewingService._id ?? viewingService.id}</p>
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
    <AdminLayout title="Services">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Manage Services</h2>
            <p className="text-sm text-muted-foreground">Configure services your AI can help customers with</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => servicesQuery.refetch()}
              disabled={servicesQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${servicesQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>

            {/* ─── Create Service Dialog ──────────────────────────── */}
            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateOpenChange}>
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
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
                    <div className="space-y-4 py-4">
                      {/* Name */}
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Enter service name (min 2 characters)" className="rounded-xl" maxLength={200} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Description */}
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the service" className="min-h-28 rounded-xl" {...field} />
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
                                {SERVICE_CATEGORY_OPTIONS.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Channels */}
                      <FormField
                        control={createForm.control}
                        name="channels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channels <span className="text-destructive">*</span></FormLabel>
                            <div className="flex flex-wrap gap-4 pt-1">
                              {SERVICE_CHANNEL_OPTIONS.map((ch) => (
                                <label key={ch} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={field.value?.includes(ch)}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...(field.value ?? []), ch]
                                        : (field.value ?? []).filter((v) => v !== ch)
                                      field.onChange(next)
                                    }}
                                  />
                                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                                </label>
                              ))}
                            </div>
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
                              <Input placeholder="Comma-separated tags, e.g. pricing, refund" className="rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* SLA */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="firstResponseMins"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Response (mins)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} placeholder="0" className="rounded-xl" value={field.value} onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))} ref={field.ref} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="resolutionMins"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resolution (mins)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} placeholder="0" className="rounded-xl" value={field.value} onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))} ref={field.ref} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                      {/* Published */}
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
                      {/* Active */}
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
                          {(createMutation.error as Error).message || "Failed to create service. Please try again."}
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
                        {createMutation.isPending ? "Saving..." : "Add Service"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Edit Service Dialog (URL-driven) ────────────────────── */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update the service details below.</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
                <div className="space-y-4 py-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter service name (min 2 characters)" className="rounded-xl" maxLength={200} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the service" className="min-h-28 rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            {SERVICE_CATEGORY_OPTIONS.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="channels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channels <span className="text-destructive">*</span></FormLabel>
                        <div className="flex flex-wrap gap-4 pt-1">
                          {SERVICE_CHANNEL_OPTIONS.map((ch) => (
                            <label key={ch} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={field.value?.includes(ch)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...(field.value ?? []), ch]
                                    : (field.value ?? []).filter((v) => v !== ch)
                                  field.onChange(next)
                                }}
                              />
                              {ch.charAt(0).toUpperCase() + ch.slice(1)}
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="tagsInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input placeholder="Comma-separated tags, e.g. pricing, refund" className="rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="firstResponseMins"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Response (mins)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} placeholder="0" className="rounded-xl" value={field.value} onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))} ref={field.ref} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="resolutionMins"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution (mins)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} placeholder="0" className="rounded-xl" value={field.value} onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))} ref={field.ref} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                  {updateMutation.error && (
                    <p className="text-sm text-destructive">
                      {(updateMutation.error as Error).message || "Failed to update service. Please try again."}
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
          </DialogContent>
        </Dialog>

        {/* ─── Delete Confirmation Dialog ──────────────────────────── */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setPendingDeleteId(null); deleteMutation.reset() } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Service</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The service will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            {deleteMutation.error && (
              <p className="text-sm text-destructive">
                {(deleteMutation.error as Error).message || "Failed to delete service."}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDeleteDialogOpen(false); setPendingDeleteId(null); deleteMutation.reset() }}
                className="rounded-xl"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="rounded-xl"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fetch error banner */}
        {servicesQuery.error && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{(servicesQuery.error as Error).message || "Failed to load services."}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-destructive hover:text-destructive"
              onClick={() => servicesQuery.refetch()}
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
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={(value) => { setSelectedCategory(value); setCurrentPage(1) }}
              >
                <SelectTrigger className="w-full rounded-xl sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allServiceCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Channels</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Loading skeletons */}
                  {servicesQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="bg-card">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                            <div className="space-y-2">
                              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-20 animate-pulse rounded bg-muted" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4 text-right"><div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" /></td>
                      </tr>
                    ))
                  ) : filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No services found.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((service) => {
                      const id = service._id ?? service.id
                      return (
                        <tr key={id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Briefcase className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{service.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{service.description || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {service.category || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(service.channels ?? []).map((ch) => (
                                <span key={ch} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                  <MessageSquare className="h-3 w-3" />{ch}
                                </span>
                              ))}
                              {(!service.channels || service.channels.length === 0) && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              disabled={isPublishingService(id)}
                              onClick={() => handleTogglePublish(service)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                                service.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isPublishingService(id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : service.isPublished ? (
                                <Globe className="h-3 w-3" />
                              ) : (
                                <GlobeLock className="h-3 w-3" />
                              )}
                              {service.isPublished ? "Published" : "Unpublished"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewService(service)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditService(service)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRequest(id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
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
            {/* Pagination */}
            {pagination.total > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                pageSize={pageSize}
                totalItems={pagination.total}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
