import type { Database as SqlJsDatabase } from 'sql.js'

export const migrationName = '002_inventory'

export function up(db: SqlJsDatabase): void {
  // Suppliers table
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      payment_terms TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name)')
  db.run('CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(is_active)')

  // Product variants table
  db.run(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      attributes TEXT,
      price_override REAL,
      cost_override REAL,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_variant_product ON product_variants(product_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variant_barcode ON product_variants(barcode)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variant_sku ON product_variants(sku)')
  db.run('CREATE INDEX IF NOT EXISTS idx_variant_active ON product_variants(is_active)')

  // Batches table
  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      expiry_date TEXT,
      manufacture_date TEXT,
      received_date TEXT NOT NULL,
      supplier_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_batch_variant ON batches(variant_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_batch_expiry ON batches(expiry_date)')
  db.run('CREATE INDEX IF NOT EXISTS idx_batch_number ON batches(batch_number)')

  // Stock movements table
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL,
      batch_id TEXT,
      quantity INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'void')),
      reference_type TEXT,
      reference_id TEXT,
      unit_cost REAL,
      reason TEXT,
      user_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_movement_variant ON stock_movements(variant_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_movement_batch ON stock_movements(batch_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_movement_type ON stock_movements(movement_type)')
  db.run('CREATE INDEX IF NOT EXISTS idx_movement_reference ON stock_movements(reference_type, reference_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_movement_created ON stock_movements(created_at)')

  // Stock alerts table
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL UNIQUE,
      alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'expired')),
      current_value REAL NOT NULL,
      threshold REAL NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_alert_variant ON stock_alerts(variant_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_alert_type ON stock_alerts(alert_type)')
  db.run('CREATE INDEX IF NOT EXISTS idx_alert_acknowledged ON stock_alerts(acknowledged)')

  // Add supplier_id column to products if not exists
  // Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we check first
  try {
    db.run('ALTER TABLE products ADD COLUMN supplier_id TEXT REFERENCES suppliers(id)')
  } catch {
    // Column already exists, ignore
  }

  // Add has_variants column to products if not exists
  try {
    db.run('ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0')
  } catch {
    // Column already exists, ignore
  }

  // Add track_batches column to products if not exists
  try {
    db.run('ALTER TABLE products ADD COLUMN track_batches INTEGER DEFAULT 0')
  } catch {
    // Column already exists, ignore
  }

  console.log('Migration 002_inventory completed')
}

export function down(db: SqlJsDatabase): void {
  db.run('DROP TABLE IF EXISTS stock_alerts')
  db.run('DROP TABLE IF EXISTS stock_movements')
  db.run('DROP TABLE IF EXISTS batches')
  db.run('DROP TABLE IF EXISTS product_variants')
  db.run('DROP TABLE IF EXISTS suppliers')

  console.log('Migration 002_inventory rolled back')
}
