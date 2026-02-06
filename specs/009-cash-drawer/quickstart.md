# Quickstart: Cash Drawer Management

**Feature**: 009-cash-drawer
**Date**: 2026-02-04
**Depends On**: 003-user-management, 002-sales-checkout

## Prerequisites

- Shifts feature working
- Cash payment method available

## Setup Steps

### 1. Run Migrations

Add `src/db/migrations/009_cash_drawer.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
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
      status TEXT DEFAULT 'open',
      opened_at TEXT NOT NULL,
      closed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS drawer_operations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL,
      reason TEXT,
      authorized_by TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS denomination_counts (
      id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL,
      denomination REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL
    )
  `);
}
```

## Verification Steps

### Test Opening Count

1. Log in and start shift
2. System prompts for opening count
3. Enter counts by denomination:
   - 5 × ₱1,000 = ₱5,000
   - 10 × ₱100 = ₱1,000
   - etc.
4. Verify total calculated correctly
5. Confirm opening
6. Verify drawer session created

### Test Expected Cash

1. Complete shift with opening ₱5,000
2. Process cash sales totaling ₱3,000
3. Navigate to drawer status
4. Verify expected shows ₱8,000

### Test Cash Drop

1. During shift, click "Cash Drop"
2. Enter amount: ₱5,000
3. Enter supervisor PIN
4. Confirm drop
5. Verify expected cash reduced by ₱5,000

### Test Closing Reconciliation

1. At shift end, click "Close Drawer"
2. Enter closing count by denomination
3. System shows expected vs actual
4. If variance > ₱100, enter reason
5. Confirm close
6. Verify variance report shows correctly

## Common Issues

### Can't Start Shift Without Opening Count

**This is expected behavior.** Opening count is required for cash accountability.

### Variance Not Calculating

**Solutions**:
1. Verify all cash transactions recorded
2. Check cash drops/paid-ins logged
3. Verify expected calculation formula
