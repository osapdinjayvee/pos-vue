/**
 * Cash Drawer Store
 * Pinia store for cash drawer state management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cashDrawerService } from '@/services/cashDrawerService'
import type {
  DrawerSession,
  DrawerOperation,
  DenominationCountInput,
  ExpectedCashBreakdown
} from '@/types/cashDrawer'

const DRAWER_STORAGE_KEY = 'pos_drawer_session'

export const useCashDrawerStore = defineStore('cashDrawer', () => {
  // State
  const currentSession = ref<DrawerSession | null>(null)
  const operations = ref<DrawerOperation[]>([])
  const expectedCashBreakdown = ref<ExpectedCashBreakdown | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const varianceThreshold = ref(100) // Default PHP 100

  // Getters
  const hasOpenSession = computed(() => currentSession.value?.status === 'open')
  const isDrawerOpen = computed(() => hasOpenSession.value)

  const currentVariance = computed(() => {
    if (!currentSession.value?.closing_amount || !expectedCashBreakdown.value) return null
    return currentSession.value.closing_amount - expectedCashBreakdown.value.expectedCash
  })

  const totalDrops = computed(() => {
    return operations.value
      .filter(op => op.type === 'drop')
      .reduce((sum, op) => sum + (op.amount || 0), 0)
  })

  const totalPaidIns = computed(() => {
    return operations.value
      .filter(op => op.type === 'paid_in')
      .reduce((sum, op) => sum + (op.amount || 0), 0)
  })

  const expectedCash = computed(() => expectedCashBreakdown.value?.expectedCash || 0)

  const isVarianceOverThreshold = computed(() => {
    if (currentVariance.value === null) return false
    return Math.abs(currentVariance.value) > varianceThreshold.value
  })

  const requiresVarianceReason = computed(() => isVarianceOverThreshold.value)

  // Actions
  async function openDrawer(
    shiftId: string,
    userId: string,
    terminalId: string,
    denominations: DenominationCountInput[]
  ): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      const result = await cashDrawerService.openDrawer(shiftId, userId, terminalId, denominations)
      currentSession.value = result.session
      operations.value = [result.operation]
      saveState()
      await refreshExpectedCash()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open drawer'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function closeDrawer(
    denominations: DenominationCountInput[],
    varianceReason?: string
  ): Promise<{ success: boolean; variance?: number; breakdown?: ExpectedCashBreakdown; error?: string }> {
    if (!currentSession.value) {
      return { success: false, error: 'No open drawer session' }
    }

    isLoading.value = true
    error.value = null

    try {
      let result
      if (varianceReason) {
        result = await cashDrawerService.closeDrawerWithReason(
          currentSession.value.id,
          denominations,
          varianceReason
        )
      } else {
        result = await cashDrawerService.closeDrawer(currentSession.value.id, denominations)
      }

      currentSession.value = result.session
      expectedCashBreakdown.value = result.breakdown
      clearState()

      return {
        success: true,
        variance: result.variance,
        breakdown: result.breakdown
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close drawer'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function performDrop(
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!currentSession.value) {
      return { success: false, error: 'No open drawer session' }
    }

    isLoading.value = true
    error.value = null

    try {
      const operation = await cashDrawerService.recordDrop(
        currentSession.value.id,
        amount,
        reason,
        supervisorId
      )
      operations.value.push(operation)
      await refreshExpectedCash()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record cash drop'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function performPaidIn(
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!currentSession.value) {
      return { success: false, error: 'No open drawer session' }
    }

    isLoading.value = true
    error.value = null

    try {
      const operation = await cashDrawerService.recordPaidIn(
        currentSession.value.id,
        amount,
        reason,
        supervisorId
      )
      operations.value.push(operation)
      await refreshExpectedCash()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record cash paid-in'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function performNoSale(
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!currentSession.value) {
      return { success: false, error: 'No open drawer session' }
    }

    try {
      const operation = await cashDrawerService.recordNoSale(
        currentSession.value.id,
        supervisorId
      )
      operations.value.push(operation)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record no sale'
      error.value = message
      return { success: false, error: message }
    }
  }

  async function refreshExpectedCash(): Promise<void> {
    if (!currentSession.value) return

    try {
      expectedCashBreakdown.value = await cashDrawerService.getExpectedCash(currentSession.value.id)
    } catch (err) {
      console.error('Failed to refresh expected cash:', err)
    }
  }

  async function loadSession(shiftId: string): Promise<void> {
    isLoading.value = true

    try {
      const session = await cashDrawerService.getSessionByShift(shiftId)
      if (session) {
        currentSession.value = session
        operations.value = await cashDrawerService.getSessionOperations(session.id)
        if (session.status === 'open') {
          await refreshExpectedCash()
        }
        saveState()
      } else {
        currentSession.value = null
        operations.value = []
        expectedCashBreakdown.value = null
        clearState()
      }
    } catch (err) {
      console.error('Failed to load drawer session:', err)
      loadState()
    } finally {
      isLoading.value = false
    }
  }

  // State persistence
  function saveState(): void {
    if (currentSession.value) {
      localStorage.setItem(DRAWER_STORAGE_KEY, JSON.stringify({
        sessionId: currentSession.value.id,
        shiftId: currentSession.value.shift_id
      }))
    }
  }

  function loadState(): void {
    try {
      const stored = localStorage.getItem(DRAWER_STORAGE_KEY)
      if (stored) {
        // State will be fully loaded via loadSession
      }
    } catch (err) {
      console.error('Failed to load drawer state:', err)
      clearState()
    }
  }

  function clearState(): void {
    currentSession.value = null
    operations.value = []
    expectedCashBreakdown.value = null
    localStorage.removeItem(DRAWER_STORAGE_KEY)
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
    currentVariance,
    totalDrops,
    totalPaidIns,
    expectedCash,
    isVarianceOverThreshold,
    requiresVarianceReason,

    // Actions
    openDrawer,
    closeDrawer,
    performDrop,
    performPaidIn,
    performNoSale,
    refreshExpectedCash,
    loadSession,
    clearState
  }
})

export default useCashDrawerStore
