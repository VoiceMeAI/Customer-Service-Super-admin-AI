/**
 * FAQs API Service
 *
 * Consumes the FAQ endpoints exposed by the backend:
 *
 *  POST   /api/widget/faqs/create       – createFaq
 *  GET    /api/widget/faqs/all          – getFaqs
 *  GET    /api/widget/faqs/{id}         – getFaqById
 *  PATCH  /api/widget/faqs/{id}         – updateFaq
 *  PATCH  /api/widget/faqs/{id}/publish – publishFaq
 *  DELETE /api/widget/faqs/{id}         – deleteFaq
 *  GET    /api/widget/faqs/public       – getPublicFaqs
 *
 * All functions:
 * - Use the shared apiClient (axios instance with interceptors)
 * - Encryption is handled automatically by the request interceptor
 * - Decryption AND nested payload unwrapping is now handled by the
 *   response interceptor (see axios.ts → unwrapNestedPayload)
 * - Auth token is attached automatically by the request interceptor
 * - Errors are normalised by the error interceptor and re-thrown as ApiError
 *
 * IMPORTANT: The response interceptor now auto-unwraps all nested .payload
 * layers, so response.data is already the innermost useful object.
 * For example:
 *   Single item endpoints → response.data = { faq: {...} }
 *   List endpoints        → response.data = { data: [...], pagination: {...} }
 */

import apiClient from './axios';
import type { ApiError, FaqPayload, FaqItem, FaqListPagination, GetAllFaqsResult } from './types';

// ─── OLD helpers (no longer needed) ───────────────────────────────────────────
//
// These three functions used to be required because the response interceptor
// only decrypted the data but left the nested { payload: { payload: { ... } } }
// structure intact. Every API function had to manually dig through the layers.
//
// Now that the interceptor runs unwrapNestedPayload() automatically, these
// are no longer called. Kept here as reference to explain to backend dev
// what the frontend had to do because of the deeply nested response format.
//
// ── 1. unwrapPayload ──
// Checked for .payload or .data at the top level. Used as a last-resort
// fallback in every function.
//
// function unwrapPayload<T>(data: unknown): T {
//   if (data && typeof data === 'object') {
//     if ('payload' in data) return (data as Record<string, unknown>).payload as T;
//     if ('data' in data)    return (data as Record<string, unknown>).data as T;
//   }
//   return data as T;
// }
//
// ── 2. extractDeepPayload ──
// Recursively walked .payload chain looking for a specific key like 'faq'
// or 'onboarding'. Used for single-item endpoints (GET by ID, POST create,
// PATCH update).
//
// function extractDeepPayload<T>(node: unknown, targetKey: string, depth = 0): T | null {
//   if (depth > 6 || !node || typeof node !== 'object') return null;
//   const obj = node as Record<string, unknown>;
//   if (obj[targetKey] !== undefined) return obj[targetKey] as T;
//   if (obj.payload !== undefined) return extractDeepPayload<T>(obj.payload, targetKey, depth + 1);
//   return null;
// }
//
// ── 3. extractListPayload ──
// Recursively walked .payload chain looking for { data: [], pagination: {} }.
// Used for list endpoints (GET all).
//
// function extractListPayload(node: unknown, depth = 0): { data: FaqItem[]; pagination: FaqListPagination | null } | null {
//   if (depth > 6 || !node || typeof node !== 'object') return null;
//   const obj = node as Record<string, unknown>;
//   if (Array.isArray(obj.data)) {
//     return { data: obj.data as FaqItem[], pagination: (obj.pagination as FaqListPagination) ?? null };
//   }
//   if (obj.payload !== undefined) {
//     const found = extractListPayload(obj.payload, depth + 1);
//     if (found) return found;
//   }
//   return null;
// }
//
// ── How every function used to look (example: getFaqById) ──
//   const result =
//     extractDeepPayload<FaqItem>(response.data, 'faq') ??
//     unwrapPayload<FaqItem>(response.data);
//
// ── How every function looks NOW ──
//   const result = (response.data as Record<string, unknown>).faq as FaqItem;
//
// The difference: all unwrapping happens ONCE in the interceptor instead of
// being duplicated in every API function across every API file.
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. Create ────────────────────────────────────────────────────────────────

/**
 * createFaq
 *
 * POST /api/widget/faqs/create
 *
 * Sends the FAQ payload to the backend.
 * The request interceptor encrypts the body to { textData: "..." }.
 * The response interceptor decrypts and returns the created FAQ record.
 *
 * Requires: valid auth token (attached by request interceptor automatically)
 *
 * @param payload  FAQ form data matching FaqPayload
 * @returns        The newly created FaqItem returned by the backend
 */
