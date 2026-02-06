/**
 * Cash Drawer Composable
 * Wraps the cashDrawer store with convenience methods
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCashDrawerStore } from '@/stores/cashDrawer'
import type { DenominationCountInput, ExpectedCashBreakdown } from '@/types/cashDrawer'

export function useCashDrawer() {
  const store = useCashDrawerStore()
  const {
    currentSession,
    operations,
    expectedCashBreakdown,
    isLoading,
    error,
    varianceThreshold,
    hasOpenSession,
    isDrawerOpen,
    currentVariance,
    totalDrops,
    totalPaidIns,
    expectedCash,
    isVarianceOverThreshold,
    requiresVarianceReason
  } = storeToRefs(store)

  // Convenience computed
  const drawerStatus = computed(() => currentSession.value?.status || 'closed')
  const requiresOpeningCount = computed(() => !currentSession.value)

  async function startShift(
    shiftId: string,
    userId: string,
    terminalId: string,
    denominations: DenominationCountInput[]
  ): Promise<{ success: boolean; error?: string }> {
    return store.openDrawer(shiftId, userId, terminalId, denominations)
  }

  async function endShift(
    denominations: DenominationCountInput[],
    varianceReason?: string
  ): Promise<{ success: boolean; variance?: number; breakdown?: ExpectedCashBreakdown; error?: string }> {
    return store.closeDrawer(denominations, varianceReason)
  }

  async function doCashDrop(
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    return store.performDrop(amount, reason, supervisorId)
  }

  async function doCashPaidIn(
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    return store.performPaidIn(amount, reason, supervisorId)
  }

  async function doNoSale(
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    return store.performNoSale(supervisorId)
  }

  async function loadSession(shiftId: string): Promise<void> {
    return store.loadSession(shiftId)
  }

  async function refreshExpectedCash(): Promise<void> {
    return store.refreshExpectedCash()
  }

  return {
    // State
    currentSession,
    operations,
    expectedCashBreakdown,
    isLoading,
    error,
    varianceThreshold,

    // Getters
    hasOpenSession,
    isDrawerOpen,
    drawerStatus,
    requiresOpeningCount,
    currentVariance,
    totalDrops,
    totalPaidIns,
    expectedCash,
    isVarianceOverThreshold,
    requiresVarianceReason,

    // Actions
    startShift,
    endShift,
    doCashDrop,
    doCashPaidIn,
    doNoSale,
    loadSession,
    refreshExpectedCash
  }
}
