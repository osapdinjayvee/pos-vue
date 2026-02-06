/**
 * useConflictResolution Composable
 * Provides reactive conflict data and resolution actions
 */

import { ref, readonly } from 'vue'
import { conflictLogRepository } from '@/repositories/conflictLogRepository'
import { conflictService } from '@/services/conflictService'
import type { ConflictLog, ConflictDetail, ConflictStats, ConflictResolutionType } from '@/types/conflict'

export function useConflictResolution() {
  const conflicts = ref<ConflictLog[]>([])
  const unresolvedConflicts = ref<ConflictLog[]>([])
  const selectedConflict = ref<ConflictDetail | null>(null)
  const stats = ref<ConflictStats>({
    total: 0,
    unresolved: 0,
    resolvedByLocal: 0,
    resolvedByServer: 0,
    resolvedManually: 0
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load all conflicts
   */
  async function loadConflicts(limit?: number): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      conflicts.value = await conflictLogRepository.getRecent(limit || 100)
      unresolvedConflicts.value = await conflictLogRepository.findUnresolved()
      stats.value = await conflictService.getConflictStats()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load conflicts'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * View conflict details
   */
  function viewConflictDetails(conflict: ConflictLog): void {
    selectedConflict.value = conflictService.getConflictDetails(conflict)
  }

  /**
   * Resolve a conflict manually
   */
  async function resolveManually(
    conflictId: string,
    resolution: ConflictResolutionType,
    resolvedBy: string
  ): Promise<void> {
    try {
      await conflictService.resolveManually(conflictId, resolution, resolvedBy)
      await loadConflicts()
      selectedConflict.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to resolve conflict'
    }
  }

  /**
   * Clear selection
   */
  function clearSelection(): void {
    selectedConflict.value = null
  }

  return {
    conflicts: readonly(conflicts),
    unresolvedConflicts: readonly(unresolvedConflicts),
    selectedConflict: readonly(selectedConflict),
    stats: readonly(stats),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadConflicts,
    viewConflictDetails,
    resolveManually,
    clearSelection
  }
}

export default useConflictResolution
