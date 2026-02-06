/**
 * Migration 005: Reports & Analytics
 * Creates tables for X-Reading, Z-Reading, counters, and sales aggregates
 */

import type { Database } from 'sql.js'

export const migration005_reports = {
  version: 5,
  name: '005_reports',

  up(db: Database): void {
    // Z-counter (CRITICAL - never resets)
    db.run(`
      CREATE TABLE IF NOT EXISTS z_counters (
        terminal_id TEXT PRIMARY KEY,
        current_value INTEGER NOT NULL DEFAULT 0,
        last_z_date TEXT,
        updated_at TEXT NOT NULL
      )
    `)

    // X-counter (resets on Z-Reading)
    db.run(`
      CREATE TABLE IF NOT EXISTS x_counters (
        terminal_id TEXT PRIMARY KEY,
        current_value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    `)

    // Z-Reading reports
    db.run(`
      CREATE TABLE IF NOT EXISTS z_readings (
        id TEXT PRIMARY KEY,
        z_counter INTEGER NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        date TEXT NOT NULL,
        beginning_or TEXT NOT NULL,
        ending_or TEXT NOT NULL,
        beginning_balance REAL NOT NULL DEFAULT 0,
        gross_sales REAL NOT NULL,
        discount_total REAL DEFAULT 0,
        net_sales REAL NOT NULL,
        vatable_sales REAL NOT NULL,
        vat_amount REAL NOT NULL,
        vat_exempt_sales REAL DEFAULT 0,
        zero_rated_sales REAL DEFAULT 0,
        void_count INTEGER DEFAULT 0,
        void_amount REAL DEFAULT 0,
        refund_count INTEGER DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        transaction_count INTEGER NOT NULL,
        sc_discount_count INTEGER DEFAULT 0,
        pwd_discount_count INTEGER DEFAULT 0,
        generated_by TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        synced_at TEXT,
        UNIQUE(terminal_id, z_counter)
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_zreading_date ON z_readings(date)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_zreading_branch ON z_readings(branch_id)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_zreading_terminal ON z_readings(terminal_id)`)

    // X-Reading reports
    db.run(`
      CREATE TABLE IF NOT EXISTS x_readings (
        id TEXT PRIMARY KEY,
        x_counter INTEGER NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        shift_id TEXT NOT NULL,
        cashier_id TEXT NOT NULL,
        gross_sales REAL NOT NULL,
        discount_total REAL DEFAULT 0,
        net_sales REAL NOT NULL,
        vatable_sales REAL NOT NULL,
        vat_amount REAL NOT NULL,
        vat_exempt_sales REAL DEFAULT 0,
        zero_rated_sales REAL DEFAULT 0,
        transaction_count INTEGER NOT NULL,
        void_count INTEGER DEFAULT 0,
        void_amount REAL DEFAULT 0,
        beginning_or TEXT NOT NULL,
        ending_or TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        synced_at TEXT
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_xreading_shift ON x_readings(shift_id)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_xreading_terminal ON x_readings(terminal_id)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_xreading_date ON x_readings(date(generated_at))`)

    // Daily sales aggregates for fast reporting
    db.run(`
      CREATE TABLE IF NOT EXISTS sales_aggregates (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        gross_sales REAL NOT NULL,
        discount_total REAL DEFAULT 0,
        net_sales REAL NOT NULL,
        vatable_sales REAL NOT NULL,
        vat_amount REAL NOT NULL,
        vat_exempt_sales REAL DEFAULT 0,
        zero_rated_sales REAL DEFAULT 0,
        transaction_count INTEGER NOT NULL,
        void_count INTEGER DEFAULT 0,
        void_amount REAL DEFAULT 0,
        refund_count INTEGER DEFAULT 0,
        refund_amount REAL DEFAULT 0,
        cash_sales REAL DEFAULT 0,
        card_sales REAL DEFAULT 0,
        other_sales REAL DEFAULT 0,
        average_ticket REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(terminal_id, date)
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_aggregate_date ON sales_aggregates(date)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_aggregate_branch ON sales_aggregates(branch_id, date)`)

    // Initialize Z-counter for default terminal (starts at 0)
    db.run(`
      INSERT OR IGNORE INTO z_counters (terminal_id, current_value, updated_at)
      VALUES ('POS-001', 0, datetime('now'))
    `)

    // Initialize X-counter for default terminal
    db.run(`
      INSERT OR IGNORE INTO x_counters (terminal_id, current_value, updated_at)
      VALUES ('POS-001', 0, datetime('now'))
    `)
  },

  down(db: Database): void {
    db.run('DROP TABLE IF EXISTS sales_aggregates')
    db.run('DROP TABLE IF EXISTS x_readings')
    db.run('DROP TABLE IF EXISTS z_readings')
    db.run('DROP TABLE IF EXISTS x_counters')
    db.run('DROP TABLE IF EXISTS z_counters')
  }
}

export default migration005_reports
