/**
 * useSync Composable
 * Provides sync control and status for Vue components
 */

import { ref, readonly, computed } from 'vue'
import { syncService } from '@/services/syncService'
import { transactionSyncService } from '@/services/transactionSyncService'
import { inventorySyncService } from '@/services/inventorySyncService'
import { connectivityService } from '@/services/connectivityService'
import { bulkSyncService } from '@/services/bulkSyncService'
import { syncHealthService } from '@/services/syncHealthService'
import { orAllocationService } from '@/services/orAllocationService'
import { useSyncStore } from '@/stores/sync'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'
import type { SyncResult, BulkSyncProgress } from '@/types/sync'
import type { InventoryDiscrepancy } from '@/services/inventorySyncService'

let initialized = false
let unsubOnlineResume: (() => void) | null = null

export function useSync() {
  const syncStore = useSyncStore()
  const syncProgress = ref(0)
  const lastResult = ref<SyncResult | null>(null)
  const bulkProgress = ref<BulkSyncProgress | null>(null)
  const isResuming = ref(false)
  const inventoryDiscrepancies = ref<InventoryDiscrepancy[]>([])
  const showInventoryAlert = ref(false)

  const isBulkSyncing = computed(() => {
    return bulkProgress.value !== null
      && bulkProgress.value.processed < bulkProgress.value.total
  })

  /**
   * Initialize the sync system
   * Should be called once on app startup
   */
  function initializeSync(): void {
    if (initialized) return

    // Initialize connectivity monitoring
    connectivityService.initialize()

    // Register entity sync handlers
    transactionSyncService.register()
    inventorySyncService.register()

    // Start auto-sync loop
    syncService.startSync()

    // Refresh status periodically
    syncStore.refreshStatus()

    // Register onOnline callback for sync resume (T017) and OR allocation check (T027)
    unsubOnlineResume = connectivityService.onOnline(async () => {
      console.log('[useSync] Connection restored — checking for pending items')
      try {
        await syncStore.refreshStatus()
        const pendingCount = syncStore.pendingCount
        if (pendingCount > 0) {
          const resumePoint = await bulkSyncService.getResumePoint()
          if (resumePoint) {
            console.log(`[useSync] Resuming sync from ${resumePoint.entityId}, ${pendingCount} items pending`)
            // Note: toast must be shown by the component that uses this composable
            // We set isResuming so the UI can react
            await resumeInterruptedSync(resumePoint.entityId, pendingCount)
          } else if (pendingCount > DEFAULT_SYNC_CONFIG.batchSize) {
            console.log(`[useSync] No resume point, triggering bulk sync for ${pendingCount} items`)
            await triggerBulkSync()
          }
          // For small pending counts, the regular auto-sync loop handles it
        }

        // Check OR allocation status when coming back online (T027)
        checkORAllocationAfterSync().catch((e) => {
          console.error('[useSync] OR allocation check on reconnect failed:', e)
        })
      } catch (e) {
        console.error('[useSync] Error resuming sync on connectivity restore:', e)
      }
    })

    // Start heartbeat loop for sync health monitoring (T037)
    const terminalId = localStorage.getItem('terminal_id') || 'POS-001'
    syncHealthService.startHeartbeatLoop(terminalId)

    // Check if there are many pending items on startup and auto-trigger bulk sync
    checkAndAutoTriggerBulkSync()

    // Start EIS auto-processing if enabled (non-blocking)
    import('@/composables/useEIS').then(({ useEIS }) => {
      const eis = useEIS()
      eis.loadDashboard().then(() => {
        if (eis.isEnabled.value) {
          eis.startAutoProcess()
          console.log('[useSync] EIS auto-processing started')
        }
      }).catch((e) => {
        console.error('[useSync] EIS initialization failed:', e)
      })
    }).catch(() => { /* EIS module not available yet */ })

    initialized = true
    console.log('[useSync] Sync system initialized')
  }

  /**
   * Check for large pending queue and auto-trigger bulk sync
   */
  async function checkAndAutoTriggerBulkSync(): Promise<void> {
    try {
      await syncStore.refreshStatus()
      const pendingCount = syncStore.pendingCount
      if (pendingCount > DEFAULT_SYNC_CONFIG.batchSize && connectivityService.isOnline.value) {
        console.log(`[useSync] ${pendingCount} pending items detected on init, auto-triggering bulk sync`)
        await triggerBulkSync()
      }
    } catch (e) {
      console.error('[useSync] Error checking for auto bulk sync:', e)
    }
  }

  /**
   * Stop the sync system
   */
  function destroySync(): void {
    syncService.stopSync()
    connectivityService.destroy()
    syncHealthService.stopHeartbeatLoop()
    if (unsubOnlineResume) {
      unsubOnlineResume()
      unsubOnlineResume = null
    }
    // Stop EIS auto-processing (non-blocking)
    import('@/composables/useEIS').then(({ useEIS }) => {
      useEIS().stopAutoProcess()
    }).catch(() => { /* EIS module not available */ })
    initialized = false
  }

  /**
   * Trigger an immediate manual sync
   */
  async function triggerManualSync(): Promise<SyncResult | null> {
    syncStore.setSyncing(true)

    try {
      const result = await syncService.triggerManualSync()
      lastResult.value = result

      if (result) {
        syncStore.updateAfterSync(result.success)
      }

      await syncStore.refreshStatus()

      // Run inventory reconciliation after sync completes
      if (result && result.success) {
        runInventoryReconciliation().catch((e) => {
          console.error('[useSync] Post-sync inventory reconciliation failed:', e)
        })
      }

      // Check OR allocation after sync (T027)
      if (result && connectivityService.isOnline.value) {
        checkORAllocationAfterSync().catch((e) => {
          console.error('[useSync] Post-sync OR allocation check failed:', e)
        })
      }

      return result
    } catch (e) {
      syncStore.updateAfterSync(false)
      throw e
    }
  }

  /**
   * Trigger a bulk sync for large queues
   * Uses bulkSyncService with progress tracking
   */
  async function triggerBulkSync(): Promise<BulkSyncProgress | null> {
    if (isBulkSyncing.value || !connectivityService.isOnline.value) {
      return null
    }

    syncStore.setSyncing(true)

    try {
      const result = await bulkSyncService.processBulkSync((progress) => {
        bulkProgress.value = { ...progress }
        syncProgress.value = progress.total > 0
          ? Math.round((progress.processed / progress.total) * 100)
          : 0
      })

      bulkProgress.value = { ...result }
      syncStore.updateAfterSync(result.failed === 0)
      await syncStore.refreshStatus()

      // Run inventory reconciliation after bulk sync completes
      if (result.failed === 0 || result.successful > 0) {
        runInventoryReconciliation().catch((e) => {
          console.error('[useSync] Post-bulk-sync inventory reconciliation failed:', e)
        })
      }

      // Check OR allocation after bulk sync (T027)
      if (connectivityService.isOnline.value) {
        checkORAllocationAfterSync().catch((e) => {
          console.error('[useSync] Post-bulk-sync OR allocation check failed:', e)
        })
      }

      return result
    } catch (e) {
      syncStore.updateAfterSync(false)
      console.error('[useSync] Bulk sync failed:', e)
      throw e
    }
  }

  /**
   * Resume an interrupted sync from a specific point
   */
  async function resumeInterruptedSync(
    fromItemId?: string,
    pendingCount?: number
  ): Promise<BulkSyncProgress | null> {
    if (isBulkSyncing.value || !connectivityService.isOnline.value) {
      return null
    }

    isResuming.value = true
    syncStore.setSyncing(true)

    try {
      const resumeId = fromItemId || ''
      const result = await bulkSyncService.resumeSync(resumeId, (progress) => {
        bulkProgress.value = { ...progress }
        syncProgress.value = progress.total > 0
          ? Math.round((progress.processed / progress.total) * 100)
          : 0
        // Clear resuming flag after first batch completes
        if (!progress.isResuming) {
          isResuming.value = false
        }
      })

      bulkProgress.value = { ...result }
      isResuming.value = false
      syncStore.updateAfterSync(result.failed === 0)
      await syncStore.refreshStatus()
      return result
    } catch (e) {
      isResuming.value = false
      syncStore.updateAfterSync(false)
      console.error('[useSync] Resume sync failed:', e)
      throw e
    }
  }

  /**
   * Run inventory reconciliation after sync.
   * Compares local vs server inventory and stores discrepancies.
   */
  async function runInventoryReconciliation(): Promise<InventoryDiscrepancy[]> {
    try {
      const discrepancies = await inventorySyncService.reconcileAfterSync()
      inventoryDiscrepancies.value = discrepancies
      showInventoryAlert.value = discrepancies.length > 0

      if (discrepancies.length > 0) {
        const negativeCount = discrepancies.filter((d) => d.is_negative).length
        if (negativeCount > 0) {
          console.warn(`[useSync] ${negativeCount} products with negative stock detected after reconciliation`)
        }
      }

      return discrepancies
    } catch (e) {
      console.error('[useSync] Inventory reconciliation failed:', e)
      return []
    }
  }

  /**
   * Dismiss the inventory reconciliation alert
   */
  function dismissInventoryAlert(): void {
    showInventoryAlert.value = false
  }

  /**
   * Clear inventory discrepancies
   */
  function clearInventoryDiscrepancies(): void {
    inventoryDiscrepancies.value = []
    showInventoryAlert.value = false
  }

  /**
   * Clear bulk sync progress (dismiss the progress display)
   */
  function clearBulkProgress(): void {
    bulkProgress.value = null
    syncProgress.value = 0
  }

  /**
   * Check OR allocation status after sync or on reconnect (T027).
   * Requests new range if allocation is running low.
   */
  async function checkORAllocationAfterSync(): Promise<void> {
    const terminalId = localStorage.getItem('terminal_id') || 'POS-001'
    try {
      await orAllocationService.checkAndRequestRange(terminalId)
      console.log('[useSync] OR allocation check completed')
    } catch (e) {
      console.error('[useSync] OR allocation check failed:', e)
    }
  }

  /**
   * Refresh sync status from database
   */
  async function refreshStatus(): Promise<void> {
    await syncStore.refreshStatus()
  }

  return {
    // State from store
    isSyncing: syncService.isSyncing,
    isOnline: connectivityService.isOnline,
    lastSyncAt: syncService.lastSyncAt,
    syncErrors: syncService.syncErrors,
    pendingCount: syncStore.pendingCount,
    syncProgress: readonly(syncProgress),
    lastResult: readonly(lastResult),

    // Bulk sync state
    bulkProgress: readonly(bulkProgress),
    isBulkSyncing,
    isResuming: readonly(isResuming),

    // Inventory reconciliation state
    inventoryDiscrepancies: readonly(inventoryDiscrepancies),
    showInventoryAlert: readonly(showInventoryAlert),

    // Actions
    initializeSync,
    destroySync,
    triggerManualSync,
    triggerBulkSync,
    resumeInterruptedSync,
    clearBulkProgress,
    runInventoryReconciliation,
    dismissInventoryAlert,
    clearInventoryDiscrepancies,
    refreshStatus
  }
}

export default useSync
