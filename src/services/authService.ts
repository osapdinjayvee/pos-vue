/**
 * Auth Service
 * Handles user authentication, login/logout, and session management
 */

import { userRepository } from '@/repositories/userRepository'
import { authLogRepository } from '@/repositories/authLogRepository'
import { shiftRepository } from '@/repositories/shiftRepository'
import { verifyPin } from '@/utils/crypto'
import type {
  User,
  DisplayUser,
  LoginCredentials,
  AuthResponse,
  DisplayRole
} from '@/types/user'
import { toDisplayUser } from '@/types/user'
import { cachedCredentialsService } from './cachedCredentialsService'

// Maximum failed login attempts before lockout
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export interface AuthResult {
  success: boolean
  user?: DisplayUser
  permissions?: string[]
  error?: string
  requiresShift?: boolean
}

class AuthService {
  private currentUser: DisplayUser | null = null
  private currentPermissions: string[] = []
  private terminalId: string = 'POS-001'

  /**
   * Set the terminal ID for this session
   */
  setTerminalId(terminalId: string): void {
    this.terminalId = terminalId
  }

  /**
   * Get the current terminal ID
   */
  getTerminalId(): string {
    return this.terminalId
  }

  /**
   * Authenticate user with username and PIN
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { username, pin, terminalId } = credentials
    this.terminalId = terminalId

    try {
      // Check for too many failed attempts
      const failedAttempts = await authLogRepository.countRecentFailures(
        username,
        LOCKOUT_DURATION_MINUTES
      )

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        await authLogRepository.logLoginFailure(
          username,
          terminalId,
          'Account locked due to too many failed attempts'
        )

        return {
          success: false,
          error: `Account locked. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        }
      }

      // Try online authentication first
      let user = await userRepository.findByUsername(username)
      let roles: DisplayRole[] = []
      let permissions: string[] = []

      if (user) {
        // Online authentication
        const isValid = await verifyPin(pin, user.pin_hash)

        if (!isValid) {
          await authLogRepository.logLoginFailure(
            username,
            terminalId,
            'Invalid PIN'
          )

          return {
            success: false,
            error: 'Invalid username or PIN'
          }
        }

        // Check if user is active
        if (!user.is_active) {
          await authLogRepository.logLoginFailure(
            username,
            terminalId,
            'Account is deactivated'
          )

          return {
            success: false,
            error: 'Account is deactivated. Contact your administrator.'
          }
        }

        // Get roles and permissions
        roles = await userRepository.getUserRoles(user.id)
        permissions = await userRepository.getUserPermissions(user.id)

        // Update last login
        await userRepository.updateLastLogin(user.id)

        // Cache credentials for offline use
        await cachedCredentialsService.cacheUser(user, roles, permissions)
      } else {
        // Try offline authentication
        const cachedAuth = await cachedCredentialsService.authenticate(username, pin)

        if (!cachedAuth.success) {
          await authLogRepository.logLoginFailure(
            username,
            terminalId,
            cachedAuth.error || 'User not found'
          )

          return {
            success: false,
            error: cachedAuth.error || 'Invalid username or PIN'
          }
        }

        // Use cached data
        const cachedUser = cachedAuth.user!

        // Create a minimal user object for display
        const displayUser: DisplayUser = {
          id: cachedUser.id,
          username: cachedUser.username,
          firstName: cachedUser.firstName,
          lastName: cachedUser.lastName,
          fullName: `${cachedUser.firstName} ${cachedUser.lastName}`,
          email: '',
          branchId: '',
          isActive: true,
          lastLoginAt: null,
          roles: cachedUser.roles.map((code) => ({
            id: '',
            name: code,
            code,
            description: '',
            isDefault: false,
            isActive: true,
            permissions: [],
            createdAt: '',
            updatedAt: ''
          })),
          permissions: cachedUser.permissions,
          createdAt: '',
          updatedAt: ''
        }

        // Log successful offline login
        await authLogRepository.logLoginSuccess(
          cachedUser.id,
          username,
          terminalId
        )

        this.currentUser = displayUser
        this.currentPermissions = cachedUser.permissions

        return {
          success: true,
          user: displayUser,
          permissions: cachedUser.permissions,
          requiresShift: true
        }
      }

      // Log successful login
      await authLogRepository.logLoginSuccess(user.id, username, terminalId)

      // Create display user
      const displayUser = toDisplayUser(user, roles, permissions)
      this.currentUser = displayUser
      this.currentPermissions = permissions

      // Check if user has an open shift
      const hasOpenShift = await shiftRepository.hasOpenShift(user.id)

      return {
        success: true,
        user: displayUser,
        permissions,
        requiresShift: !hasOpenShift
      }
    } catch (error) {
      console.error('Login error:', error)

      await authLogRepository.logLoginFailure(
        username,
        terminalId,
        error instanceof Error ? error.message : 'Unknown error'
      )

      return {
        success: false,
        error: 'An error occurred during login. Please try again.'
      }
    }
  }

  /**
   * Log out current user
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: true }
    }

    try {
      // Check if user has an open shift
      const openShift = await shiftRepository.findOpenShift(this.currentUser.id)

      if (openShift) {
        return {
          success: false,
          error: 'Please close your shift before logging out.'
        }
      }

      // Log the logout
      await authLogRepository.logLogout(
        this.currentUser.id,
        this.currentUser.username,
        this.terminalId
      )

      // Clear current user
      this.currentUser = null
      this.currentPermissions = []

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return {
        success: false,
        error: 'An error occurred during logout.'
      }
    }
  }

  /**
   * Force logout (without shift check - for emergency/admin use)
   */
  async forceLogout(): Promise<void> {
    if (this.currentUser) {
      await authLogRepository.logLogout(
        this.currentUser.id,
        this.currentUser.username,
        this.terminalId
      )
    }

    this.currentUser = null
    this.currentPermissions = []
  }

