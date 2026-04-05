import { z } from "zod"

export const STAFF_STATUS_OPTIONS = ["invited", "active", "suspended"] as const

// ─── Invite (create) form ─────────────────────────────────────────────────────
// Matches POST /api/widget/staff/create schema:
//   firstName (required, min 2, max 100), lastName (required, min 2, max 100),
//   email (required), phone (optional), roles (string array, optional)

export const inviteStaffSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name must be at most 100 characters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name must be at most 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: z.string().optional().default(""),
  roles: z.array(z.string()).optional().default([]),
})

export type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>

export const INVITE_STAFF_DEFAULTS: InviteStaffFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roles: [],
}

// ─── Edit staff form ──────────────────────────────────────────────────────────
// All fields optional for partial updates; min-length enforced if value provided

export const editStaffSchema = z.object({
  firstName: z
    .string()
    .refine((v) => !v || v.length >= 2, "First name must be at least 2 characters")
    .refine((v) => !v || v.length <= 100, "First name must be at most 100 characters")
    .optional()
    .default(""),
  lastName: z
    .string()
    .refine((v) => !v || v.length >= 2, "Last name must be at least 2 characters")
    .refine((v) => !v || v.length <= 100, "Last name must be at most 100 characters")
    .optional()
    .default(""),
  phone: z.string().optional().default(""),
  roles: z.array(z.string()).optional().default([]),
})

export type EditStaffFormValues = z.infer<typeof editStaffSchema>

export const EDIT_STAFF_DEFAULTS: EditStaffFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  roles: [],
}
