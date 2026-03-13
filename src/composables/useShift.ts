/**
 * useShift Composable
 * Provides shift management functionality for components
 */

import { computed, ref, type ComputedRef } from 'vue'
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import type { ShiftStartInput, ShiftCloseInput, DisplayShift } from '@/types/user'

export interface UseShiftReturn {
  // State
  currentShift: ComputedRef<DisplayShift | null>
  hasOpenShift: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  error: ComputedRef<string | null>

  // Shift info
  shiftDuration: ComputedRef<string>
  openingCash: ComputedRef<number>

  // Actions
  startShift: (openingCash: number) => Promise<{ success: boolean; error?: string }>
  closeShift: (closingCash: number, varianceReason?: string) => Promise<{ success: boolean; shift?: DisplayShift; error?: string }>
  forceCloseShift: (supervisorId: string) => Promise<{ success: boolean; error?: string }>
  getExpectedCash: () => Promise<number>
  refreshShift: () => Promise<void>
  loadCurrentShift: () => Promise<void>

  // Utilities
  requireShift: () => boolean
  canLogout: () => boolean
}

export function useShift(): UseShiftReturn {
  const shiftStore = useShiftStore()
  const authStore = useAuthStore()

  // State
  const currentShift = computed(() => shiftStore.currentShift)
  const hasOpenShift = computed(() => shiftStore.hasOpenShift)
  const isLoading = computed(() => shiftStore.isLoading)
  const error = computed(() => shiftStore.error)

  // Computed shift info
  const shiftDuration = computed(() => {
    if (!currentShift.value) return '0h 0m'
    return currentShift.value.duration
  })

  const openingCash = computed(() => shiftStore.openingCash)

  // Actions
  async function startShift(openingCash: number): Promise<{ success: boolean; error?: string }> {
    const terminalId = authStore.terminalId || 'POS-001'

    const input: ShiftStartInput = {
      terminal_id: terminalId,
      opening_cash: openingCash
    }

    return shiftStore.startShift(input)
  }

  async function closeShift(
    closingCash: number,
    varianceReason?: string
  ): Promise<{ success: boolean; shift?: DisplayShift; error?: string }> {
    const input: ShiftCloseInput = {
      closing_cash: closingCash,
      variance_reason: varianceReason
    }

    return shiftStore.closeShift(input)
  }

  async function forceCloseShift(supervisorId: string): Promise<{ success: boolean; error?: string }> {
    return shiftStore.forceCloseShift(supervisorId)
  }

  async function getExpectedCash(): Promise<number> {
    return shiftStore.getExpectedCash()
  }

  async function refreshShift(): Promise<void> {
    return shiftStore.refreshShift()
  }

  async function loadCurrentShift(): Promise<void> {
    return shiftStore.loadCurrentShift()
  }

  // Utilities
  function requireShift(): boolean {
    if (!hasOpenShift.value) {
      console.warn('No open shift. Please start a shift first.')
      return false
    }
    return true
  }

  function canLogout(): boolean {
    return !hasOpenShift.value
  }

  return {
    // State
    currentShift,
    hasOpenShift,
    isLoading,
    error,

    // Shift info
    shiftDuration,
    openingCash,

    // Actions
    startShift,
    closeShift,
    forceCloseShift,
    getExpectedCash,
    refreshShift,
    loadCurrentShift,

    // Utilities
    requireShift,
    canLogout
  }
}

export default useShift
