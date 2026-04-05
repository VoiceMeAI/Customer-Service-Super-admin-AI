import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { type ApiError } from "@/lib/api/types";
import { costomencryDecryptInternalCRYPTOJS } from "@/lib/utils/costomencryDecryptInternalCRYPTOJS";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// NOTE: The backend is hosted on Render's free tier, which can take up to
// 60 s to spin up after a period of inactivity (cold-start).  We set the
// timeout high enough to survive that warm-up without failing the request.
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PERRY_API_BASE_URL,
  timeout: 60000, // 60 s — accommodates Render free-tier cold starts
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const normalizeAxiosError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;

    // Give a clear, user-friendly message for network timeouts.
    // The backend (Render free tier) can take up to 60 s to cold-start —
    // if we still time out, the message should say so instead of showing
    // the raw "timeout of Xms exceeded" string.
    if (axiosError.code === "ECONNABORTED" || axiosError.message?.includes("timeout")) {
      return {
        message:
          "The server is taking too long to respond. It may be waking up — please wait a moment and try again.",
        status: undefined,
        code: axiosError.code,
        details: undefined,
      };
    }

    // No response at all (network down, CORS, etc.)
    if (!axiosError.response) {
      return {
        message:
          "Unable to reach the server. Please check your connection and try again.",
        status: undefined,
        code: axiosError.code,
        details: undefined,
      };
    }

    return {
      message: axiosError.response.data?.message ?? axiosError.message ?? "Request failed",
      status: axiosError.response?.status,
      code: axiosError.code,
      details: axiosError.response?.data,
    };
  }

  return { message: "Unexpected error" };
};

// ────────────────────────────────────────────────────────────────────────────
// unwrapNestedPayload
//
// CONTEXT FOR BACKEND DEV:
//   The backend wraps every response in multiple layers of { payload: { ... } }.
//   For example, a GET /faqs/all response after decryption looks like:
//
//     {
//       payload: {                              ← wrapper layer 1 (status wrapper)
//         status: true,
//         payload: {                            ← wrapper layer 2 (API layer)
//           code: 200,
//           message: "Faqs fetched successfully",
//           status: true,
//           payload: {                          ← wrapper layer 3 (endpoint layer)
//             data: [ ...FaqItem[] ],           ← THE ACTUAL DATA
//             pagination: { page, limit, total, totalPages }
//           }
//         }
//       }
//     }
//
//   And for single-item endpoints like GET /faqs/{id}:
//
//     {
//       payload: {
//         status: true,
//         payload: {
//           code: 200,
//           message: "Faq fetched successfully",
//           payload: {
//             faq: { ...FaqItem }               ← THE ACTUAL DATA
//           }
//         }
//       }
//     }
//
//   This function recursively peels the .payload layers until it reaches
//   the innermost useful object. After this runs:
//     List endpoint  → { data: [...], pagination: {...} }
//     Single item    → { faq: {...} }  or  { onboarding: {...} }
//
//   RECOMMENDATION TO BACKEND:
//   Flatten the response so the decrypted payload IS the data directly:
//     { code: 200, message: "...", data: [...], pagination: {...} }
//   Then this function becomes unnecessary and can be removed.
// ────────────────────────────────────────────────────────────────────────────
function unwrapNestedPayload(node: unknown, depth = 0): unknown {
  if (depth > 6 || !node || typeof node !== "object") return node;

  const obj = node as Record<string, unknown>;

  // If this level has a .payload and it's a non-null object, go deeper —
  // the real data is further down.
  if (
    obj.payload !== undefined &&
    obj.payload !== null &&
    typeof obj.payload === "object"
  ) {
    return unwrapNestedPayload(obj.payload, depth + 1);
  }

  // No more .payload nesting — this IS the real data.
  return node;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    if (!("Authorization" in config.headers)) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
  }

  return config;
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const aesKey = process.env.NEXT_PUBLIC_AES_KEY;

  // Encrypt ALL non-GET requests — including DELETE which typically has no body.
  // The backend middleware requires { textData: "..." } on every mutating request.
  // When there is no body (e.g. DELETE), we encrypt an empty object {} so the
  // backend still receives a valid textData field.
  const shouldEncrypt =
    typeof window !== "undefined" &&
    !!aesKey &&
    config.method?.toLowerCase() !== "get";

  if (!shouldEncrypt) {
    return config;
  }

  // Use the existing request body if provided; fall back to {} (e.g. DELETE).
  const dataToEncrypt = config.data !== undefined ? config.data : {};

  console.log("encrypt?", shouldEncrypt, "method:", config.method, "data:", dataToEncrypt);

  const encryptedResult = await costomencryDecryptInternalCRYPTOJS(
    "EN",
    JSON.stringify(dataToEncrypt),
    aesKey
  );

  if (!encryptedResult.status) {
    return Promise.reject({ message: encryptedResult.payload });
  }

  return {
    ...config,
    data: { textData: encryptedResult.payload },
  };
});

