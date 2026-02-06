/**
 * useBranchDashboard Composable
 * Provides reactive branch dashboard data
 */

import { ref, readonly, computed } from 'vue'
import { branchDashboardService } from '@/services/branchDashboardService'
import type { Branch, BranchSummary, BranchComparison } from '@/types/sync'

export function useBranchDashboard() {
  const branches = ref<Branch[]>([])
  const branchSummaries = ref<BranchSummary[]>([])
  const selectedBranch = ref<string | null>(null)
  const comparison = ref<BranchComparison | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const filteredSummaries = computed(() => {
    if (!selectedBranch.value) return branchSummaries.value
    return branchSummaries.value.filter((s) => s.branch_id === selectedBranch.value)
  })

  const totalSales = computed(() =>
    filteredSummaries.value.reduce((sum, s) => sum + s.today_sales, 0)
  )

  const totalTransactions = computed(() =>
    filteredSummaries.value.reduce((sum, s) => sum + s.today_transactions, 0)
  )

  const onlineBranches = computed(() =>
    branchSummaries.value.filter((s) => s.is_online).length
  )

  const offlineBranches = computed(() =>
    branchSummaries.value.filter((s) => !s.is_online).length
  )

  /**
   * Load branches and summaries
   */
  async function refreshDashboard(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const [branchData, summaryData] = await Promise.all([
        branchDashboardService.fetchBranches(),
        branchDashboardService.fetchBranchSummaries()
      ])

      branches.value = branchData
      branchSummaries.value = summaryData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load branch comparison
   */
  async function loadComparison(periodStart: string, periodEnd: string): Promise<void> {
    isLoading.value = true

    try {
      comparison.value = await branchDashboardService.fetchBranchComparison(
        periodStart,
        periodEnd
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load comparison'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Select a branch filter
   */
  function selectBranch(branchId: string | null): void {
    selectedBranch.value = branchId
  }

  return {
    branches: readonly(branches),
    branchSummaries: readonly(branchSummaries),
    filteredSummaries,
    selectedBranch: readonly(selectedBranch),
    comparison: readonly(comparison),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalSales,
    totalTransactions,
    onlineBranches,
    offlineBranches,
    refreshDashboard,
    loadComparison,
    selectBranch
  }
}

export default useBranchDashboard
