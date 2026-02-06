# Data Model: Reports & Analytics

**Feature**: 004-reports-analytics
**Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  ZCounter   │◄──────│  ZReading   │──────►│  Terminal   │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │SalesAggregate│
                      └──────────────┘

┌─────────────┐       ┌─────────────┐
│  XCounter   │◄──────│  XReading   │
└─────────────┘       └─────────────┘
```

## Entities

### ZReading

End-of-day closing report per BIR requirements.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| z_counter | integer | NOT NULL | Sequential Z-counter (never resets) |
| terminal_id | string(50) | NOT NULL | Terminal that generated |
| branch_id | UUID | FK, NOT NULL | Branch location |
| date | date | NOT NULL | Business date |
| beginning_or | string(50) | NOT NULL | First OR of the day |
| ending_or | string(50) | NOT NULL | Last OR of the day |
| beginning_balance | decimal(15,2) | NOT NULL | Opening amount |
| gross_sales | decimal(15,2) | NOT NULL | Total before discounts |
| discount_total | decimal(15,2) | DEFAULT 0 | Total discounts |
| net_sales | decimal(15,2) | NOT NULL | After discounts |
| vatable_sales | decimal(15,2) | NOT NULL | VATable amount (excl. VAT) |
| vat_amount | decimal(15,2) | NOT NULL | 12% VAT |
| vat_exempt_sales | decimal(15,2) | DEFAULT 0 | Exempt sales |
| zero_rated_sales | decimal(15,2) | DEFAULT 0 | Zero-rated sales |
| void_count | integer | DEFAULT 0 | Number of voids |
| void_amount | decimal(15,2) | DEFAULT 0 | Total voided |
| refund_count | integer | DEFAULT 0 | Number of refunds |
| refund_amount | decimal(15,2) | DEFAULT 0 | Total refunded |
| transaction_count | integer | NOT NULL | Total transactions |
| sc_discount_count | integer | DEFAULT 0 | Senior citizen discounts |
| pwd_discount_count | integer | DEFAULT 0 | PWD discounts |
| generated_by | UUID | FK, NOT NULL | User who generated |
| generated_at | datetime | NOT NULL | Generation timestamp |
| synced_at | datetime | NULL | Sync timestamp |

**Indexes**:
- `idx_zreading_counter` on (terminal_id, z_counter) UNIQUE
- `idx_zreading_date` on (date)
- `idx_zreading_branch` on (branch_id)

**Business Rules**:
- Z-counter must be sequential with no gaps
- Only one Z-Reading per terminal per day (override requires supervisor)
- Cannot be modified after generation

### XReading

Shift snapshot report.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| x_counter | integer | NOT NULL | X-counter (resets on Z-Reading) |
| terminal_id | string(50) | NOT NULL | Terminal |
| branch_id | UUID | FK, NOT NULL | Branch |
| shift_id | UUID | FK, NOT NULL | Current shift |
| cashier_id | UUID | FK, NOT NULL | Cashier |
| gross_sales | decimal(15,2) | NOT NULL | Shift gross |
| discount_total | decimal(15,2) | DEFAULT 0 | Shift discounts |
| net_sales | decimal(15,2) | NOT NULL | Shift net |
| vatable_sales | decimal(15,2) | NOT NULL | VATable |
| vat_amount | decimal(15,2) | NOT NULL | VAT |
| vat_exempt_sales | decimal(15,2) | DEFAULT 0 | Exempt |
| zero_rated_sales | decimal(15,2) | DEFAULT 0 | Zero-rated |
| transaction_count | integer | NOT NULL | Transaction count |
| beginning_or | string(50) | NOT NULL | First OR of shift |
| ending_or | string(50) | NOT NULL | Last OR at X-Reading |
| generated_at | datetime | NOT NULL | Timestamp |

**Indexes**:
- `idx_xreading_shift` on (shift_id)
- `idx_xreading_terminal` on (terminal_id)

### ZCounter

Z-counter persistence per terminal.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| terminal_id | string(50) | PK | Terminal identifier |
| current_value | integer | NOT NULL | Current Z-counter value |
| last_z_date | date | NULL | Last Z-Reading date |
| updated_at | datetime | NOT NULL | Last update |

**Business Rules**:
- current_value starts at 0, increments atomically
- NEVER decrements or resets
- Critical for BIR compliance

### XCounter

X-counter per terminal (resets on Z-Reading).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| terminal_id | string(50) | PK | Terminal identifier |
| current_value | integer | NOT NULL | Current X-counter |
| updated_at | datetime | NOT NULL | Last update |

**Business Rules**:
- Resets to 0 when Z-Reading is generated
- Increments on each X-Reading

### SalesAggregate

Pre-calculated daily totals for reporting performance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| date | date | NOT NULL | Business date |
| terminal_id | string(50) | NOT NULL | Terminal |
| branch_id | UUID | FK, NOT NULL | Branch |
| gross_sales | decimal(15,2) | NOT NULL | Daily gross |
| discount_total | decimal(15,2) | DEFAULT 0 | Daily discounts |
| net_sales | decimal(15,2) | NOT NULL | Daily net |
| vatable_sales | decimal(15,2) | NOT NULL | VATable |
| vat_amount | decimal(15,2) | NOT NULL | VAT |
| vat_exempt_sales | decimal(15,2) | DEFAULT 0 | Exempt |
| zero_rated_sales | decimal(15,2) | DEFAULT 0 | Zero-rated |
| transaction_count | integer | NOT NULL | Count |
| void_count | integer | DEFAULT 0 | Voids |
| refund_count | integer | DEFAULT 0 | Refunds |
| created_at | datetime | NOT NULL | Aggregation timestamp |

**Indexes**:
- `idx_aggregate_date` on (date)
- `idx_aggregate_branch_date` on (branch_id, date)
- `idx_aggregate_terminal_date` on (terminal_id, date) UNIQUE

## SQLite Schema (Local)

```sql
-- Z-Reading reports
CREATE TABLE z_readings (
    id TEXT PRIMARY KEY,
    z_counter INTEGER NOT NULL,
    terminal_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    date TEXT NOT NULL,
    beginning_or TEXT NOT NULL,
    ending_or TEXT NOT NULL,
    beginning_balance REAL NOT NULL,
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
);