export async function createFaq(payload: FaqPayload): Promise<FaqItem> {
  try {
    const response = await apiClient.post<unknown>('/api/widget/faqs/create', payload);

    // After interceptor unwrapping, response.data = { faq: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.faq as FaqItem) ?? (data as unknown as FaqItem);

    return result;
  } catch (error) {
    console.error('❌ createFaq – error:', error);
    throw error as ApiError;
  }
}

// ─── 2. Get All ───────────────────────────────────────────────────────────────

/**
 * getFaqs
 *
 * GET /api/widget/faqs/all
 *
 * After interceptor unwrapping, response.data = { data: FaqItem[], pagination: {...} }
 */
export async function getFaqs(
  params?: { page?: number; limit?: number }
): Promise<GetAllFaqsResult> {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? 10;

  try {
    const response = await apiClient.get<unknown>('/api/widget/faqs/all', {
      params: { page, limit },
    });

    // After interceptor unwrapping, response.data = { data: [...], pagination: {...} }
    const data = response.data as Record<string, unknown>;

    const items = Array.isArray(data.data) ? (data.data as FaqItem[]) : [];
    const pagination = (data.pagination as FaqListPagination) ?? {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    };

    return { items, pagination };
  } catch (error) {
    console.error('❌ getFaqs – error:', error);
    throw error as ApiError;
  }
}

// ─── 3. Get One ───────────────────────────────────────────────────────────────

/**
 * getFaqById
 *
 * GET /api/widget/faqs/{id}?id={id}
 *
 * Fetches a single FAQ record by ID.
 * The backend requires the id in BOTH the path segment AND as a query param.
 *
 * @param id  The FAQ record ID (_id from the backend)
 * @returns   The FaqItem with all fields populated
 */
export async function getFaqById(id: string): Promise<FaqItem> {
  try {
    const response = await apiClient.get<unknown>(`/api/widget/faqs/${id}`, {
      params: { id },
    });

    // After interceptor unwrapping, response.data = { faq: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.faq as FaqItem) ?? (data as unknown as FaqItem);

    return result;
  } catch (error) {
    console.error(`❌ getFaqById – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

/**
 * updateFaq
 *
 * PATCH /api/widget/faqs/{id}
 *
 * Sends a partial or full payload to update an existing FAQ record.
 * PATCH body is encrypted by the request interceptor to { textData: "..." }.
 *
 * @param id       The FAQ record ID to update
 * @param payload  Partial FAQ data (only changed fields are required)
 * @returns        The updated FaqItem returned by the backend
 */
export async function updateFaq(
  id: string,
  payload: Partial<FaqPayload>
): Promise<FaqItem> {
  try {
    const response = await apiClient.patch<unknown>(`/api/widget/faqs/${id}`, payload);

    // After interceptor unwrapping, response.data = { faq: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.faq as FaqItem) ?? (data as unknown as FaqItem);

    return result;
  } catch (error) {
    console.error(`❌ updateFaq – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 5. Publish / Unpublish ────────────────────────────────────────────────────

/**
 * publishFaq
 *
 * PATCH /api/widget/faqs/{id}/publish
 *
 * Toggles the published state of an FAQ record.
 * The backend expects the id in **both** the path and the request body.
 * The request body { id } is encrypted to { textData: "..." } by the
 * request interceptor automatically.
 *
 * @param id          The FAQ record ID to publish / unpublish
 * @param isPublished  The desired published state (true = publish, false = unpublish)
 * @returns            The updated FaqItem returned by the backend
 */
export async function publishFaq(id: string, isPublished: boolean): Promise<FaqItem> {
  try {
    const response = await apiClient.patch<unknown>(
      `/api/widget/faqs/${id}/publish`,
      { isPublished }
    );

    // After interceptor unwrapping, response.data = { faq: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.faq as FaqItem) ?? (data as unknown as FaqItem);

    return result;
  } catch (error) {
    console.error(`❌ publishFaq – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 6. Delete ────────────────────────────────────────────────────────────────

/**
 * deleteFaq
 *
 * DELETE /api/widget/faqs/{id}
 *
 * Permanently deletes a FAQ record.
 * Returns void on success (204 No Content or empty body).
 *
 * @param id  The FAQ record ID to delete
 */
export async function deleteFaq(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/widget/faqs/${id}`);
  } catch (error) {
    console.error(`❌ deleteFaq – error for id ${id}:`, error);
    throw error as ApiError;
  }
}
