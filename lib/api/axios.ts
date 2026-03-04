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
  baseURL: process.env.NEXT_PUBLIC_PERRY_API_BASE_URL || "https://node-backend-starter.onrender.com",
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
    return response;
  }

  console.log("🔓 Decrypting response...", {
    encrypted: response.data.encrypted,
    hasTextData: !!response.data.textData,
    status: response.data.status,
    code: response.data.code,
  });

  const decryptedResult = await costomencryDecryptInternalCRYPTOJS(
    "DE",
    response.data.textData,
    aesKey
  );

  if (!decryptedResult.status) {
    console.error("❌ Decryption failed:", decryptedResult.payload);
    return Promise.reject({ message: decryptedResult.payload });
  }

  console.log("✅ Decryption successful. Decrypted payload:", decryptedResult.payload);

  return {
    ...response,
    data: decryptedResult.payload,
  };
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeAxiosError(error))
);

export default apiClient;
