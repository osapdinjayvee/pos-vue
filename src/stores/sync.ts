/**
 * Sync Store
 * Pinia store for managing sync state and actions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { conflictLogRepository } from '@/repositories/conflictLogRepository'
import type { SyncQueue, SyncLog, SyncStatus, SyncQueueStatus } from '@/types/sync'
import type { ConflictLog } from '@/types/conflict'

export const useSyncStore = defineStore('sync', () => {
  // State
  const syncStatus = ref<SyncStatus>({
    terminal_id: 'POS-001',
    last_sync: null,
    last_download: null,
    pending_count: 0,
    error_count: 0,
    status: 'idle'
  })

  const pendingItems = ref<SyncQueue[]>([])
  const recentLogs = ref<SyncLog[]>([])
  const unresolvedConflicts = ref<ConflictLog[]>([])
  const isSyncing = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const queueCounts = ref<Record<SyncQueueStatus, number>>({
    pending: 0,
    syncing: 0,
    failed: 0,
    completed: 0
  })

  // Getters
  const pendingCount = computed(() => syncStatus.value.pending_count)
  const errorCount = computed(() => syncStatus.value.error_count)
  const lastSync = computed(() => syncStatus.value.last_sync)
  const lastDownload = computed(() => syncStatus.value.last_download)
  const currentStatus = computed(() => syncStatus.value.status)
  const hasErrors = computed(() => syncStatus.value.error_count > 0)
  const hasPending = computed(() => syncStatus.value.pending_count > 0)
  const unresolvedConflictCount = computed(() => unresolvedConflicts.value.length)

  // Actions

  /**
   * Refresh sync status from the database
   */
  async function refreshStatus(): Promise<void> {
    try {
      const counts = await syncQueueRepository.countByStatus()
      queueCounts.value = counts

      syncStatus.value.pending_count = counts.pending + counts.failed
      syncStatus.value.error_count = counts.failed
    } catch (e) {
      console.error('[SyncStore] Error refreshing status:', e)
    }
  }

  /**
   * Load pending sync items
   */
  async function loadPendingItems(): Promise<void> {
    isLoading.value = true
    try {
      pendingItems.value = await syncQueueRepository.findAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load pending items'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load recent sync logs
   */
  async function loadRecentLogs(limit: number = 50): Promise<void> {
    try {
      recentLogs.value = await syncLogRepository.getRecent(limit)
    } catch (e) {
      console.error('[SyncStore] Error loading logs:', e)
    }
  }

  /**
   * Load unresolved conflicts
   */
  async function loadUnresolvedConflicts(): Promise<void> {
    try {
      unresolvedConflicts.value = await conflictLogRepository.findUnresolved()
    } catch (e) {
      console.error('[SyncStore] Error loading conflicts:', e)
    }
  }

  /**
   * Update sync status after a sync cycle
   */
  function updateAfterSync(success: boolean): void {
    const now = new Date().toISOString()

    if (success) {
      syncStatus.value.last_sync = now
      syncStatus.value.status = 'idle'
    } else {
      syncStatus.value.status = 'error'
    }

    isSyncing.value = false
  }

  /**
   * Update sync status when download completes
   */
  function updateAfterDownload(): void {
    syncStatus.value.last_download = new Date().toISOString()
  }

  /**
   * Mark sync as in progress
   */
  function setSyncing(syncing: boolean): void {
    isSyncing.value = syncing
    syncStatus.value.status = syncing ? 'syncing' : 'idle'
  }

  /**
   * Reset failed items back to pending
   */
  async function retryFailed(ids?: string[]): Promise<number> {
    try {
      const count = await syncQueueRepository.resetFailed(ids)
      await refreshStatus()
      await loadPendingItems()
      return count
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to retry items'
      return 0
    }
  }

  /**
   * Clear completed sync queue items
   */
  async function clearCompleted(): Promise<number> {
    try {
      const count = await syncQueueRepository.clearCompleted()
      await refreshStatus()
      await loadPendingItems()
      return count
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to clear completed items'
      return 0
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    syncStatus,
    pendingItems,
    recentLogs,
    unresolvedConflicts,
    isSyncing,
    isLoading,
    error,
    queueCounts,

    // Getters
    pendingCount,
    errorCount,
    lastSync,
    lastDownload,
    currentStatus,
    hasErrors,
    hasPending,
    unresolvedConflictCount,

    // Actions
    refreshStatus,
    loadPendingItems,
    loadRecentLogs,
    loadUnresolvedConflicts,
    updateAfterSync,
    updateAfterDownload,
    setSyncing,
    retryFailed,
    clearCompleted,
    clearError
  }
})

export default useSyncStore
