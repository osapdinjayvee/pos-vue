# Quickstart: Sales & Checkout

**Feature**: 002-sales-checkout
**Date**: 2026-02-04
**Depends On**: 003-user-management, 001-product-inventory

## Prerequisites

- Node.js 20+
- pnpm 9+
- 003-user-management feature completed (auth, shifts)
- 001-product-inventory feature completed (products, stock)
- Project dependencies installed

## Setup Steps

### 1. Verify Prerequisites

```bash
# Start dev server
pnpm dev

# Verify:
# 1. Can log in as cashier
# 2. Can start a shift
# 3. Products exist in catalog
```

### 2. Run Sales Migrations

Add migration to `src/db/migrations/003_sales.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
  // Transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      or_number TEXT UNIQUE NOT NULL,
      shift_id TEXT NOT NULL,
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
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT
    )
  `);

  // ... continue with other tables from data-model.md
}
```

### 3. Configure OR Series

Set up initial OR series for the terminal:

```typescript
// src/db/seeders/orSeries.ts
import { v4 as uuidv4 } from 'uuid';

export function seedORSeries(db: Database): void {
  const series = {
    id: uuidv4(),
    terminal_id: 'POS-001',
    branch_id: 'default-branch-id',
    prefix: 'OR',
    branch_code: 'MAIN',
    start_number: 1,
    end_number: 10000,
    current_number: 0,
    ptu_number: 'FP012026-123456789-00001',
    ptu_valid_until: '2031-02-04',
    machine_serial: 'ABC123456789',
    min_number: '123456789012345',
    is_active: 1,
  };

  db.run(
    `INSERT OR REPLACE INTO or_series
     (id, terminal_id, branch_id, prefix, branch_code, start_number, end_number,
      current_number, ptu_number, ptu_valid_until, machine_serial, min_number,
      is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    Object.values(series)
  );
}
```

### 4. Set Up Business Info

Configure business details for receipts:

```typescript
// src/config/business.ts
export const BUSINESS_CONFIG = {
  name: 'SAMPLE STORE INC.',
  address: '123 Main Street, Manila City',
  tin: '123-456-789-000',
  branch_code: 'MAIN',
  vat_rate: 0.12,
};
```

## Verification Steps

### Test Basic Sale

1. Log in as cashier, start shift
2. Navigate to POS terminal
3. Scan/search for a product
4. Add to cart (quantity: 2)
5. Click "Pay"
6. Enter cash amount >= total
7. Verify receipt shows:
   - Correct OR number
   - VAT breakdown
   - All BIR required fields
8. Verify stock reduced by 2 units

### Test VAT Calculation

1. Add VATable product (price: PHP 112)
2. Verify breakdown shows:
   - VATable Sales: PHP 100.00
   - VAT 12%: PHP 12.00
3. Add VAT-exempt product (price: PHP 50)
4. Verify breakdown shows:
   - VAT Exempt: PHP 50.00
   - VAT 12%: PHP 12.00 (unchanged)

### Test Senior Citizen Discount

1. Add VATable items to cart
2. Click "Apply Discount"
3. Select "Senior Citizen"
4. Enter SC ID number and name
5. Verify:
   - 20% discount applied
   - Items become VAT-exempt
   - ID recorded on receipt

### Test Multiple Payments

1. Add items totaling PHP 500
2. Click "Pay"
3. Enter GCash: PHP 300 (reference: GC123456)
4. Enter Cash: PHP 200
5. Verify transaction completes
6. Verify receipt shows both payment methods

### Test Void Transaction

1. Complete a sale
2. Go to transaction history
3. Find the transaction
4. Click "Void"
5. Enter reason and supervisor PIN
6. Verify:
   - Transaction status = voided
   - Stock restored
   - Void record created

### Test Refund

1. Complete a sale with 3 items
2. Navigate to Refunds
3. Enter original OR number
4. Select 1 item to refund
5. Enter reason and supervisor PIN
6. Verify:
   - Refund receipt generated
   - Stock restored for returned item
   - Refund OR number generated

### Test Offline Mode

1. Complete a sale while online
2. Note the OR number
3. Disconnect network (DevTools → Offline)
4. Complete another sale
5. Verify OR number incremented correctly
6. Reconnect network
7. Verify transaction syncs

## Common Issues

### OR Number Not Generating

**Symptom**: "OR series exhausted" error

**Solutions**:
1. Check current OR series:
   ```sql
   SELECT * FROM or_series WHERE is_active = 1;
   ```
2. If exhausted, allocate new series via admin

### VAT Calculation Wrong

**Symptom**: VAT doesn't match expected

**Solutions**:
1. Verify product tax_type is correct
2. Check rounding (2 decimal places)
3. Ensure prices are VAT-inclusive

### Receipt Not Printing

**Symptom**: Print dialog not appearing

**Solutions**:
1. Check browser pop-up blocker
2. For thermal printer, ensure Electron is configured
3. Verify printer is set as default

### Void Fails

**Symptom**: "Cannot void transaction"

**Solutions**:
1. Check if already voided
2. Check if refunds exist for this transaction
3. Verify supervisor PIN is correct
4. Check supervisor has void permission

## Next Steps

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement in order:
   - Cart management (add/remove/quantity)
   - VAT calculation service
   - Payment processing
   - Receipt generation
   - Void/Refund flows
3. Write tests for:
   - VAT calculation (all tax types)
   - OR number generation
   - Stock deduction
   - Offline sync
