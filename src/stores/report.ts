/**
 * Report Store
 * Pinia store for managing report state and actions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { reportService } from '@/services/reportService'
import { zReadingRepository } from '@/repositories/zReadingRepository'
import { xReadingRepository } from '@/repositories/xReadingRepository'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import { zCounterRepository } from '@/repositories/zCounterRepository'
import type { DisplayXReading } from '@/types/xReading'
import type { DisplayZReading, ZReadingGenerationResult } from '@/types/zReading'
import type { SalesAggregate } from '@/types/report'

export const useReportStore = defineStore('report', () => {
  // State
  const xReadings = ref<DisplayXReading[]>([])
  const zReadings = ref<DisplayZReading[]>([])
  const currentXReading = ref<DisplayXReading | null>(null)
  const currentZReading = ref<DisplayZReading | null>(null)
  const salesAggregates = ref<SalesAggregate[]>([])
  const isLoading = ref(false)
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const latestXReading = computed(() =>
    xReadings.value.length > 0 ? xReadings.value[0] : null
  )

  const latestZReading = computed(() =>
    zReadings.value.length > 0 ? zReadings.value[0] : null
  )

  const hasXReadings = computed(() => xReadings.value.length > 0)
  const hasZReadings = computed(() => zReadings.value.length > 0)

  // Actions

  /**
   * Generate an X-Reading for the current shift
   */
  async function generateXReading(
    terminalId: string,
    shiftId: string,
    cashierId: string,
    branchId: string
  ): Promise<DisplayXReading | null> {
    isGenerating.value = true
    error.value = null

    try {
      const xReading = await reportService.generateXReading(
        terminalId, shiftId, cashierId, branchId
      )
      currentXReading.value = xReading
      xReadings.value.unshift(xReading)
      return xReading
    } catch (e: any) {
      error.value = e.message || 'Failed to generate X-Reading'
      console.error('Error generating X-Reading:', e)
      return null
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Generate a Z-Reading for end of day
   */
  async function generateZReading(
    terminalId: string,
    supervisorId: string,
    branchId: string,
    forceDuplicate: boolean = false
  ): Promise<ZReadingGenerationResult> {
    isGenerating.value = true
    error.value = null

    try {
      const result = await reportService.generateZReading(
        terminalId, supervisorId, branchId, forceDuplicate
      )

      if (result.success && result.zReading) {
        currentZReading.value = result.zReading
        zReadings.value.unshift(result.zReading)
      } else if (!result.success) {
        error.value = result.error || 'Failed to generate Z-Reading'
      }

      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to generate Z-Reading'
      console.error('Error generating Z-Reading:', e)
      return { success: false, error: error.value! }
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Fetch X-Reading history
   */
  async function fetchXReadings(terminalId: string) {
    isLoading.value = true
    error.value = null

    try {
      xReadings.value = await reportService.getXReadingHistory(terminalId)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch X-Readings'
      console.error('Error fetching X-Readings:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch Z-Reading history
   */
  async function fetchZReadings(terminalId: string) {
    isLoading.value = true
    error.value = null

    try {
      zReadings.value = await reportService.getZReadingHistory(terminalId)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch Z-Readings'
      console.error('Error fetching Z-Readings:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch sales aggregates for a date range
   */
  async function fetchSalesAggregates(
    branchId: string,
    dateFrom: string,
    dateTo: string
  ) {
    isLoading.value = true
    error.value = null

    try {
      salesAggregates.value = await salesAggregateRepository.getForPeriod(
        branchId, dateFrom, dateTo
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch sales aggregates'
      console.error('Error fetching sales aggregates:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if Z-Reading was already generated today
   */
  async function checkZReadingGenerated(terminalId: string): Promise<boolean> {
    return await zCounterRepository.wasGeneratedToday(terminalId)
  }

  /**
   * Clear current selections
   */
  function clearCurrent() {
    currentXReading.value = null
    currentZReading.value = null
  }

  /**
   * Reset the store
   */
  function $reset() {
    xReadings.value = []
    zReadings.value = []
    currentXReading.value = null
    currentZReading.value = null
    salesAggregates.value = []
    isLoading.value = false
    isGenerating.value = false
    error.value = null
  }

  return {
    // State
    xReadings,
    zReadings,
    currentXReading,
    currentZReading,
    salesAggregates,
    isLoading,
    isGenerating,
    error,

    // Getters
    latestXReading,
    latestZReading,
    hasXReadings,
    hasZReadings,

    // Actions
    generateXReading,
    generateZReading,
    fetchXReadings,
    fetchZReadings,
    fetchSalesAggregates,
    checkZReadingGenerated,
    clearCurrent,
    $reset
  }
})
