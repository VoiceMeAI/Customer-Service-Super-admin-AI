export type ApiListResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
};

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
};

/**
 * EncryptedApiResponse - Wrapper structure for encrypted API responses
 * 
 * Your API returns responses in this format:
 * - status: boolean (true for success)
 * - code: number (HTTP status code, e.g., 200)
 * - encrypted: boolean (true if response is encrypted)
 * - textData: string (encrypted data that gets decrypted by interceptor)
 * - timestamp: string (response timestamp)
 * 
 * Note: The axios interceptor automatically detects encrypted: true,
 * decrypts textData, and replaces response.data with the decrypted payload.
 * So in your code, you'll receive the decrypted data directly in response.data.
 */
export type EncryptedApiResponse<T = unknown> = {
  status: boolean;
  code: number;
  encrypted: boolean;
  textData: string;
  timestamp: string;
  // After decryption by interceptor, response.data becomes T
};

/**
 * LoginPayload - Data structure for user login
 * 
 * Matches the backend API schema:
 * - emailOrUsername: User's email address or username (required)
 * - password: User's password (required)
 * 
 * Note: This payload will be automatically encrypted by the axios interceptor
 * before being sent to the backend API.
 */
export type LoginPayload = {
  emailOrUsername: string;
  password: string;
};

export type LoginResponse<TUser = unknown> = {
  user?: TUser;
  token?: string;
};

/**
 * RegisterPayload - Data structure for user registration
 * 
 * Matches the backend API schema:
 * - username: User's unique username (required)
 * - firstName: User's first name (required)
 * - lastName: User's last name (required)
 * - email: User's email address (required, must be valid email format)
 * - phone: User's phone number (required)
 * - password: User's password (required, minimum 6 characters)
 * - role: User's role (optional)
 * 
 * Note: This payload will be automatically encrypted by the axios interceptor
 * before being sent to the backend API.
 */
export type RegisterPayload = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
};

/**
 * RegisterResponse - Structure of API response after registration
 * 
 * Typically includes:
 * - user: The created user object
 * - token: JWT authentication token
 * - message: Optional success message
 * 
 * Adjust based on what your backend actually returns
 */
export type RegisterResponse<TUser = unknown> = {
  user: TUser;
  token: string;
  message?: string;
};

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

/**
 * OnboardingScheduleDay - A single day entry in the hours-of-operation schedule
 * Matches the backend schema exactly
 */
export type OnboardingScheduleDay = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  start: string;  // HH:mm format, e.g. "09:00"
  end: string;    // HH:mm format, e.g. "17:00"
  isOpen: boolean;
};

/**
 * OnboardingPreChatField - A single field definition in the pre-chat form
 */
export type OnboardingPreChatField = {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[];  // Only used when type === "select"
};

/**
 * OnboardingPayload - Plain (unencrypted) payload for create / update onboarding
 * 
 * The axios request interceptor automatically encrypts this to:
 * { "textData": "AES-encrypted-string" }
 * before sending to the backend.
 * 
 * Required fields: companyName, industryCategory, companySizeOrRole,
 *                  brandColors, widgetPosition, agentPersona,
 *                  hoursOfOperation, languagePreferences, knowledgeBaseData
 */
export type OnboardingPayload = {
  companyName: string;
  websiteUrl?: string | null;
  industryCategory: string;
  companySizeOrRole: string;
  brandColors: {
    primary: string;    // Hex color, e.g. "#10b981"
    secondary?: string | null;
  };
  widgetPosition: "bottom-right" | "bottom-left";
  agentPersona: {
    alias: string;
    profileImageUrl?: string | null;
  };
  hoursOfOperation: {
    timezone: string;
    schedule: OnboardingScheduleDay[];
  };
  languagePreferences: {
    defaultLanguage: string;
    supportedLanguages: string[];  // minItems: 1
  };
  preChatFormFields?: OnboardingPreChatField[];
  knowledgeBaseData: {
    urls: string[];
    documents: string[];
  };
};

/**
 * OnboardingItem - What the backend returns for a single onboarding record
 * Includes the payload fields plus server-generated metadata
 */
