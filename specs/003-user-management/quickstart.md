# Quickstart: User Management

**Feature**: 003-user-management
**Date**: 2026-02-04

## Prerequisites

- Node.js 20+
- pnpm 9+
- Project dependencies installed (`pnpm install`)

## Setup Steps

### 1. Install Additional Dependencies

```bash
pnpm add sql.js bcryptjs uuid zod
pnpm add -D @types/sql.js @types/bcryptjs @types/uuid
```

### 2. Initialize SQLite Database

Create database initialization in `src/db/init.ts`:

```typescript
import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from IndexedDB
  const savedData = await loadFromIndexedDB();

  if (savedData) {
    db = new SQL.Database(savedData);
  } else {
    db = new SQL.Database();
    await runMigrations(db);
  }

  return db;
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

### 3. Run Database Migrations

Apply schema from `data-model.md`:

```typescript
// src/db/migrations/001_user_management.ts
export function up(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
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

    CREATE INDEX IF NOT EXISTS idx_user_username ON users(username);
    -- ... rest of schema
  `);
}
```

### 4. Seed Default Data

```typescript
// src/db/seeders/roles.ts
import { v4 as uuidv4 } from 'uuid';

export function seedRoles(db: Database): void {
  const roles = [
    {
      id: uuidv4(),
      code: 'cashier',
      name: 'Cashier',
      permissions: JSON.stringify(['sales.create', 'sales.discount', 'reports.xreading']),
      is_default: 1,
    },
    {
      id: uuidv4(),
      code: 'supervisor',
      name: 'Supervisor',
      permissions: JSON.stringify(['sales.*', 'inventory.view', 'reports.*', 'users.view']),
      is_default: 1,
    },
    {
      id: uuidv4(),
      code: 'admin',
      name: 'Administrator',
      permissions: JSON.stringify(['*']),
      is_default: 1,
    },
  ];

  for (const role of roles) {
    db.run(
      `INSERT OR IGNORE INTO roles (id, code, name, permissions, is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [role.id, role.code, role.name, role.permissions, role.is_default]
    );
  }
}
```

### 5. Create Test User

```typescript
// For development only
import bcrypt from 'bcryptjs';

const testUser = {
  id: uuidv4(),
  username: 'admin',
  pin_hash: await bcrypt.hash('1234', 10),
  first_name: 'Test',
  last_name: 'Admin',
  branch_id: 'default-branch-id',
};
```

## Verification Steps

### Test Login Flow

1. Start the development server: `pnpm dev`
2. Navigate to login page
3. Enter username: `admin`
4. Enter PIN: `1234`
5. Verify redirect to POS interface

### Test Offline Authentication

1. Log in once while online
2. Open browser DevTools → Network → Offline
3. Refresh page
4. Log in with same credentials
5. Verify login succeeds using cached credentials

### Test Role Permissions

1. Log in as cashier
2. Try to access void function → Should prompt for supervisor
3. Log in as supervisor
4. Verify void function is accessible

### Test Shift Management

1. Log in as cashier
2. Start shift with opening cash: PHP 5000
3. Verify shift status shows "open"
4. Attempt to log out → Should be blocked
5. Close shift with closing cash amount
6. Verify variance calculation
7. Now logout should succeed

## Common Issues

### SQLite WASM not loading

**Symptom**: `initSqlJs` fails with network error

**Solution**: Ensure sql.js WASM files are accessible. Either:
- Use CDN: `https://sql.js.org/dist/sql-wasm.wasm`
- Copy to public folder and reference locally

### PIN Validation Fails

**Symptom**: Correct PIN returns "Invalid credentials"

**Solution**: Ensure bcrypt hash was generated with same library:
```typescript
// Verify hash format starts with $2a$ or $2b$
console.log(user.pin_hash);
```

### Offline Credentials Expired

**Symptom**: "Credentials expired" error when offline

**Solution**: Cached credentials expire after 7 days. Sync while online to refresh:
```typescript
await userSyncService.syncUsers();
```

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement components in order:
   - Database layer (repositories)
   - Auth service
   - Login UI components
   - Shift management
   - User CRUD (admin)
3. Write tests for each layer
