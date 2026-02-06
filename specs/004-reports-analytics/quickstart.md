# Quickstart: Reports & Analytics

**Feature**: 004-reports-analytics
**Date**: 2026-02-04
**Depends On**: 002-sales-checkout, 003-user-management

## Prerequisites

- Node.js 20+
- pnpm 9+
- 002-sales-checkout feature completed (transactions)
- 003-user-management feature completed (shifts, users)
- Project dependencies installed

## Setup Steps

### 1. Verify Prerequisites

```bash
# Start dev server
pnpm dev

# Verify:
# 1. Can log in as cashier/supervisor
# 2. Can process sales transactions
# 3. Shifts are tracked
```

### 2. Run Reports Migrations

Add migration to `src/db/migrations/004_reports.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
  // Z-counter (critical - never resets)
  db.run(`
    CREATE TABLE IF NOT EXISTS z_counters (
      terminal_id TEXT PRIMARY KEY,
      current_value INTEGER NOT NULL DEFAULT 0,
      last_z_date TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  // X-counter (resets on Z-Reading)
  db.run(`
    CREATE TABLE IF NOT EXISTS x_counters (
      terminal_id TEXT PRIMARY KEY,
      current_value INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `);

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
      gross_sales REAL NOT NULL,
      discount_total REAL DEFAULT 0,
      net_sales REAL NOT NULL,
      vatable_sales REAL NOT NULL,
      vat_amount REAL NOT NULL,
      vat_exempt_sales REAL DEFAULT 0,
      zero_rated_sales REAL DEFAULT 0,
      void_count INTEGER DEFAULT 0,
      void_amount REAL DEFAULT 0,
      transaction_count INTEGER NOT NULL,
      generated_by TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      synced_at TEXT,
      UNIQUE(terminal_id, z_counter)
    )
  `);

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
      transaction_count INTEGER NOT NULL,
      beginning_or TEXT NOT NULL,
      ending_or TEXT NOT NULL,
      generated_at TEXT NOT NULL
    )
  `);

  // Daily aggregates
  db.run(`
    CREATE TABLE IF NOT EXISTS sales_aggregates (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      gross_sales REAL NOT NULL,
      net_sales REAL NOT NULL,
      vatable_sales REAL NOT NULL,
      vat_amount REAL NOT NULL,
      transaction_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(terminal_id, date)
    )
  `);

  // Initialize Z-counter for terminal
  db.run(`
    INSERT OR IGNORE INTO z_counters (terminal_id, current_value, updated_at)
    VALUES ('POS-001', 0, datetime('now'))
  `);

  // Initialize X-counter for terminal
  db.run(`
    INSERT OR IGNORE INTO x_counters (terminal_id, current_value, updated_at)
    VALUES ('POS-001', 0, datetime('now'))
  `);
}
```

## Verification Steps

### Test X-Reading Generation

1. Log in as supervisor, start shift
2. Process 5 sales transactions
3. Navigate to Reports → X-Reading
4. Click "Generate X-Reading"
5. Verify report shows:
   - Correct X-counter number
   - Correct transaction count (5)
   - Correct VAT breakdown
   - OR range (first to last)
6. Generate another X-Reading
7. Verify X-counter incremented

### Test Z-Reading Generation

1. Process several sales during the day
2. Navigate to Reports → Z-Reading
3. Click "Generate Z-Reading"
4. Enter supervisor PIN
5. Verify report shows:
   - Z-counter (should be 1 for first Z-Reading)
   - Daily totals match sum of all transactions
   - Beginning/ending OR numbers
6. Try to generate another Z-Reading same day
7. Verify warning appears about duplicate

### Test Z-Counter Persistence

1. Note the current Z-counter value
2. Restart the application
3. Navigate to Reports → Z-Reading
4. Verify Z-counter value unchanged
5. Generate Z-Reading for new day
6. Verify Z-counter incremented by 1

### Test Daily Sales Report

1. Process sales over multiple days (use test data)
2. Navigate to Reports → Daily Sales
3. Select a specific date
4. Verify totals match actual transactions
5. Select a date range
6. Verify summary aggregates correctly

### Test VAT Summary Report

1. Process sales with different VAT types:
   - VATable items
   - VAT-exempt items
   - Zero-rated items
2. Navigate to Reports → VAT Summary
3. Select date range
4. Verify:
   - VATable Sales matches sum of VATable items (excl. VAT)
   - VAT Amount is 12% of VATable Sales
   - VAT-Exempt matches exempt items
   - Zero-Rated matches zero-rated items

### Test Offline Report Generation

1. Process some sales while online
2. Disconnect network (DevTools → Offline)
3. Navigate to Reports → X-Reading
4. Generate X-Reading
5. Verify report generates successfully
6. Verify "Offline" indicator shows
7. Reconnect network
8. Verify X-Reading syncs

### Test Report Export

1. Generate any report
2. Click "Export PDF"
3. Verify print dialog opens with correct format
4. Click "Export CSV"
5. Verify CSV downloads with correct data

## Common Issues

### Z-Counter Not Incrementing

**Symptom**: Z-counter stays at 0

**Solutions**:
1. Check z_counters table has terminal entry:
   ```sql
   SELECT * FROM z_counters WHERE terminal_id = 'POS-001';
   ```
2. Verify atomic transaction is completing
3. Check for database errors in console

### Z-Reading Shows Wrong Totals

**Symptom**: Z-Reading totals don't match transactions

**Solutions**:
1. Verify date filter is correct:
   ```sql
   SELECT SUM(total_amount) FROM transactions
   WHERE terminal_id = 'POS-001' AND date(created_at) = date('now');
   ```
2. Check for voided transactions being included/excluded
3. Verify last Z-Reading date boundary

### Duplicate Z-Reading Warning Not Showing

**Symptom**: Can generate multiple Z-Readings same day

**Solutions**:
1. Check last_z_date in z_counters table
2. Verify date comparison logic
3. Check supervisor override flag

### X-Counter Not Resetting After Z-Reading

**Symptom**: X-counter continues incrementing after Z-Reading

**Solutions**:
1. Verify Z-Reading generation resets x_counters table
2. Check transaction includes X-counter reset
3. Verify correct terminal_id is used

## Next Steps

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement in order:
   - Counter management (Z/X counters)
   - X-Reading generation
   - Z-Reading generation
   - Daily/VAT reports
   - Export functionality
3. Write tests for:
   - Z-counter atomicity
   - Report calculations
   - Offline generation
