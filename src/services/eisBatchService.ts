/**
 * EIS Batch Service
 * Handles batch submission of EIS records to BIR API (via server proxy)
 */

import { eisConfigRepository } from '@/repositories/eisConfigRepository'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import { eisBatchRepository } from '@/repositories/eisBatchRepository'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'
import db from '@/db/database'
import type { EISSubmission, EISSubmissionResult, EISBatchResponse, EISErrorType, EISBatch } from '@/types/eis'

// Exponential backoff delays in seconds: 1min, 5min, 15min, 1hr, 2hr
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]

// Backoff multiplier for BIR downtime
let downtimeBackoffMultiplier = 1

/**
 * Get retry delay based on attempt count
 */
function getRetryDelay(attempts: number): number {
  const index = Math.min(attempts, RETRY_DELAYS.length - 1)
  return RETRY_DELAYS[index]
}

/**
 * Check if a submission should be retried
 */
function shouldRetry(submission: EISSubmission, maxRetries: number): boolean {
  if (submission.attempts >= maxRetries) return false
  if (submission.status !== 'failed') return false

  // Only retry temporary errors
  if (submission.last_error) {
    try {
      const errorData = JSON.parse(submission.last_error)
      if (errorData.errorType && errorData.errorType !== 'temporary') return false
    } catch {
      // Non-JSON error — treat as retryable
    }
  }

  // Check if enough time has elapsed since last attempt
  if (submission.last_attempt) {
    const lastAttempt = new Date(submission.last_attempt).getTime()
    const delayMs = getRetryDelay(submission.attempts) * 1000
    if (Date.now() - lastAttempt < delayMs) return false
  }

  return true
}

/**
 * Submit a batch to BIR API via server proxy
 */
