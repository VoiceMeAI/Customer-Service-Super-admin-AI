import { z } from "zod"

// ─── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ─── Signup ────────────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(1, "Phone number is required"),
    role: z.string().optional().default(""),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const SIGNUP_DEFAULTS: SignupFormValues = {
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  password: "",
  confirmPassword: "",
}
