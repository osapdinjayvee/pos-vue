/**
 * Sync Configuration
 * Default settings for cloud sync behavior
 */

import type { SyncConfig } from '@/types/sync'

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  /** Base URL for the sync API */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',

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
