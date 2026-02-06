/**
 * Migration 010: CRM & Loyalty Programs
 * Creates tables for loyalty_transactions, membership_tiers, and loyalty_config
 * Seeds default tiers (Bronze/Silver/Gold/Platinum) and default loyalty config
 */

import type { Database } from 'sql.js'

export const migration010_crm = {
  version: 10,
  name: '010_crm',

  up(db: Database): void {
    // Membership tiers table
    db.run(`
      CREATE TABLE IF NOT EXISTS membership_tiers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        min_spend REAL NOT NULL DEFAULT 0,
        discount_rate REAL NOT NULL DEFAULT 0,
        points_multiplier REAL NOT NULL DEFAULT 1,
        benefits TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_tier_spend ON membership_tiers(min_spend)')
    db.run('CREATE INDEX IF NOT EXISTS idx_tier_active ON membership_tiers(is_active)')

    // Loyalty transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjustment')),
        points INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        transaction_id TEXT,
        reason TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `)
    db.run('CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_transactions(customer_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_loyalty_transaction ON loyalty_transactions(transaction_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_loyalty_type ON loyalty_transactions(type)')
    db.run('CREATE INDEX IF NOT EXISTS idx_loyalty_created ON loyalty_transactions(created_at)')

    // Loyalty config table
    db.run(`
      CREATE TABLE IF NOT EXISTS loyalty_config (
        id TEXT PRIMARY KEY,
        earn_rate REAL NOT NULL DEFAULT 0.01,
        redeem_rate REAL NOT NULL DEFAULT 0.10,
        expiry_days INTEGER NOT NULL DEFAULT 365,
        min_redemption INTEGER NOT NULL DEFAULT 100,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // Seed default tiers
    const now = new Date().toISOString()

    db.run(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-bronze', 'Bronze', 0, 0, 1, JSON.stringify(['Basic loyalty points earning']), 1, 1, now, now]
    )
    db.run(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-silver', 'Silver', 10000, 0.03, 1.25, JSON.stringify(['3% member discount', '1.25x points multiplier']), 2, 1, now, now]
    )
    db.run(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-gold', 'Gold', 50000, 0.05, 1.5, JSON.stringify(['5% member discount', '1.5x points multiplier']), 3, 1, now, now]
    )
    db.run(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-platinum', 'Platinum', 100000, 0.10, 2, JSON.stringify(['10% member discount', '2x points multiplier']), 4, 1, now, now]
    )

    // Seed default loyalty config
    db.run(
      `INSERT OR IGNORE INTO loyalty_config (id, earn_rate, redeem_rate, expiry_days, min_redemption, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['default', 0.01, 0.10, 365, 100, 1, now, now]
    )

    console.log('[Migration] 010_crm completed')
  }
}
