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
 * - Encryption is handled automatically by the request interceptor
 * - Decryption AND nested payload unwrapping is handled by the response interceptor
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

// ─── 1. Create ────────────────────────────────────────────────────────────────

/**
 * createOnboarding
 *
 * POST /api/widget/onboarding/create
 *
 * @param payload  Full onboarding form data matching OnboardingPayload
 * @returns        The newly created OnboardingItem returned by the backend
 */
export async function createOnboarding(payload: OnboardingPayload): Promise<OnboardingItem> {
  try {
    const response = await apiClient.post<unknown>('/api/widget/onboarding/create', payload);

    // After interceptor unwrapping, response.data = { onboarding: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.onboarding as OnboardingItem) ?? (data as unknown as OnboardingItem);

    return result;
  } catch (error) {
    console.error('❌ createOnboarding – error:', error);
    throw error as ApiError;
  }
}

// ─── 2. Get All ───────────────────────────────────────────────────────────────

/**
 * getOnboardings
 *
 * GET /api/widget/onboarding/all
 *
 * After interceptor unwrapping, response.data = { data: OnboardingItem[], pagination: {...} }
 */
export async function getOnboardings(
  params?: { page?: number; limit?: number }
): Promise<GetAllOnboardingsResult> {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? 10;

  try {
    const response = await apiClient.get<unknown>('/api/widget/onboarding/all', {
      params: { page, limit },
    });

    // After interceptor unwrapping, response.data = { data: [...], pagination: {...} }
    const data = response.data as Record<string, unknown>;

    const items = Array.isArray(data.data) ? (data.data as OnboardingItem[]) : [];
    const pagination = (data.pagination as OnboardingListPagination) ?? {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    };

    return { items, pagination };
  } catch (error) {
    console.error('❌ getOnboardings – error:', error);
    throw error as ApiError;
  }
}

// ─── 3. Get One ───────────────────────────────────────────────────────────────

/**
 * getOnboardingById
 *
 * GET /api/widget/onboarding/{id}?id={id}
 *
 * Backend endpoint requires the id BOTH in the path AND as a query param.
 *
 * @param id  The onboarding record ID (_id from the backend)
 * @returns   The OnboardingItem with all fields populated
 */
export async function getOnboardingById(id: string): Promise<OnboardingItem> {
  try {
    // ID goes in both the path segment AND the query param (backend requirement)
    const response = await apiClient.get<unknown>(`/api/widget/onboarding/${id}`, {
      params: { id },
    });

    // After interceptor unwrapping, response.data = { onboarding: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.onboarding as OnboardingItem) ?? (data as unknown as OnboardingItem);

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
 * @param id       The onboarding record ID to update
 * @param payload  Partial onboarding data (only changed fields are required)
 * @returns        The updated OnboardingItem
 */
export async function updateOnboarding(
  id: string,
  payload: Partial<OnboardingPayload>
): Promise<OnboardingItem> {
  try {
    const response = await apiClient.patch<unknown>(`/api/widget/onboarding/${id}`, payload);

    // After interceptor unwrapping, response.data = { onboarding: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.onboarding as OnboardingItem) ?? (data as unknown as OnboardingItem);

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
 * @param id  The onboarding record ID to delete
 */
export async function deleteOnboarding(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/widget/onboarding/${id}`);
  } catch (error) {
    console.error(`❌ deleteOnboarding – error for id ${id}:`, error);
    throw error as ApiError;
  }
}
