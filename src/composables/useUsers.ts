/**
 * useUsers Composable
 * Provides user management functionality for components
 */

import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import type { DisplayUser, UserInput, UserUpdateInput } from '@/types/user'

export function useUsers() {
  const userStore = useUserStore()
  const authStore = useAuthStore()

  // State
  const users = computed(() => userStore.users)
  const roles = computed(() => userStore.roles)
  const activeUsers = computed(() => userStore.activeUsers)
  const inactiveUsers = computed(() => userStore.inactiveUsers)
  const isLoading = computed(() => userStore.isLoading)
  const error = computed(() => userStore.error)
  const userCount = computed(() => userStore.userCount)
  const activeUserCount = computed(() => userStore.activeUserCount)

  // Current user info
  const currentUserId = computed(() => authStore.currentUser?.id)

  // Actions
  async function loadUsers(): Promise<void> {
    await userStore.loadUsers()
  }

  async function loadRoles(): Promise<void> {
    await userStore.loadRoles()
  }

  async function loadAll(): Promise<void> {
    await Promise.all([loadUsers(), loadRoles()])
  }

  async function createUser(
    input: UserInput
  ): Promise<{ success: boolean; user?: DisplayUser; error?: string }> {
    return userStore.createUser(input)
  }

  async function updateUser(
    userId: string,
    input: UserUpdateInput
  ): Promise<{ success: boolean; user?: DisplayUser; error?: string }> {
    return userStore.updateUser(userId, input)
  }

  async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    // Prevent self-deactivation
    if (userId === currentUserId.value) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    return userStore.deactivateUser(userId)
  }

  async function reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    return userStore.reactivateUser(userId)
  }

  async function resetUserPin(
    userId: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    return userStore.resetUserPin(userId, newPin)
  }

  function getUserById(userId: string): DisplayUser | undefined {
    return userStore.getUserById(userId)
  }

  function clearError(): void {
    userStore.clearError()
  }

  // Validation helpers
  function isCurrentUser(userId: string): boolean {
    return userId === currentUserId.value
  }

  function canDeactivate(user: DisplayUser): boolean {
    // Cannot deactivate self
    if (isCurrentUser(user.id)) return false

    // Already inactive
    if (!user.isActive) return false

    return true
  }

  function canReactivate(user: DisplayUser): boolean {
    // Can only reactivate inactive users
    return !user.isActive
  }

  return {
    // State
    users,
    roles,
    activeUsers,
    inactiveUsers,
    isLoading,
    error,
    userCount,
    activeUserCount,

    // Actions
    loadUsers,
    loadRoles,
    loadAll,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    resetUserPin,
    getUserById,
    clearError,

    // Helpers
    isCurrentUser,
    canDeactivate,
    canReactivate
  }
}

export default useUsers
