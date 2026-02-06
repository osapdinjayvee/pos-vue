# Tasks: Offline Sync & Conflict Handling

**Input**: Design documents from `/specs/010-offline-sync/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Feature Branch**: `010-offline-sync`
**Depends On**: 005-multi-branch-sync (base sync infrastructure — already implemented)

**Organization**: Tasks grouped by user story. Adapted for Vue 3 + PrimeVue 4 + Pinia + sql.js frontend stack.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Existing Infrastructure (DO NOT recreate)

- **Sync types**: `src/types/sync.ts` — SyncQueue, SyncQueueInput, SyncLog, SyncLogInput, SyncStatus, SyncConfig, SyncResult, SyncError, SyncBatchResult, SyncEntityType, SyncQueueStatus, SyncDirection, SyncResultType, Branch, BranchSummary, SyncUploadResponse, CatalogDownloadResponse, InventorySyncResponse
- **Conflict types**: `src/types/conflict.ts` — ConflictLog, ConflictLogInput, ConflictDetail, ConflictDifference, ConflictStats, ConflictResolutionType
- **Migration 006_sync.ts**: Tables — sync_queue (id, entity_type, entity_id, operation, payload, priority, created_at, attempts, last_attempt, last_error, status), sync_log (id, entity_type, entity_id, operation, direction, result, duration_ms, synced_at), conflict_log (id, entity_type, entity_id, local_version, server_version, resolution, resolved_by, created_at, resolved_at), sync_status (terminal_id PK, last_sync, last_download, pending_count, error_count, status)
- **Repositories**: syncQueueRepository (getPending, getBatch, updateStatus, incrementAttempts, markBatchAsSyncing, existsForEntity, resetFailed, clearCompleted, countByStatus), syncLogRepository (create, findByEntity, getRecent, clearOldLogs), conflictLogRepository (create, findUnresolved, findByEntity, resolve, getStats)
- **Sync service**: `src/services/syncService.ts` — orchestrator with registerHandler, enqueueItem, processBatch, runSyncCycle, startSync, stopSync, triggerManualSync; reactive isSyncing, lastSyncAt, syncErrors
- **Entity sync services**: transactionSyncService (enqueueTransaction, enqueueVoid, enqueueRefund, uploadBatch), inventorySyncService (enqueueStockMovement, uploadBatch, downloadBranchInventory), catalogSyncService (fetchUpdatedCatalog, applyProductUpdates, deleteRemovedProducts, syncCatalogDownload)
- **Conflict service**: `src/services/conflictService.ts` — detectConflict, resolveWithLWW, logConflict, getConflictDetails, resolveManually, getConflictStats
- **Connectivity service**: `src/services/connectivityService.ts` — isOnline, lastOnlineAt, checkConnectivity, onOnline, onOffline
- **Sync store**: `src/stores/sync.ts` — syncStatus, pendingItems, recentLogs, unresolvedConflicts, isSyncing, queueCounts; actions: refreshStatus, loadPendingItems, loadRecentLogs, loadUnresolvedConflicts, updateAfterSync, retryFailed, clearCompleted
- **Sync composable**: `src/composables/useSync.ts` — initializeSync, destroySync, triggerManualSync, refreshStatus; reactive: isSyncing, isOnline, lastSyncAt, syncErrors, pendingCount, syncProgress, lastResult
- **Conflict composable**: `src/composables/useConflictResolution.ts` — loadConflicts, viewConflictDetails, resolveManually, clearSelection
- **Offline composable**: `src/composables/useOfflineStatus.ts` — isOnline, lastOnline, onOnline, onOffline
- **OR number**: `src/stores/orSeries.ts` (series, activeSeries, getNextORNumber, checkActiveSeriesStatus), `src/composables/useORNumber.ts` (loadAllSeries, getNextORNumber, checkStatus, isSeriesLow, isSeriesCritical, isSeriesExhausted, remainingCapacity), `src/utils/orGenerator.ts` (generateORNumber, formatORNumber, getSeriesStatus, thresholds at 80%/95%/100%), `src/repositories/orSeriesRepository.ts` (getAll, findActiveByTerminal, findActiveByBranch, createSeries, activate, deactivate, getNextORNumber)
- **OR Series type**: `src/types/receipt.ts` — ORSeries (id, terminal_id, branch_id, prefix, branch_code, start_number, end_number, current_number, ptu_number, ptu_valid_until, machine_serial, min_number, is_active, created_at, updated_at), DisplayORSeries
- **Sync components**: `src/components/sync/` — SyncStatus.vue (topbar indicator), PendingSyncList.vue (DataTable of queue items), ConflictList.vue (DataTable of conflicts), ConflictDetail.vue, SyncProgress.vue, BranchSelector.vue, BranchSummaryCard.vue
- **Sync views**: SyncQueueView.vue (queue management with manual sync, retry, clear), ConflictsView.vue (conflict list with detail dialog and manual resolution)
- **Routes**: `/sync-queue` and `/conflicts` already exist with permissions and breadcrumbs
- **Sync config**: `src/config/sync.ts` — DEFAULT_SYNC_CONFIG (batchSize: 50, maxRetries: 5, syncInterval: 30s), getRetryDelay, SYNC_PRIORITIES (transaction: 10, void: 9, refund: 8, stock_movement: 5)
- **Next migration**: 012 (011_analytics.ts is latest)

## Patterns to Follow

- **Repository**: extends BaseRepository with tableName/idPrefix, uses db.query()/db.execute()
- **Store**: Pinia with ref() state, computed getters, async actions (see `src/stores/sync.ts`)
- **Composable**: wraps store, exposes computed refs + methods (see `src/composables/useSync.ts`)
- **View**: Toast, ConfirmDialog, DataTable with filters (see `src/views/SyncQueueView.vue`)
- **Service**: class-based singleton pattern (see `src/services/syncService.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New types, migration for sync_health table, and extended OR allocation fields

