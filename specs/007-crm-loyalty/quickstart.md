# Quickstart: CRM & Loyalty Programs

**Feature**: 007-crm-loyalty
**Date**: 2026-02-04
**Depends On**: 002-sales-checkout, 003-user-management

## Prerequisites

- P1 features completed
- Project dependencies installed

## Setup Steps

### 1. Run CRM Migrations

Add migration `src/db/migrations/007_crm.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
  // Membership tiers
  db.run(`
    CREATE TABLE IF NOT EXISTS membership_tiers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_spend REAL NOT NULL,
      discount_rate REAL DEFAULT 0,
      points_multiplier REAL DEFAULT 1,
      display_order INTEGER NOT NULL
    )
  `);

  // Customers
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      tier_id TEXT,
      points_balance INTEGER DEFAULT 0,
      lifetime_spend REAL DEFAULT 0,
      registered_at TEXT NOT NULL,
      last_visit TEXT,
      branch_id TEXT NOT NULL
    )
  `);

  // Loyalty transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      points INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      transaction_id TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Default tiers
  db.run(`INSERT INTO membership_tiers VALUES ('bronze', 'Bronze', 0, 0, 1, 1)`);
  db.run(`INSERT INTO membership_tiers VALUES ('silver', 'Silver', 10000, 0.03, 1.25, 2)`);
  db.run(`INSERT INTO membership_tiers VALUES ('gold', 'Gold', 50000, 0.05, 1.5, 3)`);
}
```

## Verification Steps

### Test Customer Registration

1. At POS checkout, click "Add Customer"
2. Enter phone number and name
3. Click "Register"
4. Verify customer is created and attached to transaction
5. Complete sale
6. Verify points were earned

### Test Points Earning

1. Configure: 1 point per PHP 100
2. Attach customer to PHP 500 sale
3. Complete sale
4. Verify customer earned 5 points

### Test Points Redemption

1. Customer has 100+ points
2. At checkout, click "Redeem Points"
3. Enter points to redeem
4. Verify discount applied
5. Complete sale
6. Verify points deducted

### Test Tier Upgrade

1. Customer at Bronze tier
2. Process sales totaling PHP 10,000+
3. Run tier upgrade process
4. Verify customer upgraded to Silver
5. Verify Silver discount applies

## Common Issues

### Points Not Calculating

**Solutions**:
1. Verify loyalty_config exists for merchant
2. Check earn_rate is greater than 0
3. Verify customer is attached to transaction
