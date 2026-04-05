"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Search, MoreHorizontal, Pencil, Trash2, Mail, UserPlus, X,
  RefreshCw, ArrowLeft, Eye, Loader2, Calendar, ShieldCheck,
} from "lucide-react"
import {
  useStaff, useStaffById, useCreateStaff, useUpdateStaff,
  useDeleteStaff, useUpdateStaffStatus, useResendInvite,
} from "@/lib/hooks/use-staff"
import {
  inviteStaffSchema, INVITE_STAFF_DEFAULTS, editStaffSchema, EDIT_STAFF_DEFAULTS,
  type InviteStaffFormValues, type EditStaffFormValues,
} from "@/lib/validations/staff"
import type { StaffItem } from "@/lib/api/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────


/**
 * Dummy industry-standard roles for customer service/admin platforms
 * Used until a roles API is provided
 */
const ROLE_OPTIONS = [
  "Super Admin",         // Full platform access
  "Admin",              // Manage users, settings, and data
  "Manager",            // Oversee teams, view analytics
  "Team Lead",          // Lead a group of agents
  "Support Agent",      // Handle customer tickets/chats
  "Customer Success",   // Proactive customer engagement
  "Billing Specialist", // Handle billing and payments
  "QA Specialist",      // Quality assurance and review
  "Viewer",             // Read-only access
]

function getRoleLabel(role: string) {
  switch (role) {
    case "Super Admin": return "Super Admin"
    case "Admin": return "Admin"
    case "Manager": return "Manager"
    case "Support Agent": return "Support Agent"
    case "Viewer": return "Viewer"
    default: return role || "Unknown Role"
  }
}

function getInitials(member: StaffItem): string {
  const first = member.firstName ?? member.name?.split(" ")[0] ?? ""
  const last  = member.lastName  ?? member.name?.split(" ")[1] ?? ""
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || member.email[0].toUpperCase()
}

function getDisplayName(member: StaffItem): string {
  if (member.firstName || member.lastName) {
    return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
  }
  return member.name ?? member.email
}

