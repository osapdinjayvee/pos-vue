/**
 * Cached Credentials Service
 * Handles offline authentication using locally cached credentials
 */

import { verifyPin } from '@/utils/crypto'
import type { User, CachedCredentials, CachedUser, DisplayRole } from '@/types/user'

const CACHE_KEY = 'pos_cached_credentials'
const CACHE_VERSION = 1
const CACHE_EXPIRY_DAYS = 7

interface CacheAuthResult {
  success: boolean
  user?: CachedUser
  error?: string
}

class CachedCredentialsService {
  private cache: CachedCredentials | null = null

  /**
   * Initialize the cache from localStorage
   */
  initialize(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored) as CachedCredentials

        // Check version compatibility
        if (parsed.version !== CACHE_VERSION) {
          console.log('[CachedCredentials] Cache version mismatch, clearing')
          this.clearCache()
          return
        }

        this.cache = parsed
        console.log(
          `[CachedCredentials] Loaded ${this.cache.users.length} cached users`
        )
      }
    } catch (error) {
      console.error('[CachedCredentials] Failed to load cache:', error)
      this.clearCache()
    }
  }

  /**
   * Get the current cache
   */
  getCache(): CachedCredentials | null {
    if (!this.cache) {
      this.initialize()
    }
    return this.cache
  }

  /**
   * Save cache to localStorage
   */
  private saveCache(): void {
    if (!this.cache) return

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache))
    } catch (error) {
      console.error('[CachedCredentials] Failed to save cache:', error)
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache = null
    localStorage.removeItem(CACHE_KEY)
    console.log('[CachedCredentials] Cache cleared')
  }

  /**
   * Cache a user for offline authentication
   */
  async cacheUser(
    user: User,
    roles: DisplayRole[],
    permissions: string[]
  ): Promise<void> {
    if (!this.cache) {
      this.cache = {
        version: CACHE_VERSION,
        branchId: user.branch_id,
        lastSync: new Date().toISOString(),
        users: []
      }
    }

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    )

    const cachedUser: CachedUser = {
      id: user.id,
      username: user.username,
      pinHash: user.pin_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: roles.map((r) => r.code),
      permissions,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }

    // Update or add user
    const existingIndex = this.cache.users.findIndex((u) => u.id === user.id)

    if (existingIndex >= 0) {
      this.cache.users[existingIndex] = cachedUser
    } else {
      this.cache.users.push(cachedUser)
    }

    this.cache.lastSync = now.toISOString()
    this.saveCache()

    console.log(`[CachedCredentials] Cached user: ${user.username}`)
  }

  /**
   * Remove a user from the cache
   */
  removeUser(userId: string): void {
    if (!this.cache) return

    this.cache.users = this.cache.users.filter((u) => u.id !== userId)
    this.saveCache()
  }

  /**
   * Authenticate using cached credentials
   */
  async authenticate(username: string, pin: string): Promise<CacheAuthResult> {
    if (!this.cache) {
      this.initialize()
    }

    if (!this.cache || this.cache.users.length === 0) {
      return {
        success: false,
        error: 'No cached credentials available. Please connect to the server.'
      }
    }

    // Find user in cache
    const cachedUser = this.cache.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    )

    if (!cachedUser) {
      return {
        success: false,
        error: 'User not found in cache'
      }
    }

    // Check if cache has expired
    const now = new Date()
    const expiresAt = new Date(cachedUser.expiresAt)

    if (now > expiresAt) {
      return {
        success: false,
        error: 'Cached credentials have expired. Please connect to the server.'
      }
    }

    // Verify PIN
    const isValid = await verifyPin(pin, cachedUser.pinHash)

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid PIN'
      }
    }

    return {
      success: true,
      user: cachedUser
    }
  }

  /**
   * Get cached user by ID
   */
  getCachedUser(userId: string): CachedUser | null {
    if (!this.cache) {
      this.initialize()
    }

    return this.cache?.users.find((u) => u.id === userId) || null
  }

  /**
   * Get cached user by username
   */
  getCachedUserByUsername(username: string): CachedUser | null {
    if (!this.cache) {
      this.initialize()
    }

    return (
      this.cache?.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      ) || null
    )
  }

  /**
   * Check if cache has valid credentials
   */
  hasValidCredentials(): boolean {
    if (!this.cache) {
      this.initialize()
    }

    if (!this.cache || this.cache.users.length === 0) {
      return false
    }

    const now = new Date()

    // Check if at least one user has valid (non-expired) credentials
    return this.cache.users.some((u) => new Date(u.expiresAt) > now)
  }

  /**
   * Get time until cache expires
   */
  getTimeUntilExpiry(): number | null {
    if (!this.cache || this.cache.users.length === 0) {
      return null
    }

    // Get the earliest expiry time
    const now = Date.now()
    let earliestExpiry = Infinity

    for (const user of this.cache.users) {
      const expiryTime = new Date(user.expiresAt).getTime()

      if (expiryTime < earliestExpiry) {
        earliestExpiry = expiryTime
      }
    }

    if (earliestExpiry === Infinity) {
      return null
    }

    return Math.max(0, earliestExpiry - now)
  }

  /**
   * Get last sync timestamp
   */
  getLastSync(): string | null {
    if (!this.cache) {
      this.initialize()
    }

    return this.cache?.lastSync || null
  }

  /**
   * Update cache from sync response
   */
  updateFromSync(
    users: Array<{
      id: string
      username: string
      pin_hash: string
      first_name: string
      last_name: string
      branch_id: string
      is_active: boolean
      roles: Array<{ id: string; code: string; permissions: string[] }>
    }>,
    deletedUserIds: string[],
    branchId: string
  ): void {
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    )

    if (!this.cache) {
      this.cache = {
        version: CACHE_VERSION,
        branchId,
        lastSync: now.toISOString(),
        users: []
      }
    }

    // Remove deleted users
    for (const userId of deletedUserIds) {
      this.cache.users = this.cache.users.filter((u) => u.id !== userId)
    }

    // Update or add users
    for (const user of users) {
      if (!user.is_active) {
        // Remove inactive users from cache
        this.cache.users = this.cache.users.filter((u) => u.id !== user.id)
        continue
      }

      // Flatten permissions from all roles
      const permissions = new Set<string>()

      for (const role of user.roles) {
        for (const perm of role.permissions) {
          permissions.add(perm)
        }
      }

      const cachedUser: CachedUser = {
        id: user.id,
        username: user.username,
        pinHash: user.pin_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles.map((r) => r.code),
        permissions: Array.from(permissions),
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      }

      const existingIndex = this.cache.users.findIndex((u) => u.id === user.id)

      if (existingIndex >= 0) {
        this.cache.users[existingIndex] = cachedUser
      } else {
        this.cache.users.push(cachedUser)
      }
    }

    this.cache.branchId = branchId
    this.cache.lastSync = now.toISOString()
    this.saveCache()

    console.log(
      `[CachedCredentials] Sync complete: ${this.cache.users.length} users cached`
    )
  }

  /**
   * Prune expired users from cache
   */
  pruneExpired(): number {
    if (!this.cache) return 0

    const now = new Date()
    const originalCount = this.cache.users.length

    this.cache.users = this.cache.users.filter(
      (u) => new Date(u.expiresAt) > now
    )

    const prunedCount = originalCount - this.cache.users.length

    if (prunedCount > 0) {
      this.saveCache()
      console.log(`[CachedCredentials] Pruned ${prunedCount} expired users`)
    }

    return prunedCount
  }
}

export const cachedCredentialsService = new CachedCredentialsService()
export default cachedCredentialsService
