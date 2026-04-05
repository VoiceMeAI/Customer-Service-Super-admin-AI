import { z } from "zod"

export const SERVICE_CATEGORY_OPTIONS = ["General", "Services", "Facilities", "Booking", "Other"] as const

export const SERVICE_CHANNEL_OPTIONS = ["chat", "email", "voice"] as const

export const serviceFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be at most 200 characters"),
  description: z.string().optional().default(""),
  category: z.string().optional().default(""),
  tagsInput: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be 0 or greater").default(0),
  isPublished: z.boolean().default(true),
  isActive: z.boolean().default(true),
  channels: z.array(z.enum(SERVICE_CHANNEL_OPTIONS)).min(1, "Select at least one channel").default(["chat"]),
  firstResponseMins: z.coerce.number().int().min(0).optional().default(0),
  resolutionMins: z.coerce.number().int().min(0).optional().default(0),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>

export const SERVICE_FORM_DEFAULTS: ServiceFormValues = {
  name: "",
  description: "",
  category: "",
  tagsInput: "",
  sortOrder: 0,
  isPublished: true,
  isActive: true,
  channels: ["chat"],
  firstResponseMins: 0,
  resolutionMins: 0,
}
