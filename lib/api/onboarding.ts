/**
 * Onboarding API Service
 *
 * Consumes all onboarding endpoints exposed by the backend:
 *
 *  POST   /api/widget/onboarding/create        – createOnboarding
 *  GET    /api/widget/onboarding/all           – getOnboardings
 *  GET    /api/widget/onboarding/{id}          – getOnboardingById
 *  PATCH  /api/widget/onboarding/{id}          – updateOnboarding
 *  DELETE /api/widget/onboarding/{id}          – deleteOnboarding
 *
 * All functions:
 * - Use the shared apiClient (axios instance with interceptors)
 * - Encryption is handled automatically by the request interceptor:
 *     plain payload  →  { textData: "AES-encrypted-string" }
 * - Decryption is handled automatically by the response interceptor:
 *     { encrypted: true, textData: "..." }  →  plain object
 * - Auth token is attached automatically by the request interceptor
 * - Errors are normalised by the error interceptor and re-thrown as ApiError
 */

import apiClient from './axios';
import type {
  ApiError,
  OnboardingPayload,
  OnboardingItem,
  GetAllOnboardingsResult,
  OnboardingListPagination,
} from './types';

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * unwrapPayload
 *
 * After decryption the response.data sits in one of three shapes:
 *
 *   Shape A (actual backend pattern):
 *     { code, message, status, payload: <actual data> }
 *
 *   Shape B (alternate wrapper):
 *     { data: <actual data> }
 *
 *   Shape C (direct):
 *     <actual data>
 *
 * This helper extracts and returns <actual data> for any shape.
 */
function unwrapPayload<T>(data: unknown): T {
  if (data && typeof data === 'object') {
    if ('payload' in data) return (data as Record<string, unknown>).payload as T;
    if ('data' in data)    return (data as Record<string, unknown>).data as T;
  }
  return data as T;
}

// ─── 1. Create ────────────────────────────────────────────────────────────────

/**
 * createOnboarding
 *
 * POST /api/widget/onboarding/create
 *
 * Sends the full onboarding payload (all 5 steps combined).
 * The request interceptor encrypts the body to { textData: "..." }.
 * The response interceptor decrypts and returns the created onboarding record.
 *
 * Requires: valid auth token (attached by request interceptor automatically)
 *
 * @param payload  Full onboarding form data matching OnboardingPayload
 * @returns        The newly created OnboardingItem returned by the backend
 */
export async function createOnboarding(payload: OnboardingPayload): Promise<OnboardingItem> {
  try {
    console.log('📤 createOnboarding – sending payload:', {
      companyName: payload.companyName,
      industryCategory: payload.industryCategory,
      widgetPosition: payload.widgetPosition,
    });

    const response = await apiClient.post<unknown>('/api/widget/onboarding/create', payload);

    console.log('📦 createOnboarding – raw response.data:', JSON.stringify(response.data, null, 2));

    // Try deep-extract under the 'onboarding' key first (matches backend pattern),
    // then fall back to generic unwrap for any alternate response shape.
    const result =
      extractDeepPayload<OnboardingItem>(response.data, 'onboarding') ??
      unwrapPayload<OnboardingItem>(response.data);

    console.log('✅ createOnboarding – extracted result:', result);

    return result;
  } catch (error) {
    console.error('❌ createOnboarding – error:', error);
    throw error as ApiError;
  }
}

// ─── 2. Get All ───────────────────────────────────────────────────────────────

/**
 * extractListPayload (internal helper)
 *
 * Recursively walks the nested response object until it finds the layer
 * that contains `{ data: OnboardingItem[], pagination: {...} }`.
 *
 * This handles both response shapes produced by this backend:
 *
 *  Non-encrypted  →  response.data.payload.payload.payload  →  { data, pagination }
 *  Encrypted      →  response.data (already decrypted by interceptor)
 *                    may be  .payload  or  .payload.payload  →  { data, pagination }
 *
 * The recursion stops as soon as it finds an object with a `data` array
 * and an optional `pagination` sibling.
 */
