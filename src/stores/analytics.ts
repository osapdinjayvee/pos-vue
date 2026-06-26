/**
 * Analytics Store
 * Pinia store for managing analytics state — today's metrics, trends, comparisons
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { analyticsService } from '@/services/analyticsService'
import { analyticsAggregationService } from '@/services/analyticsAggregationService'
import { toLocalDateStr } from '@/utils/dateHelpers'
import type {
  AnalyticsPeriod,
  TodayMetrics,
  SalesTrendPoint,
  PeriodComparisonData
} from '@/types/analytics'

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const currentPeriod = ref<AnalyticsPeriod>('today')
  const selectedBranch = ref<string | undefined>(undefined)
  const customDateFrom = ref<string>('')
  const customDateTo = ref<string>('')
  const todayMetrics = ref<TodayMetrics | null>(null)
  const salesTrend = ref<SalesTrendPoint[]>([])
  const periodComparison = ref<PeriodComparisonData | null>(null)
  const isLoading = ref(false)
  const isAggregating = ref(false)
  const error = ref<string | null>(null)
  const lastAggregation = ref<string | null>(null)

  // Getters
  const hasData = computed(() => todayMetrics.value !== null)
  const isDataStale = computed(() => {
    if (!lastAggregation.value) return true
    const diff = Date.now() - new Date(lastAggregation.value).getTime()
    return diff > 60 * 60 * 1000 // 1 hour
  })

  // Actions
  async function loadTodayMetrics(branchId?: string) {
    isLoading.value = true
    error.value = null
    try {
      todayMetrics.value = await analyticsService.getTodayMetrics(branchId || selectedBranch.value)
    } catch (e: any) {
      error.value = e.message || 'Failed to load today metrics'
      console.error('Error loading today metrics:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function loadMetricsForPeriod(dateFrom: string, dateTo: string, branchId?: string) {
    isLoading.value = true
    error.value = null
    try {
      todayMetrics.value = await analyticsService.getMetricsForPeriod(dateFrom, dateTo, branchId || selectedBranch.value)
    } catch (e: any) {
      error.value = e.message || 'Failed to load period metrics'
      console.error('Error loading period metrics:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function loadSalesTrend(period?: AnalyticsPeriod, branchId?: string) {
    isLoading.value = true
    error.value = null
    try {
      const p = period || currentPeriod.value
      const branch = branchId || selectedBranch.value
      salesTrend.value = await analyticsService.getSalesTrend(
        p, branch,
        p === 'custom' ? customDateFrom.value : undefined,
        p === 'custom' ? customDateTo.value : undefined
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to load sales trend'
      console.error('Error loading sales trend:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function loadPeriodComparison(period?: AnalyticsPeriod, branchId?: string) {
    isLoading.value = true
    error.value = null
    try {
      const p = period || currentPeriod.value
      periodComparison.value = await analyticsService.getPeriodComparison(
        p,
        branchId || selectedBranch.value,
        p === 'custom' ? customDateFrom.value : undefined,
        p === 'custom' ? customDateTo.value : undefined
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to load period comparison'
      console.error('Error loading period comparison:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function loadDashboard(period?: AnalyticsPeriod, branchId?: string) {
    const p = period || currentPeriod.value
    if (period) currentPeriod.value = period
    if (branchId) selectedBranch.value = branchId

    isLoading.value = true
    error.value = null

    try {
      // Resolve period to date range so metrics match the selected period
      const dates = analyticsService.resolvePeriodDates(
        p,
        p === 'custom' ? customDateFrom.value : undefined,
        p === 'custom' ? customDateTo.value : undefined
      )

      await Promise.all([
        loadMetricsForPeriod(dates.from, dates.to, branchId),
        loadSalesTrend(p, branchId),
        loadPeriodComparison(p, branchId)
      ])
    } catch (e: any) {
      error.value = e.message || 'Failed to load dashboard'
      console.error('Error loading dashboard:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function runAggregation(date?: string) {
    const targetDate = date || toLocalDateStr()
    isAggregating.value = true
    error.value = null

    try {
      await analyticsAggregationService.aggregateAll(targetDate)
      lastAggregation.value = new Date().toISOString()
    } catch (e: any) {
      error.value = e.message || 'Failed to run aggregation'
      console.error('Error running aggregation:', e)
    } finally {
      isAggregating.value = false
    }
  }

  async function ensureFreshData() {
    const today = toLocalDateStr()
    const stale = await analyticsAggregationService.isStale(today)
    if (stale) {
      await runAggregation(today)
    }
  }

  function setPeriod(period: AnalyticsPeriod, dateFrom?: string, dateTo?: string) {
    currentPeriod.value = period
    if (dateFrom) customDateFrom.value = dateFrom
    if (dateTo) customDateTo.value = dateTo
  }

  function $reset() {
    currentPeriod.value = 'today'
    selectedBranch.value = undefined
    customDateFrom.value = ''
    customDateTo.value = ''
    todayMetrics.value = null
    salesTrend.value = []
    periodComparison.value = null
    isLoading.value = false
    isAggregating.value = false
    error.value = null
    lastAggregation.value = null
  }

  return {
    // State
    currentPeriod,
    selectedBranch,
    customDateFrom,
    customDateTo,
    todayMetrics,
    salesTrend,
    periodComparison,
    isLoading,
    isAggregating,
    error,
    lastAggregation,

    // Getters
    hasData,
    isDataStale,

    // Actions
    loadTodayMetrics,
    loadMetricsForPeriod,
    loadSalesTrend,
    loadPeriodComparison,
    loadDashboard,
    runAggregation,
    ensureFreshData,
    setPeriod,
    $reset
  }
})
