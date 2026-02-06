/**
 * Migration 004: User Management Tables
 * Creates users, roles, permissions, user_roles, shifts, and auth_logs tables
 */

import type { DatabaseAdapter } from '../adapters/DatabaseAdapter'

export const migration004_user_management = {
  version: 4,
  name: '004_user_management',

  async up(db: DatabaseAdapter): Promise<void> {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT,
        branch_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_username ON users(username)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_branch ON users(branch_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_active ON users(is_active)`)

    // Roles table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_role_code ON roles(code)`)

    // Permissions reference table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_permission_code ON permissions(code)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_permission_category ON permissions(category)`)

    // User roles junction table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        assigned_by TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (role_id) REFERENCES roles(id),
        UNIQUE(user_id, role_id)
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)`)

    // Shifts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        opening_cash REAL NOT NULL,
        closing_cash REAL,
        expected_cash REAL,
        variance REAL,
        variance_reason TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        closed_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_shift_user ON shifts(user_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_shift_status ON shifts(status)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_shift_branch_date ON shifts(branch_id, started_at)`)

    // Auth logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT NOT NULL,
        event_type TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        failure_reason TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_authlog_user ON auth_logs(user_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_authlog_created ON auth_logs(created_at)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_authlog_type ON auth_logs(event_type)`)

    console.log('[Migration 004] User management tables created')
  },

  async down(db: DatabaseAdapter): Promise<void> {
    await db.execute('DROP TABLE IF EXISTS auth_logs')
    await db.execute('DROP TABLE IF EXISTS shifts')
    await db.execute('DROP TABLE IF EXISTS user_roles')
    await db.execute('DROP TABLE IF EXISTS permissions')
    await db.execute('DROP TABLE IF EXISTS roles')
    await db.execute('DROP TABLE IF EXISTS users')

    console.log('[Migration 004] User management tables dropped')
  }
}

export default migration004_user_management