CREATE INDEX idx_zreading_date ON z_readings(date);
CREATE INDEX idx_zreading_branch ON z_readings(branch_id);

-- X-Reading reports
CREATE TABLE x_readings (
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
    beginning_or TEXT NOT NULL,
    ending_or TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

CREATE INDEX idx_xreading_shift ON x_readings(shift_id);

-- Z-counter (critical - never resets)
CREATE TABLE z_counters (
    terminal_id TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0,
    last_z_date TEXT,
    updated_at TEXT NOT NULL
);

-- X-counter (resets on Z-Reading)
CREATE TABLE x_counters (
    terminal_id TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

-- Daily aggregates for fast reporting
CREATE TABLE sales_aggregates (
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
    refund_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(terminal_id, date)
);

CREATE INDEX idx_aggregate_date ON sales_aggregates(date);
CREATE INDEX idx_aggregate_branch ON sales_aggregates(branch_id, date);
```

## Report Calculation Queries

### X-Reading Calculation

```sql
-- Get current shift totals
SELECT
    COUNT(*) as transaction_count,
    SUM(gross_total) as gross_sales,
    SUM(discount_total) as discount_total,
    SUM(total_amount) as net_sales,
    SUM(vatable_sales) as vatable_sales,
    SUM(vat_amount) as vat_amount,
    SUM(vat_exempt_sales) as vat_exempt_sales,
    SUM(zero_rated_sales) as zero_rated_sales,
    MIN(or_number) as beginning_or,
    MAX(or_number) as ending_or
FROM transactions
WHERE shift_id = ? AND status = 'completed';
```

### Z-Reading Calculation

```sql
-- Get daily totals since last Z-Reading
SELECT
    COUNT(*) as transaction_count,
    SUM(CASE WHEN status = 'completed' THEN gross_total ELSE 0 END) as gross_sales,
    SUM(CASE WHEN status = 'completed' THEN discount_total ELSE 0 END) as discount_total,
    SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as net_sales,
    SUM(CASE WHEN status = 'completed' THEN vatable_sales ELSE 0 END) as vatable_sales,
    SUM(CASE WHEN status = 'completed' THEN vat_amount ELSE 0 END) as vat_amount,
    SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END) as void_count,
    MIN(or_number) as beginning_or,
    MAX(or_number) as ending_or
FROM transactions
WHERE terminal_id = ?
  AND date(created_at) = ?;
```
