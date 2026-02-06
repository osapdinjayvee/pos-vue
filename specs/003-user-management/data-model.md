# Data Model: User Management

**Feature**: 003-user-management
**Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │──────<│  UserRole   │>──────│    Role     │
└─────────────┘       └─────────────┘       └─────────────┘
       │                                           │
       │                                           │
       ▼                                           ▼
┌─────────────┐                           ┌─────────────┐
│    Shift    │                           │ Permission  │
└─────────────┘                           └─────────────┘
       │
       │
       ▼
┌─────────────┐
│   AuthLog   │
└─────────────┘
```

## Entities

### User

Represents a person who can access the POS system.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Collision-resistant ID (works offline) |
| username | string(50) | UNIQUE, NOT NULL | Login identifier |
| pin_hash | string(255) | NOT NULL | bcrypt hash of PIN |
| password_hash | string(255) | NULL | Optional password for admin/supervisor |
| first_name | string(100) | NOT NULL | User's first name |
| last_name | string(100) | NOT NULL | User's last name |
| email | string(255) | NULL | Optional email for notifications |
| branch_id | UUID | FK, NOT NULL | Primary assigned branch |
| is_active | boolean | DEFAULT true | Soft delete flag |
| last_login_at | datetime | NULL | Last successful login timestamp |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_user_username` on (username)
- `idx_user_branch` on (branch_id)
- `idx_user_active` on (is_active)

**Validation Rules**:
- Username: 3-50 alphanumeric characters, lowercase
- PIN: 4-6 numeric digits
- Names: 1-100 characters, no special characters except hyphen/apostrophe

### Role

Defines a set of permissions that can be assigned to users.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(50) | UNIQUE, NOT NULL | Role display name |
| code | string(50) | UNIQUE, NOT NULL | Role code (cashier, supervisor, admin) |
| description | string(255) | NULL | Role description |
| is_default | boolean | DEFAULT false | System-defined role |
| is_active | boolean | DEFAULT true | Can be assigned to users |
| permissions | JSON | NOT NULL | Array of permission codes |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |

**Default Roles**:
```json
[
  {
    "code": "cashier",
    "name": "Cashier",
    "permissions": ["sales.create", "sales.discount", "reports.xreading"]
  },
  {
    "code": "supervisor",
    "name": "Supervisor",
    "permissions": ["sales.*", "inventory.view", "reports.*", "users.view"]
  },
  {
    "code": "admin",
    "name": "Administrator",
    "permissions": ["*"]
  }
]
```

### Permission

Defines a granular access right.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| code | string(100) | UNIQUE, NOT NULL | Permission code (e.g., sales.void) |
| name | string(100) | NOT NULL | Display name |
| description | string(255) | NULL | What this permission allows |
| category | string(50) | NOT NULL | Grouping (sales, inventory, reports, users, settings) |
| created_at | datetime | NOT NULL | Record creation timestamp |

**Permission Codes**:
```
sales.create      - Process sales transactions
sales.void        - Void transactions
sales.refund      - Process refunds
sales.discount    - Apply discounts
inventory.view    - View inventory
inventory.adjust  - Adjust stock levels
reports.xreading  - Generate X-Reading
reports.zreading  - Generate Z-Reading
reports.sales     - View sales reports
users.view        - View user list
users.create      - Create users
users.edit        - Edit users
users.deactivate  - Deactivate users
settings.view     - View settings
settings.edit     - Modify settings
```

### UserRole

Junction table linking users to roles (many-to-many).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | Reference to User |
| role_id | UUID | FK, NOT NULL | Reference to Role |
| assigned_at | datetime | NOT NULL | When role was assigned |
| assigned_by | UUID | FK, NULL | Admin who assigned role |

**Constraints**:
- UNIQUE(user_id, role_id) - User cannot have same role twice

### Shift

