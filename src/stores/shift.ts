/**
 * Shift Store
 * Pinia store for shift state management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shiftRepository } from '@/repositories/shiftRepository'
import { useAuthStore } from './auth'
import type { Shift, DisplayShift, ShiftStartInput, ShiftCloseInput } from '@/types/user'
import { toDisplayShift } from '@/types/user'

const SHIFT_STORAGE_KEY = 'pos_current_shift'

export const useShiftStore = defineStore('shift', () => {
  const authStore = useAuthStore()

  // State
  const currentShift = ref<DisplayShift | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasOpenShift = computed(() => currentShift.value !== null && currentShift.value.status === 'open')
  const shiftId = computed(() => currentShift.value?.id || null)
  const openingCash = computed(() => currentShift.value?.openingCash || 0)
  const terminalId = computed(() => currentShift.value?.terminalId || '')

  // Actions
  async function startShift(input: ShiftStartInput): Promise<{ success: boolean; error?: string }> {
    if (!authStore.currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    if (hasOpenShift.value) {
      return { success: false, error: 'You already have an open shift' }
    }

    isLoading.value = true
    error.value = null

    try {
      // Double-check DB for existing open shift (localStorage may be stale)
      const existingShift = await shiftRepository.findOpenShift(authStore.currentUser.id)
      if (existingShift) {
        currentShift.value = toDisplayShift(existingShift)
        saveState()
        return { success: false, error: 'You already have an open shift' }
      }

      const shift = await shiftRepository.startShift(
        authStore.currentUser.id,
        authStore.currentUser.branchId,
        input
      )

      currentShift.value = toDisplayShift(shift)
      saveState()

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start shift'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function closeShift(input: ShiftCloseInput): Promise<{ success: boolean; shift?: DisplayShift; error?: string }> {
    if (!currentShift.value) {
      return { success: false, error: 'No open shift to close' }
    }

    isLoading.value = true
    error.value = null

    try {
      const expectedCash = await shiftRepository.calculateExpectedCash(currentShift.value.id)
      const closedShift = await shiftRepository.closeShift(currentShift.value.id, input, expectedCash)
      const displayShift = toDisplayShift(closedShift!)

      currentShift.value = null
      clearState()

      return { success: true, shift: displayShift }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close shift'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function forceCloseShift(supervisorId: string): Promise<{ success: boolean; error?: string }> {
    if (!currentShift.value) {
      return { success: false, error: 'No open shift to close' }
    }

    isLoading.value = true
    error.value = null

    try {
      await shiftRepository.forceCloseShift(currentShift.value.id, supervisorId, 'Force closed by supervisor')
      currentShift.value = null
      clearState()

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to force close shift'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function getExpectedCash(): Promise<number> {
    if (!currentShift.value) {
      return 0
    }

    try {
      return await shiftRepository.calculateExpectedCash(currentShift.value.id)
    } catch (err) {
      console.error('Failed to calculate expected cash:', err)
      return currentShift.value.openingCash
    }
  }

  async function loadCurrentShift(): Promise<void> {
    if (!authStore.currentUser) {
      return
    }

    isLoading.value = true

    try {
      const shift = await shiftRepository.findOpenShift(authStore.currentUser.id)

      if (shift) {
        currentShift.value = toDisplayShift(shift)
        saveState()
      } else {
        currentShift.value = null
        clearState()
      }
    } catch (err) {
      console.error('Failed to load current shift:', err)
      // Try to restore from local storage
      loadState()
    } finally {
      isLoading.value = false
    }
  }

  async function refreshShift(): Promise<void> {
    if (!currentShift.value) {
      return
    }

    try {
      const shift = await shiftRepository.findById(currentShift.value.id)

      if (shift) {
        currentShift.value = toDisplayShift(shift)
        saveState()
      }
    } catch (err) {
      console.error('Failed to refresh shift:', err)
    }
  }

  // State persistence
  function saveState(): void {
    if (currentShift.value) {
      localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(currentShift.value))
    }
  }

  function loadState(): void {
    try {
      const stored = localStorage.getItem(SHIFT_STORAGE_KEY)

      if (stored) {
        currentShift.value = JSON.parse(stored) as DisplayShift
      }
    } catch (err) {
      console.error('Failed to load shift state:', err)
      clearState()
    }
  }

  function clearState(): void {
    currentShift.value = null
    localStorage.removeItem(SHIFT_STORAGE_KEY)
  }

  // Initialize
  function initialize(): void {
    loadState()
  }

  return {
    // State
    currentShift,
    isLoading,
    error,

    // Computed
    hasOpenShift,
    shiftId,
    openingCash,
    terminalId,

    // Actions
    startShift,
    closeShift,
    forceCloseShift,
    getExpectedCash,
    loadCurrentShift,
    refreshShift,
    initialize,
    clearState
  }
})

export default useShiftStore
