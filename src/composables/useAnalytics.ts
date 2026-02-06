/**
 * Analytics Composable
 * Wraps the analytics store, exposes computed refs + methods for use in components.
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAnalyticsStore } from '@/stores/analytics'
import { analyticsService } from '@/services/analyticsService'
import type { AnalyticsPeriod } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

export function useAnalytics() {
  const store = useAnalyticsStore()

  const {
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
    hasData,
    isDataStale
  } = storeToRefs(store)

  // Formatted values
  const formattedGrossSales = computed(() =>
    formatCurrency(todayMetrics.value?.grossSales || 0)
  )

  const formattedNetSales = computed(() =>
    formatCurrency(todayMetrics.value?.netSales || 0)
  )

  const formattedAvgTicket = computed(() =>
    formatCurrency(todayMetrics.value?.averageTicket || 0)
  )

  const lastUpdatedLabel = computed(() => {
    if (!lastAggregation.value) return 'Never'
    const d = new Date(lastAggregation.value)
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  })

  // Actions
  async function loadDashboard(period?: AnalyticsPeriod, branchId?: string) {
    await store.loadDashboard(period, branchId)
  }

  async function refreshData() {
    await store.runAggregation()
    await store.loadDashboard()
  }

  async function changePeriod(period: AnalyticsPeriod, dateFrom?: string, dateTo?: string) {
    store.setPeriod(period, dateFrom, dateTo)
    await store.loadSalesTrend(period)
    await store.loadPeriodComparison(period)
  }

  async function ensureFreshData() {
    await store.ensureFreshData()
  }

  /**
   * Resolve period to date range (utility for components)
   */
  function getPeriodDates(period?: AnalyticsPeriod) {
    return analyticsService.resolvePeriodDates(
      period || currentPeriod.value,
      customDateFrom.value || undefined,
      customDateTo.value || undefined
    )
  }

  return {
    // State refs
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
    hasData,
    isDataStale,

    // Formatted
    formattedGrossSales,
    formattedNetSales,
    formattedAvgTicket,
    lastUpdatedLabel,

    // Actions
    loadDashboard,
    refreshData,
    changePeriod,
    ensureFreshData,
    getPeriodDates
  }
}
