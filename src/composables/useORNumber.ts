// useORNumber composable - Provides OR number management for POS
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useORSeriesStore } from '@/stores/orSeries'
import { orAllocationService } from '@/services/orAllocationService'
import { connectivityService } from '@/services/connectivityService'
import {
  formatORNumber,
  parseORNumber,
  isValidORNumber,
  getSeriesStatus,
  getRemainingCapacity,
  previewNextORNumber
} from '@/utils/orGenerator'
import type { ORSeries, DisplayORSeries } from '@/types/receipt'
import type { ORAllocation } from '@/types/sync'

export function useORNumber() {
  const orSeriesStore = useORSeriesStore()
  const {
    series,
    activeSeries,
    displaySeries,
    activeDisplaySeries,
    hasActiveSeries,
    lowSeries,
    criticalSeries,
    exhaustedSeries,
    isLoading,
    error
  } = storeToRefs(orSeriesStore)

  // Server allocation state
  const serverAllocation = ref<(ORAllocation & { remaining: number; usagePercent: number }) | null>(null)
  const isRequestingAllocation = ref(false)

  // Get next OR number preview
  const nextORNumberPreview = computed(() => {
    if (!activeSeries.value) return null
    return previewNextORNumber(activeSeries.value)
  })

  // Get active series status
  const activeSeriesStatus = computed(() => {
    if (!activeSeries.value) return null
    return getSeriesStatus(activeSeries.value)
  })

  // Check if series is low
  const isSeriesLow = computed(() =>
    activeSeriesStatus.value?.isLow || false
  )

  // Check if series is critical
  const isSeriesCritical = computed(() =>
    activeSeriesStatus.value?.isCritical || false
  )

  // Check if series is exhausted
  const isSeriesExhausted = computed(() =>
    activeSeriesStatus.value?.isExhausted || false
  )

  // Get remaining capacity
  const remainingCapacity = computed(() => {
    if (!activeSeries.value) return 0
    return getRemainingCapacity(activeSeries.value)
  })

  // Server allocation computed properties
  const hasServerAllocation = computed(() => serverAllocation.value !== null && serverAllocation.value.remaining > 0)

  const serverAllocationRemaining = computed(() => serverAllocation.value?.remaining ?? 0)

  // Load all series
  async function loadAllSeries(): Promise<void> {
    await orSeriesStore.loadAllSeries()
  }

  // Load active series
  async function loadActiveSeries(): Promise<void> {
    await orSeriesStore.loadActiveSeries()
  }

  // Set context (branch/terminal)
  function setContext(branchId: string, terminalId?: string): void {
    orSeriesStore.setContext(branchId, terminalId)
  }

  // Create new series
  async function createSeries(data: {
    branchId: string
    terminalId: string
    prefix: string
    branchCode: string
    startNumber: number
    endNumber: number
    ptuNumber: string
    ptuValidUntil: string
    machineSerial: string
    minNumber: string
    isActive?: boolean
  }): Promise<ORSeries | null> {
    return await orSeriesStore.createSeries({
      branch_id: data.branchId,
      terminal_id: data.terminalId,
      prefix: data.prefix,
      branch_code: data.branchCode,
      start_number: data.startNumber,
      end_number: data.endNumber,
      ptu_number: data.ptuNumber,
      ptu_valid_until: data.ptuValidUntil,
      machine_serial: data.machineSerial,
      min_number: data.minNumber,
      is_active: data.isActive
    })
  }

  // Activate series
  async function activateSeries(seriesId: string): Promise<boolean> {
    return await orSeriesStore.activateSeries(seriesId)
  }

  // Deactivate series
  async function deactivateSeries(seriesId: string): Promise<boolean> {
    return await orSeriesStore.deactivateSeries(seriesId)
  }

  /**
   * Request a new OR range allocation from the server
   * Called when series is running low and terminal is online
   */
  async function requestServerAllocation(): Promise<ORAllocation | null> {
    if (isRequestingAllocation.value) return null
    if (!connectivityService.isOnline.value) return null

    const terminalId = orSeriesStore.currentTerminalId || 'terminal_001'
    const branchId = orSeriesStore.currentBranchId || 'branch_main'
    const prefix = activeSeries.value?.prefix || 'OR'

    isRequestingAllocation.value = true
    try {
      const allocation = await orAllocationService.requestNewRange(terminalId, prefix, branchId)
      if (allocation) {
        // Refresh server allocation status
        await refreshServerAllocation()
      }
      return allocation
    } catch (e) {
      console.error('[useORNumber] Failed to request server allocation:', e)
      return null
    } finally {
      isRequestingAllocation.value = false
    }
  }

  /**
   * Refresh the server allocation status from the local database
   */
  async function refreshServerAllocation(): Promise<void> {
    const terminalId = orSeriesStore.currentTerminalId || 'terminal_001'
    try {
      serverAllocation.value = await orAllocationService.getActiveAllocation(terminalId)
    } catch (e) {
      console.error('[useORNumber] Failed to refresh server allocation:', e)
    }
  }

  // Get next OR number (consumes one from series)
  // Enhanced: triggers background allocation when < 20% remaining
  async function getNextORNumber(): Promise<{
    seriesId: string
    orNumber: string
    warning?: string
  } | { error: string } | null> {
    const result = await orSeriesStore.getNextORNumber()

    if (result) {
      // After successful OR generation, check remaining capacity
      // If < 20% remaining and online, trigger background allocation (non-blocking)
      if (activeSeries.value) {
        const status = getSeriesStatus(activeSeries.value)
        if (status.usagePercentage >= 80 && connectivityService.isOnline.value) {
          // Non-blocking background allocation request
          requestServerAllocation().catch(e =>
            console.error('[useORNumber] Background allocation request failed:', e)
          )
        }
      }
      return result
    }

    // Series exhausted - check if server allocation is available
    if (isSeriesExhausted.value) {
      // If online, attempt to request a new allocation
      if (connectivityService.isOnline.value) {
        const allocation = await requestServerAllocation()
        if (allocation) {
          // Retry getting OR number after new allocation
          // The new allocation may need to be activated as a new series
          return { error: 'OR_EXHAUSTED_ALLOCATION_RECEIVED' }
        }
      }
      return { error: 'OR number range exhausted. Please connect to the server to allocate a new range. Sales cannot be processed without a valid OR number.' }
    }

    return result
  }

  // Check status
  async function checkStatus(): Promise<{
    hasActiveSeries: boolean
    warning?: string
    remaining?: number
  }> {
    return await orSeriesStore.checkActiveSeriesStatus()
  }

  // Format OR number
  function format(prefix: string, branchCode: string, number: number): string {
    return formatORNumber(prefix, branchCode, number)
  }

  // Parse OR number
  function parse(orNumber: string) {
    return parseORNumber(orNumber)
  }

  // Validate OR number
  function validate(orNumber: string): boolean {
    return isValidORNumber(orNumber)
  }

  // Find series by ID
  function findSeries(id: string): ORSeries | undefined {
    return orSeriesStore.findSeriesById(id)
  }

  // Clear error
  function clearError(): void {
    orSeriesStore.clearError()
  }

  return {
    // State (reactive refs)
    series,
    activeSeries,
    displaySeries,
    activeDisplaySeries,
    hasActiveSeries,
    lowSeries,
    criticalSeries,
    exhaustedSeries,
    isLoading,
    error,

    // Computed
    nextORNumberPreview,
    activeSeriesStatus,
    isSeriesLow,
    isSeriesCritical,
    isSeriesExhausted,
    remainingCapacity,
    hasServerAllocation,
    serverAllocationRemaining,

    // Server allocation state
    serverAllocation,
    isRequestingAllocation,

    // Actions
    loadAllSeries,
    loadActiveSeries,
    setContext,
    createSeries,
    activateSeries,
    deactivateSeries,
    getNextORNumber,
    checkStatus,
    requestServerAllocation,
    refreshServerAllocation,

    // Utilities
    format,
    parse,
    validate,
    findSeries,
    clearError
  }
}

export default useORNumber