function extractListPayload(
  node: unknown,
  depth = 0
): { data: OnboardingItem[]; pagination: OnboardingListPagination | null } | null {
  // Prevent infinite loops on malformed responses
  if (depth > 6 || !node || typeof node !== 'object') return null;

  const obj = node as Record<string, unknown>;

  // ✅ Terminal case: this object IS the data container
  if (Array.isArray(obj.data)) {
    return {
      data: obj.data as OnboardingItem[],
      pagination: (obj.pagination as OnboardingListPagination) ?? null,
    };
  }

  // Recurse into `.payload` if present
  if (obj.payload !== undefined) {
    const found = extractListPayload(obj.payload, depth + 1);
    if (found) return found;
  }

  return null;
}

/**
 * getOnboardings
 *
 * GET /api/widget/onboarding/all
 *
 * Fetches the list of onboarding records for the authenticated user.
 *
 * Actual backend response structure (non-encrypted):
 *   response.data = {
 *     payload: {                              ← outer wrapper
 *       status: true,
 *       payload: {                            ← API layer
 *         code: 200,
 *         message: "Onboardings fetched successfully",
 *         payload: {                          ← endpoint payload  ✅ we want this
 *           data: OnboardingItem[],
 *           pagination: { page, limit, total, totalPages },
 *         },
 *         status: true,
 *       }
 *     },
 *     status: true,
 *     encrypted: false,
 *     timestamp: "...",
 *   }
 *
 * The encrypted case is handled identically because the interceptor
 * decrypts textData and sets response.data to the inner content — the
 * recursive extractListPayload() finds { data, pagination } in either case.
 *
 * @param params  Optional server-side pagination parameters
 * @returns       { items, pagination } — normalised list + pagination metadata
 */