  /**
   * Verify PIN for current user (for re-authentication)
   */
  async verifyCurrentUserPin(pin: string): Promise<boolean> {
    if (!this.currentUser) {
      return false
    }

    // Try online first
    const user = await userRepository.findById(this.currentUser.id)

    if (user) {
      return verifyPin(pin, user.pin_hash)
    }

    // Try cached credentials
    const cachedAuth = await cachedCredentialsService.authenticate(
      this.currentUser.username,
      pin
    )

    return cachedAuth.success
  }

  /**
   * Verify PIN for any user (for supervisor auth)
   */
  async verifyUserPin(userId: string, pin: string): Promise<boolean> {
    const user = await userRepository.findById(userId)

    if (!user) {
      return false
    }

    return verifyPin(pin, user.pin_hash)
  }

  /**
   * Verify supervisor PIN for elevated actions
   */
  async verifySupervisorPin(
    supervisorUsername: string,
    pin: string,
    requiredPermission: string
  ): Promise<{ authorized: boolean; supervisorId?: string; error?: string }> {
    const user = await userRepository.findByUsername(supervisorUsername)

    if (!user) {
      return { authorized: false, error: 'Supervisor not found' }
    }

    // Check if user is active
    if (!user.is_active) {
      return { authorized: false, error: 'User account is deactivated' }
    }

    const isValidPin = await verifyPin(pin, user.pin_hash)

    if (!isValidPin) {
      return { authorized: false, error: 'Invalid PIN' }
    }

    // Check if user has the required permission
    const permissions = await userRepository.getUserPermissions(user.id)
    const hasPermission = this.checkPermission(permissions, requiredPermission)

    if (!hasPermission) {
      return {
        authorized: false,
        error: 'User does not have the required permission'
      }
    }

    return { authorized: true, supervisorId: user.id }
  }

  /**
   * Get current user
   */
  getCurrentUser(): DisplayUser | null {
    return this.currentUser
  }

  /**
   * Get current user permissions
   */
  getCurrentPermissions(): string[] {
    return this.currentPermissions
  }

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.checkPermission(this.currentPermissions, permission)
  }

  /**
   * Check permission with wildcard support
   */
  private checkPermission(permissions: string[], required: string): boolean {
    // Check for superadmin
    if (permissions.includes('*')) {
      return true
    }

    // Direct match
    if (permissions.includes(required)) {
      return true
    }

    // Wildcard match (e.g., 'sales.*' matches 'sales.void')
    const [category] = required.split('.')

    return permissions.includes(`${category}.*`)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  /**
   * Lock the screen
   */
  async lockScreen(): Promise<void> {
    if (this.currentUser) {
      await authLogRepository.logLock(
        this.currentUser.id,
        this.currentUser.username,
        this.terminalId
      )
    }
  }

  /**
   * Unlock the screen
   */
  async unlockScreen(pin: string): Promise<boolean> {
    if (!this.currentUser) {
      return false
    }

    const isValid = await this.verifyCurrentUserPin(pin)

    if (isValid) {
      await authLogRepository.logUnlock(
        this.currentUser.id,
        this.currentUser.username,
        this.terminalId
      )
    }

    return isValid
  }

  /**
   * Restore session from stored state
   */
  restoreSession(user: DisplayUser, permissions: string[]): void {
    this.currentUser = user
    this.currentPermissions = permissions
  }

  /**
   * Clear session state
   */
  clearSession(): void {
    this.currentUser = null
    this.currentPermissions = []
  }
}

export const authService = new AuthService()
export default authService
