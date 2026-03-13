/**
 * Sync Configuration
 * Default settings for cloud sync behavior
 */

import type { SyncConfig } from '@/types/sync'

const API_URL_STORAGE_KEY = 'pos_api_base_url'

/**
 * Get the configured API base URL.
 * Priority: localStorage > env var > default
 */
export function getApiBaseUrl(): string {
  return localStorage.getItem(API_URL_STORAGE_KEY)
    || import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api')
}

/**
 * Set the API base URL (persisted to localStorage)
 */
export function setApiBaseUrl(url: string): void {
  const trimmed = url.replace(/\/+$/, '') // strip trailing slashes
  localStorage.setItem(API_URL_STORAGE_KEY, trimmed)
  // Update the live config so new requests pick it up immediately
  DEFAULT_SYNC_CONFIG.apiBaseUrl = trimmed
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  /** Base URL for the sync API */
  apiBaseUrl: getApiBaseUrl(),

  /** Sync interval in milliseconds (default: 30 seconds) */
  syncInterval: 30_000,

  /** Number of items to sync per batch */
  batchSize: 50,

  /** Maximum retry attempts before marking as failed */
  maxRetries: 5,

  /** Initial retry delay in milliseconds (1 second) */
  initialRetryDelay: 1_000,

  /** Maximum retry delay in milliseconds (5 minutes) */
  maxRetryDelay: 300_000,

  /** Backoff multiplier for exponential retry */
  backoffMultiplier: 2,

  /** HTTP request timeout in milliseconds (30 seconds) */
  requestTimeout: 30_000
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(
  attempt: number,
  config: SyncConfig = DEFAULT_SYNC_CONFIG
): number {
  const delay = config.initialRetryDelay * Math.pow(config.backoffMultiplier, attempt)
  return Math.min(delay, config.maxRetryDelay)
}

/**
 * Check if an item has exceeded max retries
 */
export function hasExceededMaxRetries(
  attempts: number,
  config: SyncConfig = DEFAULT_SYNC_CONFIG
): boolean {
  return attempts >= config.maxRetries
}

/** Sync queue cleanup thresholds */
export const SYNC_CLEANUP = {
  /** Days to keep completed sync queue entries */
  completedRetentionDays: 7,

  /** Days to keep sync log entries */
  logRetentionDays: 90
}

/** Sync entity type priorities (higher = more urgent) */
export const SYNC_PRIORITIES: Record<string, number> = {
  transaction: 10,
  void: 9,
  refund: 8,
  stock_movement: 5
}
