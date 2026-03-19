/**
 * Unified Database Service
 * Provides a platform-agnostic database interface using the adapter pattern
 * Maintains the same public API for backward compatibility with existing repositories
 */

import { DatabaseFactory } from './DatabaseFactory'
import { hashPinSync } from '@/utils/crypto'
import type {
  DatabaseAdapter,
  DatabaseConfig,
  QueryResult,
  TransactionContext
} from './adapters/DatabaseAdapter'
import type { Platform } from './platform'

export type { DatabaseConfig } from './adapters/DatabaseAdapter'

const DEFAULT_CONFIG: DatabaseConfig = {
  name: 'pos_database',
  version: 1
}

/**
 * Unified Database Service
 * Singleton that manages the database connection and provides query methods
 */
class DatabaseService {
  private adapter: DatabaseAdapter | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the database
   * Automatically selects the appropriate adapter based on platform
   */
  async initialize(config: DatabaseConfig = DEFAULT_CONFIG): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise
    }

    // Already initialized
    if (this.adapter?.isInitialized()) {
      return
    }

    this.initPromise = this._doInitialize(config)

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async _doInitialize(config: DatabaseConfig): Promise<void> {
    try {
      // Create platform-specific adapter
      this.adapter = await DatabaseFactory.createAdapter()

      // Initialize the adapter
      await this.adapter.initialize(config)

      // Run migrations
      await this.runMigrations()

      console.log(
        `[DatabaseService] Database initialized on ${this.adapter.getPlatform()} platform`
      )
    } catch (error) {
      console.error('[DatabaseService] Initialization failed:', error)
      this.adapter = null
      throw error
    }
  }

  /**
   * Run all database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Create migrations table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const migrations = await this.getExecutedMigrations()

    // Run migrations in order
    if (!migrations.includes('001_initial')) {
      await this.runInitialMigration()
      await this.recordMigration('001_initial')
    }

    if (!migrations.includes('002_inventory')) {
      await this.runInventoryMigration()
      await this.recordMigration('002_inventory')
    }

    if (!migrations.includes('003_wholesale_pricing')) {
      await this.runWholesalePricingMigration()
      await this.recordMigration('003_wholesale_pricing')
    }

    if (!migrations.includes('004_price_history')) {
      await this.runPriceHistoryMigration()
      await this.recordMigration('004_price_history')
    }

    if (!migrations.includes('005_orders_customers_payments')) {
      await this.runOrdersCustomersPaymentsMigration()
      await this.recordMigration('005_orders_customers_payments')
    }

    if (!migrations.includes('006_user_management')) {
      await this.runUserManagementMigration()
      await this.recordMigration('006_user_management')
    }

    if (!migrations.includes('007_reports')) {
      await this.runReportsMigration()
      await this.recordMigration('007_reports')
    }

    if (!migrations.includes('008_fix_admin_hash')) {
      await this.runFixAdminHashMigration()
      await this.recordMigration('008_fix_admin_hash')
    }

    if (!migrations.includes('009_sync')) {
      await this.runSyncMigration()
      await this.recordMigration('009_sync')
    }

    if (!migrations.includes('010_crm')) {
      await this.runCrmMigration()
      await this.recordMigration('010_crm')
    }

    if (!migrations.includes('011_analytics')) {
      await this.runAnalyticsMigration()
      await this.recordMigration('011_analytics')
    }

    if (!migrations.includes('012_cash_drawer')) {
      await this.runCashDrawerMigration()
      await this.recordMigration('012_cash_drawer')
    }

    if (!migrations.includes('013_offline_sync')) {
      await this.runOfflineSyncMigration()
      await this.recordMigration('013_offline_sync')
    }

    if (!migrations.includes('014_eis')) {
      await this.runEisMigration()
      await this.recordMigration('014_eis')
    }

    if (!migrations.includes('015_sales')) {
      await this.runSalesMigration()
      await this.recordMigration('015_sales')
    }

    if (!migrations.includes('016_system_settings')) {
      await this.runSystemSettingsMigration()
      await this.recordMigration('016_system_settings')
    }

    if (!migrations.includes('017_discount_management')) {
      await this.runDiscountManagementMigration()
      await this.recordMigration('017_discount_management')
    }

    if (!migrations.includes('018_transaction_payments')) {
      await this.runTransactionPaymentsMigration()
      await this.recordMigration('018_transaction_payments')
    }

    if (!migrations.includes('019_logo_url')) {
      await this.runLogoUrlMigration()
      await this.recordMigration('019_logo_url')
    }

    if (!migrations.includes('020_onboarding')) {
      await this.runOnboardingMigration()
      await this.recordMigration('020_onboarding')
    }

    if (!migrations.includes('021_slideshow_display')) {
      await this.runSlideshowDisplayMigration()
      await this.recordMigration('021_slideshow_display')
    }

    if (!migrations.includes('022_fix_utc_timestamps')) {
      await this.runFixUtcTimestampsMigration()
      await this.recordMigration('022_fix_utc_timestamps')
    }

    if (!migrations.includes('023_device_registration')) {
      await this.runDeviceRegistrationMigration()
      await this.recordMigration('023_device_registration')
    }

    if (!migrations.includes('024_credit_ledger')) {
      await this.runCreditLedgerMigration()
      await this.recordMigration('024_credit_ledger')
    }

    // Safety net: if localStorage DB was corrupted/stale, re-run critical table creation
    await this.ensureCriticalTables()
  }

  /**
   * Verify critical tables exist with required columns and re-create if missing/stale.
   * Handles case where localStorage DB is stale after a quota-exceeded save failure
   * or has an outdated schema from an older version.
   */
  private async ensureCriticalTables(): Promise<void> {
    if (!this.adapter) return

    const criticalTables = ['transactions', 'transaction_items', 'transaction_payments', 'or_series', 'voids', 'refunds', 'refund_items']
    for (const table of criticalTables) {
      const result = await this.adapter.getOne<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [table]
      )
      if (!result) {
        console.warn(`[DatabaseService] Critical table "${table}" missing — re-running sales migrations`)
        await this.runSalesMigration()
        await this.runTransactionPaymentsMigration()
        return
      }
    }

    // Verify transaction_payments has correct schema (payment_method column + wide CHECK constraint)
    const txPayCols = await this.adapter.query<{ name: string }>(
      `PRAGMA table_info(transaction_payments)`
    )
    const txPayColNames = new Set(txPayCols.map(c => c.name))
    // Check the CREATE TABLE DDL for stale CHECK constraint missing 'credit'
    const txPayDDL = await this.adapter.getOne<{ sql: string }>(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='transaction_payments'`
    )
    const needsRecreate = !txPayColNames.has('payment_method')
      || (txPayDDL?.sql && !txPayDDL.sql.includes("'credit'"))

    if (needsRecreate) {
      console.warn('[DatabaseService] transaction_payments has stale schema — recreating with updated CHECK')
      // Backup existing data, handling both 'method' and 'payment_method' column names
      const hasMethodCol = txPayColNames.has('method')
      const hasPaymentMethodCol = txPayColNames.has('payment_method')
      let existingData: any[] = []
      try {
        if (hasPaymentMethodCol) {
          existingData = await this.adapter.query<any>(`SELECT * FROM transaction_payments`)
        } else if (hasMethodCol) {
          existingData = await this.adapter.query<any>(
            `SELECT id, transaction_id, method as payment_method, amount, tendered, change_amount, reference_number, card_type, last_four_digits, approval_code, status, created_at FROM transaction_payments`
          )
        }
      } catch { existingData = [] }

      await this.adapter.execute(`DROP TABLE IF EXISTS transaction_payments`)
      await this.runTransactionPaymentsMigration()

      for (const p of existingData) {
        try {
          await this.adapter.execute(
            `INSERT OR IGNORE INTO transaction_payments (id, transaction_id, payment_method, amount, tendered, change_amount, reference_number, card_type, last_four_digits, approval_code, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.transaction_id, p.payment_method, p.amount, p.tendered, p.change_amount, p.reference_number, p.card_type, p.last_four_digits || null, p.approval_code || null, p.status || 'completed', p.created_at]
          )
        } catch { /* skip rows that fail constraint */ }
      }
    }

    // Verify transaction_items has required columns (stale DB may lack them)
    const cols = await this.adapter.query<{ name: string }>(
      `PRAGMA table_info(transaction_items)`
    )
    const colNames = new Set(cols.map(c => c.name))
    if (!colNames.has('product_id')) {
      console.warn('[DatabaseService] transaction_items missing product_id — dropping and re-creating sales tables')
      for (const t of ['refund_items', 'refunds', 'voids', 'transaction_items', 'transactions']) {
        await this.adapter.execute(`DROP TABLE IF EXISTS ${t}`)
      }
      await this.runSalesMigration()
    }

    // Verify customers table has CRM columns (tier_id, lifetime_spend)
    const custCols = await this.adapter.query<{ name: string }>(
      `PRAGMA table_info(customers)`
    )
    const custColNames = new Set(custCols.map(c => c.name))
    if (!custColNames.has('tier_id')) {
      console.warn('[DatabaseService] customers missing tier_id — adding CRM columns')
      try { await this.adapter.execute(`ALTER TABLE customers ADD COLUMN tier_id TEXT DEFAULT 'tier-bronze'`) } catch { /* exists */ }
    }
    if (!custColNames.has('lifetime_spend')) {
      console.warn('[DatabaseService] customers missing lifetime_spend — adding column')
      try { await this.adapter.execute(`ALTER TABLE customers ADD COLUMN lifetime_spend REAL DEFAULT 0`) } catch { /* exists */ }
    }
  }

  private async getExecutedMigrations(): Promise<string[]> {
    if (!this.adapter) return []
    const results = await this.adapter.query<{ name: string }>(
      'SELECT name FROM migrations'
    )
    return results.map((row) => row.name)
  }

  private async recordMigration(name: string): Promise<void> {
    if (!this.adapter) return
    await this.adapter.execute('INSERT INTO migrations (name) VALUES (?)', [name])
  }

  // =====================
  // Migration Definitions
  // =====================

  private async runInitialMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Categories table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        parent_id TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      )
    `)

    // Products table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        price REAL NOT NULL DEFAULT 0,
        cost REAL DEFAULT 0,
        sku TEXT UNIQUE,
        barcode TEXT,
        category_id TEXT,
        stock INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active',
        tax_type TEXT DEFAULT 'vatable',
        sold INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        expiration_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `)

    // Create indexes
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)'
    )

    // Seed default categories
    const defaultCategories = [
      { id: 'cat-001', name: 'Electronics', icon: 'pi pi-desktop', order: 1 },
      { id: 'cat-002', name: 'Clothing', icon: 'pi pi-tag', order: 2 },
      { id: 'cat-003', name: 'Food', icon: 'pi pi-shopping-bag', order: 3 },
      { id: 'cat-004', name: 'Beverages', icon: 'pi pi-box', order: 4 },
      { id: 'cat-005', name: 'Accessories', icon: 'pi pi-gift', order: 5 },
      { id: 'cat-006', name: 'Home', icon: 'pi pi-home', order: 6 },
      { id: 'cat-007', name: 'Beauty', icon: 'pi pi-heart', order: 7 },
      { id: 'cat-008', name: 'Sports', icon: 'pi pi-bolt', order: 8 }
    ]

    for (const cat of defaultCategories) {
      await this.adapter.execute(
        'INSERT OR IGNORE INTO categories (id, name, icon, display_order) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.icon, cat.order]
      )
    }

    console.log('[Migration] 001_initial completed')
  }

  private async runInventoryMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Suppliers table
    await this.adapter.execute(`
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
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(is_active)'
    )

    // Product variants table
    await this.adapter.execute(`
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
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_variant_product ON product_variants(product_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_variant_barcode ON product_variants(barcode)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_variant_sku ON product_variants(sku)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_variant_active ON product_variants(is_active)'
    )

    // Batches table
    await this.adapter.execute(`
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
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_batch_variant ON batches(variant_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_batch_expiry ON batches(expiry_date)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_batch_number ON batches(batch_number)'
    )

    // Stock movements table
    await this.adapter.execute(`
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
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_movement_variant ON stock_movements(variant_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_movement_batch ON stock_movements(batch_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_movement_type ON stock_movements(movement_type)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_movement_reference ON stock_movements(reference_type, reference_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_movement_created ON stock_movements(created_at)'
    )

    // Stock alerts table
    await this.adapter.execute(`
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
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_alert_variant ON stock_alerts(variant_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_alert_type ON stock_alerts(alert_type)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_alert_acknowledged ON stock_alerts(acknowledged)'
    )

    // Add columns to products table (using try-catch for idempotency)
    const alterStatements = [
      'ALTER TABLE products ADD COLUMN supplier_id TEXT REFERENCES suppliers(id)',
      'ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0',
      'ALTER TABLE products ADD COLUMN track_batches INTEGER DEFAULT 0'
    ]

    for (const stmt of alterStatements) {
      try {
        await this.adapter.execute(stmt)
      } catch {
        // Column already exists, ignore
      }
    }

    console.log('[Migration] 002_inventory completed')
  }

  private async runWholesalePricingMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    const alterStatements = [
      'ALTER TABLE products ADD COLUMN wholesale_price REAL',
      'ALTER TABLE products ADD COLUMN wholesale_min_qty INTEGER DEFAULT 1',
      'ALTER TABLE products ADD COLUMN auto_apply_wholesale INTEGER DEFAULT 0'
    ]

    for (const stmt of alterStatements) {
      try {
        await this.adapter.execute(stmt)
      } catch {
        // Column already exists, ignore
      }
    }

    console.log('[Migration] 003_wholesale_pricing completed')
  }

  private async runPriceHistoryMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS price_history (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        old_price REAL,
        new_price REAL NOT NULL,
        old_cost REAL,
        new_cost REAL,
        change_type TEXT NOT NULL CHECK (change_type IN ('price', 'cost', 'both')),
        reason TEXT,
        user_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_price_history_created ON price_history(created_at)'
    )

    console.log('[Migration] 004_price_history completed')
  }

  private async runOrdersCustomersPaymentsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Customers table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'PH',
        tax_id TEXT,
        customer_type TEXT DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale', 'vip')),
        credit_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        loyalty_points INTEGER DEFAULT 0,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers(phone)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_customer_email ON customers(email)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_customer_type ON customers(customer_type)'
    )

    // Orders table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded', 'void')),
        order_type TEXT DEFAULT 'sale' CHECK (order_type IN ('sale', 'return', 'exchange', 'layaway')),
        subtotal REAL NOT NULL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'coupon')),
        discount_reason TEXT,
        tax_amount REAL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        change_amount REAL DEFAULT 0,
        notes TEXT,
        user_id TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        shift_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        synced_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_number ON orders(order_number)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_customer ON orders(customer_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_created ON orders(created_at)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_user ON orders(user_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_terminal ON orders(terminal_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_branch ON orders(branch_id)'
    )

    // Order items table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        batch_id TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id),
        FOREIGN KEY (batch_id) REFERENCES batches(id)
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_items(order_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_item_product ON order_items(product_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_order_item_variant ON order_items(variant_id)'
    )

    // Payments table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'gcash', 'maya', 'bank_transfer', 'credit', 'points', 'other')),
        amount REAL NOT NULL,
        reference_number TEXT,
        card_type TEXT,
        card_last_four TEXT,
        approval_code TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'void')),
        notes TEXT,
        processed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_payment_order ON payments(order_id)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_payment_method ON payments(payment_method)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_payment_status ON payments(status)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_payment_processed ON payments(processed_at)'
    )

    // Payment methods configuration table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'ewallet', 'bank', 'credit', 'other')),
        is_active INTEGER DEFAULT 1,
        requires_reference INTEGER DEFAULT 0,
        icon TEXT,
        display_order INTEGER DEFAULT 0,
        settings TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // Seed default payment methods
    const now = this.getCurrentTimestamp()
    const paymentMethods = [
      { id: 'pm-cash', name: 'Cash', code: 'cash', type: 'cash', order: 1, req: 0 },
      { id: 'pm-card', name: 'Credit/Debit Card', code: 'card', type: 'card', order: 2, req: 1 },
      { id: 'pm-gcash', name: 'GCash', code: 'gcash', type: 'ewallet', order: 3, req: 1 },
      { id: 'pm-maya', name: 'Maya', code: 'maya', type: 'ewallet', order: 4, req: 1 }
    ]

    for (const pm of paymentMethods) {
      await this.adapter.execute(
        `INSERT OR IGNORE INTO payment_methods (id, name, code, type, display_order, requires_reference, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pm.id, pm.name, pm.code, pm.type, pm.order, pm.req, now, now]
      )
    }

    // Discounts/Coupons table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS discounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
        value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_discount REAL,
        start_date TEXT,
        end_date TEXT,
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        applicable_to TEXT DEFAULT 'all' CHECK (applicable_to IN ('all', 'category', 'product', 'customer_type')),
        applicable_ids TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_discount_code ON discounts(code)'
    )
    await this.adapter.execute(
      'CREATE INDEX IF NOT EXISTS idx_discount_active ON discounts(is_active)'
    )

    console.log('[Migration] 005_orders_customers_payments completed')
  }

  private async runUserManagementMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Users table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_user_username ON users(username)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_user_branch ON users(branch_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_user_active ON users(is_active)')

    // Roles table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_role_code ON roles(code)')

    // Permissions reference table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_permission_code ON permissions(code)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_permission_category ON permissions(category)')

    // User roles junction table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)')

    // Shifts table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_shift_user ON shifts(user_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_shift_status ON shifts(status)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_shift_branch_date ON shifts(branch_id, started_at)')

    // Auth logs table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_authlog_user ON auth_logs(user_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_authlog_created ON auth_logs(created_at)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_authlog_type ON auth_logs(event_type)')

    // Seed default roles
    const now = this.getCurrentTimestamp()
    const defaultRoles = [
      {
        id: 'role-admin',
        name: 'Administrator',
        code: 'admin',
        description: 'Full system access',
        is_default: 0,
        permissions: JSON.stringify(['*'])
      },
      {
        id: 'role-manager',
        name: 'Manager',
        code: 'manager',
        description: 'Store management access',
        is_default: 0,
        permissions: JSON.stringify([
          'pos.*', 'products.*', 'inventory.*', 'orders.*', 'customers.*', 'reports.view'
        ])
      },
      {
        id: 'role-cashier',
        name: 'Cashier',
        code: 'cashier',
        description: 'POS and basic operations',
        is_default: 1,
        permissions: JSON.stringify([
          'pos.create', 'pos.view', 'products.view', 'customers.view', 'orders.view'
        ])
      }
    ]

    for (const role of defaultRoles) {
      await this.adapter.execute(
        `INSERT OR IGNORE INTO roles (id, name, code, description, is_default, permissions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [role.id, role.name, role.code, role.description, role.is_default, role.permissions, now, now]
      )
    }

    // Seed default admin user (PIN: 123456)
    const adminPinHash = hashPinSync('123456')
    await this.adapter.execute(
      `INSERT OR REPLACE INTO users (id, username, pin_hash, first_name, last_name, branch_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['user-admin', 'admin', adminPinHash, 'System', 'Administrator', 'branch-main', now, now]
    )

    // Assign admin role to admin user
    await this.adapter.execute(
      `INSERT OR REPLACE INTO user_roles (id, user_id, role_id, assigned_at)
       VALUES (?, ?, ?, ?)`,
      ['ur-admin', 'user-admin', 'role-admin', now]
    )

    console.log('[Migration] 006_user_management completed')
  }

  private async runReportsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Z-counter (CRITICAL - never resets)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS z_counters (
        terminal_id TEXT PRIMARY KEY,
        current_value INTEGER NOT NULL DEFAULT 0,
        last_z_date TEXT,
        updated_at TEXT NOT NULL
      )
    `)

    // X-counter (resets on Z-Reading)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS x_counters (
        terminal_id TEXT PRIMARY KEY,
        current_value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    `)

    // Z-Reading reports
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_zreading_date ON z_readings(date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_zreading_branch ON z_readings(branch_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_zreading_terminal ON z_readings(terminal_id)')

    // X-Reading reports
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_xreading_shift ON x_readings(shift_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_xreading_terminal ON x_readings(terminal_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_xreading_date ON x_readings(generated_at)')

    // Daily sales aggregates for fast reporting
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_aggregate_date ON sales_aggregates(date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_aggregate_branch ON sales_aggregates(branch_id, date)')

    // Initialize Z-counter for default terminal (starts at 0)
    const now = this.getCurrentTimestamp()
    await this.adapter.execute(
      `INSERT OR IGNORE INTO z_counters (terminal_id, current_value, updated_at)
       VALUES (?, ?, ?)`,
      ['POS-001', 0, now]
    )

    // Initialize X-counter for default terminal
    await this.adapter.execute(
      `INSERT OR IGNORE INTO x_counters (terminal_id, current_value, updated_at)
       VALUES (?, ?, ?)`,
      ['POS-001', 0, now]
    )

    console.log('[Migration] 007_reports completed')
  }

  private async runFixAdminHashMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Fix admin user PIN hash (was seeded with SHA-256 instead of bcrypt)
    const adminPinHash = hashPinSync('123456')
    await this.adapter.execute(
      `UPDATE users SET pin_hash = ? WHERE id = 'user-admin'`,
      [adminPinHash]
    )

    console.log('[Migration] 008_fix_admin_hash completed')
  }

  private async runSyncMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Sync queue - persistent queue of items to sync to server
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        last_error TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'failed', 'completed'))
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)')

    // Sync log - history of completed sync operations
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('upload', 'download')),
        result TEXT NOT NULL CHECK (result IN ('success', 'conflict', 'error')),
        duration_ms INTEGER NOT NULL,
        synced_at TEXT NOT NULL
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_date ON sync_log(synced_at)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_result ON sync_log(result)')

    // Conflict log - conflict detection and resolution history
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS conflict_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version TEXT NOT NULL,
        server_version TEXT NOT NULL,
        resolution TEXT NOT NULL CHECK (resolution IN ('local', 'server', 'merged', 'manual')),
        resolved_by TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_conflict_entity ON conflict_log(entity_type, entity_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_conflict_resolution ON conflict_log(resolution)')

    // Sync status - per-terminal sync state
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS sync_status (
        terminal_id TEXT PRIMARY KEY,
        last_sync TEXT,
        last_download TEXT,
        pending_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'error'))
      )
    `)

    // Initialize sync status for default terminal
    const now = this.getCurrentTimestamp()
    await this.adapter.execute(
      `INSERT OR IGNORE INTO sync_status (terminal_id, pending_count, error_count, status)
       VALUES (?, ?, ?, ?)`,
      ['POS-001', 0, 0, 'idle']
    )

    console.log('[Migration] 009_sync completed')
  }

  private async runCrmMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Add tier_id and lifetime_spend columns to customers table
    try {
      await this.adapter.execute(`ALTER TABLE customers ADD COLUMN tier_id TEXT DEFAULT 'tier-bronze'`)
    } catch { /* column may already exist */ }
    try {
      await this.adapter.execute(`ALTER TABLE customers ADD COLUMN lifetime_spend REAL DEFAULT 0`)
    } catch { /* column may already exist */ }

    // Membership tiers table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tier_spend ON membership_tiers(min_spend)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tier_active ON membership_tiers(is_active)')

    // Loyalty transactions table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_transactions(customer_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transaction ON loyalty_transactions(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_type ON loyalty_transactions(type)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_created ON loyalty_transactions(created_at)')

    // Loyalty config table
    await this.adapter.execute(`
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
    const now = this.getCurrentTimestamp()

    await this.adapter.execute(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-bronze', 'Bronze', 0, 0, 1, JSON.stringify(['Basic loyalty points earning']), 1, 1, now, now]
    )
    await this.adapter.execute(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-silver', 'Silver', 10000, 0.03, 1.25, JSON.stringify(['3% member discount', '1.25x points multiplier']), 2, 1, now, now]
    )
    await this.adapter.execute(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-gold', 'Gold', 50000, 0.05, 1.5, JSON.stringify(['5% member discount', '1.5x points multiplier']), 3, 1, now, now]
    )
    await this.adapter.execute(
      `INSERT OR IGNORE INTO membership_tiers (id, name, min_spend, discount_rate, points_multiplier, benefits, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['tier-platinum', 'Platinum', 100000, 0.10, 2, JSON.stringify(['10% member discount', '2x points multiplier']), 4, 1, now, now]
    )

    // Seed default loyalty config
    await this.adapter.execute(
      `INSERT OR IGNORE INTO loyalty_config (id, earn_rate, redeem_rate, expiry_days, min_redemption, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['default', 0.01, 0.10, 365, 100, 1, now, now]
    )

    console.log('[Migration] 010_crm completed')
  }

  private async runAnalyticsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Hourly sales aggregates for time-based analysis
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sales_hourly_date ON sales_hourly(date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sales_hourly_branch ON sales_hourly(branch_id, date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sales_hourly_terminal ON sales_hourly(terminal_id, date)')

    // Product daily aggregates for product analytics
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_product_daily_date ON product_daily(date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_product_daily_product ON product_daily(product_id, date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_product_daily_category ON product_daily(category_id, date)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_product_daily_branch ON product_daily(branch_id, date)')

    // Saved reports for custom report builder
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(type)')

    console.log('[Migration] 011_analytics completed')
  }

  private async runCashDrawerMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Drawer sessions table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_drawer_shift ON drawer_sessions(shift_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_drawer_user ON drawer_sessions(user_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_drawer_status ON drawer_sessions(status)')

    // Drawer operations table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_drawer_op_session ON drawer_operations(session_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_drawer_op_type ON drawer_operations(type)')

    // Denomination counts table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS denomination_counts (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        denomination REAL NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (operation_id) REFERENCES drawer_operations(id)
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_denom_operation ON denomination_counts(operation_id)')

    console.log('[Migration] 012_cash_drawer completed')
  }

  private async runOfflineSyncMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Sync health table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS sync_health (
        terminal_id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        last_heartbeat TEXT,
        last_upload TEXT,
        last_download TEXT,
        queue_depth INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'unknown' CHECK(status IN ('healthy','warning','critical','unknown')),
        updated_at TEXT NOT NULL
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_sync_health_status ON sync_health(status)')

    // OR allocations table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS or_allocations (
        id TEXT PRIMARY KEY,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        prefix TEXT NOT NULL,
        start_number INTEGER NOT NULL,
        end_number INTEGER NOT NULL,
        current_number INTEGER NOT NULL,
        allocated_at TEXT NOT NULL,
        exhausted_at TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','exhausted')),
        UNIQUE(terminal_id, prefix, start_number)
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_or_alloc_terminal ON or_allocations(terminal_id, status)')

    console.log('[Migration] 013_offline_sync completed')
  }

  private async runEisMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // EIS configuration table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS eis_config (
        id TEXT PRIMARY KEY,
        tin TEXT NOT NULL,
        branch_code TEXT NOT NULL,
        api_key TEXT NOT NULL,
        api_secret TEXT NOT NULL,
        environment TEXT DEFAULT 'test' CHECK(environment IN ('test','production')),
        endpoint_url TEXT,
        is_enabled INTEGER DEFAULT 0,
        batch_size INTEGER DEFAULT 100,
        submission_interval_mins INTEGER DEFAULT 5,
        max_retries INTEGER DEFAULT 5,
        api_version TEXT DEFAULT 'v1',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // EIS submissions table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS eis_submissions (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        or_number TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','submitted','failed','rejected')),
        bir_reference TEXT,
        batch_id TEXT,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        last_error TEXT,
        submitted_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_eis_sub_status ON eis_submissions(status)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_eis_sub_transaction ON eis_submissions(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_eis_sub_batch ON eis_submissions(batch_id)')

    // EIS batches table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS eis_batches (
        id TEXT PRIMARY KEY,
        item_count INTEGER NOT NULL,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'processing' CHECK(status IN ('processing','completed','partial')),
        submitted_at TEXT NOT NULL,
        completed_at TEXT
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_eis_batch_status ON eis_batches(status)')

    console.log('[Migration] 014_eis completed')
  }

  private async runSalesMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Transactions table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_or_number ON transactions(or_number)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_shift ON transactions(shift_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status)')

    // Transaction items table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        product_name TEXT NOT NULL,
        variant_name TEXT,
        sku TEXT,
        barcode TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        discount REAL DEFAULT 0,
        line_total REAL NOT NULL,
        tax_type TEXT NOT NULL CHECK (tax_type IN ('vatable', 'exempt', 'zero_rated')),
        vatable_sales REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        vat_exempt_sales REAL DEFAULT 0,
        zero_rated_sales REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `)
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_item_transaction ON transaction_items(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_item_variant ON transaction_items(variant_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_tx_item_product ON transaction_items(product_id)')

    // OR Series table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_or_terminal ON or_series(terminal_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_or_branch ON or_series(branch_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_or_active ON or_series(is_active)')

    // Voids table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_void_transaction ON voids(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_void_supervisor ON voids(supervisor_id)')

    // Refunds table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_refund_transaction ON refunds(original_transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_refund_or ON refunds(refund_or_number)')

    // Refund items table
    await this.adapter.execute(`
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
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_refund_item_refund ON refund_items(refund_id)')

    // Add POS-specific columns to payments table (created by migration 005 with different schema)
    // SQLite ALTER TABLE only supports adding columns, so we add what's missing
    const paymentsColumns = await this.adapter.query<{ name: string }>(
      `PRAGMA table_info(payments)`
    )
    const existingCols = new Set(paymentsColumns.map(c => c.name))

    if (!existingCols.has('transaction_id')) {
      await this.adapter.execute('ALTER TABLE payments ADD COLUMN transaction_id TEXT')
    }
    if (!existingCols.has('tendered')) {
      await this.adapter.execute('ALTER TABLE payments ADD COLUMN tendered REAL')
    }
    if (!existingCols.has('change_amount')) {
      await this.adapter.execute('ALTER TABLE payments ADD COLUMN change_amount REAL')
    }
    if (!existingCols.has('last_four_digits')) {
      await this.adapter.execute('ALTER TABLE payments ADD COLUMN last_four_digits TEXT')
    }

    // Seed default OR series for development
    const now = this.getCurrentTimestamp()
    await this.adapter.execute(
      `INSERT OR IGNORE INTO or_series
       (id, terminal_id, branch_id, prefix, branch_code, start_number, end_number, current_number,
        ptu_number, ptu_valid_until, machine_serial, min_number, is_active, created_at, updated_at)
       VALUES
       ('ors_default', 'POS-001', 'branch_main', 'OR', 'MAIN', 1, 10000, 0,
        'FP012026-123456789-00001', '2031-12-31', 'POS-SN-001', 'MIN123456789012345', 1, ?, ?)`,
      [now, now]
    )

    console.log('[Migration] 015_sales completed')
  }

  private async runSystemSettingsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')
    const now = this.getCurrentTimestamp()

    // Business config (Business Info + BIR Compliance)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS business_config (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL DEFAULT '',
        trade_name TEXT NOT NULL DEFAULT '',
        tin TEXT NOT NULL DEFAULT '',
        branch_code TEXT NOT NULL DEFAULT '0001',
        address TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        province TEXT NOT NULL DEFAULT '',
        zip_code TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        ptu_number TEXT NOT NULL DEFAULT '',
        ptu_valid_from TEXT NOT NULL DEFAULT '',
        ptu_valid_until TEXT NOT NULL DEFAULT '',
        machine_serial TEXT NOT NULL DEFAULT '',
        min_number TEXT NOT NULL DEFAULT '',
        accreditation_number TEXT NOT NULL DEFAULT '',
        date_accredited TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.adapter.execute(
      `INSERT OR IGNORE INTO business_config (id, business_name, trade_name, tin, branch_code, address, city, province, zip_code, phone, email, created_at, updated_at)
       VALUES ('default', '', '', '', '0001', '', '', '', '', '', '', ?, ?)`,
      [now, now]
    )

    // Tax config
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS tax_config (
        id TEXT PRIMARY KEY,
        vat_rate REAL NOT NULL DEFAULT 12,
        default_tax_type TEXT NOT NULL DEFAULT 'vatable',
        senior_citizen_discount REAL NOT NULL DEFAULT 20,
        pwd_discount REAL NOT NULL DEFAULT 20,
        show_vat_breakdown INTEGER NOT NULL DEFAULT 1,
        include_vat_in_price INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.adapter.execute(
      `INSERT OR IGNORE INTO tax_config (id, vat_rate, default_tax_type, senior_citizen_discount, pwd_discount, show_vat_breakdown, include_vat_in_price, created_at, updated_at)
       VALUES ('default', 12, 'vatable', 20, 20, 1, 1, ?, ?)`,
      [now, now]
    )

    // Receipt config (Receipt + Printer settings)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS receipt_config (
        id TEXT PRIMARY KEY,
        header_line1 TEXT NOT NULL DEFAULT '',
        header_line2 TEXT NOT NULL DEFAULT '',
        header_line3 TEXT NOT NULL DEFAULT '',
        footer_line1 TEXT NOT NULL DEFAULT 'Thank you for your purchase!',
        footer_line2 TEXT NOT NULL DEFAULT 'Please come again.',
        show_logo INTEGER NOT NULL DEFAULT 1,
        paper_width TEXT NOT NULL DEFAULT '80mm',
        font_size TEXT NOT NULL DEFAULT 'normal',
        print_duplicate INTEGER NOT NULL DEFAULT 0,
        printer_name TEXT NOT NULL DEFAULT '',
        connection_type TEXT NOT NULL DEFAULT 'usb',
        ip_address TEXT NOT NULL DEFAULT '192.168.1.100',
        port INTEGER NOT NULL DEFAULT 9100,
        usb_device TEXT NOT NULL DEFAULT '',
        bluetooth_device TEXT NOT NULL DEFAULT '',
        serial_port TEXT NOT NULL DEFAULT 'COM1',
        baud_rate INTEGER NOT NULL DEFAULT 9600,
        auto_cut INTEGER NOT NULL DEFAULT 1,
        open_cash_drawer INTEGER NOT NULL DEFAULT 1,
        cash_drawer_pin INTEGER NOT NULL DEFAULT 2,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.adapter.execute(
      `INSERT OR IGNORE INTO receipt_config (id, header_line1, header_line2, header_line3, footer_line1, footer_line2, created_at, updated_at)
       VALUES ('default', '', '', '', 'Thank you for your purchase!', 'Please come again.', ?, ?)`,
      [now, now]
    )

    // Payment config
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS payment_config (
        id TEXT PRIMARY KEY,
        cash_enabled INTEGER NOT NULL DEFAULT 1,
        card_enabled INTEGER NOT NULL DEFAULT 1,
        gcash_enabled INTEGER NOT NULL DEFAULT 1,
        maya_enabled INTEGER NOT NULL DEFAULT 1,
        grab_pay_enabled INTEGER NOT NULL DEFAULT 0,
        bank_transfer_enabled INTEGER NOT NULL DEFAULT 0,
        check_enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.adapter.execute(
      `INSERT OR IGNORE INTO payment_config (id, cash_enabled, card_enabled, gcash_enabled, maya_enabled, grab_pay_enabled, bank_transfer_enabled, check_enabled, created_at, updated_at)
       VALUES ('default', 1, 1, 1, 1, 0, 0, 0, ?, ?)`,
      [now, now]
    )

    // System config (System + Backup + Sync)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        id TEXT PRIMARY KEY,
        offline_mode_enabled INTEGER NOT NULL DEFAULT 1,
        auto_sync_enabled INTEGER NOT NULL DEFAULT 1,
        sync_interval INTEGER NOT NULL DEFAULT 5,
        data_retention_years INTEGER NOT NULL DEFAULT 10,
        low_stock_threshold INTEGER NOT NULL DEFAULT 10,
        enable_notifications INTEGER NOT NULL DEFAULT 1,
        enable_sound_alerts INTEGER NOT NULL DEFAULT 1,
        auto_backup_enabled INTEGER NOT NULL DEFAULT 1,
        backup_frequency TEXT NOT NULL DEFAULT 'daily',
        backup_time TEXT NOT NULL DEFAULT '02:00',
        cloud_backup_enabled INTEGER NOT NULL DEFAULT 1,
        local_backup_enabled INTEGER NOT NULL DEFAULT 1,
        local_backup_path TEXT NOT NULL DEFAULT '',
        keep_backup_days INTEGER NOT NULL DEFAULT 30,
        encrypt_backup INTEGER NOT NULL DEFAULT 1,
        sync_strategy TEXT NOT NULL DEFAULT 'realtime',
        conflict_resolution TEXT NOT NULL DEFAULT 'server_wins',
        sync_products INTEGER NOT NULL DEFAULT 1,
        sync_orders INTEGER NOT NULL DEFAULT 1,
        sync_customers INTEGER NOT NULL DEFAULT 1,
        sync_inventory INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.adapter.execute(
      `INSERT OR IGNORE INTO system_config (id, created_at, updated_at)
       VALUES ('default', ?, ?)`,
      [now, now]
    )

    console.log('[Migration] 016_system_settings completed')
  }

  private async runDiscountManagementMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Add new columns to existing discounts table
    const alterStatements = [
      'ALTER TABLE discounts ADD COLUMN auto_apply INTEGER DEFAULT 0',
      'ALTER TABLE discounts ADD COLUMN start_time TEXT',
      'ALTER TABLE discounts ADD COLUMN end_time TEXT',
      'ALTER TABLE discounts ADD COLUMN weekdays TEXT',
      'ALTER TABLE discounts ADD COLUMN deleted_at TEXT'
    ]

    for (const stmt of alterStatements) {
      try {
        await this.adapter.execute(stmt)
      } catch {
        // Column already exists, ignore
      }
    }

    // Add discount metadata columns to transaction_items
    const txItemAlters = [
      'ALTER TABLE transaction_items ADD COLUMN discount_name TEXT',
      'ALTER TABLE transaction_items ADD COLUMN discount_id TEXT'
    ]

    for (const stmt of txItemAlters) {
      try {
        await this.adapter.execute(stmt)
      } catch {
        // Column already exists, ignore
      }
    }

    // Junction table for product/category scopes
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS discount_scopes (
        id TEXT PRIMARY KEY,
        discount_id TEXT NOT NULL,
        product_id TEXT,
        category_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discount_id) REFERENCES discounts(id),
        CHECK (product_id IS NOT NULL OR category_id IS NOT NULL)
      )
    `)

    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_ds_discount ON discount_scopes(discount_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_ds_product ON discount_scopes(product_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_ds_category ON discount_scopes(category_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_discounts_auto ON discounts(auto_apply, is_active)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_discounts_deleted ON discounts(deleted_at)')

    // Seed sample promo discounts
    const now = this.getCurrentTimestamp()

    await this.adapter.execute(
      `INSERT OR IGNORE INTO discounts (id, name, code, type, value, min_purchase, max_discount, auto_apply, is_active, weekdays, start_time, end_time, start_date, end_date, applicable_to, applicable_ids, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['disc-promo-001', '10% Off Beverages', null, 'percentage', 10, 0, null, 1, 1, null, null, null, null, null, 'all', null, null, 0, now, now]
    )

    // Set scope for beverages discount -> category
    await this.adapter.execute(
      `INSERT OR IGNORE INTO discount_scopes (id, discount_id, category_id, created_at)
       VALUES (?, ?, ?, ?)`,
      ['ds-001', 'disc-promo-001', 'cat-004', now]
    )

    await this.adapter.execute(
      `INSERT OR IGNORE INTO discounts (id, name, code, type, value, min_purchase, max_discount, auto_apply, is_active, weekdays, start_time, end_time, start_date, end_date, applicable_to, applicable_ids, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['disc-promo-002', 'Weekend Special 15%', null, 'percentage', 15, 0, null, 1, 1, '[0,6]', null, null, null, null, 'all', null, null, 0, now, now]
    )

    await this.adapter.execute(
      `INSERT OR IGNORE INTO discounts (id, name, code, type, value, min_purchase, max_discount, auto_apply, is_active, weekdays, start_time, end_time, start_date, end_date, applicable_to, applicable_ids, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['disc-promo-003', 'Happy Hour 20%', null, 'percentage', 20, 0, null, 1, 1, null, '14:00', '17:00', null, null, 'all', null, null, 0, now, now]
    )

    await this.adapter.execute(
      `INSERT OR IGNORE INTO discounts (id, name, code, type, value, min_purchase, max_discount, auto_apply, is_active, weekdays, start_time, end_time, start_date, end_date, applicable_to, applicable_ids, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['disc-promo-004', 'PHP 50 Off Premium', 'PREMIUM50', 'fixed', 50, 200, 50, 0, 1, null, null, null, null, null, 'all', null, null, 0, now, now]
    )

    console.log('[Migration] 017_discount_management completed')
  }

  private async runTransactionPaymentsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS transaction_payments (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'gcash', 'maya', 'other_ewallet', 'points', 'grab_pay', 'bank_transfer', 'check', 'credit')),
        amount REAL NOT NULL,
        tendered REAL,
        change_amount REAL DEFAULT 0,
        reference_number TEXT,
        card_type TEXT,
        last_four_digits TEXT,
        approval_code TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'void')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `)

    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_transaction ON transaction_payments(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_method ON transaction_payments(payment_method)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_created ON transaction_payments(created_at)')

    console.log('[Migration] 018_transaction_payments completed')
  }

  private async runLogoUrlMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    try {
      await this.adapter.execute(`ALTER TABLE business_config ADD COLUMN logo_url TEXT DEFAULT ''`)
    } catch {
      // Column may already exist
    }

    console.log('[Migration] 019_logo_url completed')
  }

  /**
   * Migration 020: Onboarding tables
   */
  private async runOnboardingMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    const now = new Date().toISOString()

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id TEXT PRIMARY KEY,
        current_step TEXT NOT NULL DEFAULT 'welcome',
        is_completed INTEGER NOT NULL DEFAULT 0,
        license_key TEXT,
        license_type TEXT,
        license_verified_at TEXT,
        activated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // Insert default row if not exists
    await this.adapter.execute(
      `INSERT OR IGNORE INTO onboarding_progress (id, current_step, is_completed, created_at, updated_at)
       VALUES ('default', 'welcome', 0, ?, ?)`,
      [now, now]
    )

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS terms_documents (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        content_html TEXT NOT NULL,
        published_at TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      )
    `)

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS terms_acceptances (
        id TEXT PRIMARY KEY,
        terms_id TEXT NOT NULL REFERENCES terms_documents(id),
        terms_version TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        accepted_at TEXT NOT NULL,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending','synced','failed'))
      )
    `)

    console.log('[Migration] 020_onboarding completed')
  }

  /**
   * Migration 021: Slideshow images table + display settings columns on business_config
   */
  private async runSlideshowDisplayMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS slideshow_images (
        id TEXT PRIMARY KEY,
        image_data TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `)

    const alterStatements = [
      'ALTER TABLE business_config ADD COLUMN show_store_name INTEGER DEFAULT 1',
      'ALTER TABLE business_config ADD COLUMN show_logo INTEGER DEFAULT 1',
      'ALTER TABLE business_config ADD COLUMN show_address INTEGER DEFAULT 1',
      'ALTER TABLE business_config ADD COLUMN show_tin INTEGER DEFAULT 1',
      'ALTER TABLE business_config ADD COLUMN show_terminal INTEGER DEFAULT 1',
      'ALTER TABLE business_config ADD COLUMN show_time INTEGER DEFAULT 1',
      "ALTER TABLE business_config ADD COLUMN time_format TEXT DEFAULT '12h'",
      "ALTER TABLE business_config ADD COLUMN date_format TEXT DEFAULT 'long'",
      'ALTER TABLE business_config ADD COLUMN slideshow_interval INTEGER DEFAULT 5'
    ]

    for (const stmt of alterStatements) {
      try {
        await this.adapter.execute(stmt)
      } catch {
        // Column already exists, ignore
      }
    }

    console.log('[Migration] 021_slideshow_display completed')
  }

  /**
   * Migration 022: Convert existing UTC timestamps (ending with 'Z') to local time.
   * POS operates in local business timezone; UTC timestamps cause date(created_at)
   * to return wrong dates for transactions before 8 AM local (UTC+8).
   */
  private async runFixUtcTimestampsMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Detect local timezone offset dynamically
    const offsetMinutes = new Date().getTimezoneOffset()
    const offsetHours = -offsetMinutes / 60
    const offsetStr = offsetHours >= 0 ? `+${offsetHours} hours` : `${offsetHours} hours`

    // All tables and their timestamp columns
    const tableColumns: [string, string[]][] = [
      ['transactions', ['created_at', 'updated_at', 'synced_at']],
      ['transaction_items', ['created_at']],
      ['transaction_payments', ['created_at']],
      ['products', ['created_at', 'updated_at']],
      ['categories', ['created_at', 'updated_at']],
      ['suppliers', ['created_at', 'updated_at', 'synced_at']],
      ['product_variants', ['created_at', 'updated_at', 'synced_at']],
      ['batches', ['created_at', 'synced_at']],
      ['stock_movements', ['created_at', 'synced_at']],
      ['stock_alerts', ['created_at', 'updated_at', 'acknowledged_at']],
      ['price_history', ['created_at']],
      ['customers', ['created_at', 'updated_at', 'synced_at']],
      ['orders', ['created_at', 'updated_at', 'completed_at', 'synced_at']],
      ['order_items', ['created_at']],
      ['payments', ['processed_at', 'created_at', 'synced_at']],
      ['payment_methods', ['created_at', 'updated_at']],
      ['discounts', ['created_at', 'updated_at']],
      ['discount_scopes', ['created_at']],
      ['users', ['last_login_at', 'created_at', 'updated_at', 'synced_at']],
      ['roles', ['created_at', 'updated_at']],
      ['permissions', ['created_at']],
      ['user_roles', ['assigned_at']],
      ['shifts', ['started_at', 'ended_at', 'created_at', 'updated_at', 'synced_at']],
      ['auth_logs', ['created_at', 'synced_at']],
      ['z_counters', ['updated_at']],
      ['x_counters', ['updated_at']],
      ['z_readings', ['generated_at', 'synced_at']],
      ['x_readings', ['generated_at', 'synced_at']],
      ['sales_aggregates', ['created_at']],
      ['sync_queue', ['created_at', 'last_attempt']],
      ['sync_log', ['synced_at']],
      ['conflict_log', ['created_at', 'resolved_at']],
      ['membership_tiers', ['created_at', 'updated_at']],
      ['loyalty_transactions', ['created_at', 'synced_at']],
      ['loyalty_config', ['created_at', 'updated_at']],
      ['sales_hourly', ['created_at']],
      ['product_daily', ['created_at']],
      ['saved_reports', ['created_at', 'updated_at']],
      ['drawer_sessions', ['opened_at', 'closed_at', 'synced_at']],
      ['drawer_operations', ['created_at']],
      ['sync_health', ['last_heartbeat', 'last_upload', 'last_download', 'updated_at']],
      ['or_allocations', ['allocated_at', 'exhausted_at']],
      ['eis_config', ['created_at', 'updated_at']],
      ['eis_submissions', ['last_attempt', 'submitted_at', 'created_at']],
      ['eis_batches', ['submitted_at', 'completed_at']],
      ['or_series', ['created_at', 'updated_at']],
      ['voids', ['created_at', 'synced_at']],
      ['refunds', ['created_at', 'synced_at']],
      ['refund_items', ['created_at']],
      ['business_config', ['created_at', 'updated_at']],
      ['tax_config', ['created_at', 'updated_at']],
      ['receipt_config', ['created_at', 'updated_at']],
      ['payment_config', ['created_at', 'updated_at']],
      ['system_config', ['created_at', 'updated_at']],
      ['onboarding_progress', ['license_verified_at', 'activated_at', 'created_at', 'updated_at']],
      ['terms_documents', ['published_at', 'fetched_at']],
      ['terms_acceptances', ['accepted_at', 'synced_at']],
      ['slideshow_images', ['created_at']],
    ]

    for (const [table, columns] of tableColumns) {
      // Check if table exists before updating
      const exists = await this.adapter.getOne<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [table]
      )
      if (!exists) continue

      for (const col of columns) {
        try {
          await this.adapter.execute(
            `UPDATE ${table} SET ${col} = strftime('%Y-%m-%dT%H:%M:%f', ${col}, '${offsetStr}') WHERE ${col} LIKE '%Z'`
          )
        } catch {
          // Column may not exist in older schemas, skip
        }
      }
    }

    console.log(`[Migration] 022_fix_utc_timestamps completed (offset: ${offsetStr})`)
  }

  /**
   * Migration 023: Device registration columns on onboarding_progress
   */
  private async runDeviceRegistrationMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Add columns to onboarding_progress for server URL, device UID, and heartbeat tracking
    const columns = [
      { name: 'server_url', def: 'TEXT' },
      { name: 'device_uid', def: 'TEXT' },
      { name: 'device_registered_at', def: 'TEXT' },
      { name: 'heartbeat_status', def: "TEXT DEFAULT 'unknown'" },
      { name: 'heartbeat_last_at', def: 'TEXT' },
      { name: 'license_expiry_date', def: 'TEXT' }
    ]

    for (const col of columns) {
      try {
        await this.adapter.execute(
          `ALTER TABLE onboarding_progress ADD COLUMN ${col.name} ${col.def}`
        )
      } catch {
        // Column may already exist
      }
    }

    console.log('[Migration] 023_device_registration completed')
  }

  private async runCreditLedgerMigration(): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')

    // Create credit_ledger table
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('charge', 'payment')),
        amount REAL NOT NULL,
        running_balance REAL NOT NULL,
        transaction_id TEXT,
        reference_number TEXT,
        payment_method TEXT,
        notes TEXT,
        processed_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `)

    // Add credit_enabled to payment_config
    try {
      await this.adapter.execute(
        `ALTER TABLE payment_config ADD COLUMN credit_enabled INTEGER NOT NULL DEFAULT 0`
      )
    } catch {
      // Column may already exist
    }

    // Recreate transaction_payments with updated CHECK constraint to include credit
    // First check if the table exists and get its data
    const existingPayments = await this.adapter.query<any>(
      `SELECT * FROM transaction_payments`
    ).catch(() => [])

    await this.adapter.execute(`DROP TABLE IF EXISTS transaction_payments`)
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS transaction_payments (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'gcash', 'maya', 'other_ewallet', 'points', 'grab_pay', 'bank_transfer', 'check', 'credit')),
        amount REAL NOT NULL,
        tendered REAL,
        change_amount REAL DEFAULT 0,
        reference_number TEXT,
        card_type TEXT,
        last_four_digits TEXT,
        approval_code TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'void')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `)

    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_transaction ON transaction_payments(transaction_id)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_method ON transaction_payments(payment_method)')
    await this.adapter.execute('CREATE INDEX IF NOT EXISTS idx_txpay_created ON transaction_payments(created_at)')

    // Re-insert existing data
    for (const p of existingPayments) {
      await this.adapter.execute(
        `INSERT INTO transaction_payments (id, transaction_id, payment_method, amount, tendered, change_amount, reference_number, card_type, last_four_digits, approval_code, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.transaction_id, p.payment_method, p.amount, p.tendered, p.change_amount, p.reference_number, p.card_type, p.last_four_digits, p.approval_code, p.status || 'completed', p.created_at]
      )
    }

    console.log('[Migration] 024_credit_ledger completed')
  }

  // =====================
  // Public Query Methods
  // =====================

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
   */
  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.adapter) throw new Error('Database not connected')
    return await this.adapter.execute(sql, params)
  }

  /**
   * Query multiple rows
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.adapter) throw new Error('Database not connected')
    return await this.adapter.query<T>(sql, params)
  }

  /**
   * Query a single row
   */
  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.adapter) throw new Error('Database not connected')
    return await this.adapter.getOne<T>(sql, params)
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    if (!this.adapter) throw new Error('Database not connected')
    return await this.adapter.transaction(fn)
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close()
      this.adapter = null
    }
  }

  // =====================
  // Utility Methods
  // =====================

  /**
   * Generate a unique ID with optional prefix
   */
  generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`
  }

  /**
   * Get current timestamp in local ISO format (no Z suffix).
   * POS operates in local business timezone, not UTC.
   */
  getCurrentTimestamp(): string {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
  }

  /**
   * Export database for backup/sync
   */
  async exportDatabase(): Promise<Uint8Array | null> {
    if (!this.adapter) return null
    return await this.adapter.export()
  }

  /**
   * Import database from backup
   */
  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.adapter) throw new Error('Database not connected')
    await this.adapter.import(data)
  }

  /**
   * Get the current platform
   */
  getPlatform(): Platform | null {
    return this.adapter?.getPlatform() ?? null
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.adapter?.isInitialized() ?? false
  }
}

// Singleton instance
export const db = new DatabaseService()
export default db
