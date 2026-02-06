/**
 * Sync Service Orchestrator
 * Manages the sync loop: processes queue in batches, triggers on interval and connectivity changes
 */

import { ref, readonly, computed } from 'vue'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { connectivityService } from '@/services/connectivityService'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'
import { hasExceededMaxRetries } from '@/config/sync'
import type { SyncQueue, SyncQueueInput, SyncResult, SyncEntityType } from '@/types/sync'
import db from '@/db/database'

type EntitySyncHandler = (items: SyncQueue[]) => Promise<SyncEntitySyncResult[]>

interface SyncEntitySyncResult {
  id: string
  success: boolean
  error?: string
}

const isSyncing = ref(false)
const lastSyncAt = ref<string | null>(null)
const syncErrors = ref<string[]>([])
const clockDriftMs = ref(0)

const significantClockDrift = computed(() => Math.abs(clockDriftMs.value) > 60000)

let syncInterval: ReturnType<typeof setInterval> | null = null
let unsubOnline: (() => void) | null = null
const entityHandlers = new Map<SyncEntityType, EntitySyncHandler>()

/**
 * Register a sync handler for an entity type
 * Each sync service (transaction, catalog, inventory) registers its handler
 */
function registerHandler(entityType: SyncEntityType, handler: EntitySyncHandler): void {
  entityHandlers.set(entityType, handler)
}

/**
 * Enqueue an item for sync
 * Called by transaction/inventory services when new data is created
 */
async function enqueueItem(input: SyncQueueInput): Promise<void> {
  // Check for duplicate (don't double-queue)
  const exists = await syncQueueRepository.existsForEntity(
    input.entity_type,
    input.entity_id
  )

  if (!exists) {
    await syncQueueRepository.create(input)
  }
}

/**
 * Process a batch of pending sync items
 */
async function processBatch(): Promise<SyncResult> {
  const startTime = Date.now()
  let synced = 0
  let failed = 0
  const errors: SyncResult['errors'] = []

  // Get pending items
  const batch = await syncQueueRepository.getBatch(DEFAULT_SYNC_CONFIG.batchSize)

  if (batch.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [], duration_ms: 0 }
  }

  // Group by entity type for batch processing
  const grouped = new Map<SyncEntityType, SyncQueue[]>()
  for (const item of batch) {
    const group = grouped.get(item.entity_type) || []
    group.push(item)
    grouped.set(item.entity_type, group)
  }

  // Mark batch as syncing
  const batchIds = batch.map((item) => item.id)
  await syncQueueRepository.markBatchAsSyncing(batchIds)

  // Process each entity type
  for (const [entityType, items] of grouped) {
    const handler = entityHandlers.get(entityType)

    if (!handler) {
      // No handler registered - mark as failed
      for (const item of items) {
        await syncQueueRepository.incrementAttempts(item.id, `No sync handler for ${entityType}`)
        failed++
        errors.push({
          entity_id: item.entity_id,
          entity_type: item.entity_type,
          error: `No sync handler for ${entityType}`,
          attempts: item.attempts + 1
        })
      }
      continue
    }

    try {
      const results = await handler(items)

      for (const result of results) {
        const item = items.find((i) => i.id === result.id)
        if (!item) continue

        if (result.success) {
          await syncQueueRepository.updateStatus(result.id, 'completed')
          await syncLogRepository.create({
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            operation: item.operation,
            direction: 'upload',
            result: 'success',
            duration_ms: Date.now() - startTime
          })
          synced++
        } else {
          const errorMsg = result.error || 'Unknown sync error'

          if (hasExceededMaxRetries(item.attempts + 1)) {
            await syncQueueRepository.updateStatus(result.id, 'failed', errorMsg)
          } else {
            await syncQueueRepository.incrementAttempts(result.id, errorMsg)
          }

          await syncLogRepository.create({
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            operation: item.operation,
            direction: 'upload',
            result: 'error',
            duration_ms: Date.now() - startTime
          })

          failed++
          errors.push({
            entity_id: item.entity_id,
            entity_type: item.entity_type,
            error: errorMsg,
            attempts: item.attempts + 1
          })
        }
      }
    } catch (e) {
      // Entire batch for this entity type failed
      const errorMsg = e instanceof Error ? e.message : 'Batch sync failed'
      for (const item of items) {
        if (hasExceededMaxRetries(item.attempts + 1)) {
          await syncQueueRepository.updateStatus(item.id, 'failed', errorMsg)
        } else {
          await syncQueueRepository.incrementAttempts(item.id, errorMsg)
        }
        failed++
        errors.push({
          entity_id: item.entity_id,
          entity_type: item.entity_type,
          error: errorMsg,
          attempts: item.attempts + 1
        })
      }
    }
  }

  const duration = Date.now() - startTime

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
    duration_ms: duration
  }
}