apiClient.interceptors.response.use(async (response) => {
  const aesKey = process.env.NEXT_PUBLIC_AES_KEY;
  const shouldDecrypt =
    typeof window !== "undefined" &&
    !!aesKey &&
    response?.data?.encrypted === true &&
    typeof response?.data?.textData === "string";

  if (!shouldDecrypt) {
    // ────────────────────────────────────────────────────────────────────────
    // NEW APPROACH: Unwrap nested .payload wrappers for non-encrypted responses too.
    //
    // PROBLEM FOR BACKEND DEV:
    //   Even non-encrypted responses come wrapped in multiple layers:
    //     response.data = {
    //       payload: {                          ← wrapper 1
    //         status: true,
    //         payload: {                        ← wrapper 2
    //           code: 200,
    //           message: "...",
    //           payload: {                      ← wrapper 3  ← this is the ACTUAL data
    //             data: [...],
    //             pagination: {...}
    //           }
    //         }
    //       },
    //       status: true,
    //       encrypted: false,
    //       timestamp: "..."
    //     }
    //
    //   Every API function on the frontend had to use recursive helpers
    //   (unwrapPayload, extractDeepPayload, extractListPayload) just to
    //   reach the real data. In other projects with this same encryption
    //   setup, the response after decryption is flat — callers can use
    //   response.data directly.
    //
    //   IDEAL backend response (what we'd like you to change to):
    //     { code: 200, message: "...", data: [...], pagination: {...} }
    //   or for single items:
    //     { code: 200, message: "...", data: { ...item } }
    //
    //   Until that's fixed, we auto-unwrap here so all API functions
    //   receive clean data without needing helper functions.
    // ────────────────────────────────────────────────────────────────────────
    response.data = unwrapNestedPayload(response.data);
    return response;
  }

  // ── OLD APPROACH (commented out for reference): ────────────────────────
  // Previously, the interceptor ONLY decrypted the response and returned
  // the raw decrypted object — which still had 2-3 layers of { payload: { payload: ... } }.
  // This forced every API function (createFaq, getFaqs, getOnboardingById, etc.)
  // to use three helper functions to dig through the nesting:
  //
  //   1. unwrapPayload<T>(data)         — check for .payload or .data at top level
  //   2. extractDeepPayload<T>(data, key) — recursively walk .payload chain looking for a key
  //   3. extractListPayload(data)       — recursively walk .payload chain looking for { data: [], pagination }
  //
  // Every single API function had to do something like:
  //   const result = extractDeepPayload(response.data, 'faq') ?? unwrapPayload(response.data);
  //
  // This was duplicated across faqs.ts, onboarding.ts, and would need to be
  // copied into every new API file — fragile, verbose, and error-prone.
  //
  // The old decryption code:
  //   const decryptedResult = await costomencryDecryptInternalCRYPTOJS("DE", response.data.textData, aesKey);
  //   if (!decryptedResult.status) {
  //     console.error("❌ Decryption failed:", decryptedResult.payload);
  //     return Promise.reject({ message: decryptedResult.payload });
  //   }
  //   return { ...response, data: decryptedResult.payload };
  //   // ↑ returned the raw nested object — API functions still had to dig through it
  // ── END OLD APPROACH ───────────────────────────────────────────────────

  // ── NEW APPROACH: Decrypt + unwrap in one step ────────────────────────
  // After decryption, we run unwrapNestedPayload() to peel all the
  // { payload: { payload: { payload: ... } } } layers. This means
  // response.data is the innermost useful object — API functions can
  // access the data directly without any helper functions.
  //
  // Example — after this interceptor runs:
  //   Single item:  response.data = { faq: {...} }       or { onboarding: {...} }
  //   List:         response.data = { data: [...], pagination: {...} }
  //
  // API functions just do:
  //   const faq = (response.data as any).faq;
  //   const { data, pagination } = response.data as any;
  //
  // No more recursive helpers needed.
  // ────────────────────────────────────────────────────────────────────────

  const decryptedResult = await costomencryDecryptInternalCRYPTOJS(
    "DE",
    response.data.textData,
    aesKey
  );

  if (!decryptedResult.status) {
    console.error("❌ Decryption failed:", decryptedResult.payload);
    return Promise.reject({ message: decryptedResult.payload });
  }

  return {
    ...response,
    data: unwrapNestedPayload(decryptedResult.payload),
  };
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeAxiosError(error))
);

export default apiClient;