function getStatusColor(status: string | undefined) {
  switch (status) {
    case "active":    return "bg-primary/10 text-primary"
    case "invited":   return "bg-amber-500/10 text-amber-500"
    case "suspended": return "bg-destructive/10 text-destructive"
    default:          return "bg-muted text-muted-foreground"
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  console.log("StaffPage rendered");
  const searchParams = useSearchParams()
  const router = useRouter()

  // ─── Filters ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState("")
  const [selectedRole, setSelectedRole] = useState("All")
  const [currentPage, setCurrentPage]   = useState(1)
  const [pageSize, setPageSize]         = useState(10)

  // ─── URL-driven page mode ────────────────────────────────────────────────
  type PageMode = "list" | "view" | "edit"
  const [pageMode, setPageMode] = useState<PageMode>("list")
  const [activeId, setActiveId] = useState<string | null>(null)

  // ─── Dialog visibility ───────────────────────────────────────────────────
  const [isInviteOpen, setIsInviteOpen]       = useState(false)
  const [isEditOpen, setIsEditOpen]           = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // ─── Roles state (same pattern as onboarding supportedLanguages) ─────────
  const [inviteRoles, setInviteRoles] = useState<string[]>([])
  const [editRoles, setEditRoles]     = useState<string[]>([])

  const addInviteRole = (role: string) => {
    if (role && !inviteRoles.includes(role)) setInviteRoles([...inviteRoles, role])
  }
  const removeInviteRole = (role: string) => {
    setInviteRoles(inviteRoles.filter((r) => r !== role))
  }
  const addEditRole = (role: string) => {
    if (role && !editRoles.includes(role)) setEditRoles([...editRoles, role])
  }
  const removeEditRole = (role: string) => {
    setEditRoles(editRoles.filter((r) => r !== role))
  }

  // ─── React Query ─────────────────────────────────────────────────────────
  const staffQuery  = useStaff({ page: currentPage, limit: pageSize })
  const staffList   = staffQuery.data?.items ?? []
  const pagination  = staffQuery.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  const detailQuery  = useStaffById(activeId)
  const viewingStaff = detailQuery.data ?? null

  // Use only dummy roles for now
  const roleOptions = ROLE_OPTIONS;
  const allRoles    = ["All", ...roleOptions]

  const createMutation       = useCreateStaff()
  const updateMutation       = useUpdateStaff()
  const deleteMutation       = useDeleteStaff()
  const statusMutation       = useUpdateStaffStatus()
  const resendMutation       = useResendInvite()

  // ─── Forms ───────────────────────────────────────────────────────────────
  const inviteForm = useForm<InviteStaffFormValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: INVITE_STAFF_DEFAULTS,
  })

  const editForm = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: EDIT_STAFF_DEFAULTS,
  })

  // ─── URL sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id   = searchParams.get("id")
    const mode = searchParams.get("mode")

    if (mode === "view" && id) {
      setPageMode("view")
      setActiveId(id)
    } else if (mode === "edit" && id) {
      setPageMode("edit")
      setActiveId(id)
      setIsEditOpen(true)
    } else {
      setPageMode("list")
      setActiveId(null)
      setIsEditOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ─── Pre-fill edit form when detail data loads ───────────────────────────
  useEffect(() => {
    if (pageMode === "edit" && viewingStaff) {
      editForm.reset({
        firstName: viewingStaff.firstName ?? "",
        lastName:  viewingStaff.lastName  ?? "",
        phone:     viewingStaff.phone     ?? "",
        roles:     viewingStaff.roles     ?? [],
      })
      setEditRoles(viewingStaff.roles ?? [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageMode, viewingStaff])

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filteredStaff = staffList.filter((m) => {
    const name  = getDisplayName(m).toLowerCase()
    const email = m.email.toLowerCase()
    const q     = searchQuery.toLowerCase()
    const matchesSearch = name.includes(q) || email.includes(q)
    const matchesRole   = selectedRole === "All" || (m.roles ?? []).includes(selectedRole) || m.role === selectedRole
    return matchesSearch && matchesRole
  })

  // ─── Navigation ──────────────────────────────────────────────────────────
  const handleViewStaff = (member: StaffItem) => {
    const id = member._id ?? member.id
    if (!id) return
    router.push(`/admin/staff?id=${id}&mode=view`, { scroll: false })
  }

  const handleEditStaff = (member: StaffItem) => {
    const id = member._id ?? member.id
    if (!id) return
    router.push(`/admin/staff?id=${id}&mode=edit`, { scroll: false })
  }

  const handleBackToList = () => router.push("/admin/staff", { scroll: false })

  // ─── Invite ──────────────────────────────────────────────────────────────
  const handleInviteOpenChange = (open: boolean) => {
    setIsInviteOpen(open)
    if (!open) { inviteForm.reset(INVITE_STAFF_DEFAULTS); setInviteRoles([]); createMutation.reset() }
  }

  const onInviteSubmit = (values: InviteStaffFormValues) => {
    createMutation.mutate(
      {
        firstName: values.firstName.trim(),
        lastName:  values.lastName.trim(),
        email:     values.email.trim(),
        phone:     values.phone?.trim() || undefined,
        roles:     inviteRoles.length > 0 ? inviteRoles : undefined,
      },
      { onSuccess: () => handleInviteOpenChange(false) }
    )
  }

  // ─── Edit ────────────────────────────────────────────────────────────────
  const handleEditOpenChange = (open: boolean) => {
    if (!open) { updateMutation.reset(); handleBackToList() }
  }

  const onEditSubmit = (values: EditStaffFormValues) => {
    if (!activeId) return
    updateMutation.mutate(
      {
        id: activeId,
        payload: {
          firstName: values.firstName?.trim() || undefined,
          lastName:  values.lastName?.trim()  || undefined,
          phone:     values.phone?.trim()     || undefined,
          roles:     editRoles.length > 0 ? editRoles : undefined,
        },
      },
      { onSuccess: () => handleBackToList() }
    )
  }

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteRequest = (id: string | undefined) => {
    if (!id) return
    setPendingDeleteId(id)
    deleteMutation.reset()
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return
    deleteMutation.mutate(pendingDeleteId, {
      onSuccess: () => { setDeleteDialogOpen(false); setPendingDeleteId(null) },
    })
  }

  // ─── Status toggle ───────────────────────────────────────────────────────
  const handleToggleStatus = (member: StaffItem) => {
    const id = member._id ?? member.id
    if (!id || statusMutation.isPending) return
    const next = member.status === "active" ? "suspended" : "active"
    statusMutation.mutate({ id, payload: { status: next } })
  }

  const isTogglingStatus = (id: string | undefined) =>
    statusMutation.isPending && (
      statusMutation.variables?.id === id
    )

  // ─── Resend invite ───────────────────────────────────────────────────────
  const handleResendInvite = (id: string | undefined) => {
    if (!id || resendMutation.isPending) return
    resendMutation.mutate(id)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (pageMode === "view") {
    return (
      <AdminLayout title="Staff Detail">
        <div className="space-y-6">
          {/* Back + title */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="rounded-xl" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Staff Detail</h2>
                <p className="text-sm text-muted-foreground">Read-only view of the selected team member</p>
              </div>
            </div>
            {viewingStaff && (
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => handleEditStaff(viewingStaff)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={resendMutation.isPending}
                  onClick={() => handleResendInvite(viewingStaff._id ?? viewingStaff.id)}
                >
                  {resendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Resend Invite
                </Button>
              </div>
            )}
          </div>

          {detailQuery.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {(detailQuery.error as Error).message || "Failed to load staff details."}
            </div>
          )}

          {detailQuery.isLoading ? (
            <Card className="rounded-2xl">
              <CardContent className="space-y-4 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : viewingStaff ? (
            <div className="space-y-4">
              <Card className="rounded-2xl">
                <CardContent className="space-y-6 p-6">
                  {/* Avatar + badges */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 text-xl">
                      <AvatarFallback>{getInitials(viewingStaff)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{getDisplayName(viewingStaff)}</p>
                      <p className="text-sm text-muted-foreground">{viewingStaff.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(viewingStaff.status)}`}>
                          {viewingStaff.status ?? "—"}
                        </span>
                        {viewingStaff.role && (
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {viewingStaff.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First Name</p>
                      <p className="text-sm text-foreground">{viewingStaff.firstName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Name</p>
                      <p className="text-sm text-foreground">{viewingStaff.lastName || "—"}</p>
                    </div>
                    {viewingStaff.roles && viewingStaff.roles.length > 0 && (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" /> Roles
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {viewingStaff.roles.map((r) => (
                            <span key={r} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingStaff.phone && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                        <p className="text-sm text-foreground">{viewingStaff.phone}</p>
                      </div>
                    )}
                    {typeof viewingStaff.isActive === "boolean" && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active</p>
                        <p className="text-sm text-foreground">{viewingStaff.isActive ? "Yes" : "No"}</p>
                      </div>
                    )}
                    {viewingStaff.invitedBy && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invited By</p>
                        <p className="text-sm text-foreground">{viewingStaff.invitedBy}</p>
                      </div>
                    )}
                    {viewingStaff.invitedAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Invited
                        </div>
                        <p className="text-sm text-foreground">{new Date(viewingStaff.invitedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {viewingStaff.createdAt && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Joined
                        </div>
                        <p className="text-sm text-foreground">{new Date(viewingStaff.createdAt).toLocaleString()}</p>
                      </div>
                    )}
                    {(viewingStaff._id ?? viewingStaff.id) && (
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
                        <p className="font-mono text-xs text-muted-foreground">{viewingStaff._id ?? viewingStaff.id}</p>
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
    <AdminLayout title="Staff">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
            <p className="text-sm text-muted-foreground">Manage staff access and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => staffQuery.refetch()}
              disabled={staffQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${staffQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>

            {/* ─── Invite Dialog ────────────────────────────────────── */}
            <Dialog open={isInviteOpen} onOpenChange={handleInviteOpenChange}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>Send an invitation email to a new team member.</DialogDescription>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)}>
                    <div className="space-y-4 py-4">
                      {/* First + Last name (required) */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={inviteForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="Jane" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={inviteForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" className="rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Email */}
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="colleague@company.com" className="rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Phone */}
                      <FormField
                        control={inviteForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1 234 567 8900" className="rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Roles */}
                      <div className="space-y-2">
                        <Label>Add Role</Label>
                        <Select onValueChange={addInviteRole}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Add role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.filter((r) => !!r && !inviteRoles.includes(r)).length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No roles available</div>
                            ) : (
                              roleOptions
                                .filter((r) => !!r && !inviteRoles.includes(r))
                                .map((r) => (
                                  <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Roles tag list */}
                      {inviteRoles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Assigned Roles</Label>
                          <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-border p-3">
                            {inviteRoles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                              >
                                {getRoleLabel(role)}
                                <button
                                  type="button"
                                  onClick={() => removeInviteRole(role)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {createMutation.error && (
                        <p className="text-sm text-destructive">
                          {(createMutation.error as Error).message || "Failed to send invitation. Please try again."}
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => handleInviteOpenChange(false)} className="rounded-xl" disabled={createMutation.isPending}>
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-xl" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Sending..." : <><Mail className="mr-2 h-4 w-4" />Send Invitation</>}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Edit Dialog (URL-driven) ──────────────────────────────── */}
        <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>Update the team member's details below.</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 234 567 8900" className="rounded-xl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Roles */}
                  <div className="space-y-2">
                    <Label>Add Role</Label>
                    <Select onValueChange={addEditRole}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Add role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions
                          .filter((r) => !editRoles.includes(r))
                          .map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editRoles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Assigned Roles</Label>
                      <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-border p-3">
                        {editRoles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {role}
                            <button
                              type="button"
                              onClick={() => removeEditRole(role)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {updateMutation.error && (
                    <p className="text-sm text-destructive">
                      {(updateMutation.error as Error).message || "Failed to update staff. Please try again."}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleEditOpenChange(false)} className="rounded-xl" disabled={updateMutation.isPending}>
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

        {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setPendingDeleteId(null); deleteMutation.reset() } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove Staff Member</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The team member will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            {deleteMutation.error && (
              <p className="text-sm text-destructive">
                {(deleteMutation.error as Error).message || "Failed to remove staff member."}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setPendingDeleteId(null); deleteMutation.reset() }} className="rounded-xl" disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} className="rounded-xl" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fetch error banner */}
        {staffQuery.error && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{(staffQuery.error as Error).message || "Failed to load staff."}</span>
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-destructive hover:text-destructive" onClick={() => staffQuery.refetch()}>
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
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="rounded-xl pl-10"
                />
              </div>
              <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); setCurrentPage(1) }}>
                <SelectTrigger className="w-full rounded-xl sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Loading skeletons */}
                  {staffQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="bg-card">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                          </div>
                        </td>
                        <td className="px-6 py-4"><div className="h-4 w-40 animate-pulse rounded bg-muted" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                        <td className="px-6 py-4 text-right"><div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" /></td>
                      </tr>
                    ))
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member) => {
                      const id = member._id ?? member.id
                      return (
                        <tr key={id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{getInitials(member)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{getDisplayName(member)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {member.role || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              disabled={isTogglingStatus(id)}
                              onClick={() => handleToggleStatus(member)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors hover:opacity-80 disabled:opacity-50 ${getStatusColor(member.status)}`}
                              title="Click to toggle active/inactive"
                            >
                              {isTogglingStatus(id) && <Loader2 className="h-3 w-3 animate-spin" />}
                              {member.status ?? "—"}
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
                                <DropdownMenuItem onClick={() => handleViewStaff(member)}>
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={resendMutation.isPending}
                                  onClick={() => handleResendInvite(id)}
                                >
                                  <Mail className="mr-2 h-4 w-4" /> Resend Invite
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRequest(id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove
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
