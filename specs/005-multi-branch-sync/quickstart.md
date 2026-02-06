# Quickstart: Multi-Branch & Cloud Sync

**Feature**: 005-multi-branch-sync
**Date**: 2026-02-04
**Depends On**: All P1 features

## Prerequisites

- All P1 features completed
- Laravel backend API running
- Network connectivity for testing

## Setup Steps

### 1. Run Sync Migrations

Add migration `src/db/migrations/005_sync.ts`:

```typescript
import { Database } from 'sql.js';

export function up(db: Database): void {
  // Sync queue table
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_attempt TEXT,
      last_error TEXT,
      status TEXT DEFAULT 'pending'
    )
  `);

  // Sync status table
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_status (
      terminal_id TEXT PRIMARY KEY,
      last_sync TEXT,
      pending_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle'
    )
  `);

  // Initialize terminal sync status
  db.run(`
    INSERT OR IGNORE INTO sync_status (terminal_id, status)
    VALUES ('POS-001', 'idle')
  `);
}
```

### 2. Configure Sync Endpoint

```typescript
// src/config/sync.ts
export const SYNC_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  syncInterval: 60000,      // 1 minute
  batchSize: 50,
  maxRetries: 5,
  retryDelay: 1000,
};
```

## Verification Steps

### Test Transaction Sync

1. Process a sale while online
2. Check sync queue is empty
3. Verify transaction appears in server dashboard
4. Check sync log shows successful upload

### Test Offline Queue

1. Disconnect network (DevTools → Offline)
2. Process 5 sales
3. Check sync queue shows 5 pending items
4. Reconnect network
5. Verify all 5 transactions sync
6. Verify sync queue is empty

### Test Catalog Download

1. Update product price in admin panel
2. Trigger manual sync on POS
3. Verify new price appears locally
4. Verify conflict log if local changes existed

### Test Conflict Resolution

1. Disconnect terminal
2. Update product description locally
3. Update same product in admin panel
4. Reconnect and sync
5. Verify server version wins
6. Verify conflict logged

## Common Issues

### Sync Never Completes

**Solutions**:
1. Check network connectivity
2. Verify API endpoint is correct
3. Check sync_queue for stuck items with errors

### Data Not Appearing on Server

**Solutions**:
1. Check sync_queue for pending items
2. Verify authentication token is valid
3. Check server logs for errors
