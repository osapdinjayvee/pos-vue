/**
 * Auth Store
 * Pinia store for authentication state management
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { authService, type AuthResult } from '@/services/authService'
import type { DisplayUser, LoginCredentials } from '@/types/user'

const AUTH_STORAGE_KEY = 'pos_auth_state'
const LOCK_TIMEOUT_KEY = 'pos_lock_timeout'
const DEFAULT_LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

interface StoredAuthState {
  user: DisplayUser | null
  permissions: string[]
  terminalId: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<DisplayUser | null>(null)
  const permissions = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isLocked = ref(false)
  const lastActivity = ref<number>(Date.now())
  const lockTimeout = ref<number>(DEFAULT_LOCK_TIMEOUT)
  const terminalId = ref<string>('POS-001')

  // Timer reference
  let activityTimer: number | null = null

  // Computed
  const isAuthenticated = computed(() => user.value !== null && !isLocked.value)
  const isLoggedIn = computed(() => user.value !== null)
  const currentUser = computed(() => user.value)
  const fullName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
  )
  const userRoles = computed(() => user.value?.roles || [])
  const primaryRole = computed(() => userRoles.value[0]?.name || 'Unknown')

  // Permission checking
  function hasPermission(permission: string): boolean {
    // Check for superadmin
    if (permissions.value.includes('*')) {
      return true
    }

    // Direct match
    if (permissions.value.includes(permission)) {
      return true
    }

    // Wildcard match (e.g., 'sales.*' matches 'sales.void')
    const [category] = permission.split('.')
    return permissions.value.includes(`${category}.*`)
  }

  function hasAnyPermission(perms: string[]): boolean {
    return perms.some((p) => hasPermission(p))
  }

  function hasAllPermissions(perms: string[]): boolean {
    return perms.every((p) => hasPermission(p))
  }

  // Actions
  async function login(credentials: LoginCredentials): Promise<AuthResult> {
    isLoading.value = true
    error.value = null

    try {
      const result = await authService.login(credentials)

      if (result.success && result.user) {
        user.value = result.user
        permissions.value = result.permissions || []
        terminalId.value = credentials.terminalId
        isLocked.value = false
        lastActivity.value = Date.now()

        // Persist state
        saveState()

        // Start activity monitoring
        startActivityMonitor()
      } else {
        error.value = result.error || 'Login failed'
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      const result = await authService.logout()

      if (result.success) {
        clearState()
      } else {
        error.value = result.error || 'Logout failed'
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function forceLogout(): Promise<void> {
    await authService.forceLogout()
    clearState()
  }

  // Screen lock
  function lock(): void {
    if (!user.value) return

    isLocked.value = true
    authService.lockScreen()
  }

  async function unlock(pin: string): Promise<boolean> {
    if (!user.value) return false

    const success = await authService.unlockScreen(pin)

    if (success) {
      isLocked.value = false
      lastActivity.value = Date.now()
      saveState()
    }

    return success
  }

  // Activity monitoring
  function updateActivity(): void {
    lastActivity.value = Date.now()
  }

  function startActivityMonitor(): void {
    stopActivityMonitor()

    activityTimer = window.setInterval(() => {
      const elapsed = Date.now() - lastActivity.value

      if (elapsed >= lockTimeout.value && isLoggedIn.value && !isLocked.value) {
        lock()
      }
    }, 10000) // Check every 10 seconds
  }

  function stopActivityMonitor(): void {
    if (activityTimer !== null) {
      clearInterval(activityTimer)
      activityTimer = null
    }
  }

  function setLockTimeout(minutes: number): void {
    lockTimeout.value = minutes * 60 * 1000
    localStorage.setItem(LOCK_TIMEOUT_KEY, lockTimeout.value.toString())
  }

  // State persistence
  function saveState(): void {
    const state: StoredAuthState = {
      user: user.value,
      permissions: permissions.value,
      terminalId: terminalId.value
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
  }

  function loadState(): void {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)

      if (stored) {
        const state = JSON.parse(stored) as StoredAuthState

        if (state.user) {
          user.value = state.user
          permissions.value = state.permissions || []
          terminalId.value = state.terminalId || 'POS-001'

          // Restore service state
          authService.restoreSession(state.user, state.permissions)
          authService.setTerminalId(state.terminalId)

          // Start activity monitoring
          lastActivity.value = Date.now()
          startActivityMonitor()
        }
      }

      // Load lock timeout preference
      const storedTimeout = localStorage.getItem(LOCK_TIMEOUT_KEY)

      if (storedTimeout) {
        lockTimeout.value = parseInt(storedTimeout, 10)
      }
    } catch (err) {
      console.error('Failed to load auth state:', err)
      clearState()
    }
  }

  function clearState(): void {
    user.value = null
    permissions.value = []
    isLocked.value = false
    error.value = null

    stopActivityMonitor()
    localStorage.removeItem(AUTH_STORAGE_KEY)
    authService.clearSession()
  }

  // Initialize
  function initialize(): void {
    loadState()

    // Listen for activity events
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']

    events.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true })
    })
  }

  // Watch for lock state changes
  watch(isLocked, (locked) => {
    if (!locked) {
      saveState()
    }
  })

  return {
    // State
    user,
    permissions,
    isLoading,
    error,
    isLocked,
    terminalId,
    lockTimeout,

    // Computed
    isAuthenticated,
    isLoggedIn,
    currentUser,
    fullName,
    userRoles,
    primaryRole,

    // Permission methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Actions
    login,
    logout,
    forceLogout,
    lock,
    unlock,
    updateActivity,
    setLockTimeout,
    initialize,
    clearState
  }
})

export default useAuthStore
