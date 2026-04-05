/**
 * Services API Service
 *
 * Consumes the service endpoints exposed by the backend:
 *
 *  POST   /api/widget/services/create        – createService
 *  GET    /api/widget/services/all           – getServices
 *  GET    /api/widget/services/{id}          – getServiceById
 *  PATCH  /api/widget/services/{id}          – updateService
 *  DELETE /api/widget/services/{id}          – deleteService
 *  PATCH  /api/widget/services/{id}/publish  – publishService
 *  PATCH  /api/widget/services/reorder       – reorderServices
 *  GET    /api/widget/services/public        – getPublicServices
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
  ServicePayload,
  ServiceItem,
  ServiceListPagination,
  GetAllServicesResult,
  ReorderServicesPayload,
} from './types';

// ─── 1. Create ────────────────────────────────────────────────────────────────

/**
 * createService
 *
 * POST /api/widget/services/create
 *
 * @param payload  Service form data matching ServicePayload
 * @returns        The newly created ServiceItem returned by the backend
 */
export async function createService(payload: ServicePayload): Promise<ServiceItem> {
  try {
    const response = await apiClient.post<unknown>('/api/widget/services/create', payload);

    // After interceptor unwrapping, response.data = { service: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.service as ServiceItem) ?? (data as unknown as ServiceItem);

    return result;
  } catch (error) {
    console.error('❌ createService – error:', error);
    throw error as ApiError;
  }
}

// ─── 2. Get All ───────────────────────────────────────────────────────────────

/**
 * getServices
 *
 * GET /api/widget/services/all
 *
 * After interceptor unwrapping, response.data = { data: ServiceItem[], pagination: {...} }
 */
export async function getServices(
  params?: { page?: number; limit?: number }
): Promise<GetAllServicesResult> {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? 10;

  try {
    const response = await apiClient.get<unknown>('/api/widget/services/all', {
      params: { page, limit },
    });

    const data = response.data as Record<string, unknown>;

    const items = Array.isArray(data.data) ? (data.data as ServiceItem[]) : [];
    const pagination = (data.pagination as ServiceListPagination) ?? {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    };

    return { items, pagination };
  } catch (error) {
    console.error('❌ getServices – error:', error);
    throw error as ApiError;
  }
}

// ─── 3. Get One ───────────────────────────────────────────────────────────────

/**
 * getServiceById
 *
 * GET /api/widget/services/{id}
 *
 * @param id  The service record ID (_id from the backend)
 * @returns   The ServiceItem with all fields populated
 */
export async function getServiceById(id: string): Promise<ServiceItem> {
  try {
    const response = await apiClient.get<unknown>(`/api/widget/services/${id}`);

    // After interceptor unwrapping, response.data = { service: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.service as ServiceItem) ?? (data as unknown as ServiceItem);

    return result;
  } catch (error) {
    console.error(`❌ getServiceById – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

/**
 * updateService
 *
 * PATCH /api/widget/services/{id}
 *
 * @param id       The service record ID to update
 * @param payload  Partial service data (only changed fields are required)
 * @returns        The updated ServiceItem returned by the backend
 */
export async function updateService(
  id: string,
  payload: Partial<ServicePayload>
): Promise<ServiceItem> {
  try {
    const response = await apiClient.patch<unknown>(`/api/widget/services/${id}`, payload);

    // After interceptor unwrapping, response.data = { service: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.service as ServiceItem) ?? (data as unknown as ServiceItem);

    return result;
  } catch (error) {
    console.error(`❌ updateService – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 5. Delete ────────────────────────────────────────────────────────────────

/**
 * deleteService
 *
 * DELETE /api/widget/services/{id}
 *
 * @param id  The service record ID to delete
 */
export async function deleteService(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/widget/services/${id}`);
  } catch (error) {
    console.error(`❌ deleteService – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 6. Publish / Unpublish ───────────────────────────────────────────────────

/**
 * publishService
 *
 * PATCH /api/widget/services/{id}/publish
 *
 * @param id           The service record ID to publish / unpublish
 * @param isPublished  The desired published state
 * @returns            The updated ServiceItem returned by the backend
 */
export async function publishService(id: string, isPublished: boolean): Promise<ServiceItem> {
  try {
    const response = await apiClient.patch<unknown>(
      `/api/widget/services/${id}/publish`,
      { isPublished }
    );

    // After interceptor unwrapping, response.data = { service: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.service as ServiceItem) ?? (data as unknown as ServiceItem);

    return result;
  } catch (error) {
    console.error(`❌ publishService – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 7. Reorder ───────────────────────────────────────────────────────────────

/**
 * reorderServices
 *
 * PATCH /api/widget/services/reorder
 *
 * @param payload  { serviceIds: string[] } — ordered array of service IDs
 */
export async function reorderServices(payload: ReorderServicesPayload): Promise<void> {
  try {
    await apiClient.patch('/api/widget/services/reorder', payload);
  } catch (error) {
    console.error('❌ reorderServices – error:', error);
    throw error as ApiError;
  }
}

// ─── 8. Public (unauthenticated) ─────────────────────────────────────────────

/**
 * getPublicServices
 *
 * GET /api/widget/services/public
 *
 * Returns published, active services without requiring auth.
 */
export async function getPublicServices(): Promise<ServiceItem[]> {
  try {
    const response = await apiClient.get<unknown>('/api/widget/services/public');

    const data = response.data as Record<string, unknown>;
    const items = Array.isArray(data.data) ? (data.data as ServiceItem[]) : [];

    return items;
  } catch (error) {
    console.error('❌ getPublicServices – error:', error);
    throw error as ApiError;
  }
}
