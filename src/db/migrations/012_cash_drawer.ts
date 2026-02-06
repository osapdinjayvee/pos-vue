/**
 * Migration 012: Cash Drawer Management
 * Creates tables for drawer_sessions, drawer_operations, and denomination_counts
 */

import type { Database } from 'sql.js'

export const migration012_cash_drawer = {
  version: 12,
  name: '012_cash_drawer',

  up(db: Database): void {
    // Drawer sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS drawer_sessions (
        id TEXT PRIMARY KEY,
        shift_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        opening_amount REAL NOT NULL,
        expected_amount REAL,
        closing_amount REAL,
        variance REAL,
        variance_reason TEXT,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        synced_at TEXT,
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_drawer_shift ON drawer_sessions(shift_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_drawer_user ON drawer_sessions(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_drawer_status ON drawer_sessions(status)')

    // Drawer operations table
    db.run(`
      CREATE TABLE IF NOT EXISTS drawer_operations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('open', 'close', 'drop', 'paid_in', 'no_sale')),
        amount REAL,
        reason TEXT,
        authorized_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES drawer_sessions(id)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_drawer_op_session ON drawer_operations(session_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_drawer_op_type ON drawer_operations(type)')

    // Denomination counts table
    db.run(`
      CREATE TABLE IF NOT EXISTS denomination_counts (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        denomination REAL NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (operation_id) REFERENCES drawer_operations(id)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_denom_operation ON denomination_counts(operation_id)')

    console.log('[Migration] 012_cash_drawer completed')
  }
}
