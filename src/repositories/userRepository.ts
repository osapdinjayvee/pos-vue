/**
 * User Repository
 * Data access for users and user-role assignments
 */

import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { User, UserRole, Role, DisplayRole } from '@/types/user'
import { toDisplayRole } from '@/types/user'

class UserRepository extends BaseRepository<User> {
  protected tableName = 'users'
  protected idPrefix = 'usr'

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return await db.getOne<User>(
      `SELECT * FROM ${this.tableName} WHERE username = ? AND is_active = 1`,
      [username.toLowerCase()]
    )
  }

  /**
   * Find user by username (including inactive)
   */
  async findByUsernameAll(username: string): Promise<User | null> {
    return await db.getOne<User>(
      `SELECT * FROM ${this.tableName} WHERE username = ?`,
      [username.toLowerCase()]
    )
  }

  /**
   * Find all active users
   */
  async findAllActive(options?: QueryOptions): Promise<User[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY first_name ASC, last_name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<User>(sql)
  }

  /**
   * Find users by branch
   */
  async findByBranch(branchId: string, options?: QueryOptions): Promise<User[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE branch_id = ? AND is_active = 1`
    const params: any[] = [branchId]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY first_name ASC, last_name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<User>(sql, params)
  }

  /**
   * Search users by name or username
   */
  async search(query: string, options?: QueryOptions): Promise<User[]> {
    const searchTerm = `%${query}%`
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE (username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
      AND is_active = 1
    `
    const params: any[] = [searchTerm, searchTerm, searchTerm]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY first_name ASC, last_name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<User>(sql, params)
  }

  /**
   * Check if username exists (for validation)
   */
  async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE username = ?`
    const params: any[] = [username.toLowerCase()]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await db.execute(
      `UPDATE ${this.tableName} SET last_login_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), userId]
    )
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(userId: string): Promise<User | null> {
    return await this.update(userId, { is_active: 0 } as Partial<User>)
  }

  /**
   * Reactivate user
   */
  async reactivate(userId: string): Promise<User | null> {
    return await this.update(userId, { is_active: 1 } as Partial<User>)
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<DisplayRole[]> {
    const roles = await db.query<Role>(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.is_active = 1`,
      [userId]
    )

    return roles.map(toDisplayRole)
  }

  /**
   * Get user permissions (flattened from all roles)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await db.query<{ permissions: string }>(
      `SELECT r.permissions FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.is_active = 1`,
      [userId]
    )

    const permissionSet = new Set<string>()

    for (const role of roles) {
      const permissions = JSON.parse(role.permissions) as string[]
      for (const perm of permissions) {
        permissionSet.add(perm)
      }
    }

    return Array.from(permissionSet)
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy?: string
  ): Promise<UserRole> {
    const id = db.generateId('ur')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, roleId, now, assignedBy || null]
    )

    const result = await db.getOne<UserRole>(
      'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?',
      [userId, roleId]
    )

    return result!
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    const result = await db.execute(
      'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
      [userId, roleId]
    )

    return result.changes > 0
  }

  /**
   * Set user roles (replace all)
   */
  async setRoles(
    userId: string,
    roleIds: string[],
    assignedBy?: string
  ): Promise<void> {
    // Remove all existing roles
    await db.execute('DELETE FROM user_roles WHERE user_id = ?', [userId])

    // Assign new roles
    for (const roleId of roleIds) {
      await this.assignRole(userId, roleId, assignedBy)
    }
  }

  /**
   * Count active admins (for preventing last admin deactivation)
   */
  async countActiveAdmins(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.is_active = 1 AND r.code = 'admin'`
    )

    return result?.count || 0
  }

  /**
   * Check if user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.code = 'admin'`,
      [userId]
    )

    return (result?.count || 0) > 0
  }

  /**
   * Get users with a specific role
   */
  async findByRole(roleCode: string, options?: QueryOptions): Promise<User[]> {
    let sql = `
      SELECT u.* FROM ${this.tableName} u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE r.code = ? AND u.is_active = 1
    `
    const params: any[] = [roleCode]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY u.first_name ASC, u.last_name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<User>(sql, params)
  }
}

export const userRepository = new UserRepository()
export default userRepository
