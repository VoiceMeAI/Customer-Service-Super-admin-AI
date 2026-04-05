/**
 * React Query hooks for Onboardings
 *
 * Replaces all manual useState + useEffect + useCallback patterns in the
 * Onboarding pages with declarative, cached, auto-refreshing queries and
 * mutations.
 *
 * Query key factory (onboardingKeys) makes cache invalidation surgical:
 *  - invalidate onboardingKeys.lists() after create/delete
 *  - invalidate onboardingKeys.detail(id) after update
 *
 *  OLD                                               NEW
 *  ──────────────────────────────────────────────────────────────────────
 *  const [onboardings, setOnboardings] = useState([])   useOnboardings()
 *  const [isLoading, setIsLoading] = ...                query.isLoading
 *  const fetchOnboardings = useCallback(...)            automatic
 *  useEffect(() => { fetchOnboardings(...) }, [...])    automatic
 *
 *  const [viewing, ...] = useState(null)                useOnboardingById(id)
 *
 *  setIsSubmitting(true) try { await createOnboarding() }
 *                                                       useCreateOnboarding()
 *  try { await updateOnboarding() }                     useUpdateOnboarding()
 *  try { await deleteOnboarding() }                     useDeleteOnboarding()
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import {
  getOnboardings,
  getOnboardingById,
  createOnboarding,
  updateOnboarding,
  deleteOnboarding,
} from "@/lib/api/onboarding"
import type { OnboardingItem, OnboardingPayload, GetAllOnboardingsResult } from "@/lib/api/types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const onboardingKeys = {
  all:     () => ["onboardings"] as const,
  lists:   () => [...onboardingKeys.all(), "list"] as const,
  list:    (params: { page: number; limit: number }) =>
             [...onboardingKeys.lists(), params] as const,
  details: () => [...onboardingKeys.all(), "detail"] as const,
  detail:  (id: string) => [...onboardingKeys.details(), id] as const,
}

// ─── 1. useOnboardings — paginated list ───────────────────────────────────────

export type UseOnboardingsParams = {
  page?: number
  limit?: number
}

/**
 * useOnboardings
 *
 * Fetches the paginated onboarding list. Automatically refetches when
 * page/limit change (they are part of the query key). Replaces:
 *
 *  const fetchOnboardings = useCallback(async (page, limit) => { ... }, [])
 *  useEffect(() => { fetchOnboardings(currentPage, pageSize) }, [...])
 *  + useState isLoading + fetchError
 */
export function useOnboardings(params: UseOnboardingsParams = {}) {
  const page  = params.page  ?? 1
  const limit = params.limit ?? 10

  return useQuery<GetAllOnboardingsResult>({
    queryKey: onboardingKeys.list({ page, limit }),
    queryFn:  () => getOnboardings({ page, limit }),
    placeholderData: (previous) => previous,
  })
}

// ─── 2. useOnboardingById — single record ─────────────────────────────────────

/**
 * useOnboardingById
 *
 * Fetches a single onboarding record by ID. Only runs when `id` is non-null.
 * Replaces the manual getOnboardingById call + viewingOnboarding / isViewLoading
 * / viewError state trio.
 *
 * Pass `initialData` to pre-populate from the list cache so the UI shows data
 * while the fresh fetch completes in the background.
 */
export function useOnboardingById(
  id: string | null,
  options?: Pick<UseQueryOptions<OnboardingItem>, "initialData">
) {
  return useQuery<OnboardingItem>({
    queryKey: onboardingKeys.detail(id ?? ""),
    queryFn:  () => getOnboardingById(id!),
    enabled:  !!id,
    ...options,
  })
}

// ─── 3. useCreateOnboarding ───────────────────────────────────────────────────

/**
 * useCreateOnboarding
 *
 * Mutation for POST /api/widget/onboarding/create.
 * On success, invalidates the list cache so the new record appears.
 */
export function useCreateOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: OnboardingPayload) => createOnboarding(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: onboardingKeys.lists() })
    },
  })
}

// ─── 4. useUpdateOnboarding ───────────────────────────────────────────────────

/**
 * useUpdateOnboarding
 *
 * Mutation for PATCH /api/widget/onboarding/{id}.
 * On success, invalidates both the list and the specific detail cache entry.
 */
export function useUpdateOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OnboardingPayload> }) =>
      updateOnboarding(id, payload),
    onSuccess: (updatedItem) => {
      const id = (updatedItem as OnboardingItem & { _id?: string })._id ?? (updatedItem as OnboardingItem & { id?: string }).id
      if (id) void qc.invalidateQueries({ queryKey: onboardingKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: onboardingKeys.lists() })
    },
  })
}

// ─── 5. useDeleteOnboarding ───────────────────────────────────────────────────

/**
 * useDeleteOnboarding
 *
 * Mutation for DELETE /api/widget/onboarding/{id}.
 * On success, removes the detail cache entry and invalidates the list.
 */
export function useDeleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOnboarding(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: onboardingKeys.lists() })
      qc.removeQueries({ queryKey: onboardingKeys.detail(id) })
    },
  })
}
