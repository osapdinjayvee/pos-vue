# Data Model: Cash Drawer Management

**Feature**: 009-cash-drawer
**Date**: 2026-02-04

## Entities

### DrawerSession

Cash tracking per shift.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| shift_id | UUID | FK, UNIQUE | Related shift |
| user_id | UUID | FK | Cashier |
| terminal_id | string(50) | NOT NULL | Terminal |
| opening_amount | decimal(15,2) | NOT NULL | Opening cash |
| expected_amount | decimal(15,2) | NULL | Calculated expected |
| closing_amount | decimal(15,2) | NULL | Actual closing |
| variance | decimal(15,2) | NULL | Over/short |
| variance_reason | text | NULL | Explanation |
| status | enum | DEFAULT open | open, closed |
| opened_at | datetime | NOT NULL | Open time |
| closed_at | datetime | NULL | Close time |

### DrawerOperation

Cash movements during shift.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| session_id | UUID | FK | Drawer session |
| type | enum | NOT NULL | open, close, drop, paid_in, no_sale |
| amount | decimal(15,2) | NULL | Amount (for drops/paid-ins) |
| reason | string(255) | NULL | Reason |
| authorized_by | UUID | FK | Supervisor (if required) |
| created_at | datetime | NOT NULL | Timestamp |

### DenominationCount

Cash breakdown for counts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| operation_id | UUID | FK | Parent operation |
| denomination | decimal(10,2) | NOT NULL | Denomination value |
| quantity | integer | NOT NULL | Count |
| subtotal | decimal(15,2) | NOT NULL | denomination * quantity |

## SQLite Schema

```sql
-- Drawer sessions
CREATE TABLE drawer_sessions (
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
);

CREATE INDEX idx_drawer_shift ON drawer_sessions(shift_id);

-- Drawer operations
CREATE TABLE drawer_operations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('open', 'close', 'drop', 'paid_in', 'no_sale')),
    amount REAL,
    reason TEXT,
    authorized_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES drawer_sessions(id)
);

-- Denomination counts
CREATE TABLE denomination_counts (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL,
    denomination REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (operation_id) REFERENCES drawer_operations(id)
);
```
