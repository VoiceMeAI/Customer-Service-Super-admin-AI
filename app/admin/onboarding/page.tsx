"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AdminLayout } from "@/components/admin-layout"
import {
  useOnboardings,
  useOnboardingById,
  useCreateOnboarding,
  useUpdateOnboarding,
  useDeleteOnboarding,
} from "@/lib/hooks/use-onboardings"
import type { OnboardingPayload } from "@/lib/api/types"
import {
  onboardingFormSchema,
  ONBOARDING_FORM_DEFAULTS,
  ONBOARDING_STEP_FIELDS,
  type OnboardingFormValues,
} from "@/lib/validations/onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Pagination } from "@/components/ui/pagination"
import {
  Check,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Building2,
  Eye,
  X,
  Globe,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleDay = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  start: string
  end: string
  isOpen: boolean
}

type PreChatFormField = {
  key: string
  label: string
  type: "text" | "email" | "number" | "tel" | "textarea" | "select"
  required: boolean
  options?: string[]
}

type Onboarding = {
  id: string
  status: string
  createdAt: string
  companyName: string
  websiteUrl?: string
  industryCategory: string
  companySizeOrRole: string
  brandColors: { primary: string; secondary?: string }
  widgetPosition: "bottom-right" | "bottom-left"
  agentPersona: { alias: string; profileImageUrl?: string }
  hoursOfOperation: { timezone: string; schedule: ScheduleDay[] }
  languagePreferences: { defaultLanguage: string; supportedLanguages: string[] }
  preChatFormFields: PreChatFormField[]
  knowledgeBaseData: { urls: string[]; documents: string[] }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const steps = [
  { id: 1, name: "Business Info" },
  { id: 2, name: "Agent Setup" },
  { id: 3, name: "Hours" },
  { id: 4, name: "Language" },
  { id: 5, name: "Knowledge Base" },
]

const industryOptions = [
  "Hospitality",
  "Healthcare",
  "Retail",
  "Finance",
  "Technology",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Transportation",
  "E-commerce",
  "Other",
]

const companySizeOptions = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
]

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (UTC-5)" },
  { value: "America/Chicago", label: "Central Time (UTC-6)" },
  { value: "America/Denver", label: "Mountain Time (UTC-7)" },
  { value: "America/Los_Angeles", label: "Pacific Time (UTC-8)" },
  { value: "Europe/London", label: "London (UTC+0)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "India (UTC+5:30)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10)" },
]

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "it", label: "Italian" },
  { value: "ru", label: "Russian" },
  { value: "nl", label: "Dutch" },
]

const fieldTypeOptions: PreChatFormField["type"][] = [
  "text",
  "email",
  "number",
  "tel",
  "textarea",
  "select",
]

const statusOptions = ["All", "completed", "in_progress", "draft"]

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

// ─── Default Values ───────────────────────────────────────────────────────────