- [x] T001 Extend sync types in `src/types/sync.ts` — Add: BulkSyncProgress interface (total, processed, successful, failed, currentBatch, totalBatches, estimatedTimeRemaining, errors, startedAt, isResuming), SyncHealthStatus type ('healthy' | 'warning' | 'critical' | 'unknown'), SyncHealth interface (terminal_id, branch_id, last_heartbeat, last_upload, last_download, queue_depth, error_count, status: SyncHealthStatus, updated_at), SyncHealthThresholds interface (syncOverdueMins: 240, queueDepthWarning: 100, queueDepthCritical: 500, errorCountWarning: 5), ORAllocation interface (id, terminal_id, branch_id, prefix, start_number, end_number, current_number, allocated_at, exhausted_at, status: 'active' | 'exhausted'), ORAllocationRequest/Response types
- [x] T002 Extend conflict types in `src/types/conflict.ts` — Add: ConflictResolutionRule interface (entityType, strategy: 'server_wins' | 'local_wins' | 'merge' | 'manual', mergeFields?: string[]), CONFLICT_RESOLUTION_RULES constant mapping entity types to rules per research.md matrix (transaction → append-only, product → server_wins, price → server_wins, user → server_wins, customer → merge by phone, inventory → sum_movements)
- [x] T003 Create database migration `src/db/migrations/013_offline_sync.ts` — Create table: sync_health (terminal_id TEXT PK, branch_id TEXT NOT NULL, last_heartbeat TEXT, last_upload TEXT, last_download TEXT, queue_depth INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0, status TEXT DEFAULT 'unknown' CHECK(status IN ('healthy','warning','critical','unknown')), updated_at TEXT NOT NULL). Create table: or_allocations (id TEXT PK, terminal_id TEXT NOT NULL, branch_id TEXT NOT NULL, prefix TEXT NOT NULL, start_number INTEGER NOT NULL, end_number INTEGER NOT NULL, current_number INTEGER NOT NULL, allocated_at TEXT NOT NULL, exhausted_at TEXT, status TEXT DEFAULT 'active' CHECK(status IN ('active','exhausted')), UNIQUE(terminal_id, prefix, start_number)). Add indexes: idx_sync_health_status on sync_health(status), idx_or_alloc_terminal on or_allocations(terminal_id, status)
- [x] T004 Register migration 013 in `src/db/database.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositories and core services that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create `src/repositories/syncHealthRepository.ts` — extends BaseRepository, methods: upsert(health: SyncHealth), findByTerminal(terminalId), findAll(), findByStatus(status: SyncHealthStatus), findByBranch(branchId), updateHeartbeat(terminalId), updateQueueDepth(terminalId, depth), incrementErrorCount(terminalId), resetErrorCount(terminalId), getStaleTerminals(thresholdMins: number) returning terminals where last_heartbeat is older than threshold
- [x] T006 [P] Create `src/repositories/orAllocationRepository.ts` — extends BaseRepository, methods: create(allocation), findActiveByTerminal(terminalId), findByTerminal(terminalId), markExhausted(id), getCurrentAllocation(terminalId, prefix) returning active allocation with remaining capacity, getUsagePercentage(id)
- [x] T007 Create `src/services/bulkSyncService.ts` — processBulkSync(onProgress: (progress: BulkSyncProgress) => void): gets all pending items sorted by priority, processes in batches of BATCH_SIZE (from sync config), tracks progress with processed/successful/failed counts, calculates estimatedTimeRemaining based on avg batch duration, yields to UI between batches via setTimeout(0). resumeSync(fromItemId, onProgress): queries pending items created after the last successfully synced item, resumes from that point. getResumePoint(): queries sync_log for last successful upload, returns the entity_id/created_at to resume from. Uses syncService.processBatch() internally but adds progress tracking and resume logic
- [x] T008 Create `src/services/orAllocationService.ts` — requestNewRange(terminalId, prefix, branchId): calls httpClient.post('/sync/or-allocations/request') to get new range from server, stores in or_allocations table via orAllocationRepository. checkAndRequestRange(terminalId): checks current active allocation, if < 20% remaining requests new range. consumeNumber(terminalId): gets next number from active allocation, marks exhausted when depleted. isRangeAvailable(terminalId): returns boolean. getActiveAllocation(terminalId): returns current allocation with remaining count. Integrates with existing useORNumber flow — when OR series is low, attempts server allocation before falling back to local series
- [x] T009 Create `src/services/syncHealthService.ts` — updateHealth(terminalId, branchId): updates sync_health record with current queue_depth from syncQueueRepository.countByStatus(), error_count, calculated status based on SyncHealthThresholds. sendHeartbeat(terminalId): updates last_heartbeat in sync_health, posts to `/sync/health/heartbeat` if online. evaluateStatus(health: SyncHealth): returns calculated SyncHealthStatus based on thresholds (healthy if recent heartbeat + low queue + low errors, warning if overdue or high queue, critical if very overdue or very high queue or many errors). startHeartbeatLoop(terminalId, intervalMs?: 300000): sends heartbeat every 5 minutes while online. getTerminalStatuses(): returns all sync_health records with evaluated statuses
- [x] T010 Enhance conflict resolution in `src/services/conflictService.ts` — Add method: resolveByRules(entityType, localVersion, serverVersion, localTimestamp, serverTimestamp): uses CONFLICT_RESOLUTION_RULES to determine resolution strategy per entity type. For 'server_wins': return server version. For 'merge': merge fields (e.g., customer merge by phone — combine transaction histories, keep server demographics). For 'sum_movements': sum inventory quantities. Log conflict with resolution type. Returns {resolution, resolvedData, conflictId}. Integrate with existing resolveWithLWW as fallback for unconfigured entities
- [x] T011 Verify Phase 2 with `npx vue-tsc --noEmit` and `npx vite build`

**Checkpoint**: Foundation ready — bulk sync service, OR allocation, sync health monitoring, and enhanced conflict resolution in place

---

## Phase 3: User Story 1 — Bulk Sync Recovery (Priority: P1) 🎯 MVP

**Goal**: After extended offline period, accumulated transactions sync reliably with progress feedback, non-blocking POS operations, and resume-from-last-point capability

**Independent Test**: Accumulate 100+ transactions offline (seed sync_queue), trigger sync, verify progress bar shows, verify POS operations not blocked, disconnect mid-sync, reconnect and verify resume from last successful point

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `src/components/sync/BulkSyncProgress.vue` — Enhanced progress display replacing basic SyncProgress.vue usage during bulk syncs. Shows: PrimeVue ProgressBar with percentage, "X of Y items synced" text, current batch number, estimated time remaining, successful/failed counters with PrimeVue Tag (success/danger), error summary expandable section with last 5 errors. Props: progress (BulkSyncProgress), isActive. Auto-scrolls error list
- [x] T013 [P] [US1] Create `src/components/sync/SyncResumeIndicator.vue` — Small banner component shown when sync is resuming from an interrupted point. Shows: "Resuming sync from item X" with PrimeVue Message severity="info", last successful sync timestamp, items remaining count. Props: resumePoint, remaining. Emits: dismiss
- [x] T014 [US1] Update `src/composables/useSync.ts` — Add methods: triggerBulkSync() that calls bulkSyncService.processBulkSync() with progress callback updating new reactive ref `bulkProgress`, wraps in try/catch with error toast. Add: resumeInterruptedSync() that calls bulkSyncService.resumeSync() with progress callback. Add reactive state: bulkProgress ref (BulkSyncProgress | null), isBulkSyncing computed, isResuming ref. On initializeSync(), check if there are > BATCH_SIZE pending items and auto-trigger bulk sync. Ensure existing triggerManualSync still works for small syncs
- [x] T015 [US1] Update `src/views/SyncQueueView.vue` — Add BulkSyncProgress component (shown when bulkProgress is not null, replacing basic SyncProgress). Add SyncResumeIndicator (shown when isResuming). Add "Bulk Sync" button (visible when pendingCount > 50, calls triggerBulkSync). Ensure "Manual Sync" button still works for regular sync. Show toast on bulk sync completion with summary (X synced, Y failed). Existing PendingSyncList, retry, clear actions remain unchanged
- [x] T016 [US1] Ensure non-blocking sync — In `src/services/bulkSyncService.ts`, add `await new Promise(resolve => setTimeout(resolve, 0))` between batches to yield to UI thread. Add requestIdleCallback fallback for lower-priority batches. Verify that transaction processing (POS view) is not blocked during bulk sync by testing concurrent operations. If syncService.isSyncing is true, new sales should still queue to sync_queue without waiting
- [x] T017 [US1] Implement sync resume on connectivity restore — In `src/composables/useSync.ts` initializeSync(), register an onOnline callback (via connectivityService) that checks for pending items, determines resume point via bulkSyncService.getResumePoint(), and calls resumeInterruptedSync() if there are items to sync. Show toast "Connection restored — resuming sync of X items"

**Checkpoint**: Bulk sync recovery fully functional — progress tracking, non-blocking, resume from interruption

---

## Phase 4: User Story 2 — Product Catalog Conflict (Priority: P1)

**Goal**: Product data modified at both HQ and terminal while offline resolves deterministically (server wins), with conflict logging and new product/deleted product handling

**Independent Test**: Modify a product price locally while "offline" (seed a conflict), trigger catalog sync, verify server version wins, verify conflict appears in conflict log, verify new server products appear locally, verify deleted products marked discontinued

### Implementation for User Story 2

- [x] T018 [US2] Enhance `src/services/catalogSyncService.ts` — Update syncCatalogDownload() to use conflictService.resolveByRules('product', ...) when a local product has been modified since last sync AND server version differs. Before applying product updates, compare local updated_at vs server updated_at vs synced_at for each product. If conflict detected: call resolveByRules which returns server version (server_wins rule), log conflict with both versions. For deleted products: check if local has transactions referencing the product, if yes mark product as discontinued (is_active = 0) instead of deleting, preserve transaction data integrity. For new server products: upsert directly. Add syncCatalogWithConflictResolution() method that wraps the full flow
- [x] T019 [US2] Add conflict logging UI feedback — In `src/views/SyncQueueView.vue`, after bulk/manual sync completes, check syncStore.unresolvedConflicts count. If > 0, show PrimeVue Toast with severity warn: "X conflicts detected during sync — review in Conflicts dashboard" with action button linking to `/conflicts`. Update syncStore.loadUnresolvedConflicts() after each sync cycle
- [x] T020 [US2] Update `src/views/ConflictsView.vue` — Add filter tabs or SelectButton to filter by entity_type (All, Product, Customer, Inventory). Add "Recommended Resolution" column to ConflictList showing the rule-based recommendation (e.g., "Server version (auto-applied)" or "Manual review needed"). Ensure product conflicts show both versions with highlighted field differences (price, name, category changes). Existing manual resolution flow (local/server choice) remains unchanged

**Checkpoint**: Product catalog conflicts resolve automatically with server precedence, full logging, proper handling of new/deleted products

---

## Phase 5: User Story 3 — Inventory Reconciliation (Priority: P1)

**Goal**: After offline period with sales, inventory levels reconcile correctly — central inventory reflects all movements, stock receipts from HQ appear locally, multi-terminal deductions sum correctly, negative stock flagged

**Independent Test**: Make sales offline (decrement stock locally), trigger sync, verify inventory movements uploaded, download updated stock levels, verify negative stock flagged for review

### Implementation for User Story 3

- [x] T021 [US3] Enhance `src/services/inventorySyncService.ts` — Add reconcileInventory(branchId): after uploading local stock_movements, download server's current inventory for branch, compare local quantities vs server quantities. For each product: if local qty differs from server (after applying all synced movements), flag for reconciliation. Add sumMovements(productId, dateFrom, dateTo): calculates net movement across all terminals for a product. Add flagNegativeStock(): after reconciliation, query products where current_stock < 0, return list for review. Add reconcileAfterSync(): wrapper that calls uploadBatch, downloadBranchInventory, then reconcileInventory
- [x] T022 [P] [US3] Create `src/components/sync/InventoryReconciliationAlert.vue` — PrimeVue Message banner with severity="warn" shown when inventory discrepancies detected post-sync. Shows: "X products have inventory discrepancies after sync" with details button. Clicking details shows Dialog with DataTable: product name, local qty, server qty, difference, status (negative stock flagged with Tag danger). Props: discrepancies[], visible. Emits: dismiss, review(productId)
- [x] T023 [US3] Wire inventory reconciliation into sync flow — In `src/composables/useSync.ts`, after bulk or manual sync completes, call inventorySyncService.reconcileAfterSync(). If discrepancies found, store in a new reactive ref `inventoryDiscrepancies`. If negative stock found, show toast with severity warn. Update SyncQueueView to show InventoryReconciliationAlert when discrepancies exist

**Checkpoint**: Inventory reconciliation works after sync — movements uploaded, stock levels reconciled, negative stock flagged

---

## Phase 6: User Story 4 — OR Number Synchronization (Priority: P1)

**Goal**: OR numbers remain sequential and gap-free across terminals — pre-allocated ranges per terminal, automatic range request when < 20% remaining, block sales when range exhausted and offline

**Independent Test**: Consume OR numbers until < 20% remaining, verify range request triggers, exhaust range while offline, verify sales blocked with alert, reconnect, verify new range allocated and sales resume

### Implementation for User Story 4

- [x] T024 [US4] Integrate OR allocation with existing OR number flow — In `src/composables/useORNumber.ts`, add method requestServerAllocation(): calls orAllocationService.requestNewRange() when isSeriesLow is true AND isOnline. Update getNextORNumber() flow: after generating OR from local series, check remaining capacity, if < 20% and online, trigger background allocation request (non-blocking). If series exhausted and no allocation available, return error indicating sales must be blocked. Add computed: hasServerAllocation, serverAllocationRemaining
- [x] T025 [US4] Add OR exhaustion sales blocker — In the POS checkout flow (where getNextORNumber is called before completing a sale), if getNextORNumber returns error (exhausted + no allocation), show PrimeVue ConfirmDialog: "OR number range exhausted. Please connect to the server to allocate a new range. Sales cannot be processed without a valid OR number." with "Retry" button that re-checks. If online, automatically attempt allocation and retry. This is a hard block per BIR compliance — no OR = no sale
- [x] T026 [US4] Add OR allocation status to SyncQueueView — In `src/views/SyncQueueView.vue`, add an "OR Allocation" section/card showing: current active allocation (prefix, range, current number, remaining count, usage percentage with ProgressBar), allocation status Tag (success if > 50%, warn if < 20%, danger if exhausted), "Request New Range" button (calls orAllocationService.checkAndRequestRange, disabled if offline). Uses useORNumber composable for data
- [x] T027 [US4] Wire OR allocation check into sync lifecycle — In `src/composables/useSync.ts` initializeSync(), after sync completes (both bulk and regular), call orAllocationService.checkAndRequestRange() to pre-emptively request new range if running low. Register onOnline callback that checks OR allocation status and requests range if needed

**Checkpoint**: OR number synchronization working — pre-allocation, auto-request when low, hard block when exhausted offline

---

## Phase 7: User Story 5 — Conflict Dashboard (Priority: P2)

**Goal**: Enhanced conflict resolution dashboard with type filtering, recommended resolution display, manual override with audit trail, and resolution history

**Independent Test**: Trigger conflicts of different types (product, customer, inventory), view conflict dashboard, verify filtering works, verify recommended resolution shown, manually override a resolution, verify audit trail

### Implementation for User Story 5

- [x] T028 [P] [US5] Create `src/components/sync/ConflictStats.vue` — Summary cards row showing: Total Conflicts, Unresolved (Tag danger), Auto-Resolved (Tag success), Manual Resolutions (Tag info). Uses conflictService.getConflictStats(). Props: stats (ConflictStats). Click on any stat filters the list below
- [x] T029 [P] [US5] Create `src/components/sync/ConflictResolutionHistory.vue` — DataTable showing resolved conflicts as audit trail. Columns: date, entity type, entity ID, resolution type (Tag with severity), resolved by (user name or "System"), original conflict summary. Sortable by date. PrimeVue Paginator. Props: conflicts[], loading. DatePicker filter for date range
- [x] T030 [US5] Enhance `src/views/ConflictsView.vue` — Major upgrade: Add ConflictStats component at top. Add SelectButton filter for entity types (All, Product, Customer, Inventory, User) using distinct entity_types from conflicts. Add Tabs with two TabPanels: "Unresolved" (existing ConflictList filtered to unresolved) and "History" (ConflictResolutionHistory showing all resolved). In ConflictDetail dialog, show "Recommended Resolution" based on CONFLICT_RESOLUTION_RULES (e.g., "Server version recommended for product conflicts"). Add "Apply Recommended" quick-action button alongside existing manual local/server choice. After manual resolution, refresh stats and list. Toast confirmation on resolution
- [x] T031 [US5] Enhance `src/components/sync/ConflictDetail.vue` — Add: field-by-field diff display showing local vs server values for each changed field with color highlighting (red for local, green for server, or vice versa based on recommendation). Add: "Resolution Recommendation" section explaining why server/local/merge is recommended per CONFLICT_RESOLUTION_RULES. Add: timestamp comparison showing which version is newer. For customer conflicts: show merge preview with combined data

**Checkpoint**: Conflict dashboard fully enhanced — stats overview, type filtering, recommended resolution, manual override, audit trail

---

## Phase 8: User Story 6 — Sync Health Monitoring (Priority: P2)

**Goal**: Monitor sync health across terminals — last sync time per terminal, overdue alerts, queue depth visibility, error details, terminal status indicators

**Independent Test**: View sync health dashboard, verify terminal statuses shown, simulate stale terminal (seed sync_health with old timestamp), verify warning/critical status, drill into terminal to see queue depth and errors

### Implementation for User Story 6

- [x] T032 [P] [US6] Create `src/components/sync/SyncHealthCard.vue` — Card displaying single terminal health. Shows: terminal ID, branch name, status indicator (PrimeVue Tag — success for healthy, warn for warning, danger for critical, secondary for unknown), last heartbeat (relative time), last upload/download timestamps, queue depth with ProgressBar (green < 100, yellow 100-500, red > 500), error count with Badge. Click emits drill-down event. Props: health (SyncHealth)
- [x] T033 [P] [US6] Create `src/components/sync/SyncHealthAlerts.vue` — PrimeVue Message list showing terminals that need attention. Each alert: terminal ID, reason (e.g., "No heartbeat for 4+ hours", "Queue depth > 500", "5+ sync errors"), severity mapped to PrimeVue severity (warn/error). Auto-refreshes every 60 seconds. Props: alerts[], loading. Emits: viewTerminal(terminalId)
- [x] T034 [P] [US6] Create `src/components/sync/TerminalSyncDetail.vue` — Dialog/Drawer showing detailed sync information for a single terminal. Sections: Status overview (all SyncHealth fields), Recent sync log (DataTable from syncLogRepository filtered by terminal), Pending queue items (DataTable from syncQueueRepository filtered by terminal), Error history (last 10 errors with timestamps and messages). Actions: "Force Sync" button, "Clear Errors" button. Props: terminalId, visible. Emits: close
- [x] T035 [US6] Create `src/views/SyncHealthView.vue` — Full page with: SyncHealthAlerts at top (critical/warning terminals), grid of SyncHealthCards for all terminals (responsive 1-3 columns), TerminalSyncDetail dialog (opened on card click). Auto-refreshes health data every 60 seconds. Uses syncHealthService.getTerminalStatuses(). Add summary stats: total terminals, healthy count, warning count, critical count. SelectButton filter for status (All, Healthy, Warning, Critical)
- [x] T036 [US6] Add route `/sync-health` in `src/router/index.ts` with users.edit permission guard. Add breadcrumb "Sync Health" in `src/components/layout/AppTopbar.vue`. Add "Sync Health" menu item in `src/components/layout/AppMenu.vue` under the existing sync section (near Sync Queue item), icon `pi pi-heart`
- [x] T037 [US6] Wire heartbeat into app lifecycle — In `src/composables/useSync.ts` initializeSync(), call syncHealthService.startHeartbeatLoop(terminalId) to send heartbeat every 5 minutes while online. On each heartbeat, update local sync_health record with current queue depth and error count. On app unmount (destroySync), stop heartbeat loop. Terminal ID from existing config/context

**Checkpoint**: Sync health monitoring fully functional — terminal statuses, alerts, drill-down, heartbeat

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, integration, and cross-story improvements

- [x] T038 [P] Handle edge case: customer deduplication on sync — In `src/services/catalogSyncService.ts` or new `src/services/customerSyncService.ts`, add deduplicateCustomers(): when syncing customers, detect duplicates by phone number, merge transaction histories to the server version, mark local duplicate as merged. Log as conflict with resolution='merged'
- [x] T039 [P] Handle edge case: sync queue corruption — In `src/services/bulkSyncService.ts`, add validateQueueIntegrity(): check all pending items have valid JSON payload (parse test), valid entity_type, non-empty entity_id. Quarantine corrupt items (move to 'failed' status with error 'corrupt_payload'). Show toast if corruption detected
- [x] T040 [P] Handle edge case: clock drift — In `src/services/syncService.ts`, after successful sync cycle, compare server response timestamp with local Date.now(). If drift > 60 seconds, log warning. Store server time offset in a ref. Use offset when comparing timestamps for conflict resolution. Show banner in SyncQueueView if significant drift detected
- [x] T041 [P] Handle edge case: server rejects transaction — In `src/services/transactionSyncService.ts` uploadBatch(), when server returns specific items in failed_ids with error, quarantine those items (status='failed', last_error contains server rejection reason). Do NOT block other items from syncing. Show toast "X transactions rejected by server — review in Sync Queue". Add visual indicator (Tag danger "Rejected") in PendingSyncList for quarantined items
- [x] T042 Update `src/components/sync/SyncStatus.vue` (topbar indicator) — Enhance to show bulk sync progress when active (mini progress bar or percentage next to sync icon). Show OR allocation warning icon when isSeriesLow/isCritical. Show inventory discrepancy badge if unresolved. Clicking still navigates to /sync-queue
- [x] T043 Full build verification — Run `npx vue-tsc --noEmit` and `npx vite build`. Fix any type errors
- [x] T044 Run quickstart.md verification — Test: bulk sync of 100+ items with progress, product conflict resolution (server wins), OR number allocation and exhaustion block, conflict dashboard with filtering and manual resolution, sync health terminal status display

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 types and migration — BLOCKS all user stories
- **Phase 3 (US1 Bulk Sync)**: Depends on Phase 2 bulkSyncService
- **Phase 4 (US2 Product Conflict)**: Depends on Phase 2 enhanced conflictService
- **Phase 5 (US3 Inventory Reconciliation)**: Depends on Phase 2 (uses existing inventorySyncService)
- **Phase 6 (US4 OR Numbers)**: Depends on Phase 2 orAllocationService
- **Phase 7 (US5 Conflict Dashboard)**: Depends on Phase 2 conflict resolution rules
- **Phase 8 (US6 Sync Health)**: Depends on Phase 2 syncHealthService
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Bulk Sync)**: Independent — enhances sync queue processing
- **US2 (Product Conflict)**: Independent — enhances catalog sync with conflict rules
- **US3 (Inventory Reconciliation)**: Independent — enhances inventory sync
- **US4 (OR Numbers)**: Independent — enhances OR number allocation
- **US5 (Conflict Dashboard)**: Benefits from US2 conflict data but independently testable with seed data
- **US6 (Sync Health)**: Independent — new monitoring capability

### Within Each User Story

- Service enhancements before component/composable changes
- Components before view integration
- Composable/store updates wire service to UI
- Route/menu after view exists

### Parallel Opportunities

- **Phase 2**: T005, T006 (repositories) can run in parallel
- **Phase 3**: T012, T013 (BulkSyncProgress + SyncResumeIndicator) can run in parallel
- **Phase 5**: T022 (InventoryReconciliationAlert) can run in parallel with T021
- **Phase 7**: T028, T029 (ConflictStats + ConflictResolutionHistory) can run in parallel
- **Phase 8**: T032, T033, T034 (SyncHealthCard + Alerts + Detail) can run in parallel
- **Phase 9**: T038, T039, T040, T041 (all edge cases) can run in parallel
- **All user stories (Phases 3–8)** can run in parallel after Phase 2 completes

---

## Parallel Example: User Story 1

```bash
# Launch both new components in parallel (different files, no deps):
Task: "Create BulkSyncProgress in src/components/sync/BulkSyncProgress.vue"
Task: "Create SyncResumeIndicator in src/components/sync/SyncResumeIndicator.vue"