Represents a work session for a user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | User working the shift |
| terminal_id | string(50) | NOT NULL | Terminal identifier |
| branch_id | UUID | FK, NOT NULL | Branch where shift occurred |
| started_at | datetime | NOT NULL | Shift start timestamp |
| ended_at | datetime | NULL | Shift end timestamp (NULL if open) |
| opening_cash | decimal(15,2) | NOT NULL | Cash in drawer at start |
| closing_cash | decimal(15,2) | NULL | Actual cash count at end |
| expected_cash | decimal(15,2) | NULL | Calculated expected cash |
| variance | decimal(15,2) | NULL | Difference (actual - expected) |
| variance_reason | string(500) | NULL | Explanation if variance exists |
| status | enum | NOT NULL | open, closed, force_closed |
| closed_by | UUID | FK, NULL | User who closed (for force close) |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_shift_user` on (user_id)
- `idx_shift_status` on (status)
- `idx_shift_branch_date` on (branch_id, started_at)

**Business Rules**:
- Only one open shift per user across all terminals
- Shift must be closed before user can start new shift
- Force close requires supervisor and reason

### AuthLog

Audit trail for authentication events.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NULL | User attempting auth (NULL if unknown user) |
| username | string(50) | NOT NULL | Username attempted |
| event_type | enum | NOT NULL | login_success, login_failure, logout, lock, unlock |
| terminal_id | string(50) | NOT NULL | Terminal identifier |
| ip_address | string(45) | NULL | IP if online |
| user_agent | string(500) | NULL | Browser/client info |
| failure_reason | string(255) | NULL | Why auth failed |
| created_at | datetime | NOT NULL | Event timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_authlog_user` on (user_id)
- `idx_authlog_created` on (created_at)
- `idx_authlog_type` on (event_type)

## State Transitions

### Shift Status

```
        ┌──────┐
        │ open │
        └──┬───┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌────────┐  ┌────────────┐
│ closed │  │force_closed│
└────────┘  └────────────┘
```

**Transitions**:
- `open` → `closed`: User closes their own shift with cash count
- `open` → `force_closed`: Supervisor closes another user's shift

### User Active Status

```
     create
        │
        ▼
   ┌─────────┐
   │ active  │
   └────┬────┘
        │ deactivate
        ▼
  ┌───────────┐
  │ inactive  │
  └─────┬─────┘
        │ reactivate
        ▼
   ┌─────────┐
   │ active  │
   └─────────┘
```

**Rules**:
- Users cannot be deleted, only deactivated
- Inactive users cannot log in
- Reactivation requires admin permission

## SQLite Schema (Local)

```sql
-- Users table
CREATE TABLE users (
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
);

CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_branch ON users(branch_id);

-- Roles table
CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    permissions TEXT NOT NULL, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- User roles junction
CREATE TABLE user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    assigned_by TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE(user_id, role_id)
);

-- Shifts table
CREATE TABLE shifts (
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
);

CREATE INDEX idx_shift_user ON shifts(user_id);
CREATE INDEX idx_shift_status ON shifts(status);

-- Auth logs table
CREATE TABLE auth_logs (
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
);

CREATE INDEX idx_authlog_user ON auth_logs(user_id);
CREATE INDEX idx_authlog_created ON auth_logs(created_at);

-- Permissions reference table
CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

## Cached Credentials Schema

For offline authentication, credentials are cached in encrypted localStorage:

```typescript
interface CachedCredentials {
  version: number;           // Schema version for migrations
  branchId: string;          // Branch these credentials belong to
  lastSync: string;          // ISO timestamp of last sync
  users: CachedUser[];       // Encrypted user records
}

interface CachedUser {
  id: string;
  username: string;
  pinHash: string;           // bcrypt hash
  firstName: string;
  lastName: string;
  roles: string[];           // Role codes
  permissions: string[];     // Flattened permissions
  cachedAt: string;          // When cached
  expiresAt: string;         // Cache expiry (7 days)
}
```

## Sync Payload Schemas

### User Sync (Server → Terminal)

```typescript
interface UserSyncResponse {
  users: {
    id: string;
    username: string;
    pin_hash: string;
    first_name: string;
    last_name: string;
    branch_id: string;
    is_active: boolean;
    roles: { id: string; code: string; permissions: string[] }[];
    updated_at: string;
  }[];
  deleted_user_ids: string[];
  sync_timestamp: string;
}
```

### Shift Sync (Terminal → Server)

```typescript
interface ShiftSyncRequest {
  terminal_id: string;
  shifts: {
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string | null;
    opening_cash: number;
    closing_cash: number | null;
    expected_cash: number | null;
    variance: number | null;
    variance_reason: string | null;
    status: 'open' | 'closed' | 'force_closed';
    closed_by: string | null;
  }[];
  auth_logs: {
    id: string;
    user_id: string | null;
    username: string;
    event_type: string;
    failure_reason: string | null;
    created_at: string;
  }[];
}
```
