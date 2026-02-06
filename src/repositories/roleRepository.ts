/**
 * Role Repository
 * Data access for roles and permissions
 */

import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Role, RoleInput, Permission } from '@/types/user'

class RoleRepository extends BaseRepository<Role> {
  protected tableName = 'roles'
  protected idPrefix = 'role'

  /**
   * Find role by code
   */
  async findByCode(code: string): Promise<Role | null> {
    return await db.getOne<Role>(
      `SELECT * FROM ${this.tableName} WHERE code = ?`,
      [code]
    )
  }

  /**
   * Find all active roles
   */
  async findAllActive(options?: QueryOptions): Promise<Role[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY is_default DESC, name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Role>(sql)
  }

  /**
   * Find default roles only
   */
  async findDefaultRoles(): Promise<Role[]> {
    return await db.query<Role>(
      `SELECT * FROM ${this.tableName} WHERE is_default = 1 AND is_active = 1 ORDER BY name ASC`
    )
  }

  /**
   * Find custom roles only
   */
  async findCustomRoles(): Promise<Role[]> {
    return await db.query<Role>(
      `SELECT * FROM ${this.tableName} WHERE is_default = 0 AND is_active = 1 ORDER BY name ASC`
    )
  }

  /**
   * Check if role code exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE code = ?`
    const params: any[] = [code]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  /**
   * Check if role name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE name = ?`
    const params: any[] = [name]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  /**
   * Create role with input
   */
  async createRole(input: RoleInput): Promise<Role> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, name, code, description, is_default, is_active, permissions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        input.name,
        input.code,
        input.description || null,
        input.is_default ? 1 : 0,
        JSON.stringify(input.permissions),
        now,
        now
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Update role permissions
   */
  async updatePermissions(roleId: string, permissions: string[]): Promise<Role | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET permissions = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(permissions), db.getCurrentTimestamp(), roleId]
    )

    return await this.findById(roleId)
  }

  /**
   * Deactivate role
   */
  async deactivate(roleId: string): Promise<Role | null> {
    return await this.update(roleId, { is_active: 0 } as Partial<Role>)
  }

  /**
   * Reactivate role
   */
  async reactivate(roleId: string): Promise<Role | null> {
    return await this.update(roleId, { is_active: 1 } as Partial<Role>)
  }

  /**
   * Get users count for a role
   */
  async getUsersCount(roleId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?`,
      [roleId]
    )

    return result?.count || 0
  }

  /**
   * Check if role can be deleted (not default, no users)
   */
  async canDelete(roleId: string): Promise<{ canDelete: boolean; reason?: string }> {
    const role = await this.findById(roleId)

    if (!role) {
      return { canDelete: false, reason: 'Role not found' }
    }

    if (role.is_default) {
      return { canDelete: false, reason: 'Default roles cannot be deleted' }
    }

    const usersCount = await this.getUsersCount(roleId)
    if (usersCount > 0) {
      return { canDelete: false, reason: `Role is assigned to ${usersCount} user(s)` }
    }

    return { canDelete: true }
  }
}

class PermissionRepository extends BaseRepository<Permission> {
  protected tableName = 'permissions'
  protected idPrefix = 'perm'

  /**
   * Find permission by code
   */
  async findByCode(code: string): Promise<Permission | null> {
    return await db.getOne<Permission>(
      `SELECT * FROM ${this.tableName} WHERE code = ?`,
      [code]
    )
  }

  /**
   * Find permissions by category
   */
  async findByCategory(category: string): Promise<Permission[]> {
    return await db.query<Permission>(
      `SELECT * FROM ${this.tableName} WHERE category = ? ORDER BY name ASC`,
      [category]
    )
  }

  /**
   * Get all permissions grouped by category
   */
  async getAllGroupedByCategory(): Promise<Record<string, Permission[]>> {
    const permissions = await db.query<Permission>(
      `SELECT * FROM ${this.tableName} ORDER BY category ASC, name ASC`
    )

    const grouped: Record<string, Permission[]> = {}

    for (const permission of permissions) {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    }

    return grouped
  }

  /**
   * Get all permission codes
   */
  async getAllCodes(): Promise<string[]> {
    const permissions = await db.query<{ code: string }>(
      `SELECT code FROM ${this.tableName} ORDER BY code ASC`
    )

    return permissions.map((p) => p.code)
  }
}

export const roleRepository = new RoleRepository()
export const permissionRepository = new PermissionRepository()
export default roleRepository