# Then wire into composable and view (depends on components + service):
Task: "Update useSync composable with bulk sync methods"
Task: "Update SyncQueueView with bulk sync UI"
```

## Parallel Example: User Story 6

```bash
# Launch all three components in parallel (different files):
Task: "Create SyncHealthCard in src/components/sync/SyncHealthCard.vue"
Task: "Create SyncHealthAlerts in src/components/sync/SyncHealthAlerts.vue"
Task: "Create TerminalSyncDetail in src/components/sync/TerminalSyncDetail.vue"

# Then compose the view (depends on all components):
Task: "Create SyncHealthView in src/views/SyncHealthView.vue"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US4)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011)
3. Complete Phase 3: US1 — Bulk Sync Recovery (T012–T017) — reliable data sync
4. Complete Phase 4: US2 — Product Catalog Conflict (T018–T020) — deterministic resolution
5. Complete Phase 6: US4 — OR Number Synchronization (T024–T027) — BIR compliance
6. **STOP and VALIDATE**: Bulk sync works, conflicts resolve, OR numbers sequential
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Bulk Sync) → Test → **Deploy (sync reliability!)**
3. Add US2 (Product Conflict) + US4 (OR Numbers) → Test → Deploy (data integrity!)
4. Add US3 (Inventory Reconciliation) → Test → Deploy
5. Add US5 (Conflict Dashboard) → Test → Deploy
6. Add US6 (Sync Health) → Test → Deploy
7. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: US1 (Bulk Sync) → US3 (Inventory Reconciliation)
- **Developer B**: US2 (Product Conflict) → US5 (Conflict Dashboard)
- **Developer C**: US4 (OR Numbers) → US6 (Sync Health)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All data stored in local sql.js database (offline-first)
- Existing sync infrastructure is extensive — most tasks ENHANCE rather than create
- Server API endpoints assumed at `/sync/*` — httpClient from existing sync config
- Conflict resolution: server wins for product/price/user, merge for customer, sum for inventory
- OR allocation: BIR compliance is non-negotiable — exhausted range = blocked sales
- Heartbeat interval: 5 minutes while online
- Sync health thresholds: 4 hours overdue = warning, queue > 500 = critical
- No Laravel/Filament/PHP — everything is Vue 3 + TypeScript + PrimeVue 4
- Commit after each task or logical group
