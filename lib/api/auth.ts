/**
 * Authentication API Service
 * 
 * This module provides functions to interact with authentication endpoints:
 * - register: Create a new user account
 * - login: Authenticate existing user
 * - logout: End user session
 * 
 * All functions:
 * - Make API calls using the configured apiClient
 * - Handle encryption/decryption automatically (via interceptors)
 * - Update Zustand auth store on success
 * - Return typed responses with proper error handling
 */

import apiClient from './axios';
import { 
  type LoginPayload, 
  type LoginResponse, 
  type RegisterPayload,
  type RegisterResponse,
  type ApiError 
} from './types';
import { useAuthStore, type User } from '@/lib/stores/auth-store';

// ============================================================================
// STEP 1: Register Function
// ============================================================================
/**
 * register - Register a new user account
 * 
 * @param payload - Registration data (username, firstName, lastName, email, phone, password, role?)
 *                  Required fields: username, firstName, lastName, email, phone, password
 *                  Optional fields: role
 *                  Password must be at least 6 characters
 * @returns Promise<RegisterResponse<User>> - User data and token
 * @throws ApiError - If registration fails
 * 
 * What it does:
 * 1. Makes POST request to /auth/register endpoint
 * 2. Request body is automatically encrypted (via axios interceptor)
 * 3. Response is automatically decrypted (via axios interceptor)
 * 4. On success: Updates Zustand store with user and token
 * 5. Returns the response data
 * 
 * Flow:
 * User submits signup form
 *   ↓
 * register(payload) called
 *   ↓
 * POST /auth/register (encrypted)
 *   ↓
 * API validates and creates user
 *   ↓
 * API returns { user, token } (decrypted)
 *   ↓
 * setAuth(user, token) updates Zustand store
 *   ↓
 * Token saved to localStorage (automatic)
 *   ↓
 * Axios interceptor synced (automatic)
 *   ↓
 * User is now logged in ✅
 */
export async function register(payload: RegisterPayload): Promise<RegisterResponse<User>> {
  try {
    // ------------------------------------------------------------------------
    // Make API Request
    // ------------------------------------------------------------------------
    /**
     * apiClient.post<RegisterResponse<User>>('/auth/register', payload)
     * 
     * - apiClient: Pre-configured axios instance with interceptors
     * - '/auth/register': Backend endpoint (adjust if different)
     * - payload: Registration data (username, firstName, lastName, email, phone, password, role?)
     * - <RegisterResponse<User>>: TypeScript type for response
     * 
     * Payload structure (matches RegisterPayload type):
     * {
     *   username: string,      // Required
     *   firstName: string,      // Required
     *   lastName: string,       // Required
     *   email: string,          // Required, email format
     *   phone: string,          // Required
     *   password: string,       // Required, minLength: 6
     *   role?: string          // Optional
     * }
     * 
     * What happens automatically:
     * 1. Request interceptor encrypts payload (if encryption enabled)
     * 2. Request sent to: baseURL + '/auth/register'
     * 3. Response interceptor decrypts response (if encrypted)
     * 4. Error interceptor normalizes errors
     */
    const response = await apiClient.post<RegisterResponse<User>>('/api/widget/auth/register', payload);

    // ------------------------------------------------------------------------
    // Validate Response
    // ------------------------------------------------------------------------
    /**
     * After decryption by interceptor, response.data should contain:
     * { user: {...}, token: "..." }
     * 
     * The interceptor automatically:
     * 1. Detects encrypted: true in the API response
     * 2. Decrypts textData field
     * 3. Replaces response.data with the decrypted payload
     * 
     * So at this point, response.data is already the decrypted object.
     * 
     * Debug logging to see what we actually received:
     */
    console.log("📦 Register response received:", {
      hasData: !!response.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullData: response.data,
    });

    if (!response.data || typeof response.data !== 'object') {
      console.error("❌ Invalid response.data:", response.data);
      throw {
        message: 'Invalid response from server',
        status: 500,
      } as ApiError;
    }

    // ------------------------------------------------------------------------
    // Extract Data from Response Structure
    // ------------------------------------------------------------------------
    /**
     * The API returns decrypted data in this structure:
     * {
     *   code: 200,
     *   message: "Login successful",
     *   payload: {
     *     token: "Bearer ...",
     *     user: { ... }
     *   },
     *   status: true
     * }
     * 
     * We need to extract token and user from response.data.payload
     */
    let token: string | undefined;
    let user: User | undefined;

    // Check if data is in payload property (actual API structure)
    if (response.data && typeof response.data === 'object' && 'payload' in response.data) {
      const payload = (response.data as any).payload;
      console.log("📦 Response has 'payload' property");
      
      if (!payload || typeof payload !== 'object') {
        throw {
          message: 'Invalid response from server: payload is not an object',
          status: 500,
        } as ApiError;
      }

      token = payload.token;
      user = payload.user as User;

      // Remove "Bearer " prefix if present (some APIs include it, some don't)
      if (token && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
    } 
    // Fallback: Check if data is wrapped in a 'data' property
    else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      console.log("📦 Response wrapped in 'data' property");
      const wrappedData = (response.data as any).data as RegisterResponse<User>;
      token = wrappedData.token;
      user = wrappedData.user;
    } 
    // Direct structure: { user, token }
    else {
      const directData = response.data as RegisterResponse<User>;
      token = directData.token;
      user = directData.user;
    }

    console.log("🔍 Extracted data:", {
      hasToken: !!token,
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : [],
      tokenLength: token?.length,
    });

    if (!token || !user) {
      console.error("❌ Missing required fields:", {
        hasToken: !!token,
        hasUser: !!user,
        actualResponse: response.data,
      });
      throw {
        message: 'Invalid response from server: missing user or token',
        status: 500,
        details: response.data,
      } as ApiError;
    }

    // ------------------------------------------------------------------------
    // Update Zustand Store
    // ------------------------------------------------------------------------
    /**
     * useAuthStore.getState().setAuth(user, token)
     * 
     * This updates the global auth state:
     * - Sets user and token in Zustand store
     * - Triggers re-renders in all components using the store
     * - Automatically saves to localStorage (via persist middleware)
     * - Syncs token with axios interceptor (for future API calls)
     * 
     * Why use getState()?
     * - We're not in a React component, so we can't use the hook
     * - getState() gives us direct access to store actions
     */
    console.log("✅ Validation passed. Updating store with:", {
      userId: user?.id || user?.email,
      hasToken: !!token,
    });
    useAuthStore.getState().setAuth(user, token);

    // ------------------------------------------------------------------------
    // Return Response
    // ------------------------------------------------------------------------
    /**
     * Return the response in expected format for components
     * Components can use this for:
     * - Displaying success messages
     * - Redirecting to dashboard
     * - Accessing additional response data
     */
    return {
      user,
      token,
    } as RegisterResponse<User>;
  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    /**
     * Errors are automatically normalized by axios interceptor
     * They come as ApiError type with:
     * - message: Human-readable error message
     * - status: HTTP status code (401, 400, 500, etc.)
     * - code: Error code
     * - details: Additional error information
     * 
     * We re-throw so the calling component can handle it
     */
    throw error as ApiError;
  }
}