/**
 * Run a full sync cycle
 */
async function runSyncCycle(): Promise<SyncResult | null> {
  // Don't sync if already syncing or offline
  if (isSyncing.value || !connectivityService.isOnline.value) {
    return null
  }

  isSyncing.value = true
  syncErrors.value = []

  try {
    const result = await processBatch()

    lastSyncAt.value = new Date().toISOString()

    // Update sync_status table
    try {
      const pendingCount = await syncQueueRepository.getPendingCount()
      const counts = await syncQueueRepository.countByStatus()
      await db.execute(
        `UPDATE sync_status SET last_sync = ?, pending_count = ?, error_count = ?, status = 'idle'
         WHERE terminal_id = ?`,
        [lastSyncAt.value, pendingCount, counts.failed, 'POS-001']
      )
    } catch {
      // Non-critical - status table update failure shouldn't break sync
    }

    if (result.errors.length > 0) {
      syncErrors.value = result.errors.map((e) => `${e.entity_type}/${e.entity_id}: ${e.error}`)
    }

    return result
  } catch (e) {
    console.error('[SyncService] Sync cycle failed:', e)
    syncErrors.value = [e instanceof Error ? e.message : 'Sync cycle failed']
    return null
  } finally {
    isSyncing.value = false
  }
}

/**
 * Start the automatic sync loop
 */
function startSync(intervalMs?: number): void {
  // Stop any existing sync
  stopSync()

  const interval = intervalMs || DEFAULT_SYNC_CONFIG.syncInterval

  // Start periodic sync
  syncInterval = setInterval(() => {
    runSyncCycle().catch((e) => console.error('[SyncService] Periodic sync error:', e))
  }, interval)

  // Also sync immediately when coming back online
  unsubOnline = connectivityService.onOnline(() => {
    console.log('[SyncService] Back online - triggering immediate sync')
    runSyncCycle().catch((e) => console.error('[SyncService] Online trigger sync error:', e))
  })

  console.log(`[SyncService] Auto-sync started (interval: ${interval}ms)`)
}

/**
 * Stop the automatic sync loop
 */
function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  if (unsubOnline) {
    unsubOnline()
    unsubOnline = null
  }
  console.log('[SyncService] Auto-sync stopped')
}

/**
 * Update clock drift based on a server response timestamp.
 * Entity sync handlers should call this when they receive a timestamp from the server.
 */
function updateClockDrift(serverTimestamp: string): void {
  const serverTime = new Date(serverTimestamp).getTime()
  if (isNaN(serverTime)) {
    console.warn('[SyncService] Invalid server timestamp for clock drift detection:', serverTimestamp)
    return
  }

  const drift = Date.now() - serverTime
  clockDriftMs.value = drift

  if (Math.abs(drift) > 60000) {
    console.warn(
      `[SyncService] Significant clock drift detected: ${Math.round(drift / 1000)}s (local is ${drift > 0 ? 'ahead' : 'behind'})`
    )
  }
}

/**
 * Trigger a manual sync (outside the interval)
 */
async function triggerManualSync(): Promise<SyncResult | null> {
  return await runSyncCycle()
}

export const syncService = {
  isSyncing: readonly(isSyncing),
  lastSyncAt: readonly(lastSyncAt),
  syncErrors: readonly(syncErrors),
  clockDriftMs: readonly(clockDriftMs),
  significantClockDrift: significantClockDrift,
  registerHandler,
  enqueueItem,
  processBatch,
  runSyncCycle,
  startSync,
  stopSync,
  triggerManualSync,
  updateClockDrift
}

export default syncService
