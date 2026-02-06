# Research: User Management

**Feature**: 003-user-management
**Date**: 2026-02-04

## Research Tasks Completed

### 1. SQLite in Browser for Offline Auth

**Decision**: Use sql.js (WebAssembly SQLite)

**Rationale**:
- Pure JavaScript implementation via WebAssembly
- No native dependencies required
- Works in all modern browsers
- Can persist to IndexedDB or localStorage
- Same SQL syntax as native SQLite

**Alternatives Considered**:
- IndexedDB directly: More complex API, no SQL queries
- Dexie.js: IndexedDB wrapper, not SQLite compatible
- absurd-sql: Newer, less proven in production

**Implementation Notes**:
```typescript
import initSqlJs from 'sql.js';

const SQL = await initSqlJs({
  locateFile: file => `https://sql.js.org/dist/${file}`
});
const db = new SQL.Database();
```

### 2. Secure PIN/Password Storage in Browser

**Decision**: Use bcrypt.js for hashing, Web Crypto API for encryption

**Rationale**:
- bcrypt.js: Browser-compatible bcrypt implementation
- Configurable work factor (10-12 rounds)
- Web Crypto API for AES encryption of cached credentials

**Alternatives Considered**:
- Argon2: Better security but larger bundle, slower in WASM
- SHA-256: Too fast, vulnerable to brute force
- PBKDF2: Good but bcrypt is more common in retail POS

**Implementation Notes**:
```typescript
import bcrypt from 'bcryptjs';

// Hashing
const hash = await bcrypt.hash(pin, 10);

// Verification
const isValid = await bcrypt.compare(pin, hash);
```

### 3. Offline Credential Caching Strategy

**Decision**: Encrypted credential cache with 7-day expiry

**Rationale**:
- Balance security vs usability for retail environment
- 7 days covers typical weekly sync patterns
- Encrypted storage prevents credential theft if device compromised

**Alternatives Considered**:
- No caching (always online): Violates offline-first
- Unlimited cache: Security risk
- 24-hour cache: Too restrictive for weekend operations

**Implementation Notes**:
```typescript
interface CachedCredential {
  userId: string;
  username: string;
  pinHash: string;
  role: string;
  permissions: string[];
  cachedAt: number;
  expiresAt: number;
}
```

### 4. Role-Based Permission System

**Decision**: Permission-based system with role groupings

**Rationale**:
- Permissions are granular (e.g., "sales.void")
- Roles group permissions (Cashier, Supervisor, Admin)
- Future custom roles can combine any permissions
- Check permissions, not roles, for flexibility

**Alternatives Considered**:
- Simple role check: Less flexible
- ACL (Access Control List): Over-engineered for this use case
- ABAC (Attribute-Based): Too complex

**Permission Taxonomy**:
```typescript
const PERMISSIONS = {
  // Sales
  'sales.create': 'Process sales transactions',
  'sales.void': 'Void transactions',
  'sales.refund': 'Process refunds',
  'sales.discount': 'Apply discounts',

  // Inventory
  'inventory.view': 'View inventory',
  'inventory.adjust': 'Adjust stock levels',

  // Reports
  'reports.xreading': 'Generate X-Reading',
  'reports.zreading': 'Generate Z-Reading',
  'reports.sales': 'View sales reports',

  // Users
  'users.view': 'View user list',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.deactivate': 'Deactivate users',

  // Settings
  'settings.view': 'View settings',
  'settings.edit': 'Modify settings',
};

const DEFAULT_ROLES = {
  cashier: ['sales.create', 'sales.discount', 'reports.xreading'],
  supervisor: ['sales.*', 'inventory.view', 'reports.*', 'users.view'],
  admin: ['*'],
};
```

### 5. Shift Management Workflow

**Decision**: Mandatory shift start/end with cash tracking

**Rationale**:
- Retail standard for cash accountability
- Shift provides context for all transactions
- Opening/closing cash enables reconciliation

**Workflow**:
1. User logs in
2. System checks for open shift
3. If no open shift: prompt to start shift with opening cash
4. User works (all transactions linked to shift)
5. User requests shift close
6. System shows expected cash (opening + cash in - cash out)
7. User enters actual cash count
8. System records variance and closes shift
9. User can now log out

**Edge Cases**:
- Force close: Supervisor can close another user's shift (with reason)
- Carryover: Shift can span midnight if not closed
- Multiple terminals: One shift per user across terminals

### 6. Inactivity Auto-Lock Implementation

**Decision**: Timer-based lock with immediate PIN re-entry

**Rationale**:
- Prevents unauthorized access when terminal unattended
- PIN re-entry faster than full login
- Configurable timeout per merchant preference

**Implementation Notes**:
```typescript
// Activity events to monitor
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// Lock behavior
function setupInactivityLock(timeoutMs: number) {
  let timer: number;

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(lockScreen, timeoutMs);
  };

  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true });
  });

  resetTimer();
}
```

### 7. User Data Sync Strategy

**Decision**: Incremental sync with last-modified timestamp

**Rationale**:
- Full sync unnecessary for user data (small dataset)
- Timestamp-based ensures only changes sync
- Supports both online and offline modifications

**Sync Flow**:
1. Terminal connects to network
2. Send local changes with timestamps
3. Receive server changes newer than last sync
4. Apply changes (server wins on conflict)
5. Update last sync timestamp

**Conflict Resolution**:
- User deactivated on server: Local deactivates immediately
- User permissions changed: Server version wins
- New user created offline: Assign temp ID, get real ID on sync

## Technology Decisions Summary

| Component | Choice | Package/Library |
|-----------|--------|-----------------|
| Local Database | SQLite | sql.js |
| PIN Hashing | bcrypt | bcryptjs |
| Encryption | AES-256 | Web Crypto API |
| State Management | Pinia | pinia |
| UI Components | PrimeVue | primevue |
| Form Validation | Zod | zod |

## Open Questions (Resolved)

1. ~~Should PIN be numeric only?~~ → Yes, 4-6 digits for fast entry
2. ~~How to handle multiple terminals?~~ → User logs into one terminal at a time
3. ~~Session token or credential caching?~~ → Credential caching (simpler offline)
