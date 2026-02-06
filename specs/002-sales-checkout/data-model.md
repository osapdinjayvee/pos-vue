# Data Model: Sales & Checkout

**Feature**: 002-sales-checkout
**Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  ORSeries   │◄──────│ Transaction │──────►│    Shift    │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  TxItem  │   │ Payment  │   │  Void    │
       └──────────┘   └──────────┘   └──────────┘
              │
              ▼
       ┌──────────┐
       │ Refund   │──────► RefundItem
       └──────────┘
```

## Entities

### Transaction

Represents a completed sales transaction.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| or_number | string(50) | UNIQUE, NOT NULL | Official Receipt number |
| shift_id | UUID | FK, NOT NULL | Associated shift |
| user_id | UUID | FK, NOT NULL | Cashier who processed |
| terminal_id | string(50) | NOT NULL | POS terminal |
| branch_id | UUID | FK, NOT NULL | Branch location |
| customer_id | UUID | FK, NULL | Associated customer (if any) |
| subtotal | decimal(15,2) | NOT NULL | Sum of line items before discount |
| discount_total | decimal(15,2) | DEFAULT 0 | Total discounts applied |
| vatable_sales | decimal(15,2) | NOT NULL | Sum of VATable items (excl. VAT) |
| vat_amount | decimal(15,2) | NOT NULL | 12% VAT on VATable items |
| vat_exempt_sales | decimal(15,2) | DEFAULT 0 | Sum of VAT-exempt items |
| zero_rated_sales | decimal(15,2) | DEFAULT 0 | Sum of zero-rated items |
| total_amount | decimal(15,2) | NOT NULL | Final amount due |
| discount_type | string(50) | NULL | e.g., 'senior_citizen', 'pwd', 'promo' |
| discount_id_number | string(100) | NULL | SC/PWD ID for audit |
| discount_id_name | string(255) | NULL | Name on SC/PWD ID |
| status | enum | DEFAULT 'completed' | completed, voided |
| notes | text | NULL | Transaction notes |
| created_at | datetime | NOT NULL | Transaction timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_tx_or_number` on (or_number)
- `idx_tx_shift` on (shift_id)
- `idx_tx_user` on (user_id)
- `idx_tx_created` on (created_at)
- `idx_tx_status` on (status)

**Business Rules**:
- or_number is sequential within OR series
- status changes only: completed → voided
- All amounts stored as 2 decimal places

### TransactionItem

Line item in a transaction.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| transaction_id | UUID | FK, NOT NULL | Parent transaction |
| variant_id | UUID | FK, NOT NULL | Product variant sold |
| product_name | string(255) | NOT NULL | Snapshot of product name |
| variant_name | string(100) | NOT NULL | Snapshot of variant name |
| quantity | integer | NOT NULL | Units sold |
| unit_price | decimal(15,2) | NOT NULL | Price per unit at time of sale |
| line_discount | decimal(15,2) | DEFAULT 0 | Discount on this line |
| line_total | decimal(15,2) | NOT NULL | quantity * unit_price - line_discount |
| tax_type | enum | NOT NULL | vatable, exempt, zero_rated |
| vatable_amount | decimal(15,2) | NOT NULL | VATable portion |
| vat_amount | decimal(15,2) | NOT NULL | VAT on this line |
| created_at | datetime | NOT NULL | Record timestamp |

**Indexes**:
- `idx_tx_item_transaction` on (transaction_id)
- `idx_tx_item_variant` on (variant_id)

