/**
 * Role and Permission Seeder
 * Seeds default roles and permissions for user management
 */

import type { DatabaseAdapter } from '../adapters/DatabaseAdapter'
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '@/types/user'

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Seed default permissions
 */
export async function seedPermissions(db: DatabaseAdapter): Promise<void> {
  const now = getCurrentTimestamp()

  for (const perm of DEFAULT_PERMISSIONS) {
    // Check if permission already exists
    const existing = await db.getOne<{ id: string }>(
      'SELECT id FROM permissions WHERE code = ?',
      [perm.code]
    )

    if (!existing) {
      await db.execute(
        `INSERT INTO permissions (id, code, name, description, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [generateId(), perm.code, perm.name, perm.description, perm.category, now]
      )
    }
  }

  console.log('[Seeder] Permissions seeded')
}

/**
 * Seed default roles (Cashier, Supervisor, Admin)
 */
export async function seedRoles(db: DatabaseAdapter): Promise<void> {
  const now = getCurrentTimestamp()

  for (const role of DEFAULT_ROLES) {
    // Check if role already exists
    const existing = await db.getOne<{ id: string }>(
      'SELECT id FROM roles WHERE code = ?',
      [role.code]
    )

    if (!existing) {
      await db.execute(
        `INSERT INTO roles (id, name, code, description, is_default, is_active, permissions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          generateId(),
          role.name,
          role.code,
          role.description || null,
          role.is_default ? 1 : 0,
          JSON.stringify(role.permissions),
          now,
          now
        ]
      )
    }
  }

  console.log('[Seeder] Roles seeded')
}

/**
 * Run all role/permission seeders
 */
export async function seedRolesAndPermissions(db: DatabaseAdapter): Promise<void> {
  await seedPermissions(db)
  await seedRoles(db)
}

export default seedRolesAndPermissions