export type OnboardingItem = OnboardingPayload & {
  _id?: string;
  id?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * OnboardingListPagination - Pagination metadata returned by the backend
 */
export type OnboardingListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * GetAllOnboardingsResult - Normalised return value from getOnboardings()
 * after all response nesting has been unwrapped.
 */
export type GetAllOnboardingsResult = {
  items: OnboardingItem[];
  pagination: OnboardingListPagination;
};

/**
 * Actual backend response shape for GET /api/widget/onboarding/all
 *
 * The response is triple-nested:
 *
 *  When NOT encrypted (encrypted: false):
 *    response.data = {
 *      payload: {                              ← outer wrapper
 *        status: true,
 *        payload: {                            ← API layer
 *          code: 200,
 *          message: "Onboardings fetched successfully",
 *          payload: {                          ← endpoint payload
 *            data: OnboardingItem[],
 *            pagination: OnboardingListPagination,
 *          },
 *          status: true,
 *        }
 *      },
 *      status: true,
 *      encrypted: false,
 *      timestamp: string,
 *    }
 *
 *  When encrypted (encrypted: true):
 *    The axios interceptor decrypts textData and sets response.data to
 *    the decrypted content, which matches one of the inner layers above.
 *    The extractListPayload() helper in onboarding.ts handles both cases
 *    recursively.
 */
export type GetAllOnboardingsApiResponse = Record<string, unknown>;

// ============================================================================
// FAQ TYPES
// ============================================================================

/**
 * FaqPayload - Plain (unencrypted) payload for create / update FAQ
 *
 * Matches the backend schema exactly:
 *   required: question, answer
 *   optional: companyId, category, tags, sortOrder, isPublished, isActive
 *
 * The axios request interceptor automatically encrypts this to:
 *   { "textData": "AES-encrypted-string" }
 */
export type FaqPayload = {
  question: string;           // minLength: 3, maxLength: 500
  answer: string;             // minLength: 3
  companyId?: string | null;
  category?: string | null;   // maxLength: 120
  tags?: string[];
  sortOrder?: number;         // integer, minimum: 0
  isPublished?: boolean;
  isActive?: boolean;
};

/**
 * FaqItem - What the backend returns for a single FAQ record
 * Includes the payload fields plus server-generated metadata
 */
export type FaqItem = FaqPayload & {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * FaqListPagination - Pagination metadata returned by the backend
 */
export type FaqListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * GetAllFaqsResult - Normalised return value from getFaqs()
 */
export type GetAllFaqsResult = {
  items: FaqItem[];
  pagination: FaqListPagination;
};

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * ServiceSla - SLA configuration for a service.
 */
export type ServiceSla = {
  firstResponseMins?: number;  // integer, minimum: 0
  resolutionMins?: number;     // integer, minimum: 0
};

/**
 * ServiceChannel - Allowed channel values for a service.
 */
export type ServiceChannel = "chat" | "email" | "voice";

/**
 * ServicePayload - Plain (unencrypted) payload for create / update service
 *
 * Matches the backend schema exactly (POST /api/widget/services/create):
 *   required: name
 *   optional: description, companyId, category, tags, sortOrder, isPublished,
 *            isActive, sla, channels, metadata
 *
 * The axios request interceptor automatically encrypts this to:
 *   { "textData": "AES-encrypted-string" }
 */
export type ServicePayload = {
  name: string;                // required, minLength: 2, maxLength: 200
  description?: string | null;
  companyId?: string | null;
  category?: string | null;    // maxLength: 120
  tags?: string[];
  sortOrder?: number;          // integer, minimum: 0
  isPublished?: boolean;
  isActive?: boolean;
  sla?: ServiceSla | null;
  channels?: ServiceChannel[];
  metadata?: Record<string, unknown> | null;
};

/**
 * ServiceItem - What the backend returns for a single service record.
 * Includes the payload fields plus server-generated metadata.
 */
export type ServiceItem = ServicePayload & {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * ServiceListPagination - Pagination metadata returned by GET /api/widget/services/all
 */
export type ServiceListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * GetAllServicesResult - Normalised return value from getServices()
 */
export type GetAllServicesResult = {
  items: ServiceItem[];
  pagination: ServiceListPagination;
};

/**
 * ReorderServicesPayload - Payload for PATCH /api/widget/services/reorder
 * Sends the new ordered list of service IDs.
 */
export type ReorderServicesPayload = {
  serviceIds: string[];
};

// ============================================================================
// STAFF TYPES
// ============================================================================

/**
 * StaffStatus - Possible status values for a staff member.
 * Matches the enum defined in POST /api/widget/staff/create
 */
export type StaffStatus = "invited" | "active" | "suspended";

/**
 * StaffRole - A role object returned by GET /api/widget/staff/roles/all
 */
export type StaffRole = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  permissions?: string[];
};

/**
 * StaffPermission - A permission object returned by GET /api/widget/staff/permissions/all
 */
export type StaffPermission = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
};

/**
 * StaffPayload - Plain (unencrypted) payload for POST /api/widget/staff/create
 *
 * Required: firstName (min 2, max 100), lastName (min 2, max 100), email
 * The axios request interceptor automatically encrypts this to:
 *   { "textData": "AES-encrypted-string" }
 * Note: additionalProperties is false on the backend — only send these fields.
 */
export type StaffPayload = {
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string | null;
  phone?: string | null;
  roles?: string[];
  status?: StaffStatus;
  isActive?: boolean;
  invitedBy?: string | null;
  invitedAt?: string | null;
};

/**
 * UpdateStaffPayload - Partial payload for PATCH /api/widget/staff/{id}
 */
export type UpdateStaffPayload = {
  firstName?: string;
  lastName?: string;
  roles?: string[];
  phone?: string | null;
  isActive?: boolean;
};

/**
 * UpdateStaffStatusPayload - Payload for PATCH /api/widget/staff/{id}/status
 */
export type UpdateStaffStatusPayload = {
  status: StaffStatus;
};

/**
 * UpdateStaffRolesPayload - Payload for PATCH /api/widget/staff/{id}/roles
 */
export type UpdateStaffRolesPayload = {
  roles: string[];
};

/**
 * StaffItem - What the backend returns for a single staff record.
 */
export type StaffItem = {
  _id?: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  roles?: string[];
  /** Convenience singular alias sometimes returned by the backend */
  role?: string;
  status?: StaffStatus;
  companyId?: string;
  phone?: string | null;
  isActive?: boolean;
  invitedBy?: string | null;
  invitedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * StaffListPagination - Pagination metadata returned by GET /api/widget/staff/all
 */
export type StaffListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * GetAllStaffResult - Normalised return value from getStaff()
 */
export type GetAllStaffResult = {
  items: StaffItem[];
  pagination: StaffListPagination;
};