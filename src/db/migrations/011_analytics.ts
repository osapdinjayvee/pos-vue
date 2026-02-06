/**
 * Migration 011: Advanced Analytics
 * Creates tables for sales_hourly, product_daily, and saved_reports
 * Adds indexes for efficient analytics queries
 */

import type { Database } from 'sql.js'

export const migration011_analytics = {
  version: 11,
  name: '011_analytics',

  up(db: Database): void {
    // Hourly sales aggregates for time-based analysis
    db.run(`
      CREATE TABLE IF NOT EXISTS sales_hourly (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        sales REAL NOT NULL DEFAULT 0,
        transaction_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(terminal_id, date, hour)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_sales_hourly_date ON sales_hourly(date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_sales_hourly_branch ON sales_hourly(branch_id, date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_sales_hourly_terminal ON sales_hourly(terminal_id, date)')

    // Product daily aggregates for product analytics
    db.run(`
      CREATE TABLE IF NOT EXISTS product_daily (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        category_id TEXT,
        branch_id TEXT NOT NULL,
        quantity_sold INTEGER NOT NULL DEFAULT 0,
        revenue REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        profit REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(product_id, date, branch_id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_product_daily_date ON product_daily(date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_product_daily_product ON product_daily(product_id, date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_product_daily_category ON product_daily(category_id, date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_product_daily_branch ON product_daily(branch_id, date)')

    // Saved reports for custom report builder
    db.run(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(type)')

    console.log('[Migration] 011_analytics completed')
  }
}