**Notes**:
- Product/variant names are snapshots (don't change if product renamed)
- Price is snapshot at time of sale

### Payment

Payment record for a transaction.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| transaction_id | UUID | FK, NOT NULL | Associated transaction |
| method | enum | NOT NULL | cash, card, gcash, maya, other_ewallet |
| amount | decimal(15,2) | NOT NULL | Amount paid via this method |
| tendered | decimal(15,2) | NULL | Amount given (cash only) |
| change_amount | decimal(15,2) | NULL | Change returned (cash only) |
| reference_number | string(100) | NULL | Card/e-wallet reference |
| card_last_four | string(4) | NULL | Last 4 digits of card |
| card_type | string(20) | NULL | Visa, Mastercard, etc. |
| created_at | datetime | NOT NULL | Payment timestamp |

**Indexes**:
- `idx_payment_transaction` on (transaction_id)
- `idx_payment_method` on (method)

### ORSeries

Official Receipt number series configuration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| terminal_id | string(50) | NOT NULL | Assigned terminal |
| branch_id | UUID | FK, NOT NULL | Branch |
| prefix | string(20) | NOT NULL | OR prefix (e.g., "OR") |
| branch_code | string(10) | NOT NULL | Branch code for OR |
| start_number | integer | NOT NULL | First number in range |
| end_number | integer | NOT NULL | Last number in range |
| current_number | integer | NOT NULL | Next number to use |
| ptu_number | string(50) | NOT NULL | BIR Permit to Use |
| ptu_valid_until | date | NOT NULL | PTU expiry date |
| machine_serial | string(50) | NOT NULL | Machine serial number |
| min_number | string(50) | NOT NULL | Machine Identification Number |
| is_active | boolean | DEFAULT true | Currently in use |
| created_at | datetime | NOT NULL | Record timestamp |
| updated_at | datetime | NOT NULL | Last update |

**Indexes**:
- `idx_or_terminal` on (terminal_id)
- `idx_or_active` on (is_active)

**Business Rules**:
- Only one active series per terminal
- Alert at 80% usage (current_number > start + 0.8 * (end - start))
- Never reuse or skip numbers

### Void

Void record for cancelled transactions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| transaction_id | UUID | FK, UNIQUE, NOT NULL | Voided transaction |
| reason | string(500) | NOT NULL | Why transaction was voided |
| supervisor_id | UUID | FK, NOT NULL | Who authorized |
| terminal_id | string(50) | NOT NULL | Where voided |
| created_at | datetime | NOT NULL | Void timestamp |
| synced_at | datetime | NULL | Last sync |

**Indexes**:
- `idx_void_transaction` on (transaction_id)
- `idx_void_supervisor` on (supervisor_id)

**Business Rules**:
- One void per transaction
- Original transaction status set to 'voided'
- Stock movements with type 'void' restore inventory

### Refund

Refund record for returned items.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| original_transaction_id | UUID | FK, NOT NULL | Original sale |
| refund_or_number | string(50) | UNIQUE, NOT NULL | Refund receipt number |
| total_refund_amount | decimal(15,2) | NOT NULL | Total amount refunded |
| reason | string(500) | NOT NULL | Why items returned |
| supervisor_id | UUID | FK, NOT NULL | Who authorized |
| user_id | UUID | FK, NOT NULL | Cashier processing |
| terminal_id | string(50) | NOT NULL | Where refunded |
| branch_id | UUID | FK, NOT NULL | Branch |
| refund_method | enum | NOT NULL | cash, card, gcash, maya, store_credit |
| reference_number | string(100) | NULL | Refund reference |
| created_at | datetime | NOT NULL | Refund timestamp |
| synced_at | datetime | NULL | Last sync |

**Indexes**:
- `idx_refund_transaction` on (original_transaction_id)
- `idx_refund_or` on (refund_or_number)

### RefundItem

Individual item in a refund.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| refund_id | UUID | FK, NOT NULL | Parent refund |
| original_item_id | UUID | FK, NOT NULL | Original transaction item |
| quantity | integer | NOT NULL | Units returned |
| refund_amount | decimal(15,2) | NOT NULL | Amount refunded for this item |
| return_to_stock | boolean | DEFAULT true | Add back to inventory |
| created_at | datetime | NOT NULL | Record timestamp |

**Indexes**:
- `idx_refund_item_refund` on (refund_id)

### Discount

Discount/promotion definitions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(100) | NOT NULL | Discount name |
| code | string(50) | UNIQUE, NULL | Promo code (if applicable) |
| type | enum | NOT NULL | percentage, fixed_amount, senior_citizen, pwd |
| value | decimal(10,2) | NOT NULL | Discount value (% or amount) |
| min_purchase | decimal(15,2) | DEFAULT 0 | Minimum purchase required |
| max_discount | decimal(15,2) | NULL | Cap on discount amount |
| applicable_items | enum | DEFAULT 'all' | all, category, specific_products |
| category_ids | JSON | NULL | If applicable_items = 'category' |
| product_ids | JSON | NULL | If applicable_items = 'specific_products' |
| valid_from | datetime | NULL | Start date |
| valid_until | datetime | NULL | End date |
| is_active | boolean | DEFAULT true | Can be used |
| requires_id | boolean | DEFAULT false | Requires ID capture |
| created_at | datetime | NOT NULL | Record timestamp |
| updated_at | datetime | NOT NULL | Last update |

**Indexes**:
- `idx_discount_code` on (code)
- `idx_discount_active` on (is_active)

## SQLite Schema (Local)

```sql
-- Transactions
CREATE TABLE transactions (
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
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
    notes TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tx_or_number ON transactions(or_number);
CREATE INDEX idx_tx_shift ON transactions(shift_id);
CREATE INDEX idx_tx_created ON transactions(created_at);
CREATE INDEX idx_tx_status ON transactions(status);

-- Transaction items
CREATE TABLE transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    line_discount REAL DEFAULT 0,
    line_total REAL NOT NULL,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('vatable', 'exempt', 'zero_rated')),
    vatable_amount REAL NOT NULL,
    vat_amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

CREATE INDEX idx_tx_item_transaction ON transaction_items(transaction_id);

-- Payments
CREATE TABLE payments (
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
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE INDEX idx_payment_transaction ON payments(transaction_id);

-- OR Series
CREATE TABLE or_series (
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
);

CREATE INDEX idx_or_terminal ON or_series(terminal_id);

-- Voids
CREATE TABLE voids (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    supervisor_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
);

-- Refunds
CREATE TABLE refunds (
    id TEXT PRIMARY KEY,
    original_transaction_id TEXT NOT NULL,
    refund_or_number TEXT UNIQUE NOT NULL,
    total_refund_amount REAL NOT NULL,
    reason TEXT NOT NULL,
    supervisor_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    refund_method TEXT NOT NULL,
    reference_number TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (original_transaction_id) REFERENCES transactions(id)
);

CREATE INDEX idx_refund_transaction ON refunds(original_transaction_id);

-- Refund items
CREATE TABLE refund_items (
    id TEXT PRIMARY KEY,
    refund_id TEXT NOT NULL,
    original_item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    return_to_stock INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (refund_id) REFERENCES refunds(id),
    FOREIGN KEY (original_item_id) REFERENCES transaction_items(id)
);

-- Discounts
CREATE TABLE discounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'senior_citizen', 'pwd')),
    value REAL NOT NULL,
    min_purchase REAL DEFAULT 0,
    max_discount REAL,
    applicable_items TEXT DEFAULT 'all',
    category_ids TEXT,
    product_ids TEXT,
    valid_from TEXT,
    valid_until TEXT,
    is_active INTEGER DEFAULT 1,
    requires_id INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_discount_code ON discounts(code);
```

## Sync Payload Schemas

### Transaction Sync (Terminal → Server)

```typescript
interface TransactionSyncRequest {
  terminal_id: string;
  branch_id: string;
  transactions: {
    id: string;
    or_number: string;
    shift_id: string;
    user_id: string;
    customer_id: string | null;
    subtotal: number;
    discount_total: number;
    vatable_sales: number;
    vat_amount: number;
    vat_exempt_sales: number;
    zero_rated_sales: number;
    total_amount: number;
    discount_type: string | null;
    discount_id_number: string | null;
    status: string;
    created_at: string;
    items: TransactionItem[];
    payments: Payment[];
  }[];
  voids: Void[];
  refunds: (Refund & { items: RefundItem[] })[];
}

interface TransactionSyncResponse {
  synced_transaction_ids: string[];
  synced_void_ids: string[];
  synced_refund_ids: string[];
  or_series_status: {
    current_number: number;
    remaining: number;
    alert: boolean;
  };
  sync_timestamp: string;
}
```
