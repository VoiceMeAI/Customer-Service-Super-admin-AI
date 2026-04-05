/**
 * Staff API Service
 *
 * Consumes all staff endpoints exposed by the backend:
 *
 *  POST   /api/widget/staff/create            – createStaff
 *  GET    /api/widget/staff/all               – getStaff
 *  GET    /api/widget/staff/{id}              – getStaffById
 *  PATCH  /api/widget/staff/{id}              – updateStaff
 *  DELETE /api/widget/staff/{id}              – deleteStaff
 *  PATCH  /api/widget/staff/{id}/status       – updateStaffStatus
 *  PATCH  /api/widget/staff/{id}/roles        – updateStaffRoles
 *  POST   /api/widget/staff/{id}/resend-invite – resendInvite
 *  GET    /api/widget/staff/roles/all         – getRoles
 *  GET    /api/widget/staff/permissions/all   – getPermissions
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
  StaffPayload,
  UpdateStaffPayload,
  UpdateStaffStatusPayload,
  UpdateStaffRolesPayload,
  StaffItem,
  StaffRole,
  StaffPermission,
  StaffListPagination,
  GetAllStaffResult,
} from './types';

// ─── 1. Create ────────────────────────────────────────────────────────────────

/**
 * createStaff
 *
 * POST /api/widget/staff/create
 *
 * @param payload  Staff invite data matching StaffPayload
 * @returns        The newly created StaffItem returned by the backend
 */
export async function createStaff(payload: StaffPayload): Promise<StaffItem> {
  try {
    const response = await apiClient.post<unknown>('/api/widget/staff/create', payload);

    // After interceptor unwrapping, response.data = { staff: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.staff as StaffItem) ?? (data as unknown as StaffItem);

    return result;
  } catch (error) {
    console.error('❌ createStaff – error:', error);
    throw error as ApiError;
  }
}

// ─── 2. Get All ───────────────────────────────────────────────────────────────

/**
 * getStaff
 *
 * GET /api/widget/staff/all
 *
 * After interceptor unwrapping, response.data = { data: StaffItem[], pagination: {...} }
 */
export async function getStaff(
  params?: { page?: number; limit?: number }
): Promise<GetAllStaffResult> {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? 10;

  try {
    const response = await apiClient.get<unknown>('/api/widget/staff/all', {
      params: { page, limit },
    });

    const data = response.data as Record<string, unknown>;

    const items = Array.isArray(data.data) ? (data.data as StaffItem[]) : [];
    const pagination = (data.pagination as StaffListPagination) ?? {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    };

    return { items, pagination };
  } catch (error) {
    console.error('❌ getStaff – error:', error);
    throw error as ApiError;
  }
}

// ─── 3. Get One ───────────────────────────────────────────────────────────────

/**
 * getStaffById
 *
 * GET /api/widget/staff/{id}
 *
 * @param id  The staff record ID (_id from the backend)
 * @returns   The StaffItem with all fields populated
 */
