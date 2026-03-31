/**
 * src/api/index.ts — Public API surface for the app
 *
 * Import from here everywhere in the app:
 *   import apiClient, { saveAuthTokens, clearAuthTokens } from '@/api';
 *   import { AUTH_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
 */

export { default as apiClient } from './axiosConfig';
export {
  saveAuthTokens,
  clearAuthTokens,
  getAccessToken,
  SOCKET_BASE_URL,
  TOKEN_KEYS,
} from './axiosConfig';

export * from './endpoints';
