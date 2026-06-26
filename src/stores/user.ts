/**
 * User Store
 * Pinia store for user management state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userRepository } from '@/repositories/userRepository'
import { roleRepository } from '@/repositories/roleRepository'
import type {
  User,
  DisplayUser,
  DisplayRole,
  UserInput,
  UserUpdateInput
} from '@/types/user'
import { toDisplayUser, toDisplayRole } from '@/types/user'
import { hashPin, hashAnswer } from '@/utils/crypto'

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<DisplayUser[]>([])
  const roles = ref<DisplayRole[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeUsers = computed(() => users.value.filter((u) => u.isActive))
  const inactiveUsers = computed(() => users.value.filter((u) => !u.isActive))
  const userCount = computed(() => users.value.length)
  const activeUserCount = computed(() => activeUsers.value.length)

  // Actions
  async function loadUsers(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const rawUsers = await userRepository.findAll()
      users.value = await Promise.all(
        rawUsers.map(async (user) => {
          const userRoles = await userRepository.getUserRoles(user.id)
          const permissions = await userRepository.getUserPermissions(user.id)
          return toDisplayUser(user, userRoles, permissions)
        })
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      error.value = message
      console.error('Failed to load users:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadRoles(): Promise<void> {
    try {
      const rawRoles = await roleRepository.findAll()
      roles.value = rawRoles.filter((r) => r.is_active === 1).map(toDisplayRole)
    } catch (err) {
      console.error('Failed to load roles:', err)
    }
  }

  async function createUser(input: UserInput): Promise<{ success: boolean; user?: DisplayUser; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      // Check if username already exists
      const existing = await userRepository.findByUsername(input.username)
      if (existing) {
        return { success: false, error: 'Username already exists' }
      }

      // Transform UserInput → db row: hash pin, strip role_ids
      const { pin, role_ids, password, securityQuestions, ...rest } = input
      const pin_hash = await hashPin(pin)
      const password_hash = password ? await hashPin(password) : null

      const newUser = await userRepository.create({
        ...rest,
        username: rest.username.toLowerCase(),
        pin_hash,
        password_hash
      } as Omit<User, 'id' | 'created_at' | 'updated_at'>)

      // Assign roles
      if (role_ids && role_ids.length > 0) {
        await userRepository.setRoles(newUser.id, role_ids)
      }

      // Store security questions if provided
      if (securityQuestions) {
        await userRepository.setSecurityQuestions(
          newUser.id,
          securityQuestions.question1,
          await hashAnswer(securityQuestions.answer1),
          securityQuestions.question2,
          await hashAnswer(securityQuestions.answer2)
        )
      }

      const userRoles = await userRepository.getUserRoles(newUser.id)
      const permissions = await userRepository.getUserPermissions(newUser.id)
      const displayUser = toDisplayUser(newUser, userRoles, permissions)

      users.value = [...users.value, displayUser]

      return { success: true, user: displayUser }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(
    userId: string,
    input: UserUpdateInput
  ): Promise<{ success: boolean; user?: DisplayUser; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      // Transform UserUpdateInput → db columns: hash pin/password, strip role_ids
      const { pin, password, role_ids, securityQuestions, ...rest } = input
      const dbData: Record<string, any> = { ...rest }

      if (pin) {
        dbData.pin_hash = await hashPin(pin)
      }
      if (password) {
        dbData.password_hash = await hashPin(password)
      }

      const updatedUser = await userRepository.update(userId, dbData as Partial<User>)

      if (!updatedUser) {
        return { success: false, error: 'User not found' }
      }

      // Update roles if provided
      if (role_ids) {
        await userRepository.setRoles(userId, role_ids)
      }

      // Update security questions if provided
      if (securityQuestions) {
        await userRepository.setSecurityQuestions(
          userId,
          securityQuestions.question1,
          await hashAnswer(securityQuestions.answer1),
          securityQuestions.question2,
          await hashAnswer(securityQuestions.answer2)
        )
      }

      const userRoles = await userRepository.getUserRoles(userId)
      const permissions = await userRepository.getUserPermissions(userId)
      const displayUser = toDisplayUser(updatedUser, userRoles, permissions)

      // Update in local state
      const index = users.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        users.value[index] = displayUser
        users.value = [...users.value]
      }

      return { success: true, user: displayUser }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      // Check if this is the last admin
      const isAdmin = await userRepository.isAdmin(userId)
      if (isAdmin) {
        const adminCount = await userRepository.countActiveAdmins()
        if (adminCount <= 1) {
          return { success: false, error: 'Cannot deactivate the last administrator' }
        }
      }

      await userRepository.deactivate(userId)

      // Update in local state
      const index = users.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        const user = users.value[index]
        if (user) {
          users.value[index] = { ...user, isActive: false }
          users.value = [...users.value]
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate user'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      await userRepository.reactivate(userId)

      // Update in local state
      const index = users.value.findIndex((u) => u.id === userId)
      if (index !== -1) {
        const user = users.value[index]
        if (user) {
          users.value[index] = { ...user, isActive: true }
          users.value = [...users.value]
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate user'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function resetUserPin(
    userId: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    error.value = null

    try {
      const pinHash = await hashPin(newPin)
      await userRepository.update(userId, { pin_hash: pinHash } as Partial<User>)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset PIN'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  function getUserById(userId: string): DisplayUser | undefined {
    return users.value.find((u) => u.id === userId)
  }

  function clearError(): void {
    error.value = null
  }

  return {
    // State
    users,
    roles,
    isLoading,
    error,

    // Computed
    activeUsers,
    inactiveUsers,
    userCount,
    activeUserCount,

    // Actions
    loadUsers,
    loadRoles,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    resetUserPin,
    getUserById,
    clearError
  }
})

export default useUserStore
