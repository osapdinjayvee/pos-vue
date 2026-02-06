// OR Series Store - State management for Official Receipt number series
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { orSeriesRepository } from '@/repositories/orSeriesRepository'
import type { ORSeries, ORSeriesInput, DisplayORSeries } from '@/types/receipt'
import { toDisplayORSeries } from '@/types/receipt'

export const useORSeriesStore = defineStore('orSeries', () => {
  // State
  const series = ref<ORSeries[]>([])
  const activeSeries = ref<ORSeries | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Current terminal/branch context
  const currentBranchId = ref<string>('branch_main')
  const currentTerminalId = ref<string | null>(null)

  // Getters
  const displaySeries = computed<DisplayORSeries[]>(() =>
    series.value.map(s => toDisplayORSeries(s))
  )

  const activeDisplaySeries = computed<DisplayORSeries | null>(() =>
    activeSeries.value ? toDisplayORSeries(activeSeries.value) : null
  )

  const hasActiveSeries = computed(() => activeSeries.value !== null)

  const lowSeries = computed(() =>
    series.value.filter(s => {
      const totalRange = s.end_number - s.start_number + 1
      const usedCount = s.current_number - s.start_number + 1
      const usagePercentage = (usedCount / totalRange) * 100
      return usagePercentage >= 80 && s.is_active === 1
    })
  )

  const criticalSeries = computed(() =>
    series.value.filter(s => {
      const totalRange = s.end_number - s.start_number + 1
      const usedCount = s.current_number - s.start_number + 1
      const usagePercentage = (usedCount / totalRange) * 100
      return usagePercentage >= 95 && s.is_active === 1
    })
  )

  const exhaustedSeries = computed(() =>
    series.value.filter(s => s.current_number >= s.end_number && s.is_active === 1)
  )

  // Actions
  async function loadAllSeries(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      series.value = await orSeriesRepository.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load OR series'
    } finally {
      isLoading.value = false
    }
  }

  async function loadActiveSeries(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // Try terminal-specific first, then branch
      if (currentTerminalId.value) {
        activeSeries.value = await orSeriesRepository.findActiveByTerminal(currentTerminalId.value)
      }

      if (!activeSeries.value) {
        activeSeries.value = await orSeriesRepository.findActiveByBranch(currentBranchId.value)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load active OR series'
    } finally {
      isLoading.value = false
    }
  }

  async function loadSeriesByBranch(branchId: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      series.value = await orSeriesRepository.findByBranch(branchId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load OR series'
    } finally {
      isLoading.value = false
    }
  }

  async function createSeries(data: ORSeriesInput): Promise<ORSeries | null> {
    isLoading.value = true
    error.value = null

    try {
      const newSeries = await orSeriesRepository.createSeries(data)
      series.value.push(newSeries)

      // If this is the first active series, set it as active
      if (newSeries.is_active === 1 && !activeSeries.value) {
        activeSeries.value = newSeries
      }

      return newSeries
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create OR series'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function activateSeries(seriesId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // Deactivate current active series first
      if (activeSeries.value) {
        await orSeriesRepository.deactivate(activeSeries.value.id)
        const oldIndex = series.value.findIndex(s => s.id === activeSeries.value!.id)
        const oldItem = series.value[oldIndex]
        if (oldIndex >= 0 && oldItem) {
          oldItem.is_active = 0
        }
      }

      // Activate new series
      const success = await orSeriesRepository.activate(seriesId)
      if (success) {
        const index = series.value.findIndex(s => s.id === seriesId)
        const item = series.value[index]
        if (index >= 0 && item) {
          item.is_active = 1
          activeSeries.value = item
        }
      }

      return success
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to activate OR series'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deactivateSeries(seriesId: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const success = await orSeriesRepository.deactivate(seriesId)
      if (success) {
        const index = series.value.findIndex(s => s.id === seriesId)
        const item = series.value[index]
        if (index >= 0 && item) {
          item.is_active = 0
        }

        if (activeSeries.value?.id === seriesId) {
          activeSeries.value = null
        }
      }

      return success
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to deactivate OR series'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function getSeriesStatus(seriesId: string): Promise<{
    remaining: number
    usagePercentage: number
    isLow: boolean
    isCritical: boolean
    isExhausted: boolean
  } | null> {
    return await orSeriesRepository.getSeriesStatus(seriesId)
  }

  async function getNextORNumber(): Promise<{
    seriesId: string
    orNumber: string
    warning?: string
  } | null> {
    return await orSeriesRepository.getNextORNumber(
      currentBranchId.value,
      currentTerminalId.value || undefined
    )
  }

  async function checkActiveSeriesStatus(): Promise<{
    hasActiveSeries: boolean
    warning?: string
    remaining?: number
  }> {
    if (!activeSeries.value) {
      await loadActiveSeries()
    }

    if (!activeSeries.value) {
      return { hasActiveSeries: false }
    }

    const status = await getSeriesStatus(activeSeries.value.id)
    if (!status) {
      return { hasActiveSeries: true }
    }

    let warning: string | undefined
    if (status.isCritical) {
      warning = `CRITICAL: OR series nearly exhausted (${status.remaining} remaining)`
    } else if (status.isLow) {
      warning = `WARNING: OR series is low (${status.remaining} remaining)`
    }

    return {
      hasActiveSeries: true,
      warning,
      remaining: status.remaining
    }
  }

  function setContext(branchId: string, terminalId?: string): void {
    currentBranchId.value = branchId
    currentTerminalId.value = terminalId || null
  }

  function clearError(): void {
    error.value = null
  }

  function findSeriesById(id: string): ORSeries | undefined {
    return series.value.find(s => s.id === id)
  }

  return {
    // State
    series,
    activeSeries,
    isLoading,
    error,
    currentBranchId,
    currentTerminalId,

    // Getters
    displaySeries,
    activeDisplaySeries,
    hasActiveSeries,
    lowSeries,
    criticalSeries,
    exhaustedSeries,

    // Actions
    loadAllSeries,
    loadActiveSeries,
    loadSeriesByBranch,
    createSeries,
    activateSeries,
    deactivateSeries,
    getSeriesStatus,
    getNextORNumber,
    checkActiveSeriesStatus,
    setContext,
    clearError,
    findSeriesById
  }
})
