# Data Model: CRM & Loyalty Programs

**Feature**: 007-crm-loyalty
**Date**: 2026-02-04

## Entities

### Customer

Individual buyer profile.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| phone | string(20) | UNIQUE per merchant | Primary identifier |
| name | string(255) | NOT NULL | Customer name |
| email | string(255) | NULL | Email address |
| tier_id | UUID | FK | Current membership tier |
| points_balance | integer | DEFAULT 0 | Current points |
| lifetime_spend | decimal(15,2) | DEFAULT 0 | Total spend |
| registered_at | datetime | NOT NULL | Registration date |
| last_visit | datetime | NULL | Last transaction |
| branch_id | UUID | FK | Registration branch |
| synced_at | datetime | NULL | Sync timestamp |

### LoyaltyTransaction

Points activity record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| customer_id | UUID | FK, NOT NULL | Customer |
| type | enum | NOT NULL | earn, redeem, expire, adjustment |
| points | integer | NOT NULL | Points (+/-) |
| balance_after | integer | NOT NULL | Balance after |
| transaction_id | UUID | FK, NULL | Related sale |
| reason | string(255) | NULL | Description |
| created_at | datetime | NOT NULL | Timestamp |
| synced_at | datetime | NULL | Sync timestamp |

### MembershipTier

Customer level definition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(50) | NOT NULL | Tier name |
| min_spend | decimal(15,2) | NOT NULL | Threshold |
| discount_rate | decimal(5,4) | DEFAULT 0 | Discount % |
| points_multiplier | decimal(5,2) | DEFAULT 1 | Points bonus |
| benefits | JSON | NULL | Benefit list |
| display_order | integer | NOT NULL | Sort order |

### LoyaltyConfig

Merchant loyalty settings.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| merchant_id | UUID | PK | Merchant |
| earn_rate | decimal(10,4) | NOT NULL | Points/PHP |
| redeem_rate | decimal(10,4) | NOT NULL | PHP/point |
| expiry_days | integer | DEFAULT 365 | Expiry period |
| min_redemption | integer | DEFAULT 100 | Min points |
| is_active | boolean | DEFAULT true | Program active |

## SQLite Schema

```sql
-- Customers
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    tier_id TEXT,
    points_balance INTEGER DEFAULT 0,
    lifetime_spend REAL DEFAULT 0,
    registered_at TEXT NOT NULL,
    last_visit TEXT,
    branch_id TEXT NOT NULL,
    synced_at TEXT,
    UNIQUE(phone, branch_id)
);

CREATE INDEX idx_customer_phone ON customers(phone);
CREATE INDEX idx_customer_tier ON customers(tier_id);

-- Loyalty transactions
CREATE TABLE loyalty_transactions (
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
);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);

-- Membership tiers
CREATE TABLE membership_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_spend REAL NOT NULL,
    discount_rate REAL DEFAULT 0,
    points_multiplier REAL DEFAULT 1,
    benefits TEXT,
    display_order INTEGER NOT NULL
);

-- Loyalty config
CREATE TABLE loyalty_config (
    merchant_id TEXT PRIMARY KEY,
    earn_rate REAL NOT NULL,
    redeem_rate REAL NOT NULL,
    expiry_days INTEGER DEFAULT 365,
    min_redemption INTEGER DEFAULT 100,
    is_active INTEGER DEFAULT 1
);
```
