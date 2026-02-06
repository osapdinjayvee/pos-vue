/**
 * User Seeder
 * Seeds default admin user for development
 */

import type { DatabaseAdapter } from '../adapters/DatabaseAdapter'
import { hashPinSync } from '@/utils/crypto'

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

// Default branch ID for development
const DEFAULT_BRANCH_ID = 'default-branch-001'

/**
 * Seed default admin user
 * Username: admin
 * PIN: 1234
 */
export async function seedAdminUser(db: DatabaseAdapter): Promise<void> {
  const now = getCurrentTimestamp()

  // Check if admin user already exists
  const existingAdmin = await db.getOne<{ id: string }>(
    'SELECT id FROM users WHERE username = ?',
    ['admin']
  )

  if (existingAdmin) {
    console.log('[Seeder] Admin user already exists')
    return
  }

  // Create admin user
  const adminId = generateId()
  const pinHash = hashPinSync('1234')

  await db.execute(
    `INSERT INTO users (id, username, pin_hash, password_hash, first_name, last_name, email, branch_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      adminId,
      'admin',
      pinHash,
      null,
      'System',
      'Administrator',
      'admin@pos.local',
      DEFAULT_BRANCH_ID,
      now,
      now
    ]
  )

  // Get admin role ID
  const adminRole = await db.getOne<{ id: string }>(
    'SELECT id FROM roles WHERE code = ?',
    ['admin']
  )

  if (adminRole) {
    // Assign admin role to user
    await db.execute(
      `INSERT INTO user_roles (id, user_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, NULL)`,
      [generateId(), adminId, adminRole.id, now]
    )
  }

  console.log('[Seeder] Admin user created (username: admin, PIN: 1234)')
}

/**
 * Seed test cashier user
 * Username: cashier01
 * PIN: 1111
 */
export async function seedTestCashier(db: DatabaseAdapter): Promise<void> {
  const now = getCurrentTimestamp()

  // Check if cashier user already exists
  const existingCashier = await db.getOne<{ id: string }>(
    'SELECT id FROM users WHERE username = ?',
    ['cashier01']
  )

  if (existingCashier) {
    console.log('[Seeder] Cashier user already exists')
    return
  }

  // Create cashier user
  const cashierId = generateId()
  const pinHash = hashPinSync('1111')

  await db.execute(
    `INSERT INTO users (id, username, pin_hash, password_hash, first_name, last_name, email, branch_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      cashierId,
      'cashier01',
      pinHash,
      null,
      'Test',
      'Cashier',
      null,
      DEFAULT_BRANCH_ID,
      now,
      now
    ]
  )

  // Get cashier role ID
  const cashierRole = await db.getOne<{ id: string }>(
    'SELECT id FROM roles WHERE code = ?',
    ['cashier']
  )

  if (cashierRole) {
    // Assign cashier role to user
    await db.execute(
      `INSERT INTO user_roles (id, user_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, NULL)`,
      [generateId(), cashierId, cashierRole.id, now]
    )
  }

  console.log('[Seeder] Cashier user created (username: cashier01, PIN: 1111)')
}

/**
 * Seed test supervisor user
 * Username: supervisor01
 * PIN: 2222
 */
export async function seedTestSupervisor(db: DatabaseAdapter): Promise<void> {
  const now = getCurrentTimestamp()

  // Check if supervisor user already exists
  const existingSupervisor = await db.getOne<{ id: string }>(
    'SELECT id FROM users WHERE username = ?',
    ['supervisor01']
  )

  if (existingSupervisor) {
    console.log('[Seeder] Supervisor user already exists')
    return
  }

  // Create supervisor user
  const supervisorId = generateId()
  const pinHash = hashPinSync('2222')

  await db.execute(
    `INSERT INTO users (id, username, pin_hash, password_hash, first_name, last_name, email, branch_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      supervisorId,
      'supervisor01',
      pinHash,
      null,
      'Test',
      'Supervisor',
      null,
      DEFAULT_BRANCH_ID,
      now,
      now
    ]
  )

  // Get supervisor role ID
  const supervisorRole = await db.getOne<{ id: string }>(
    'SELECT id FROM roles WHERE code = ?',
    ['supervisor']
  )

  if (supervisorRole) {
    // Assign supervisor role to user
    await db.execute(
      `INSERT INTO user_roles (id, user_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, NULL)`,
      [generateId(), supervisorId, supervisorRole.id, now]
    )
  }

  console.log('[Seeder] Supervisor user created (username: supervisor01, PIN: 2222)')
}

/**
 * Run all user seeders for development
 */
export async function seedUsers(db: DatabaseAdapter): Promise<void> {
  await seedAdminUser(db)
  await seedTestCashier(db)
  await seedTestSupervisor(db)
}

export default seedUsers