// ============================================================================
// STEP 4: Login Function
// ============================================================================
/**
 * login - Authenticate an existing user
 * 
 * @param payload - Login credentials (emailOrUsername, password)
 *                  emailOrUsername: User's email address or username
 *                  password: User's password
 * @returns Promise<LoginResponse<User>> - User data and token
 * @throws ApiError - If login fails
 * 
 * What it does:
 * 1. Makes POST request to /api/widget/auth/login endpoint
 * 2. Request body is automatically encrypted (via axios interceptor)
 * 3. Response is automatically decrypted (via axios interceptor)
 * 4. On success: Updates Zustand store with user and token
 * 5. Returns the response data
 * 
 * Flow:
 * User submits login form
 *   ↓
 * login(payload) called
 *   ↓
 * POST /api/widget/auth/login (encrypted)
 *   ↓
 * API validates credentials
 *   ↓
 * API returns { user, token } (decrypted)
 *   ↓
 * setAuth(user, token) updates Zustand store
 *   ↓
 * Token saved to localStorage (automatic)
 *   ↓
 * Axios interceptor synced (automatic)
 *   ↓
 * User is now logged in ✅
 */
export async function login(payload: LoginPayload): Promise<LoginResponse<User>> {
  try {
    // ------------------------------------------------------------------------
    // Make API Request
    // ------------------------------------------------------------------------
    /**
     * apiClient.post<LoginResponse<User>>('/api/widget/auth/login', payload)
     * 
     * - Uses LoginPayload type from types.ts (emailOrUsername, password)
     * - Response type is LoginResponse<User> (user and token)
     * - Encryption/decryption handled automatically
     * 
     * Payload structure (matches LoginPayload type):
     * {
     *   emailOrUsername: string,  // User's email or username
     *   password: string           // User's password
     * }
     */
    const response = await apiClient.post<LoginResponse<User>>('/api/widget/auth/login', payload);

    // ------------------------------------------------------------------------
    // Validate Response
    // ------------------------------------------------------------------------
    /**
     * After decryption by interceptor, response.data should contain:
     * { user: {...}, token: "..." }
     * 
     * The interceptor automatically:
     * 1. Detects encrypted: true in the API response
     * 2. Decrypts textData field
     * 3. Replaces response.data with the decrypted payload
     * 
     * So at this point, response.data is already the decrypted object.
     * 
     * Debug logging to see what we actually received:
     */
    console.log("📦 Login response received:", {
      hasData: !!response.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullData: response.data,
    });

    if (!response.data || typeof response.data !== 'object') {
      console.error("❌ Invalid response.data:", response.data);
      throw {
        message: 'Invalid response from server',
        status: 500,
      } as ApiError;
    }

    // ------------------------------------------------------------------------
    // Extract Data from Response Structure
    // ------------------------------------------------------------------------
    /**
     * The API returns decrypted data in this structure:
     * {
     *   code: 200,
     *   message: "Login successful",
     *   payload: {
     *     token: "Bearer ...",
     *     user: { ... }
     *   },
     *   status: true
     * }
     * 
     * We need to extract token and user from response.data.payload
     */
    let token: string | undefined;
    let user: User | undefined;

    // Check if data is in payload property (actual API structure)
    if (response.data && typeof response.data === 'object' && 'payload' in response.data) {
      const payload = (response.data as any).payload;
      console.log("📦 Response has 'payload' property");
      
      if (!payload || typeof payload !== 'object') {
        throw {
          message: 'Invalid response from server: payload is not an object',
          status: 500,
        } as ApiError;
      }

      token = payload.token;
      user = payload.user as User;

      // Remove "Bearer " prefix if present (some APIs include it, some don't)
      if (token && token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
    } 
    // Fallback: Check if data is wrapped in a 'data' property
    else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      console.log("📦 Response wrapped in 'data' property");
      const wrappedData = (response.data as any).data as LoginResponse<User>;
      token = wrappedData.token;
      user = wrappedData.user;
    } 
    // Direct structure: { user, token }
    else {
      const directData = response.data as LoginResponse<User>;
      token = directData.token;
      user = directData.user;
    }

    console.log("🔍 Extracted data:", {
      hasToken: !!token,
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : [],
      tokenLength: token?.length,
    });

    if (!token || !user) {
      console.error("❌ Missing required fields:", {
        hasToken: !!token,
        hasUser: !!user,
        actualResponse: response.data,
      });
      throw {
        message: 'Invalid response from server: missing user or token',
        status: 500,
        details: response.data,
      } as ApiError;
    }

    // ------------------------------------------------------------------------
    // Update Zustand Store
    // ------------------------------------------------------------------------
    /**
     * Update global auth state
     * This makes the user "logged in" across the entire app
     */
    console.log("✅ Validation passed. Updating store with:", {
      userId: user?.id || user?.email,
      hasToken: !!token,
    });
    useAuthStore.getState().setAuth(user, token);

    // ------------------------------------------------------------------------
    // Return Response
    // ------------------------------------------------------------------------
    /**
     * Return the response in expected format for components
     */
    return {
      user,
      token,
    } as LoginResponse<User>;
  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    /**
     * Re-throw normalized error
     * Components will catch and display to user
     */
    throw error as ApiError;
  }
}