export async function getStaffById(id: string): Promise<StaffItem> {
  try {
    const response = await apiClient.get<unknown>(`/api/widget/staff/${id}`);

    // After interceptor unwrapping, response.data = { staff: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.staff as StaffItem) ?? (data as unknown as StaffItem);

    return result;
  } catch (error) {
    console.error(`❌ getStaffById – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

/**
 * updateStaff
 *
 * PATCH /api/widget/staff/{id}
 *
 * @param id       The staff record ID to update
 * @param payload  Partial staff data (only changed fields required)
 * @returns        The updated StaffItem returned by the backend
 */
export async function updateStaff(
  id: string,
  payload: UpdateStaffPayload
): Promise<StaffItem> {
  try {
    const response = await apiClient.patch<unknown>(`/api/widget/staff/${id}`, payload);

    // After interceptor unwrapping, response.data = { staff: {...} }
    const data = response.data as Record<string, unknown>;
    const result = (data.staff as StaffItem) ?? (data as unknown as StaffItem);

    return result;
  } catch (error) {
    console.error(`❌ updateStaff – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 5. Delete ────────────────────────────────────────────────────────────────

/**
 * deleteStaff
 *
 * DELETE /api/widget/staff/{id}
 *
 * @param id  The staff record ID to delete
 */
export async function deleteStaff(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/widget/staff/${id}`);
  } catch (error) {
    console.error(`❌ deleteStaff – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 6. Update Status ─────────────────────────────────────────────────────────

/**
 * updateStaffStatus
 *
 * PATCH /api/widget/staff/{id}/status
 *
 * @param id      The staff record ID
 * @param status  The desired status: "active" | "inactive" | "pending" | "suspended"
 * @returns       The updated StaffItem
 */
export async function updateStaffStatus(
  id: string,
  payload: UpdateStaffStatusPayload
): Promise<StaffItem> {
  try {
    const response = await apiClient.patch<unknown>(
      `/api/widget/staff/${id}/status`,
      payload
    );

    const data = response.data as Record<string, unknown>;
    const result = (data.staff as StaffItem) ?? (data as unknown as StaffItem);

    return result;
  } catch (error) {
    console.error(`❌ updateStaffStatus – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 7. Update Roles ──────────────────────────────────────────────────────────

/**
 * updateStaffRoles
 *
 * PATCH /api/widget/staff/{id}/roles
 *
 * @param id      The staff record ID
 * @param payload { roles: string[] }
 * @returns       The updated StaffItem
 */
export async function updateStaffRoles(
  id: string,
  payload: UpdateStaffRolesPayload
): Promise<StaffItem> {
  try {
    const response = await apiClient.patch<unknown>(
      `/api/widget/staff/${id}/roles`,
      payload
    );

    const data = response.data as Record<string, unknown>;
    const result = (data.staff as StaffItem) ?? (data as unknown as StaffItem);

    return result;
  } catch (error) {
    console.error(`❌ updateStaffRoles – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 8. Resend Invite ─────────────────────────────────────────────────────────

/**
 * resendInvite
 *
 * POST /api/widget/staff/{id}/resend-invite
 *
 * @param id  The staff record ID to resend the invitation email to
 */
export async function resendInvite(id: string): Promise<void> {
  try {
    await apiClient.post(`/api/widget/staff/${id}/resend-invite`, {});
  } catch (error) {
    console.error(`❌ resendInvite – error for id ${id}:`, error);
    throw error as ApiError;
  }
}

// ─── 9. Get Roles ─────────────────────────────────────────────────────────────

/**
 * getRoles
 *
 * GET /api/widget/staff/roles/all
 *
 * Returns the list of available roles for role assignment dropdowns.
 */
export async function getRoles(): Promise<StaffRole[]> {
  try {
    const response = await apiClient.get<unknown>('/api/widget/staff/roles/all');

    const data = response.data as Record<string, unknown>;
    const items = Array.isArray(data.data)
      ? (data.data as StaffRole[])
      : Array.isArray(data.roles)
        ? (data.roles as StaffRole[])
        : [];

    return items;
  } catch (error) {
    console.error('❌ getRoles – error:', error);
    throw error as ApiError;
  }
}

// ─── 10. Get Permissions ──────────────────────────────────────────────────────

/**
 * getPermissions
 *
 * GET /api/widget/staff/permissions/all
 *
 * Returns the list of available permissions.
 */
export async function getPermissions(): Promise<StaffPermission[]> {
  try {
    const response = await apiClient.get<unknown>('/api/widget/staff/permissions/all');

    const data = response.data as Record<string, unknown>;
    const items = Array.isArray(data.data)
      ? (data.data as StaffPermission[])
      : Array.isArray(data.permissions)
        ? (data.permissions as StaffPermission[])
        : [];

    return items;
  } catch (error) {
    console.error('❌ getPermissions – error:', error);
    throw error as ApiError;
  }
}
