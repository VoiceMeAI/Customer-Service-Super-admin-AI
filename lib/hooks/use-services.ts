/**
 * React Query hooks for Services
 *
 * Mirrors the pattern in use-faqs.ts exactly.
 * Query key factory makes cache invalidation surgical:
 *  - invalidate serviceKeys.lists() after create/delete
 *  - invalidate serviceKeys.detail(id) after update/publish
 *
 *  OLD (mock)                                    NEW
 *  ────────────────────────────────────────────────────────────────────
 *  const [services, setServices] = useState([])  useServices()
 *  toggleActive / handleDelete (local state)     usePublishService() / useDeleteService()
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  publishService,
  reorderServices,
} from "@/lib/api/services"
import type {
  ServiceItem,
  ServicePayload,
  GetAllServicesResult,
  ReorderServicesPayload,
} from "@/lib/api/types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const serviceKeys = {
  all:     () => ["services"] as const,
  lists:   () => [...serviceKeys.all(), "list"] as const,
  list:    (params: { page: number; limit: number }) =>
             [...serviceKeys.lists(), params] as const,
  details: () => [...serviceKeys.all(), "detail"] as const,
  detail:  (id: string) => [...serviceKeys.details(), id] as const,
}

// ─── 1. useServices — paginated list ─────────────────────────────────────────

export type UseServicesParams = {
  page?: number
  limit?: number
}

export function useServices(params: UseServicesParams = {}) {
  const page  = params.page  ?? 1
  const limit = params.limit ?? 10

  return useQuery<GetAllServicesResult>({
    queryKey: serviceKeys.list({ page, limit }),
    queryFn:  () => getServices({ page, limit }),
    placeholderData: (previous) => previous,
  })
}

// ─── 2. useServiceById — single record ───────────────────────────────────────

export function useServiceById(
  id: string | null,
  options?: Pick<UseQueryOptions<ServiceItem>, "initialData">
) {
  return useQuery<ServiceItem>({
    queryKey: serviceKeys.detail(id ?? ""),
    queryFn:  () => getServiceById(id!),
    enabled:  !!id,
    ...options,
  })
}

// ─── 3. useCreateService ─────────────────────────────────────────────────────

export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ServicePayload) => createService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() })
    },
  })
}

// ─── 4. useUpdateService ─────────────────────────────────────────────────────

export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ServicePayload> }) =>
      updateService(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() })
    },
  })
}

// ─── 5. useDeleteService ─────────────────────────────────────────────────────

export function useDeleteService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() })
    },
  })
}

// ─── 6. usePublishService ────────────────────────────────────────────────────

export function usePublishService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      publishService(id, isPublished),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() })
    },
  })
}

// ─── 7. useReorderServices ───────────────────────────────────────────────────

export function useReorderServices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReorderServicesPayload) => reorderServices(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() })
    },
  })
}
