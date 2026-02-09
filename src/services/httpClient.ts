/**
 * HTTP Client
 * Platform-aware HTTP client:
 * - Web/Electron: Axios with interceptors for auth, timeout, and retry
 * - Capacitor native: CapacitorHttp (bypasses CORS, uses native networking)
 *
 * Both expose the same Axios-compatible interface: .get(), .post(), .put(), .patch(), .delete()
 */

import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { DEFAULT_SYNC_CONFIG, getRetryDelay } from '@/config/sync'
import { detectPlatform } from '@/db/platform'

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

// ─── Auth helpers (shared across both implementations) ───

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  const token = localStorage.getItem('auth_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const terminalId = localStorage.getItem('terminal_id') || 'POS-001'
  headers['X-Terminal-ID'] = terminalId

  return headers
}

// ─── Capacitor native HTTP client ───

function createCapacitorHttpClient(): HttpClient {
  // Lazy import — only resolved on native platforms
  const getCapacitorHttp = async () => {
    const { CapacitorHttp } = await import('@capacitor/core')
    return CapacitorHttp
  }

  const baseUrl = DEFAULT_SYNC_CONFIG.apiBaseUrl

  async function request<T>(
    method: string,
    url: string,
    data?: any,
    retryCount = 0
  ): Promise<HttpResponse<T>> {
    const CapHttp = await getCapacitorHttp()
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

    try {
      const response = await CapHttp.request({
        method,
        url: fullUrl,
        headers: getAuthHeaders(),
        data: data ?? undefined,
        connectTimeout: DEFAULT_SYNC_CONFIG.requestTimeout,
        readTimeout: DEFAULT_SYNC_CONFIG.requestTimeout
      })

      // Throw on server errors (5xx) and retryable 4xx
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        const maxRetries = DEFAULT_SYNC_CONFIG.maxRetries
        if (retryCount < maxRetries) {
          const delay = getRetryDelay(retryCount)
          console.log(
            `[HttpClient:Capacitor] Retry ${retryCount + 1}/${maxRetries} after ${delay}ms for ${url}`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          return request<T>(method, url, data, retryCount + 1)
        }
      }

      // Throw on non-retryable client errors
      if (response.status >= 400) {
        const err: any = new Error(`HTTP ${response.status}`)
        err.response = { status: response.status, data: response.data }
        throw err
      }

      return {
        data: response.data as T,
        status: response.status,
        headers: response.headers
      }
    } catch (err: any) {
      // If already wrapped with .response, re-throw
      if (err.response) throw err

      // Network-level error — retry if applicable
      const maxRetries = DEFAULT_SYNC_CONFIG.maxRetries
      if (retryCount < maxRetries) {
        const delay = getRetryDelay(retryCount)
        console.log(
          `[HttpClient:Capacitor] Network error, retry ${retryCount + 1}/${maxRetries} after ${delay}ms for ${url}`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return request<T>(method, url, data, retryCount + 1)
      }

      throw err
    }
  }

  return {
    get: <T>(url: string) => request<T>('GET', url),
    post: <T>(url: string, data?: any) => request<T>('POST', url, data),
    put: <T>(url: string, data?: any) => request<T>('PUT', url, data),
    patch: <T>(url: string, data?: any) => request<T>('PATCH', url, data),
    delete: <T>(url: string) => request<T>('DELETE', url)
  }
}

// ─── Web/Electron Axios client ───

function createAxiosHttpClient(): HttpClient {
  const client: AxiosInstance = axios.create({
    baseURL: DEFAULT_SYNC_CONFIG.apiBaseUrl,
    timeout: DEFAULT_SYNC_CONFIG.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  // Request interceptor: inject auth token
  client.interceptors.request.use(
    (config) => {
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
        `[HttpClient:Axios] Retry ${config._retryCount}/${config._maxRetries} after ${delay}ms for ${config.url}`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return client(config)
    }
  )

  return client as unknown as HttpClient
}

// ─── Factory: pick implementation based on platform ───

function createHttpClient(): HttpClient {
  const platform = detectPlatform()

  if (platform === 'capacitor') {
    console.log('[HttpClient] Using CapacitorHttp (native networking)')
    return createCapacitorHttpClient()
  }

  console.log('[HttpClient] Using Axios (web/electron)')
  return createAxiosHttpClient()
}

export const httpClient = createHttpClient()

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
