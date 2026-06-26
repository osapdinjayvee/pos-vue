/**
 * HTTP Client
 * Uses Axios with interceptors for auth, dynamic base URL, timeout, and retry.
 *
 * On Capacitor 6+, the native runtime automatically patches fetch/XMLHttpRequest
 * to use native HTTP (bypassing CORS). Axios uses XHR under the hood, so it
 * works natively on all platforms without a separate CapacitorHttp client.
 */

import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { DEFAULT_SYNC_CONFIG, getRetryDelay, getApiBaseUrl } from '@/config/sync'

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number
  _maxRetries?: number
}

/**
 * Axios-compatible response shape used by all consumers
 */
interface HttpResponse<T = any> {
  data: T
  status: number
  headers: Record<string, string>
}

/**
 * Axios-compatible client interface
 */
interface HttpClient {
  get<T = any>(url: string, config?: any): Promise<HttpResponse<T>>
  post<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>
  put<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>
  patch<T = any>(url: string, data?: any, config?: any): Promise<HttpResponse<T>>
  delete<T = any>(url: string, config?: any): Promise<HttpResponse<T>>
}

// ─── Axios client (works on all platforms) ───

function createAxiosHttpClient(): HttpClient {
  // Always use fetch adapter — Capacitor patches window.fetch for native HTTP
  // but does NOT reliably patch XMLHttpRequest (Axios default).
  // Using fetch adapter everywhere avoids timing issues where Capacitor isn't
  // initialized yet when this module loads, and works fine on web/Electron too.
  const client: AxiosInstance = axios.create({
    baseURL: DEFAULT_SYNC_CONFIG.apiBaseUrl,
    timeout: DEFAULT_SYNC_CONFIG.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    adapter: 'fetch'
  })

  console.log('[HttpClient] Using Axios with fetch adapter')

  // Request interceptor: inject auth token + dynamic base URL
  client.interceptors.request.use(
    (config) => {
      // Override baseURL per-request so config changes take effect immediately
      config.baseURL = getApiBaseUrl()

      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      const terminalId = localStorage.getItem('terminal_id') || 'POS-001'
      config.headers['X-Terminal-ID'] = terminalId

      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor: retry with exponential backoff
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryConfig | undefined
      if (!config) return Promise.reject(error)

      config._retryCount = config._retryCount || 0
      config._maxRetries = config._maxRetries || DEFAULT_SYNC_CONFIG.maxRetries

      // Don't retry on connection refused
      if (!error.response && error.code === 'ERR_NETWORK') {
        return Promise.reject(error)
      }

      // Don't retry on client errors (4xx) except 408 and 429
      const status = error.response?.status
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return Promise.reject(error)
      }

      if (config._retryCount >= config._maxRetries) {
        return Promise.reject(error)
      }

      config._retryCount += 1

      const delay = getRetryDelay(config._retryCount - 1)
      console.log(
        `[HttpClient] Retry ${config._retryCount}/${config._maxRetries} after ${delay}ms for ${config.url}`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return client(config)
    }
  )

  return client as unknown as HttpClient
}

export const httpClient = createAxiosHttpClient()

/**
 * Update the auth token (call after login/refresh)
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

/**
 * Clear the auth token (call on logout)
 */
export function clearAuthToken(): void {
  localStorage.removeItem('auth_token')
}

/**
 * Update the terminal ID
 */
export function setTerminalId(terminalId: string): void {
  localStorage.setItem('terminal_id', terminalId)
}

export default httpClient
