/**
 * useAuth Composable
 * Provides authentication functionality for components
 */

import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { LoginCredentials } from '@/types/user'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // Computed properties
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoggedIn = computed(() => authStore.isLoggedIn)
  const isLocked = computed(() => authStore.isLocked)
  const isLoading = computed(() => authStore.isLoading)
  const error = computed(() => authStore.error)
  const currentUser = computed(() => authStore.currentUser)
  const fullName = computed(() => authStore.fullName)
  const primaryRole = computed(() => authStore.primaryRole)
  const terminalId = computed(() => authStore.terminalId)

  // Login
  async function login(credentials: LoginCredentials) {
    const result = await authStore.login(credentials)

    if (result.success) {
      // Navigate to dashboard or POS
      await router.push('/')
    }

    return result
  }

  // Logout
  async function logout() {
    const result = await authStore.logout()

    if (result.success) {
      await router.push('/login')
    }

    return result
  }

  // Force logout (no shift check)
  async function forceLogout() {
    await authStore.forceLogout()
    await router.push('/login')
  }

  // Lock screen
  function lock() {
    authStore.lock()
  }

  // Unlock screen
  async function unlock(pin: string): Promise<boolean> {
    return authStore.unlock(pin)
  }

  // Check permission
  function hasPermission(permission: string): boolean {
    return authStore.hasPermission(permission)
  }

  // Check any of permissions
  function hasAnyPermission(permissions: string[]): boolean {
    return authStore.hasAnyPermission(permissions)
  }

  // Check all permissions
  function hasAllPermissions(permissions: string[]): boolean {
    return authStore.hasAllPermissions(permissions)
  }

  // Update activity (reset lock timer)
  function updateActivity() {
    authStore.updateActivity()
  }

  // Set lock timeout
  function setLockTimeout(minutes: number) {
    authStore.setLockTimeout(minutes)
  }

  // Require authentication
  function requireAuth(): boolean {
    if (!isAuthenticated.value) {
      router.push('/login')
      return false
    }
    return true
  }

  // Require permission
  function requirePermission(permission: string): boolean {
    if (!requireAuth()) return false

    if (!hasPermission(permission)) {
      // Could redirect to unauthorized page or show toast
      console.warn(`Permission denied: ${permission}`)
      return false
    }

    return true
  }

  // Initialize auth on mount (optional)
  function initializeAuth() {
    authStore.initialize()
  }

  return {
    // State
    isAuthenticated,
    isLoggedIn,
    isLocked,
    isLoading,
    error,
    currentUser,
    fullName,
    primaryRole,
    terminalId,

    // Actions
    login,
    logout,
    forceLogout,
    lock,
    unlock,
    updateActivity,
    setLockTimeout,
    initializeAuth,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    requireAuth,
    requirePermission
  }
}

export default useAuth
