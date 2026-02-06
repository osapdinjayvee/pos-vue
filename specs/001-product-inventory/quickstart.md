# Quickstart: Product & Inventory Management

**Feature**: 001-product-inventory
**Date**: 2026-02-04
**Depends On**: 003-user-management

## Prerequisites

- Node.js 20+
- pnpm 9+
- 003-user-management feature completed (database, auth)
- Project dependencies installed

## Setup Steps

### 1. Verify User Management is Complete

```bash
# Ensure you can log in and database is initialized
pnpm dev
# Navigate to login, authenticate as admin
```

### 2. Run Inventory Migrations

Add migration to `src/db/migrations/002_inventory.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
  // Categories
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // Products
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT NOT NULL,
      supplier_id TEXT,
      base_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      tax_type TEXT NOT NULL,
      has_variants INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      track_batches INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_product_category ON products(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_product_name ON products(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_product_active ON products(is_active)`);

  // ... continue with other tables from data-model.md
}
```

### 3. Seed Default Categories

```typescript
// src/db/seeders/categories.ts
import { v4 as uuidv4 } from 'uuid';

export function seedCategories(db: Database): void {
  const categories = [
    { id: uuidv4(), name: 'Food & Beverages', parent_id: null },
    { id: uuidv4(), name: 'Personal Care', parent_id: null },
    { id: uuidv4(), name: 'Household', parent_id: null },
    { id: uuidv4(), name: 'Electronics', parent_id: null },
    { id: uuidv4(), name: 'Other', parent_id: null },
  ];

  for (const cat of categories) {
    db.run(
      `INSERT OR IGNORE INTO categories (id, name, parent_id, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 0, 1, datetime('now'), datetime('now'))`,
      [cat.id, cat.name, cat.parent_id]
    );
  }
}
```

### 4. Create Sample Product

```typescript
// For development/testing
const sampleProduct = {
  id: uuidv4(),
  name: 'Sample Product',
  category_id: 'food-category-id',
  base_price: 100.00,
  cost_price: 75.00,
  tax_type: 'vatable',
  has_variants: false,
  low_stock_threshold: 10,
};

// Create default variant
const defaultVariant = {
  id: uuidv4(),
  product_id: sampleProduct.id,
  sku: 'SAMPLE-001',
  barcode: '4800000000001',
  name: 'Default',
};

// Add initial stock
const initialStock = {
  id: uuidv4(),
  variant_id: defaultVariant.id,
  quantity: 100,
  movement_type: 'receive',
  user_id: 'admin-user-id',
  terminal_id: 'SETUP',
  branch_id: 'default-branch-id',
};
```

## Verification Steps

### Test Product CRUD

1. Navigate to Products page
2. Click "Add Product"
3. Fill in: Name, Category, Price, Tax Type
4. Save and verify product appears in list
5. Edit the product, change price
6. Verify change persists

### Test Barcode Lookup

1. Create a product with barcode "4800000000001"
2. Navigate to POS page
3. Enter barcode in search field
4. Verify product is found instantly (<500ms)

### Test Stock Movements

1. Navigate to product detail
2. Click "Receive Stock"
3. Enter quantity: 50
4. Save and verify stock increases by 50
5. Check movement history shows the receipt

### Test Low Stock Alerts

1. Create product with low_stock_threshold: 10
2. Add initial stock: 5 units
3. Navigate to Alerts dashboard
4. Verify product appears in low-stock list

### Test Offline Inventory

1. Create product and add stock while online
2. Open DevTools → Network → Offline
3. Navigate to Products page
4. Verify products still load from local database
5. Add a new product while offline
6. Reconnect and verify it syncs

## Common Issues

### Product Not Found by Barcode

**Symptom**: Barcode scan returns "Product not found"

**Solutions**:
1. Verify barcode index exists:
   ```sql
   SELECT * FROM product_variants WHERE barcode = '4800000000001';
   ```
2. Check barcode format (no leading/trailing spaces)
3. Ensure variant is active

### Stock Calculation Wrong

**Symptom**: Displayed stock doesn't match expected

**Solutions**:
1. Check all movements:
   ```sql
   SELECT * FROM stock_movements WHERE variant_id = ?;
   ```
2. Verify sum:
   ```sql
   SELECT SUM(quantity) FROM stock_movements WHERE variant_id = ?;
   ```
3. Look for negative values from sales or adjustments

### Category Not Appearing

**Symptom**: New category not in dropdown

**Solutions**:
1. Check is_active flag
2. Verify parent_id exists (if subcategory)
3. Force refresh category list

## Next Steps

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement in order:
   - Category CRUD
   - Product CRUD
   - Variant management
   - Stock movements
   - Barcode lookup
   - Low stock alerts
3. Write tests for:
   - Stock calculation
   - Barcode validation
   - Offline sync
