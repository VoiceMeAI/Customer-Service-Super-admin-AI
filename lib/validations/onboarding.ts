import { z } from "zod"

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Validates the flat scalar fields in the 5-step onboarding form.
 *
 * Dynamic collections (schedule, supportedLanguages, preChatFormFields,
 * knowledgeBaseUrls, knowledgeBaseDocuments) have complex custom UIs and
 * are managed as local state arrays — they are assembled into the final
 * OnboardingPayload at submit time.
 */
export const onboardingFormSchema = z.object({
  // ── Step 1: Business Info ─────────────────────────────────────────────────
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(120, "Company name must be 120 characters or less"),
  websiteUrl: z
    .string()
    .url("Enter a valid URL (e.g. https://example.com)")
    .optional()
    .or(z.literal("")),
  industryCategory: z.string().min(1, "Select an industry"),
  companySizeOrRole: z.string().min(1, "Select a company size"),
  primaryColor: z.string().min(1, "Primary color is required"),
  secondaryColor: z.string().optional().default(""),
  widgetPosition: z.enum(["bottom-right", "bottom-left"], {
    errorMap: () => ({ message: "Select a widget position" }),
  }),

  // ── Step 2: Agent Setup ───────────────────────────────────────────────────
  agentAlias: z
    .string()
    .min(2, "Alias must be at least 2 characters")
    .max(50, "Alias must be at most 50 characters"),
  agentProfileImageUrl: z
    .string()
    .url("Enter a valid image URL")
    .optional()
    .or(z.literal("")),

  // ── Step 3: Hours of Operation ────────────────────────────────────────────
  timezone: z.string().min(1, "Timezone is required"),

  // ── Step 4: Language & Pre-Chat ───────────────────────────────────────────
  defaultLanguage: z.string().min(1, "Default language is required"),
})

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>

// ─── Default values ───────────────────────────────────────────────────────────

export const ONBOARDING_FORM_DEFAULTS: OnboardingFormValues = {
  companyName: "",
  websiteUrl: "",
  industryCategory: "",
  companySizeOrRole: "",
  primaryColor: "#10b981",
  secondaryColor: "#6366f1",
  widgetPosition: "bottom-right",
  agentAlias: "",
  agentProfileImageUrl: "",
  timezone: "America/New_York",
  defaultLanguage: "en",
}

// ─── Per-step field lists ─────────────────────────────────────────────────────
// Used with form.trigger(ONBOARDING_STEP_FIELDS[step]) to validate only the
// fields that belong to the current step before advancing to the next one.

export const ONBOARDING_STEP_FIELDS: Record<number, (keyof OnboardingFormValues)[]> = {
  1: ["companyName", "websiteUrl", "industryCategory", "companySizeOrRole", "widgetPosition", "primaryColor"],
  2: ["agentAlias", "agentProfileImageUrl"],
  3: ["timezone"],
  4: ["defaultLanguage"],
  5: [], // Step 5 has no form fields — submit handled by form.handleSubmit
}
