# Research: Multi-Branch & Cloud Sync

**Feature**: 005-multi-branch-sync
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Sync Architecture

**Decision**: Queue-based bidirectional sync with background processing

**Flow**:
```
Terminal                          Server
   │                                │
   ├─── Transaction completes ─────►│
   │    (queued locally)            │
   │                                │
   ├─── Sync trigger ──────────────►│
   │    (connectivity/timer)        │
   │                                │
   │◄── ACK + Product updates ─────┤
   │                                │
   └─── Mark synced locally ────────┘
```

**Implementation**:
```typescript
interface SyncQueue {
  id: string;
  entity_type: 'transaction' | 'void' | 'refund' | 'stock_movement';
  entity_id: string;
  operation: 'create' | 'update';
  payload: string;          // JSON
  created_at: string;
  attempts: number;
  last_attempt: string;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}
```

### 2. Conflict Resolution Strategy

**Decision**: Last-write-wins with server preference for reference data

**Rules**:
- Transactions: Always upload (no conflict possible - append-only)
- Products: Server version wins (admin controls catalog)
- Inventory: Sum movements from all terminals
- Users: Server version wins

```typescript
interface ConflictLog {
  id: string;
  entity_type: string;
  entity_id: string;
  local_version: string;    // JSON
  server_version: string;   // JSON
  resolution: 'local' | 'server' | 'merged' | 'manual';
  resolved_by: string | null;
  created_at: string;
}
```

### 3. Retry Strategy

**Decision**: Exponential backoff with max attempts

```typescript
const RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelay: 1000,     // 1 second
  maxDelay: 300000,       // 5 minutes
  backoffMultiplier: 2,
};

function calculateDelay(attempts: number): number {
  const delay = RETRY_CONFIG.initialDelay *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempts);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}
```

### 4. Connectivity Detection

**Decision**: Combination of navigator.onLine and actual API ping

```typescript
async function checkConnectivity(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 5. Batch Processing

**Decision**: Process sync queue in batches of 50 items

```typescript
const BATCH_SIZE = 50;

async function processSyncQueue(): Promise<SyncResult> {
  const pending = await syncQueueRepository.getPending(BATCH_SIZE);

  for (const batch of chunk(pending, 10)) {
    await Promise.all(batch.map(syncItem));
  }
}
```

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| HTTP Client | Axios | Retry interceptors, timeout support |
| Queue Storage | SQLite | Persistent, survives restart |
| Background Sync | setInterval + online event | Simple, works in browser |
| Conflict UI | PrimeVue DataTable | Existing component library |
