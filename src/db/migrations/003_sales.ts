import type { Database as SqlJsDatabase } from 'sql.js'

export const migrationName = '003_sales'

export function up(db: SqlJsDatabase): void {
  // Transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      or_number TEXT UNIQUE NOT NULL,
      shift_id TEXT,
      user_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_id TEXT,
      subtotal REAL NOT NULL,
      discount_total REAL DEFAULT 0,
      vatable_sales REAL NOT NULL,
      vat_amount REAL NOT NULL,
      vat_exempt_sales REAL DEFAULT 0,
      zero_rated_sales REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      discount_type TEXT,
      discount_id_number TEXT,
      discount_id_name TEXT,
      status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_or_number ON transactions(or_number)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_shift ON transactions(shift_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status)')

  // Transaction items table
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      line_discount REAL DEFAULT 0,
      line_total REAL NOT NULL,
      tax_type TEXT NOT NULL CHECK (tax_type IN ('vatable', 'exempt', 'zero_rated')),
      vatable_amount REAL NOT NULL,
      vat_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_item_transaction ON transaction_items(transaction_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tx_item_variant ON transaction_items(variant_id)')

  // Payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'gcash', 'maya', 'other_ewallet')),
      amount REAL NOT NULL,
      tendered REAL,
      change_amount REAL,
      reference_number TEXT,
      card_last_four TEXT,
      card_type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_payment_transaction ON payments(transaction_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_payment_method ON payments(method)')

  // OR Series table
  db.run(`
    CREATE TABLE IF NOT EXISTS or_series (
      id TEXT PRIMARY KEY,
      terminal_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      prefix TEXT NOT NULL,
      branch_code TEXT NOT NULL,
      start_number INTEGER NOT NULL,
      end_number INTEGER NOT NULL,
      current_number INTEGER NOT NULL,
      ptu_number TEXT NOT NULL,
      ptu_valid_until TEXT NOT NULL,
      machine_serial TEXT NOT NULL,
      min_number TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_or_terminal ON or_series(terminal_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_or_branch ON or_series(branch_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_or_active ON or_series(is_active)')

  // Voids table
  db.run(`
    CREATE TABLE IF NOT EXISTS voids (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      supervisor_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_void_transaction ON voids(transaction_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_void_supervisor ON voids(supervisor_id)')

  // Refunds table
  db.run(`
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      original_transaction_id TEXT NOT NULL,
      refund_or_number TEXT UNIQUE NOT NULL,
      total_refund_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      supervisor_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'card', 'gcash', 'maya', 'store_credit')),
      reference_number TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (original_transaction_id) REFERENCES transactions(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_refund_transaction ON refunds(original_transaction_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_refund_or ON refunds(refund_or_number)')

  // Refund items table
  db.run(`
    CREATE TABLE IF NOT EXISTS refund_items (
      id TEXT PRIMARY KEY,
      refund_id TEXT NOT NULL,
      original_item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      refund_amount REAL NOT NULL,
      return_to_stock INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE,
      FOREIGN KEY (original_item_id) REFERENCES transaction_items(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_refund_item_refund ON refund_items(refund_id)')

  // Discounts table
  db.run(`
    CREATE TABLE IF NOT EXISTS discounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'senior_citizen', 'pwd')),
      value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      max_discount REAL,
      applicable_items TEXT DEFAULT 'all' CHECK (applicable_items IN ('all', 'category', 'specific_products')),
      category_ids TEXT,
      product_ids TEXT,
      valid_from TEXT,
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,
      requires_id INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_discount_code ON discounts(code)')
  db.run('CREATE INDEX IF NOT EXISTS idx_discount_active ON discounts(is_active)')
  db.run('CREATE INDEX IF NOT EXISTS idx_discount_type ON discounts(type)')

  // Seed default OR series for development
  const now = new Date().toISOString()
  db.run(`
    INSERT OR IGNORE INTO or_series
    (id, terminal_id, branch_id, prefix, branch_code, start_number, end_number, current_number,
     ptu_number, ptu_valid_until, machine_serial, min_number, is_active, created_at, updated_at)
    VALUES
    ('ors_default', 'POS-001', 'branch_main', 'OR', 'MAIN', 1, 10000, 0,
     'FP012026-123456789-00001', '2031-12-31', 'POS-SN-001', 'MIN123456789012345', 1, ?, ?)
  `, [now, now])

  // Seed default discounts
  db.run(`
    INSERT OR IGNORE INTO discounts
    (id, name, code, type, value, requires_id, is_active, created_at, updated_at)
    VALUES
    ('disc_senior', 'Senior Citizen Discount', 'SENIOR', 'senior_citizen', 20, 1, 1, ?, ?)
  `, [now, now])

  db.run(`
    INSERT OR IGNORE INTO discounts
    (id, name, code, type, value, requires_id, is_active, created_at, updated_at)
    VALUES
    ('disc_pwd', 'PWD Discount', 'PWD', 'pwd', 20, 1, 1, ?, ?)
  `, [now, now])

  console.log('Migration 003_sales completed')
}

export function down(db: SqlJsDatabase): void {
  db.run('DROP TABLE IF EXISTS refund_items')
  db.run('DROP TABLE IF EXISTS refunds')
  db.run('DROP TABLE IF EXISTS voids')
  db.run('DROP TABLE IF EXISTS payments')
  db.run('DROP TABLE IF EXISTS transaction_items')
  db.run('DROP TABLE IF EXISTS transactions')
  db.run('DROP TABLE IF EXISTS or_series')
  db.run('DROP TABLE IF EXISTS discounts')

  console.log('Migration 003_sales rolled back')
}
