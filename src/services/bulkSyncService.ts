/**
 * Bulk Sync Service
 * Handles large-scale sync operations with progress tracking, non-blocking processing, and resume capability
 */

import { syncService } from '@/services/syncService'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'
import type { BulkSyncProgress, SyncError } from '@/types/sync'

/**
 * Process all pending sync items in batches with progress tracking
 */
async function processBulkSync(
  onProgress: (progress: BulkSyncProgress) => void
): Promise<BulkSyncProgress> {
  const startedAt = new Date().toISOString()
  const pendingCount = await syncQueueRepository.getPendingCount()
  const batchSize = DEFAULT_SYNC_CONFIG.batchSize
  const totalBatches = Math.ceil(pendingCount / batchSize)

  const progress: BulkSyncProgress = {
    total: pendingCount,
    processed: 0,
    successful: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches,
    estimatedTimeRemaining: 0,
    errors: [],
    startedAt,
    isResuming: false
  }

  onProgress({ ...progress })

  const batchDurations: number[] = []

  while (progress.processed < progress.total) {
    progress.currentBatch++
    const batchStart = Date.now()

    const result = await syncService.processBatch()

    const batchDuration = Date.now() - batchStart
    batchDurations.push(batchDuration)

    progress.processed += result.synced + result.failed
    progress.successful += result.synced
    progress.failed += result.failed

    for (const error of result.errors) {
      if (progress.errors.length < 50) {
        progress.errors.push(error)
      }
    }

    // Calculate estimated time remaining
    const avgBatchDuration =
      batchDurations.reduce((a, b) => a + b, 0) / batchDurations.length
    const remainingBatches = Math.max(0, totalBatches - progress.currentBatch)
    progress.estimatedTimeRemaining = Math.round(avgBatchDuration * remainingBatches)

    onProgress({ ...progress })

    // If no items were processed this batch, we're done
    if (result.synced === 0 && result.failed === 0) break

    // Yield to UI thread between batches
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return progress
}

/**
 * Resume sync from the last successfully synced item
 */
async function resumeSync(
  fromItemId: string,
  onProgress: (progress: BulkSyncProgress) => void
): Promise<BulkSyncProgress> {
  const startedAt = new Date().toISOString()
  const pendingCount = await syncQueueRepository.getPendingCount()
  const batchSize = DEFAULT_SYNC_CONFIG.batchSize
  const totalBatches = Math.ceil(pendingCount / batchSize)

  const progress: BulkSyncProgress = {
    total: pendingCount,
    processed: 0,
    successful: 0,
    failed: 0,
    currentBatch: 0,
    totalBatches,
    estimatedTimeRemaining: 0,
    errors: [],
    startedAt,
    isResuming: true
  }

  onProgress({ ...progress })

  const batchDurations: number[] = []

  while (progress.processed < progress.total) {
    progress.currentBatch++
    const batchStart = Date.now()

    const result = await syncService.processBatch()

    const batchDuration = Date.now() - batchStart
    batchDurations.push(batchDuration)

    progress.processed += result.synced + result.failed
    progress.successful += result.synced
    progress.failed += result.failed

    for (const error of result.errors) {
      if (progress.errors.length < 50) {
        progress.errors.push(error)
      }
    }

    const avgBatchDuration =
      batchDurations.reduce((a, b) => a + b, 0) / batchDurations.length
    const remainingBatches = Math.max(0, totalBatches - progress.currentBatch)
    progress.estimatedTimeRemaining = Math.round(avgBatchDuration * remainingBatches)

    // After first batch completes, no longer "resuming"
    progress.isResuming = false

    onProgress({ ...progress })

    if (result.synced === 0 && result.failed === 0) break

    // Yield to UI thread
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return progress
}

/**
 * Get the resume point - last successfully synced upload item
 */
async function getResumePoint(): Promise<{ entityId: string; syncedAt: string } | null> {
  const logs = await syncLogRepository.findAll({
    direction: 'upload',
    result: 'success',
    limit: 1
  })

  if (logs.length === 0) return null

  return {
    entityId: logs[0]!.entity_id,
    syncedAt: logs[0]!.synced_at
  }
}

/**
 * Validate queue integrity - check for corrupt payloads
 */
async function validateQueueIntegrity(): Promise<{
  valid: number
  corrupt: number
  corrupted: string[]
}> {
  const pending = await syncQueueRepository.getPending()
  let valid = 0
  let corrupt = 0
  const corrupted: string[] = []

  for (const item of pending) {
    try {
      JSON.parse(item.payload)
      if (!item.entity_id || !item.entity_type) {
        throw new Error('Missing entity_id or entity_type')
      }
      valid++
    } catch {
      corrupt++
      corrupted.push(item.id)
      await syncQueueRepository.updateStatus(item.id, 'failed', 'corrupt_payload')
    }
  }

  return { valid, corrupt, corrupted }
}

export const bulkSyncService = {
  processBulkSync,
  resumeSync,
  getResumePoint,
  validateQueueIntegrity
}

export default bulkSyncService
