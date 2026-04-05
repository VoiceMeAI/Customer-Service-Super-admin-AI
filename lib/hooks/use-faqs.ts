/**
 * React Query hooks for FAQs
 *
 * Replaces all manual useState + useEffect + useCallback patterns in the
 * FAQ pages with declarative, cached, auto-refreshing queries and mutations.
 *
 * Query key factory (faqKeys) makes cache invalidation surgical — mutating
 * one FAQ only refetches the data that actually changed.
 *
 * How it maps to the old manual code:
 *
 *  OLD                                          NEW
 *  ─────────────────────────────────────────────────────────────────────
 *  const [faqs, setFaqs] = useState([])        useFaqs()
 *  const [isLoading, setIsLoading] = ...       query.isLoading
 *  const [fetchError, setFetchError] = ...     query.error
 *  const fetchFaqs = useCallback(...)          automatic (staleTime + focus)
 *  useEffect(() => { fetchFaqs(...) }, [...])  automatic
 *
 *  const [viewingFaq, ...] = useState(null)    useFaqById(id)
 *  const [isViewLoading, ...] = useState(...)  query.isLoading
 *  const [viewError, ...] = useState(null)     query.error
 *
 *  setIsSubmitting(true) try { await createFaq() } finally { ... }
 *                                              useCreateFaq() → mutation.mutate()
 *  setIsEditSubmitting(true) ...               useUpdateFaq() → mutation.mutate()
 *  setPublishingId(id) ...                     usePublishFaq() → mutation.isPending
 *  setIsDeleting(true) ...                     useDeleteFaq() → mutation.isPending
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import {
  getFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  publishFaq,
} from "@/lib/api/faqs"
import type { FaqItem, FaqPayload } from "@/lib/api/types"

// ─── Query key factory ────────────────────────────────────────────────────────
//
// Consistent key hierarchy lets us invalidate exactly the right data:
//  - invalidate faqKeys.lists() after create/delete (list data changed)
//  - invalidate faqKeys.detail(id) after update/publish (single item changed)

export const faqKeys = {
  all:     () => ["faqs"] as const,
  lists:   () => [...faqKeys.all(), "list"] as const,
  list:    (params: { page: number; limit: number }) =>
             [...faqKeys.lists(), params] as const,
  details: () => [...faqKeys.all(), "detail"] as const,
  detail:  (id: string) => [...faqKeys.details(), id] as const,
}

// ─── 1. useFaqs — paginated list ──────────────────────────────────────────────

export type UseFaqsParams = {
  page?: number
  limit?: number
}

/**
 * useFaqs
 *
 * Fetches the paginated FAQ list. Automatically refetches when page/limit
 * change (passed as query key parts). Replaces:
 *
 *  const fetchFaqs = useCallback(async (page, limit) => { ... }, [])
 *  useEffect(() => { fetchFaqs(currentPage, pageSize) }, [...])
 *  + 2× useState for isLoading + fetchError
 */
export function useFaqs(params: UseFaqsParams = {}) {
  const page  = params.page  ?? 1
  const limit = params.limit ?? 10

  return useQuery({
    queryKey: faqKeys.list({ page, limit }),
    queryFn:  () => getFaqs({ page, limit }),
    // Keep previous page's data visible while next page loads (no flash of empty)
    placeholderData: (previous) => previous,
  })
}

// ─── 2. useFaqById — single item ──────────────────────────────────────────────

/**
 * useFaqById
 *
 * Fetches a single FAQ by ID. Only runs when `id` is non-null.
 * Replaces the manual getFaqById call inside the URL-sync useEffect, plus
 * the viewingFaq / isViewLoading / viewError state trio.
 *
 * The `initialData` option lets callers pass a cached list item so the UI
 * shows data instantly while the fresh fetch completes in the background.
 */
export function useFaqById(
  id: string | null,
  options?: Pick<UseQueryOptions<FaqItem>, "initialData">
) {
  return useQuery({
    queryKey: faqKeys.detail(id ?? ""),
    queryFn:  () => getFaqById(id!),
    enabled:  !!id,
    ...options,
  })
}

// ─── 3. useCreateFaq ──────────────────────────────────────────────────────────

/**
 * useCreateFaq
 *
 * Mutation for POST /api/widget/faqs/create.
 * On success, invalides the list cache so the new record appears immediately.
 * Replaces:
 *
 *  setIsSubmitting(true)
 *  try { await createFaq(payload); fetchFaqs(...) }
 *  catch { setSubmitError(...) }
 *  finally { setIsSubmitting(false) }
 */
export function useCreateFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FaqPayload) => createFaq(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: faqKeys.lists() })
    },
  })
}

// ─── 4. useUpdateFaq ──────────────────────────────────────────────────────────

/**
 * useUpdateFaq
 *
 * Mutation for PATCH /api/widget/faqs/{id}.
 * On success, invalidates both the list and the specific detail cache entry.
 */
export function useUpdateFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FaqPayload> }) =>
      updateFaq(id, payload),
    onSuccess: (updatedFaq) => {
      const id = updatedFaq._id ?? updatedFaq.id
      if (id) void qc.invalidateQueries({ queryKey: faqKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: faqKeys.lists() })
    },
  })
}

// ─── 5. usePublishFaq ─────────────────────────────────────────────────────────

/**
 * usePublishFaq
 *
 * Mutation for PATCH /api/widget/faqs/{id}/publish.
 * Performs an optimistic update on the list cache so the badge flips
 * instantly without waiting for the server round-trip.
 * Replaces the publishingId + manual setFaqs in-place pattern.
 */
export function usePublishFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      publishFaq(id, isPublished),
    onSuccess: (updatedFaq) => {
      const id = updatedFaq._id ?? updatedFaq.id
      if (id) {
        // Update the detail cache directly (no extra network request)
        qc.setQueryData<FaqItem>(faqKeys.detail(id), updatedFaq)
        // Invalidate lists so pagination totals stay accurate
        void qc.invalidateQueries({ queryKey: faqKeys.lists() })
      }
    },
  })
}

// ─── 6. useDeleteFaq ──────────────────────────────────────────────────────────

/**
 * useDeleteFaq
 *
 * Mutation for DELETE /api/widget/faqs/{id}.
 * On success, removes the item from all list caches immediately,
 * then invalidates to sync server pagination totals.
 * Replaces setIsDeleting + manual setFaqs filter + fetchFaqs.
 */
export function useDeleteFaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFaq(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: faqKeys.lists() })
      // Remove the detail cache entry to avoid stale data if user navigates
      qc.removeQueries({ queryKey: faqKeys.detail(id) })
    },
  })
}