const defaultSchedule: ScheduleDay[] = DAYS_OF_WEEK.map((day) => ({
  day,
  start: "09:00",
  end: "17:00",
  isOpen: !["saturday", "sunday"].includes(day),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-primary/10 text-primary"
    case "in_progress":
      return "bg-amber-500/10 text-amber-500"
    case "draft":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getLanguageLabel(code: string) {
  return languageOptions.find((l) => l.value === code)?.label ?? code
}

function getTimezoneLabel(tz: string) {
  return timezoneOptions.find((t) => t.value === tz)?.label ?? tz
}

function normaliseItem(item: Record<string, unknown>): Onboarding {
  return {
    id: (item._id ?? item.id ?? "") as string,
    status: (item.status ?? "draft") as string,
    createdAt: (item.createdAt ?? new Date().toISOString()) as string,
    companyName: (item.companyName ?? "") as string,
    websiteUrl: item.websiteUrl as string | undefined,
    industryCategory: (item.industryCategory ?? "") as string,
    companySizeOrRole: (item.companySizeOrRole ?? "") as string,
    brandColors: (item.brandColors ?? { primary: "#10b981" }) as Onboarding["brandColors"],
    widgetPosition: (item.widgetPosition ?? "bottom-right") as Onboarding["widgetPosition"],
    agentPersona: (item.agentPersona ?? { alias: "" }) as Onboarding["agentPersona"],
    hoursOfOperation: (item.hoursOfOperation ?? {
      timezone: "UTC",
      schedule: defaultSchedule,
    }) as Onboarding["hoursOfOperation"],
    languagePreferences: (item.languagePreferences ?? {
      defaultLanguage: "en",
      supportedLanguages: ["en"],
    }) as Onboarding["languagePreferences"],
    preChatFormFields: (item.preChatFormFields ?? []) as Onboarding["preChatFormFields"],
    knowledgeBaseData: (item.knowledgeBaseData ?? {
      urls: [],
      documents: [],
    }) as Onboarding["knowledgeBaseData"],
  }
}

// ─── Inner component ──────────────────────────────────────────────────────────

function OnboardingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "view" | "form">("list")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [currentStep, setCurrentStep] = useState(1)

  // ── Dynamic array state (complex UI collections) ──────────────────────────
  const [schedule, setSchedule] = useState<ScheduleDay[]>(defaultSchedule)
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(["en"])
  const [preChatFormFields, setPreChatFormFields] = useState<PreChatFormField[]>([])
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState<PreChatFormField>({
    key: "",
    label: "",
    type: "text",
    required: false,
    options: [],
  })
  const [newFieldOption, setNewFieldOption] = useState("")
  const [knowledgeBaseUrls, setKnowledgeBaseUrls] = useState<string[]>([])
  const [knowledgeBaseDocuments, setKnowledgeBaseDocuments] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState("")
  const [newDocument, setNewDocument] = useState("")

  // ── React Query ───────────────────────────────────────────────────────────
  const onboardingsQuery = useOnboardings({ page: currentPage, limit: pageSize })
  // Single detail query — resolved ID depends on the current view mode
  const activeDetailId =
    viewMode === "view" ? viewingId : viewMode === "form" ? editingId : null
  const detailQuery = useOnboardingById(activeDetailId)
  const createMutation = useCreateOnboarding()
  const updateMutation = useUpdateOnboarding()
  const deleteMutation = useDeleteOnboarding()

  // ── Derived data ──────────────────────────────────────────────────────────
  const onboardings = (onboardingsQuery.data?.items ?? []).map((item) =>
    normaliseItem(item as unknown as Record<string, unknown>)
  )
  const serverTotal = onboardingsQuery.data?.pagination.total ?? 0
  const serverTotalPages = onboardingsQuery.data?.pagination.totalPages ?? 0

  const viewingOnboarding =
    viewMode === "view" && detailQuery.data
      ? normaliseItem(detailQuery.data as unknown as Record<string, unknown>)
      : null

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: ONBOARDING_FORM_DEFAULTS,
    mode: "onTouched",
  })

  // Pre-fill form when editing and fresh detail data arrives
  useEffect(() => {
    if (viewMode === "form" && editingId && detailQuery.data) {
      const n = normaliseItem(detailQuery.data as unknown as Record<string, unknown>)
      form.reset({
        companyName: n.companyName,
        websiteUrl: n.websiteUrl ?? "",
        industryCategory: n.industryCategory,
        companySizeOrRole: n.companySizeOrRole,
        primaryColor: n.brandColors.primary,
        secondaryColor: n.brandColors.secondary ?? "#6366f1",
        widgetPosition: n.widgetPosition,
        agentAlias: n.agentPersona.alias,
        agentProfileImageUrl: n.agentPersona.profileImageUrl ?? "",
        timezone: n.hoursOfOperation.timezone,
        defaultLanguage: n.languagePreferences.defaultLanguage,
      })
      setSchedule(
        n.hoursOfOperation.schedule.map(({ day, start, end, isOpen }) => ({
          day,
          start,
          end,
          isOpen,
        }))
      )
      setSupportedLanguages(n.languagePreferences.supportedLanguages)
      setPreChatFormFields(
        (n.preChatFormFields ?? []).map(({ key, label, type, required, options }) => ({
          key,
          label,
          type,
          required,
          options,
        }))
      )
      setKnowledgeBaseUrls(n.knowledgeBaseData.urls ?? [])
      setKnowledgeBaseDocuments(n.knowledgeBaseData.documents ?? [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data, viewMode, editingId])

  // ── URL ↔ State synchronisation ────────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get("id")
    const mode = searchParams.get("mode")

    if (mode === "view" && id) {
      setViewMode("view")
      setViewingId(id)
      setEditingId(null)
    } else if (mode === "edit" && id) {
      setViewMode("form")
      setEditingId(id)
      setViewingId(null)
      setCurrentStep(1)
    } else if (mode === "create") {
      setViewMode("form")
      setEditingId(null)
      setViewingId(null)
      setCurrentStep(1)
      form.reset(ONBOARDING_FORM_DEFAULTS)
      setSchedule(defaultSchedule)
      setSupportedLanguages(["en"])
      setPreChatFormFields([])
      setShowAddField(false)
      setNewField({ key: "", label: "", type: "text", required: false, options: [] })
      setKnowledgeBaseUrls([])
      setKnowledgeBaseDocuments([])
      setNewUrl("")
      setNewDocument("")
    } else {
      setViewMode("list")
      setEditingId(null)
      setViewingId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Navigation handlers ────────────────────────────────────────────────────
  const handleCreateNew = () =>
    router.push("/admin/onboarding?mode=create", { scroll: false })
  const handleView = (id: string) =>
    router.push(`/admin/onboarding?id=${id}&mode=view`, { scroll: false })
  const handleEdit = (id: string) =>
    router.push(`/admin/onboarding?id=${id}&mode=edit`, { scroll: false })
  const handleDeleteRequest = (id: string) => {
    setPendingDeleteId(id)
    setDeleteDialogOpen(true)
  }
  const handleBackToList = () => router.push("/admin/onboarding", { scroll: false })

  const handleDeleteConfirm = () => {
    if (!pendingDeleteId) return
    deleteMutation.mutate(pendingDeleteId, {
      onSettled: () => {
        setDeleteDialogOpen(false)
        setPendingDeleteId(null)
      },
    })
  }

  // ── Step navigation with per-step validation ──────────────────────────────
  const handleNext = async () => {
    const valid = await form.trigger(ONBOARDING_STEP_FIELDS[currentStep])
    if (valid) setCurrentStep((s) => Math.min(5, s + 1))
  }

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const updateScheduleDay = (
    day: string,
    field: keyof ScheduleDay,
    value: string | boolean
  ) => {
    setSchedule(schedule.map((s) => (s.day === day ? { ...s, [field]: value } : s)))
  }

  // ── Language helpers ──────────────────────────────────────────────────────
  const addLanguage = (lang: string) => {
    if (lang && !supportedLanguages.includes(lang)) {
      setSupportedLanguages([...supportedLanguages, lang])
    }
  }
  const removeLanguage = (lang: string) => {
    if (supportedLanguages.length > 1) {
      setSupportedLanguages(supportedLanguages.filter((l) => l !== lang))
    }
  }

  // ── Pre-chat field helpers ────────────────────────────────────────────────
  const addPreChatField = () => {
    if (!newField.key || !newField.label) return
    setPreChatFormFields([...preChatFormFields, { ...newField }])
    setNewField({ key: "", label: "", type: "text", required: false, options: [] })
    setNewFieldOption("")
    setShowAddField(false)
  }
  const removePreChatField = (index: number) => {
    setPreChatFormFields(preChatFormFields.filter((_, i) => i !== index))
  }
  const addFieldOption = () => {
    if (newFieldOption.trim()) {
      setNewField({
        ...newField,
        options: [...(newField.options ?? []), newFieldOption.trim()],
      })
      setNewFieldOption("")
    }
  }
  const removeFieldOption = (opt: string) => {
    setNewField({
      ...newField,
      options: (newField.options ?? []).filter((o) => o !== opt),
    })
  }

  // ── Knowledge base helpers ────────────────────────────────────────────────
  const addUrl = () => {
    if (newUrl.trim()) {
      setKnowledgeBaseUrls([...knowledgeBaseUrls, newUrl.trim()])
      setNewUrl("")
    }
  }
  const addDocument = () => {
    if (newDocument.trim()) {
      setKnowledgeBaseDocuments([...knowledgeBaseDocuments, newDocument.trim()])
      setNewDocument("")
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  const onSubmit = (values: OnboardingFormValues) => {
    const payload: OnboardingPayload = {
      companyName: values.companyName,
      websiteUrl: values.websiteUrl || undefined,
      industryCategory: values.industryCategory,
      companySizeOrRole: values.companySizeOrRole,
      brandColors: {
        primary: values.primaryColor,
        secondary: values.secondaryColor || undefined,
      },
      widgetPosition: values.widgetPosition,
      agentPersona: {
        alias: values.agentAlias,
        profileImageUrl: values.agentProfileImageUrl || undefined,
      },
      hoursOfOperation: { timezone: values.timezone, schedule },
      languagePreferences: { defaultLanguage: values.defaultLanguage, supportedLanguages },
      preChatFormFields: preChatFormFields.length > 0 ? preChatFormFields : undefined,
      knowledgeBaseData: { urls: knowledgeBaseUrls, documents: knowledgeBaseDocuments },
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, payload },
        { onSuccess: () => handleBackToList() }
      )
    } else {
      createMutation.mutate(payload, { onSuccess: () => handleBackToList() })
    }
  }

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filteredOnboardings = onboardings.filter((o) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      o.companyName.toLowerCase().includes(q) ||
      o.industryCategory.toLowerCase().includes(q) ||
      (o.websiteUrl ?? "").toLowerCase().includes(q) ||
      o.agentPersona.alias.toLowerCase().includes(q)
    const matchesStatus = selectedStatus === "All" || o.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const isFiltering = searchQuery !== "" || selectedStatus !== "All"
  const displayTotal = isFiltering ? filteredOnboardings.length : serverTotal
  const displayTotalPages = isFiltering
    ? Math.max(1, Math.ceil(filteredOnboardings.length / pageSize))
    : Math.max(1, serverTotalPages)
  const paginatedOnboardings = isFiltering
    ? filteredOnboardings.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredOnboardings

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const submitError =
    createMutation.error?.message ?? updateMutation.error?.message ?? null

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE
  // ═══════════════════════════════════════════════════════════════════════════

  if (viewMode === "view") {
    if (detailQuery.isLoading || !viewingOnboarding) {
      return (
        <AdminLayout title="View Onboarding">
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            {detailQuery.error ? (
              <span className="text-destructive">
                {detailQuery.error.message || "Failed to load onboarding"}
              </span>
            ) : (
              "Loading onboarding…"
            )}
          </div>
        </AdminLayout>
      )
    }

    return (
      <AdminLayout title="View Onboarding">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackToList} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
            <Button onClick={() => handleEdit(viewingOnboarding.id)} className="rounded-xl">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Onboarding
            </Button>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </div>
                  <CardTitle className="text-base">Business Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                    <p className="mt-1 font-medium text-foreground">{viewingOnboarding.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="mt-1 font-medium text-foreground">{viewingOnboarding.websiteUrl || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="mt-1 font-medium text-foreground">{viewingOnboarding.industryCategory}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company Size</p>
                    <p className="mt-1 font-medium text-foreground">{viewingOnboarding.companySizeOrRole}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Widget Position</p>
                    <p className="mt-1 font-medium text-foreground capitalize">
                      {viewingOnboarding.widgetPosition.replace("-", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Brand Colors</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: viewingOnboarding.brandColors.primary }}
                        title={`Primary: ${viewingOnboarding.brandColors.primary}`}
                      />
                      {viewingOnboarding.brandColors.secondary && (
                        <div
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: viewingOnboarding.brandColors.secondary }}
                          title={`Secondary: ${viewingOnboarding.brandColors.secondary}`}
                        />
                      )}
                      <span className="font-mono text-sm text-foreground">
                        {viewingOnboarding.brandColors.primary}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    2
                  </div>
                  <CardTitle className="text-base">Agent Setup</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Agent Alias</p>
                    <p className="mt-1 font-medium text-foreground">{viewingOnboarding.agentPersona.alias}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profile Image</p>
                    <p className="mt-1 font-medium text-foreground">
                      {viewingOnboarding.agentPersona.profileImageUrl || "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    3
                  </div>
                  <CardTitle className="text-base">Hours of Operation</CardTitle>
                </div>
                <CardDescription>
                  Timezone: {getTimezoneLabel(viewingOnboarding.hoursOfOperation.timezone)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Day</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewingOnboarding.hoursOfOperation.schedule.map((day) => (
                        <tr key={day.day} className="bg-card">
                          <td className="px-4 py-3 text-sm font-medium text-foreground capitalize">{day.day}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                day.isOpen
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {day.isOpen ? "Open" : "Closed"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {day.isOpen ? `${day.start} – ${day.end}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    4
                  </div>
                  <CardTitle className="text-base">Language & Pre-Chat Form</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Default Language</p>
                    <p className="mt-1 font-medium text-foreground">
                      {getLanguageLabel(viewingOnboarding.languagePreferences.defaultLanguage)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Supported Languages</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {viewingOnboarding.languagePreferences.supportedLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {getLanguageLabel(lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {viewingOnboarding.preChatFormFields.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Pre-Chat Form Fields ({viewingOnboarding.preChatFormFields.length})
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Label</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Key</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Required</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {viewingOnboarding.preChatFormFields.map((field, i) => (
                            <tr key={i} className="bg-card">
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{field.label}</td>
                              <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{field.key}</td>
                              <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{field.type}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                    field.required
                                      ? "bg-primary/10 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {field.required ? "Yes" : "No"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    5
                  </div>
                  <CardTitle className="text-base">Knowledge Base</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    URLs ({viewingOnboarding.knowledgeBaseData.urls.length})
                  </p>
                  {viewingOnboarding.knowledgeBaseData.urls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No URLs added</p>
                  ) : (
                    <div className="space-y-2">
                      {viewingOnboarding.knowledgeBaseData.urls.map((url, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
                        >
                          <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="break-all text-sm text-foreground">{url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Documents ({viewingOnboarding.knowledgeBaseData.documents.length})
                  </p>
                  {viewingOnboarding.knowledgeBaseData.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents added</p>
                  ) : (
                    <div className="space-y-2">
                      {viewingOnboarding.knowledgeBaseData.documents.map((doc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
                        >
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm text-foreground">{doc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (viewMode === "list") {
    return (
      <AdminLayout title="Onboarding">
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Onboarding</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this onboarding? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setPendingDeleteId(null)
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="rounded-xl"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Manage Onboardings</h2>
              <p className="text-sm text-muted-foreground">
                Configure and manage your business onboarding setups
              </p>
            </div>
            <Button onClick={handleCreateNew} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Create Onboarding
            </Button>
          </div>

          {/* Filters */}
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by company name or industry..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="rounded-xl pl-10"
                  />
                </div>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => {
                    setSelectedStatus(v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "All"
                          ? "All Status"
                          : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error banners */}
          {onboardingsQuery.error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {onboardingsQuery.error.message || "Failed to load onboardings"}
            </div>
          )}
          {deleteMutation.error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {deleteMutation.error.message || "Failed to delete onboarding"}
            </div>
          )}

          {/* Table */}
          <Card className="rounded-2xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Company</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Industry</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Widget</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {onboardingsQuery.isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          Loading onboardings…
                        </td>
                      </tr>
                    ) : paginatedOnboardings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          No onboardings found. Create your first onboarding to get started.
                        </td>
                      </tr>
                    ) : (
                      paginatedOnboardings.map((onboarding) => (
                        <tr
                          key={onboarding.id}
                          className="bg-card transition-colors hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl"
                                style={{ backgroundColor: onboarding.brandColors.primary + "20" }}
                              >
                                <Building2
                                  className="h-5 w-5"
                                  style={{ color: onboarding.brandColors.primary }}
                                />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{onboarding.companyName}</p>
                                {onboarding.websiteUrl && (
                                  <p className="text-xs text-muted-foreground">{onboarding.websiteUrl}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {onboarding.industryCategory}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {onboarding.agentPersona.alias}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm capitalize text-muted-foreground">
                            {onboarding.widgetPosition.replace("-", " ")}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(onboarding.status)}`}
                            >
                              {onboarding.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {onboarding.createdAt}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(onboarding.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(onboarding.id)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRequest(onboarding.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {displayTotal > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={displayTotalPages}
                  pageSize={pageSize}
                  totalItems={displayTotal}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setCurrentPage(1)
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM VIEW (Create / Edit)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <AdminLayout title={editingId ? "Edit Onboarding" : "Create Onboarding"}>
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={handleBackToList} className="mb-4 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
                      currentStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep === step.id
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-0.5 w-12 transition-colors lg:w-24",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="rounded-2xl shadow-lg">
              {/* ── Step 1: Business Info ───────────────────────────────────── */}
              {currentStep === 1 && (
                <>
                  <CardHeader>
                    <CardTitle>Business Info</CardTitle>
                    <CardDescription>
                      Set up your company details, branding, and widget preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Company Name <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Grand Hotel"
                                className="rounded-xl"
                                maxLength={120}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>{field.value.length}/120 characters</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="websiteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Website URL{" "}
                              <span className="text-xs text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://yourcompany.com"
                                className="rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="industryCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Industry Category <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industryOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companySizeOrRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Company Size <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companySizeOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="widgetPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Widget Position <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-3">
                              {(["bottom-right", "bottom-left"] as const).map((pos) => (
                                <div
                                  key={pos}
                                  onClick={() => field.onChange(pos)}
                                  className={cn(
                                    "cursor-pointer rounded-xl border-2 p-4 transition-all",
                                    field.value === pos
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium capitalize text-foreground">
                                      {pos.replace("-", " ")}
                                    </p>
                                    {field.value === pos && (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative mt-3 h-14 w-full rounded-lg border border-border bg-muted/50">
                                    <div
                                      className={cn(
                                        "absolute bottom-2 h-5 w-5 rounded-full bg-primary",
                                        pos === "bottom-right" ? "right-2" : "left-2"
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Primary Brand Color <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                                />
                                <Input
                                  {...field}
                                  className="w-32 rounded-xl font-mono"
                                  placeholder="#10b981"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Secondary Brand Color{" "}
                              <span className="text-xs text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                                />
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  className="w-32 rounded-xl font-mono"
                                  placeholder="#6366f1"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {/* ── Step 2: Agent Setup ─────────────────────────────────────── */}
              {currentStep === 2 && (
                <>
                  <CardHeader>
                    <CardTitle>Agent Setup</CardTitle>
                    <CardDescription>
                      Configure your AI agent&apos;s name and appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="agentAlias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Agent Alias <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Maya, Aria, Nova"
                              className="rounded-xl"
                              maxLength={50}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The name your AI assistant will use when greeting customers (2–50 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agentProfileImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Profile Image{" "}
                            <span className="text-xs text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-5">
                              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50">
                                {field.value ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={field.value}
                                    alt="Agent"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <Input
                                  placeholder="https://example.com/avatar.png"
                                  className="rounded-xl"
                                  {...field}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Enter a public image URL for your agent&apos;s avatar
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </>
              )}

              {/* ── Step 3: Hours of Operation ──────────────────────────────── */}
              {currentStep === 3 && (
                <>
                  <CardHeader>
                    <CardTitle>Hours of Operation</CardTitle>
                    <CardDescription>Set when your business is open and available</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Timezone <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezoneOptions.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>
                        Weekly Schedule <span className="text-destructive">*</span>
                      </Label>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Day</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Open</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Opens At</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Closes At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {schedule.map((day) => (
                              <tr
                                key={day.day}
                                className={cn("bg-card transition-opacity", !day.isOpen && "opacity-50")}
                              >
                                <td className="px-4 py-3 text-sm font-medium capitalize text-foreground">
                                  {day.day}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Switch
                                    checked={day.isOpen}
                                    onCheckedChange={(checked) =>
                                      updateScheduleDay(day.day, "isOpen", checked)
                                    }
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="time"
                                    value={day.start}
                                    onChange={(e) =>
                                      updateScheduleDay(day.day, "start", e.target.value)
                                    }
                                    disabled={!day.isOpen}
                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="time"
                                    value={day.end}
                                    onChange={(e) =>
                                      updateScheduleDay(day.day, "end", e.target.value)
                                    }
                                    disabled={!day.isOpen}
                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* ── Step 4: Language & Pre-Chat ─────────────────────────────── */}
              {currentStep === 4 && (
                <>
                  <CardHeader>
                    <CardTitle>Language & Pre-Chat Form</CardTitle>
                    <CardDescription>
                      Set language preferences and optional fields shown before a chat starts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="defaultLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Default Language <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={(v) => {
                                field.onChange(v)
                                if (!supportedLanguages.includes(v)) {
                                  setSupportedLanguages([v, ...supportedLanguages])
                                }
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {languageOptions.map((l) => (
                                  <SelectItem key={l.value} value={l.value}>
                                    {l.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Add Supported Language</Label>
                        <Select onValueChange={addLanguage}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Add language..." />
                          </SelectTrigger>
                          <SelectContent>
                            {languageOptions
                              .filter((l) => !supportedLanguages.includes(l.value))
                              .map((l) => (
                                <SelectItem key={l.value} value={l.value}>
                                  {l.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Supported languages tag list */}
                    <div className="space-y-2">
                      <Label>Supported Languages</Label>
                      <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-border p-3">
                        {supportedLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            {getLanguageLabel(lang)}
                            {lang === form.getValues("defaultLanguage") ? (
                              <span className="ml-1 text-[10px] opacity-60">(default)</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeLanguage(lang)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pre-Chat Form Fields */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Label>Pre-Chat Form Fields</Label>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Fields shown to users before they start chatting (optional)
                          </p>
                        </div>
                        {!showAddField && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddField(true)}
                            className="rounded-xl"
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Field
                          </Button>
                        )}
                      </div>

                      {preChatFormFields.length > 0 && (
                        <div className="space-y-2">
                          {preChatFormFields.map((field, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{field.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  key:{" "}
                                  <span className="font-mono">{field.key}</span>
                                  {" · "}type: {field.type}
                                  {" · "}
                                  {field.required ? "required" : "optional"}
                                  {field.options && field.options.length > 0 &&
                                    ` · options: ${field.options.join(", ")}`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removePreChatField(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {showAddField && (
                        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                          <p className="text-sm font-medium text-foreground">New Form Field</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Label <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. Full Name"
                                value={newField.label}
                                onChange={(e) =>
                                  setNewField({ ...newField, label: e.target.value })
                                }
                                className="h-9 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Key <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                placeholder="e.g. fullName"
                                value={newField.key}
                                onChange={(e) =>
                                  setNewField({
                                    ...newField,
                                    key: e.target.value.replace(/\s/g, ""),
                                  })
                                }
                                className="h-9 rounded-xl font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Field Type</Label>
                              <Select
                                value={newField.type}
                                onValueChange={(v) =>
                                  setNewField({
                                    ...newField,
                                    type: v as PreChatFormField["type"],
                                    options: [],
                                  })
                                }
                              >
                                <SelectTrigger className="h-9 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldTypeOptions.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-3 pt-5">
                              <Switch
                                checked={newField.required}
                                onCheckedChange={(checked) =>
                                  setNewField({ ...newField, required: checked })
                                }
                              />
                              <Label className="text-xs">Required field</Label>
                            </div>
                          </div>

                          {newField.type === "select" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Select Options</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add option..."
                                  value={newFieldOption}
                                  onChange={(e) => setNewFieldOption(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      addFieldOption()
                                    }
                                  }}
                                  className="h-9 rounded-xl"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addFieldOption}
                                  className="h-9 rounded-xl"
                                >
                                  Add
                                </Button>
                              </div>
                              {(newField.options ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {(newField.options ?? []).map((opt) => (
                                    <span
                                      key={opt}
                                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs"
                                    >
                                      {opt}
                                      <button
                                        type="button"
                                        onClick={() => removeFieldOption(opt)}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={addPreChatField}
                              className="rounded-xl"
                              disabled={!newField.key || !newField.label}
                            >
                              <Check className="mr-2 h-3 w-3" />
                              Add Field
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowAddField(false)
                                setNewField({
                                  key: "",
                                  label: "",
                                  type: "text",
                                  required: false,
                                  options: [],
                                })
                              }}
                              className="rounded-xl"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {/* ── Step 5: Knowledge Base ───────────────────────────────────── */}
              {currentStep === 5 && (
                <>
                  <CardHeader>
                    <CardTitle>Knowledge Base</CardTitle>
                    <CardDescription>
                      Add URLs and documents for your AI to learn from
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Website URLs */}
                    <div className="space-y-3">
                      <div>
                        <Label>Website URLs</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Add pages your AI should reference (e.g. About, FAQs, Services)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://yoursite.com/faq"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUrl()
                            }
                          }}
                          className="rounded-xl"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addUrl}
                          className="flex-shrink-0 rounded-xl"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {knowledgeBaseUrls.length > 0 && (
                        <div className="space-y-2">
                          {knowledgeBaseUrls.map((url, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm text-foreground">{url}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0 text-destructive"
                                onClick={() =>
                                  setKnowledgeBaseUrls(
                                    knowledgeBaseUrls.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    <div className="space-y-3">
                      <div>
                        <Label>Documents</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Add document names or paths (e.g. hotel-guide.pdf)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="document-name.pdf"
                            value={newDocument}
                            onChange={(e) => setNewDocument(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addDocument()
                              }
                            }}
                            className="rounded-xl pl-10"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addDocument}
                          className="flex-shrink-0 rounded-xl"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {knowledgeBaseDocuments.length > 0 && (
                        <div className="space-y-2">
                          {knowledgeBaseDocuments.map((doc, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="text-sm text-foreground">{doc}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0 text-destructive"
                                onClick={() =>
                                  setKnowledgeBaseDocuments(
                                    knowledgeBaseDocuments.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}

              {/* ── Navigation ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3 border-t border-border p-6">
                {submitError && (
                  <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                    disabled={currentStep === 1 || isSubmitting}
                    className="rounded-xl"
                  >
                    Previous
                  </Button>
                  {currentStep < 5 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl"
                    >
                      {isSubmitting
                        ? editingId
                          ? "Updating…"
                          : "Creating…"
                        : editingId
                          ? "Update Onboarding"
                          : "Complete Setup"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </form>
        </Form>
      </div>
    </AdminLayout>
  )
}

// ─── Exported page ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout title="Onboarding">
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            Loading…
          </div>
        </AdminLayout>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  )
}
