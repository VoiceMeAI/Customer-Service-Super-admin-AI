import { z } from "zod"

export const CATEGORY_OPTIONS = ["General", "Services", "Facilities", "Booking", "Other"] as const

export const faqFormSchema = z.object({
  question: z
    .string()
    .min(3, "Question must be at least 3 characters")
    .max(500, "Question must be at most 500 characters"),
  answer: z
    .string()
    .min(3, "Answer must be at least 3 characters"),
  category: z.string().optional().default(""),
  tagsInput: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be 0 or greater").default(0),
  isPublished: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

export type FaqFormValues = z.infer<typeof faqFormSchema>

export const FAQ_FORM_DEFAULTS: FaqFormValues = {
  question: "",
  answer: "",
  category: "",
  tagsInput: "",
  sortOrder: 0,
  isPublished: true,
  isActive: true,
}