export async function getOnboardings(
  params?: { page?: number; limit?: number }
): Promise<GetAllOnboardingsResult> {
  try {
    const page  = params?.page  ?? 1;
    const limit = params?.limit ?? 10;

    console.log(`📤 getOnboardings – page=${page}, limit=${limit}`);

    const response = await apiClient.get<unknown>('/api/widget/onboarding/all', {
      params: { page, limit },
    });

    console.log('📦 getOnboardings – raw response.data:', JSON.stringify(response.data, null, 2));

    const extracted = extractListPayload(response.data);

    if (!extracted) {
      console.warn('⚠️ getOnboardings – could not find { data, pagination } in response:', response.data);
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const defaultPagination: OnboardingListPagination = {
      page,
      limit,
      total: extracted.data.length,
      totalPages: Math.ceil(extracted.data.length / limit),
    };

    const pagination: OnboardingListPagination = extracted.pagination ?? defaultPagination;

    console.log(`✅ getOnboardings – ${extracted.data.length} items, total=${pagination.total}, totalPages=${pagination.totalPages}`);

    return {
      items: extracted.data,
      pagination,
    };
  } catch (error) {
    console.error('❌ getOnboardings – error:', error);
    throw error as ApiError;
  }
}

// ─── 3. Get One ───────────────────────────────────────────────────────────────

/**
 * extractDeepPayload (internal helper)
 *
 * Recursively walks the nested response until it finds an object that
 * contains a specific `targetKey`.  This handles the triple-nested
 * backend response format for single-item endpoints:
 *
 *   response.data (non-encrypted):
 *     { payload: { status, payload: { code, message, payload: { onboarding: {...} }, status } } }
 *
 *   The function walks through every `.payload` node until it finds one
 *   that contains `targetKey`, then returns the value at that key.
 *
 *   Works identically for encrypted responses because the interceptor
 *   decrypts the data before this helper runs.
 */
function extractDeepPayload<T>(
  node: unknown,
  targetKey: string,
  depth = 0
): T | null {
  if (depth > 6 || !node || typeof node !== 'object') return null;

  const obj = node as Record<string, unknown>;

  // ✅ Terminal case: this level has the key we're looking for
  if (obj[targetKey] !== undefined) {
    return obj[targetKey] as T;
  }

  // Recurse into `.payload`
  if (obj.payload !== undefined) {
    return extractDeepPayload<T>(obj.payload, targetKey, depth + 1);
  }

  return null;
}

/**
 * getOnboardingById
 *
 * GET /api/widget/onboarding/{id}?id={id}
 *
 * Fetches a single onboarding record by its ID.
 *
 * Backend endpoint requires the id BOTH in the path AND as a query param:
 *   /api/widget/onboarding/69a7d6d44625c35b927b6476?id=69a7d6d44625c35b927b6476
 *
 * Actual response structure (non-encrypted):
 *   response.data = {
 *     payload: {
 *       status: true,
 *       payload: {
 *         code: 200,
 *         message: "Onboarding fetched successfully",
 *         payload: {
 *           onboarding: { ...OnboardingItem }   ← the actual data
 *         },
 *         status: true,
 *       }
 *     },
 *     ...
 *   }
 *
 * extractDeepPayload(response.data, 'onboarding') digs through the
 * nested `.payload` chain and returns the `onboarding` object directly.
 *
 * @param id  The onboarding record ID (_id from the backend)
 * @returns   The OnboardingItem with all fields populated
 */
export async function getOnboardingById(id: string): Promise<OnboardingItem> {
  try {
    console.log(`📤 getOnboardingById – fetching id: ${id}`);

    // ID goes in both the path segment AND the query param (backend requirement)
    const response = await apiClient.get<unknown>(`/api/widget/onboarding/${id}`, {
      params: { id },
    });

    console.log('📦 getOnboardingById – raw response.data:', JSON.stringify(response.data, null, 2));

    const result = extractDeepPayload<OnboardingItem>(response.data, 'onboarding');

    if (!result) {
      console.warn('⚠️ getOnboardingById – could not find onboarding key in response:', response.data);
      // Fallback: try the generic unwrap in case the structure is different
      const fallback = unwrapPayload<OnboardingItem>(response.data);
      console.log('🔄 getOnboardingById – fallback unwrap result:', fallback);
      return fallback;
    }

    console.log('✅ getOnboardingById – extracted onboarding:', result);

    return result;
  } catch (error) {
    console.error(`❌ getOnboardingById – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

/**
 * updateOnboarding
 *
 * PATCH /api/widget/onboarding/{id}
 *
 * Sends a partial or full payload to update an existing onboarding record.
 * PATCH body is encrypted by the request interceptor to { textData: "..." }.
 *
 * @param id       The onboarding record ID to update
 * @param payload  Partial onboarding data (only changed fields are required)
 * @returns        The updated OnboardingItem
 */
export async function updateOnboarding(
  id: string,
  payload: Partial<OnboardingPayload>
): Promise<OnboardingItem> {
  try {
    console.log(`📤 updateOnboarding – updating id: ${id}`, {
      fields: Object.keys(payload),
    });

    const response = await apiClient.patch<unknown>(`/api/widget/onboarding/${id}`, payload);

    console.log('📦 updateOnboarding – raw response.data:', JSON.stringify(response.data, null, 2));

    // Same triple-nested pattern as GET-by-ID — use recursive extractor,
    // fall back to generic unwrap if the shape differs.
    const result =
      extractDeepPayload<OnboardingItem>(response.data, 'onboarding') ??
      unwrapPayload<OnboardingItem>(response.data);

    console.log('✅ updateOnboarding – extracted result:', result);

    return result;
  } catch (error) {
    console.error(`❌ updateOnboarding – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 5. Delete ────────────────────────────────────────────────────────────────

/**
 * deleteOnboarding
 *
 * DELETE /api/widget/onboarding/{id}
 *
 * Permanently deletes an onboarding record.
 * Returns void on success (204 No Content or empty body).
 *
 * @param id  The onboarding record ID to delete
 */
export async function deleteOnboarding(id: string): Promise<void> {
  try {
    console.log(`📤 deleteOnboarding – deleting id: ${id}`);

    await apiClient.delete(`/api/widget/onboarding/${id}`);

    console.log(`✅ deleteOnboarding – id ${id} deleted successfully`);
  } catch (error) {
    console.error(`❌ deleteOnboarding – error for id ${id}:`, error);
    throw error as ApiError;
  }
}
