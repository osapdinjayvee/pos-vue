# Research: Offline Sync & Conflict Handling

**Feature**: 010-offline-sync
**Date**: 2026-02-04

## Research Tasks Completed

### 1. OR Number Allocation Strategy

**Decision**: Pre-allocate ranges per terminal with server validation

```typescript
interface ORAllocation {
  terminal_id: string;
  prefix: string;
  start_number: number;
  end_number: number;
  current_number: number;
  allocated_at: string;
  exhausted_at: string | null;
}

// Allocation flow:
// 1. Terminal requests range when < 20% remaining
// 2. Server validates no gaps from previous range
// 3. Server allocates next sequential range
// 4. Terminal stores range locally
// 5. Terminal uses local range for offline OR generation
```

### 2. Conflict Resolution Matrix

**Decision**: Entity-specific resolution rules

| Entity | Rule | Rationale |
|--------|------|-----------|
| Transaction | No conflict (append-only) | Transactions never edited |
| Product | Server wins | Admin controls catalog |
| Price | Server wins | Pricing controlled centrally |
| User | Server wins | Security-critical |
| Customer | Merge by phone | Deduplication |
| Inventory | Sum movements | Additive changes |

### 3. Bulk Sync Progress

**Decision**: Batch processing with UI feedback

```typescript
interface BulkSyncProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  errors: SyncError[];
}

async function processBulkSync(
  items: SyncQueueItem[],
  onProgress: (progress: BulkSyncProgress) => void
): Promise<BulkSyncResult> {
  const BATCH_SIZE = 50;
  const batches = chunk(items, BATCH_SIZE);

  for (const [index, batch] of batches.entries()) {
    const results = await syncBatch(batch);
    onProgress({
      total: items.length,
      processed: (index + 1) * BATCH_SIZE,
      currentBatch: index + 1,
      totalBatches: batches.length,
      // ...
    });
  }
}
```

### 4. Sync Health Monitoring

**Decision**: Terminal heartbeat + queue depth alerts

```typescript
interface TerminalHealth {
  terminal_id: string;
  last_heartbeat: string;
  last_sync: string;
  queue_depth: number;
  error_count: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Alert thresholds
const HEALTH_THRESHOLDS = {
  syncOverdueMins: 240,        // 4 hours
  queueDepthWarning: 100,
  queueDepthCritical: 500,
  errorCountWarning: 5,
};
```

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Progress UI | PrimeVue ProgressBar | Built-in component |
| Monitoring | Filament Dashboard | Admin panel integration |
| Heartbeat | 5-minute interval | Balance between freshness and overhead |
