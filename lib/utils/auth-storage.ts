// Storage keys - these are just identifiers for localStorage
const TOKEN_KEY = 'auth_token';  // Key name for storing the token string
const USER_KEY = 'auth_user';   // Key name for storing the user object

export const authStorage = {
  /**
   * Save the authentication token to localStorage
   * @param token - The JWT/auth token string from API response
   */
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Get the authentication token from localStorage
   * @returns The token string or null if not found
   */
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  /**
   * Remove the token from localStorage (for logout)
   */
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  /**
   * Save user data to localStorage
   * @param user - The user object from API response (id, email, name, etc.)
   */
  setUser: (user: unknown) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get user data from localStorage
   * @returns The user object or null if not found
   */
  getUser: <T = unknown>(): T | null => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  /**
   * Clear all authentication data (token + user)
   * Used when user logs out
   */
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },
};