// ============================================================================
// STEP 5: Logout Function
// ============================================================================
/**
 * logout - End user session
 * 
 * @returns Promise<void>
 * 
 * What it does:
 * 1. Optionally makes POST request to /auth/logout (to invalidate token on server)
 * 2. Clears Zustand store (user, token, isAuthenticated)
 * 3. Clears localStorage (automatic via persist middleware)
 * 4. Clears axios interceptor token
 * 
 * Flow:
 * User clicks logout
 *   ↓
 * logout() called
 *   ↓
 * POST /auth/logout (optional - to invalidate server-side token)
 *   ↓
 * clearAuth() clears Zustand store
 *   ↓
 * localStorage cleared (automatic)
 *   ↓
 * Axios token cleared
 *   ↓
 * User redirected to login page
 *   ↓
 * User is now logged out ✅
 * 
 * Note: We use try/catch/finally because:
 * - Even if server logout fails, we still want to clear local state
 * - This ensures user can always log out, even if server is down
 */
export async function logout(): Promise<void> {
  try {
    // ------------------------------------------------------------------------
    // Optional: Notify Server
    // ------------------------------------------------------------------------
    /**
     * Some backends track active sessions
     * Calling logout endpoint invalidates the token server-side
     * 
     * This is optional - if your backend doesn't need it, you can remove this
     * 
     * Note: We don't need to pass token - axios interceptor adds it automatically
     */
    await apiClient.post('/auth/logout');
  } catch (error) {
    /**
     * If server logout fails, we still continue
     * This ensures user can always log out locally
     * You might want to log this error for debugging
     */
    console.error('Logout API call failed:', error);
  } finally {
    // ------------------------------------------------------------------------
    // Always Clear Local State
    // ------------------------------------------------------------------------
    /**
     * useAuthStore.getState().clearAuth()
     * 
     * This:
     * - Clears user and token from Zustand store
     * - Triggers re-renders in all components
     * - Automatically clears localStorage (via persist middleware)
     * - Clears token from axios interceptor
     * 
     * We do this in finally block to ensure it always runs,
     * even if the API call fails
     */
    useAuthStore.getState().clearAuth();
  }
}

// ============================================================================
// STEP 6: Helper Functions (Optional but Useful)
// ============================================================================

/**
 * getCurrentUser - Get current user from store
 * 
 * @returns User | null
 * 
 * Convenience function to get user without using the hook
 * Useful in non-React contexts (utilities, middleware, etc.)
 */
export function getCurrentUser(): User | null {
  return useAuthStore.getState().user;
}

/**
 * isAuthenticated - Check if user is authenticated
 * 
 * @returns boolean
 * 
 * Convenience function to check auth status
 * Returns true if user and token exist
 */
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

/**
 * getAuthToken - Get current auth token
 * 
 * @returns string | null
 * 
 * Convenience function to get token
 * Useful for custom API calls or debugging
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