async function submitBatch(submissions: EISSubmission[]): Promise<EISBatchResponse> {
  const config = await eisConfigRepository.getConfig()
  const apiBase = DEFAULT_SYNC_CONFIG.apiBaseUrl

  const payloads = submissions.map((s) => ({
    id: s.id,
    or_number: s.or_number,
    payload: JSON.parse(s.payload)
  }))

  try {
    const response = await fetch(`${apiBase}/eis/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EIS-Environment': config?.environment || 'test',
        'X-EIS-API-Key': config?.api_key || '',
        'X-EIS-API-Secret': config?.api_secret || ''
      },
      body: JSON.stringify({ submissions: payloads }),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const statusCode = response.status
      const errorText = await response.text().catch(() => 'Unknown error')

      // Classify HTTP errors
      if (statusCode >= 500 || statusCode === 408) {
        return {
          batch_id: '',
          results: submissions.map((s) => ({
            or_number: s.or_number,
            success: false,
            error: errorText,
            errorType: 'temporary' as EISErrorType
          }))
        }
      }

      if (statusCode === 400) {
        let fieldErrors: string
        try {
          const parsed = JSON.parse(errorText)
          fieldErrors = JSON.stringify(parsed)
        } catch {
          fieldErrors = errorText
        }
        return {
          batch_id: '',
          results: submissions.map((s) => ({
            or_number: s.or_number,
            success: false,
            error: fieldErrors,
            errorType: 'validation' as EISErrorType
          }))
        }
      }

      if (statusCode === 409) {
        return {
          batch_id: '',
          results: submissions.map((s) => ({
            or_number: s.or_number,
            success: true,
            errorType: 'duplicate' as EISErrorType
          }))
        }
      }

      return {
        batch_id: '',
        results: submissions.map((s) => ({
          or_number: s.or_number,
          success: false,
          error: errorText,
          errorType: 'rejected' as EISErrorType
        }))
      }
    }

    const data: EISBatchResponse = await response.json()
    // Reset downtime backoff on success
    downtimeBackoffMultiplier = 1
    return data
  } catch (error) {
    // Network error or timeout — temporary
    const errorMsg = error instanceof Error ? error.message : 'Network error'
    return {
      batch_id: '',
      results: submissions.map((s) => ({
        or_number: s.or_number,
        success: false,
        error: errorMsg,
        errorType: 'temporary' as EISErrorType
      }))
    }
  }
}

/**
 * Handle individual submission result
 */
async function handleSubmissionResult(
  submission: EISSubmission,
  result: EISSubmissionResult
): Promise<void> {
  if (result.success) {
    await eisSubmissionRepository.markSubmitted(submission.id, result.bir_reference || '')
    return
  }

  const errorType = result.errorType || 'temporary'
  const errorData = JSON.stringify({
    message: result.error || 'Unknown error',
    errorType
  })

  switch (errorType) {
    case 'duplicate':
      // Already submitted — mark as success
      await eisSubmissionRepository.markSubmitted(submission.id, result.bir_reference || 'duplicate')
      break
    case 'validation':
      // Data error — mark rejected for manual review
      await eisSubmissionRepository.markRejected(submission.id, errorData)
      break
    case 'rejected':
      // BIR rejected — mark rejected
      await eisSubmissionRepository.markRejected(submission.id, errorData)
      break
    case 'temporary':
    default:
      // Temporary error — increment attempts for retry
      await eisSubmissionRepository.incrementAttempts(submission.id, errorData)
      break
  }
}

/**
 * Process a batch of pending submissions
 */
async function processPendingBatch(): Promise<{
  batch: EISBatch | null
  successCount: number
  failedCount: number
  alertActive: boolean
  alertMessage: string
}> {
  const config = await eisConfigRepository.getConfig()
  if (!config || !config.is_enabled) {
    return { batch: null, successCount: 0, failedCount: 0, alertActive: false, alertMessage: '' }
  }

  const batchSize = config.batch_size || 100
  const maxRetries = config.max_retries || 5

  // Get pending submissions
  const pending = await eisSubmissionRepository.getBatch(batchSize)

  // Also get retryable failed submissions
  const allFailed = await eisSubmissionRepository.getRetryable(maxRetries)
  const retryable = allFailed.filter((s) => shouldRetry(s, maxRetries))

  const submissions = [...pending, ...retryable]

  if (submissions.length === 0) {
    return { batch: null, successCount: 0, failedCount: 0, alertActive: false, alertMessage: '' }
  }

  // Create batch record
  const now = db.getCurrentTimestamp()
  const batch = await eisBatchRepository.create({
    item_count: submissions.length,
    success_count: 0,
    failed_count: 0,
    status: 'processing',
    submitted_at: now
  } as Omit<EISBatch, 'id' | 'created_at' | 'updated_at'>)

  // Set batch ID on submissions
  await eisSubmissionRepository.setBatchId(
    submissions.map((s) => s.id),
    batch.id
  )

  // Submit batch
  const response = await submitBatch(submissions)

  let successCount = 0
  let failedCount = 0

  // Process results
  for (const submission of submissions) {
    const result = response.results.find((r) => r.or_number === submission.or_number)
    if (result) {
      await handleSubmissionResult(submission, result)
      if (result.success) {
        successCount++
      } else {
        failedCount++
      }
    } else {
      // No result for this submission — treat as temporary failure
      await eisSubmissionRepository.incrementAttempts(
        submission.id,
        JSON.stringify({ message: 'No result in batch response', errorType: 'temporary' })
      )
      failedCount++
    }
  }

  // Update batch record
  await eisBatchRepository.updateCounts(batch.id, successCount, failedCount)
  if (failedCount === 0) {
    await eisBatchRepository.markCompleted(batch.id)
  } else if (successCount > 0) {
    await eisBatchRepository.markPartial(batch.id)
  } else {
    await eisBatchRepository.markCompleted(batch.id)
  }

  // Check for BIR downtime — all temporary failures
  const allTemporary = failedCount > 0 && failedCount === submissions.length &&
    response.results.every((r) => r.errorType === 'temporary')
  if (allTemporary) {
    downtimeBackoffMultiplier = Math.min(downtimeBackoffMultiplier * 2, 12) // Max 1hr (5min * 12)
  }

  // Check failure threshold for alerting
  let alertActive = false
  let alertMessage = ''
  if (failedCount > submissions.length * 0.5) {
    alertActive = true
    alertMessage = `EIS submission failure rate is high — ${failedCount} of ${submissions.length} items failed. Please check BIR connectivity and credentials.`
  }

  return {
    batch: await eisBatchRepository.findById(batch.id),
    successCount,
    failedCount,
    alertActive,
    alertMessage
  }
}

/**
 * Get batch stats for optimization
 */
async function getBatchStats(): Promise<{
  avgItemsPerBatch: number
  avgSuccessRate: number
  avgProcessingTimeMs: number
}> {
  const batches = await eisBatchRepository.getRecent(20)
  if (batches.length === 0) {
    return { avgItemsPerBatch: 0, avgSuccessRate: 0, avgProcessingTimeMs: 0 }
  }

  let totalItems = 0
  let totalSuccess = 0
  let totalDurationMs = 0
  let completedCount = 0

  for (const batch of batches) {
    totalItems += batch.item_count
    totalSuccess += batch.success_count
    if (batch.completed_at && batch.submitted_at) {
      const duration = new Date(batch.completed_at).getTime() - new Date(batch.submitted_at).getTime()
      totalDurationMs += duration
      completedCount++
    }
  }

  return {
    avgItemsPerBatch: Math.round(totalItems / batches.length),
    avgSuccessRate: totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0,
    avgProcessingTimeMs: completedCount > 0 ? Math.round(totalDurationMs / completedCount) : 0
  }
}

/**
 * Get the current downtime backoff multiplier
 */
function getBackoffMultiplier(): number {
  return downtimeBackoffMultiplier
}

/**
 * Reset the backoff multiplier
 */
function resetBackoff(): void {
  downtimeBackoffMultiplier = 1
}

export const eisBatchService = {
  processPendingBatch,
  submitBatch,
  handleSubmissionResult,
  shouldRetry,
  getRetryDelay,
  getBatchStats,
  getBackoffMultiplier,
  resetBackoff
}

export default eisBatchService
