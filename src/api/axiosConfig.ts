/**
 * MSCureChain Patient App — Axios Configuration
 *
 * Mirrors the web frontend's apiClient.ts (lib/integrations/api/apiClient.ts):
 *  - Tokens stored under "accessToken" / "refreshToken" keys (AsyncStorage)
 *  - Bearer token injected via request interceptor
 *  - X-Hospital-Id header NOT sent for patients (backend tenantMiddleware
 *    explicitly gives patients global access, no tenant scoping needed)
 *  - 401 → silent token refresh via POST /auth/refresh + retry original request
 *  - Refresh failure → clear tokens + emit "auth-logout" event
 *
 * Base URLs:
 *  - Production : https://www.mscurechain.com/api   (matches .env.production)
 *  - Local dev  : http://localhost:5003/api           (matches server.ts PORT 4005 / Postman guide 5003)
 *  - Alt local  : http://10.0.2.2:5003/api           (Android emulator → host machine)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Keys must match exactly what the frontend uses in sessionStorage */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * API Base URL Configuration
 * 
 * Priority order:
 * 1. REACT_APP_API_URL (environment variable - can be set in .env or app startup)
 * 2. __DEV__ flag (development vs production mode)
 * 3. Platform-specific handling:
 *    - Android emulator: http://10.0.2.2:5003/api (emulator's gateway to host)
 *    - Physical device: http://192.168.29.249:5003/api (machine's local network IP)
 *    - Web/iOS: http://127.0.0.1:5003/api (localhost)
 * 
 * Production URL: https://www.mscurechain.com/api
 */
const getBaseUrl = (): string => {
  // 1. Check environment variable first (highest priority)
  const envUrl = process.env.REACT_APP_API_URL || 
                 (global as any).REACT_APP_API_URL;
  if (envUrl) {
    console.log('[AxiosConfig] Using API URL from environment:', envUrl);
    return envUrl;
  }
  
  // Directly point the app to the MSCureChain Production Server 
  // ensuring the mobile app hits the live portals (doctors, emergencies, bookings, etc).
  return 'https://www.mscurechain.com/api';
};

const BASE_URL = getBaseUrl();

const TIMEOUT_MS = 10_000; // Matches API_CONFIG.TIMEOUT in frontend config

// ─── State (mirrors module-level vars in apiClient.ts) ────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/** Process the queued requests after a successful token refresh */
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Inject Bearer token (same key as frontend sessionStorage)
    let token = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);

    // Sanitize token: strip surrounding quotes (common storage artifact, same guard as frontend)
    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. X-Hospital-Id header
    //    The backend tenantMiddleware (tenantMiddleware.ts L102-L109) gives patients
    //    GLOBAL access with no tenant scoping — no X-Hospital-Id needed for patients.
    //    If you ever need SuperAdmin impersonation, uncomment below and set hospitalId:
    //
    //    const hospitalId = await AsyncStorage.getItem('activeHospitalId');
    //    if (hospitalId) config.headers['X-Hospital-Id'] = hospitalId;

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // ✅ Success pass-through
  (response: AxiosResponse) => response,

  // ❌ Error handler: mirrors 401 → refresh → retry logic from apiClient.ts
  async (error: AxiosError<unknown>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle network errors (no response received)
    if (!error.response) {
      const networkError = new Error(
        `Connectivity Error: Please ensure you are connected to the internet and the server is online.\n\nAPI: ${BASE_URL}`,
      );
      (networkError as any).isNetworkError = true;
      console.error('[AxiosConfig] Network error:', error.message);
      return Promise.reject(networkError);
    }

    const { status } = error.response;
    const requestUrl = originalRequest.url || '';

    // Detect if this IS a login/auth request (don't refresh on these)
    const isLoginRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/sign-in') ||
      requestUrl.includes('/auth/signin');
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    // ── 401 Unauthorized: attempt silent token refresh ──────────────────────
    if (status === 401 && !originalRequest._retry && !isLoginRequest && !isRefreshRequest) {
      // Mark so we don't loop
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another refresh is in-flight — queue this request
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          const tokenError = new Error(
            'Session expired: No refresh token available. Please login again.',
          );
          (tokenError as any).isSessionExpired = true;
          throw tokenError;
        }

        // POST /auth/refresh — matches frontend (apiClient.ts L248-L254)
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: TIMEOUT_MS,
          },
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          refreshResponse.data.tokens;

        // Persist new tokens (same keys as frontend)
        await AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, newAccessToken);
        await AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, newRefreshToken);

        // Update authorization header on the failed request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Unblock queued requests
        processQueue(null, newAccessToken);

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear tokens and REDIRECT TO LOGIN
        console.error('[AxiosConfig] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        await clearAuthTokens();

        // Auto-redirect to Login screen
        try {
          const { navigateToLogin } = await import('../navigation/navigationRef');
          navigateToLogin();
        } catch (navError) {
          console.warn('[AxiosConfig] Navigation redirect failed:', navError);
        }

        const errorMessage = refreshError instanceof Error 
          ? refreshError.message 
          : 'Your session has expired. Please login again.';
        const sessionError = new Error(errorMessage);
        (sessionError as any).isSessionExpired = true;
        return Promise.reject(sessionError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── All other errors: extract message and rethrow ────────────────────────
    const responseData = error.response?.data as any;
    let errorMessage =
      responseData?.message ||
      responseData?.error?.message ||
      `HTTP ${status}`;

    const enrichedError = new Error(errorMessage);
    (enrichedError as any).status = status;
    (enrichedError as any).error = responseData?.error || responseData;
    (enrichedError as any).isSessionExpired = false;

    return Promise.reject(enrichedError);
  },
);

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Persist both tokens after a successful login.
 * Call this from your login screen / auth action.
 */
export const saveAuthTokens = async (
  accessToken: string,
  refreshToken: string,
): Promise<void> => {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken),
    AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
};

/**
 * Clear all auth tokens (called on logout or session expiry).
 * Mirrors the frontend's sessionStorage.removeItem calls (apiClient.ts L280-L282).
 */
export const clearAuthTokens = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
    AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
  ]);
};

/**
 * Retrieve the current access token (useful for Socket.IO auth).
 * Mirrors: sessionStorage.getItem('accessToken') in socket.ts
 */
export const getAccessToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  if (token && token.startsWith('"') && token.endsWith('"')) {
    return token.slice(1, -1);
  }
  return token;
};

// ─── Socket.IO Base URL ───────────────────────────────────────────────────────

/**
 * The Socket.IO server root (no /api suffix).
 * Mirrors: API_CONFIG.BASE_URL.replace('/api', '') in socket.ts
 */
export const SOCKET_BASE_URL = BASE_URL.replace('/api', ''); 

// ─── Default Export ───────────────────────────────────────────────────────────

export default apiClient;
