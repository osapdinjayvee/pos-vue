/**
 * HTTP Client
 * Axios instance with interceptors for auth, timeout, and retry with exponential backoff
 */

import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { DEFAULT_SYNC_CONFIG, getRetryDelay } from '@/config/sync'

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number
  _maxRetries?: number
}

/**
 * Create the configured Axios instance
 */
function createHttpClient(): AxiosInstance {
  const client = axios.create({
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
      // Get auth token from localStorage (set during login)
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Add terminal ID header
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

      // Initialize retry count
      config._retryCount = config._retryCount || 0
      config._maxRetries = config._maxRetries || DEFAULT_SYNC_CONFIG.maxRetries

      // Don't retry on connection refused (no server running)
      if (!error.response && error.code === 'ERR_NETWORK') {
        return Promise.reject(error)
      }

      // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
      const status = error.response?.status
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return Promise.reject(error)
      }

      // Don't retry if we've exceeded max retries
      if (config._retryCount >= config._maxRetries) {
        return Promise.reject(error)
      }

      config._retryCount += 1

      // Calculate delay with exponential backoff
      const delay = getRetryDelay(config._retryCount - 1)

      console.log(
        `[HttpClient] Retry ${config._retryCount}/${config._maxRetries} after ${delay}ms for ${config.url}`
      )

      // Wait then retry
      await new Promise((resolve) => setTimeout(resolve, delay))
      return client(config)
    }
  )

  return client
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
