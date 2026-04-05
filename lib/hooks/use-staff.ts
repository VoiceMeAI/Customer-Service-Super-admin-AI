/**
 * React Query hooks for Staff
 *
 * Mirrors the pattern in use-faqs.ts / use-services.ts exactly.
 * Query key factory makes cache invalidation surgical:
 *  - invalidate staffKeys.lists() after create/delete
 *  - invalidate staffKeys.detail(id) after update/status/roles
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  updateStaffStatus,
  updateStaffRoles,
  resendInvite,
  getRoles,
  getPermissions,
} from "@/lib/api/staff"
import type {
  StaffItem,
  StaffPayload,
  UpdateStaffPayload,
  UpdateStaffStatusPayload,
  UpdateStaffRolesPayload,
  StaffRole,
  StaffPermission,
  GetAllStaffResult,
} from "@/lib/api/types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const staffKeys = {
  all:         () => ["staff"] as const,
  lists:       () => [...staffKeys.all(), "list"] as const,
  list:        (params: { page: number; limit: number }) =>
                 [...staffKeys.lists(), params] as const,
  details:     () => [...staffKeys.all(), "detail"] as const,
  detail:      (id: string) => [...staffKeys.details(), id] as const,
  roles:       () => [...staffKeys.all(), "roles"] as const,
  permissions: () => [...staffKeys.all(), "permissions"] as const,
}

// ─── 1. useStaff — paginated list ─────────────────────────────────────────────

export type UseStaffParams = {
  page?: number
  limit?: number
}

export function useStaff(params: UseStaffParams = {}) {
  const page  = params.page  ?? 1
  const limit = params.limit ?? 10

  return useQuery<GetAllStaffResult>({
    queryKey: staffKeys.list({ page, limit }),
    queryFn:  () => getStaff({ page, limit }),
    placeholderData: (previous) => previous,
  })
}

// ─── 2. useStaffById — single item ────────────────────────────────────────────

export function useStaffById(
  id: string | null,
  options?: Pick<UseQueryOptions<StaffItem>, "initialData">
) {
  return useQuery<StaffItem>({
    queryKey: staffKeys.detail(id ?? ""),
    queryFn:  () => getStaffById(id!),
    enabled:  !!id,
    ...options,
  })
}

// ─── 3. useCreateStaff ────────────────────────────────────────────────────────

export function useCreateStaff() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: StaffPayload) => createStaff(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.lists() })
    },
  })
}

// ─── 4. useUpdateStaff ────────────────────────────────────────────────────────

export function useUpdateStaff() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPayload }) =>
      updateStaff(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: staffKeys.detail(id) })
      qc.invalidateQueries({ queryKey: staffKeys.lists() })
    },
  })
}

// ─── 5. useDeleteStaff ────────────────────────────────────────────────────────

export function useDeleteStaff() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.lists() })
    },
  })
}

// ─── 6. useUpdateStaffStatus ──────────────────────────────────────────────────

export function useUpdateStaffStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffStatusPayload }) =>
      updateStaffStatus(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: staffKeys.detail(id) })
      qc.invalidateQueries({ queryKey: staffKeys.lists() })
    },
  })
}

// ─── 7. useUpdateStaffRoles ───────────────────────────────────────────────────

export function useUpdateStaffRoles() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffRolesPayload }) =>
      updateStaffRoles(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: staffKeys.detail(id) })
      qc.invalidateQueries({ queryKey: staffKeys.lists() })
    },
  })
}

// ─── 8. useResendInvite ───────────────────────────────────────────────────────

export function useResendInvite() {
  return useMutation({
    mutationFn: (id: string) => resendInvite(id),
  })
}

// ─── 9. useRoles ─────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery<StaffRole[]>({
    queryKey: staffKeys.roles(),
    queryFn:  () => getRoles(),
    staleTime: 5 * 60 * 1000, // roles rarely change — cache for 5 min
  })
}

// ─── 10. usePermissions ───────────────────────────────────────────────────────

export function usePermissions() {
  return useQuery<StaffPermission[]>({
    queryKey: staffKeys.permissions(),
    queryFn:  () => getPermissions(),
    staleTime: 5 * 60 * 1000, // permissions rarely change — cache for 5 min
  })
}
