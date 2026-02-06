# Tasks: Multi-Branch & Cloud Sync

**Input**: Design documents from `/specs/005-multi-branch-sync/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md
**Depends On**: 001-product-inventory, 002-sales-checkout, 003-user-management, 004-reports-analytics

**Tests**: Tests included where specified in quickstart.md verification steps.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, configuration, and connectivity primitives

- [x] T001 Create database migration for sync tables (sync_queue, sync_log, conflict_log, sync_status) in src/db/migrations/006_sync.ts
- [x] T002 [P] Create TypeScript types for sync entities in src/types/sync.ts (SyncQueue, SyncLog, SyncStatus, SyncConfig, SyncResult)
- [x] T003 [P] Create TypeScript types for conflict entities in src/types/conflict.ts (ConflictLog, ConflictResolution, ConflictDetail)
- [x] T004 [P] Create sync configuration with retry/batch settings in src/config/sync.ts (apiBaseUrl, syncInterval, batchSize, maxRetries, retryDelay, backoffMultiplier)
- [x] T005 Register migration 006_sync in src/db/database.ts runMigrations method
- [x] T006 [P] Install Axios HTTP client dependency via npm

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repositories, connectivity service, and sync orchestrator that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create sync queue repository in src/repositories/syncQueueRepository.ts (CRUD, getPending, getByStatus, getBatch, updateStatus, incrementAttempts)
- [x] T008 [P] Create sync log repository in src/repositories/syncLogRepository.ts (create, findByEntity, getRecent, countByResult)
- [x] T009 [P] Create conflict log repository in src/repositories/conflictLogRepository.ts (create, findUnresolved, findByEntity, resolve, getRecent)
- [x] T010 Create connectivity service in src/services/connectivityService.ts (checkConnectivity with navigator.onLine + API ping, online/offline event listeners, status reactive ref)
- [x] T011 Create useOfflineStatus composable in src/composables/useOfflineStatus.ts (isOnline ref, lastOnline timestamp, onOnline/onOffline callbacks)
- [x] T012 Create sync store in src/stores/sync.ts (Pinia store with syncStatus, pendingCount, isSyncing, lastSync, errors state and actions)
- [x] T013 Create HTTP client with Axios interceptors in src/services/httpClient.ts (base URL from config, auth token injection, timeout, retry interceptor with exponential backoff)
- [x] T014 Create base sync service orchestrator in src/services/syncService.ts (startSync, stopSync, processBatch, enqueueItem, sync loop with setInterval + online event trigger)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Transaction Sync to Cloud (Priority: P1) 🎯 MVP

**Goal**: POS transactions sync to cloud automatically when online, queue when offline, with status visibility

**Independent Test**: Process a sale offline, restore connectivity, verify transaction appears on server within 60 seconds

### Implementation for User Story 1

- [x] T015 [P] [US1] Create transaction sync service in src/services/transactionSyncService.ts (serializeTransaction, uploadBatch to POST /api/sync/transactions, handleResponse, markSynced)
- [x] T016 [US1] Add auto-enqueue hook: when order completes in transactionService, insert into sync_queue with entity_type='transaction'
- [x] T017 [US1] Implement batch upload in transactionSyncService (chunk pending transactions, upload each batch, handle partial failures)
- [x] T018 [US1] Implement retry with exponential backoff for failed transaction syncs in transactionSyncService
- [x] T019 [US1] Create SyncStatus.vue indicator component in src/components/sync/SyncStatus.vue (shows online/offline icon, pending count badge, last sync time)
- [x] T020 [US1] Integrate SyncStatus.vue into AppTopbar.vue layout
- [x] T021 [US1] Create useSync composable in src/composables/useSync.ts (startAutoSync, stopAutoSync, triggerManualSync, syncProgress, pendingCount)
- [x] T022 [US1] Initialize sync loop on app startup in App.vue or main.ts (call useSync.startAutoSync)
- [x] T023 [US1] Update synced_at column on orders table when transaction sync succeeds
- [x] T024 [US1] Update sync_status table pending_count and last_sync after each sync cycle

**Checkpoint**: User Story 1 complete - transactions sync to cloud, queue offline, status indicator visible

---

## Phase 4: User Story 2 - Product Catalog Sync (Priority: P1)

**Goal**: Product catalog updates from server sync down to terminals, price changes propagate automatically

**Independent Test**: Update product price on server, trigger sync on terminal, verify new price is shown

### Implementation for User Story 2

- [x] T025 [P] [US2] Create catalog sync service in src/services/catalogSyncService.ts (fetchUpdatedProducts from GET /api/sync/catalog?since=TIMESTAMP, applyProductUpdates, applyNewProducts, applyCategoryUpdates)
- [x] T026 [US2] Implement catalog download logic: fetch products updated since last_download timestamp, upsert into local products table
- [x] T027 [US2] Implement category sync: fetch categories updated since last sync, upsert into local categories table
- [x] T028 [US2] Handle product deletion from server: mark product as status='discontinued' locally, preserve completed sales referencing it
- [x] T029 [US2] Update sync_status.last_download after successful catalog sync
- [x] T030 [US2] Add manual sync button in src/components/sync/SyncStatus.vue (calls catalogSyncService.syncNow)
- [x] T031 [US2] Register catalog sync in syncService orchestrator: run after transaction upload completes
- [x] T032 [US2] Log all catalog downloads to sync_log with direction='download'

**Checkpoint**: User Story 2 complete - product catalog syncs from server, manual trigger available

---

## Phase 5: User Story 3 - Inventory Sync Across Branches (Priority: P1)

**Goal**: Stock movements sync between branches; headquarters sees real-time inventory per branch

**Independent Test**: Make sale at Branch A, verify stock reduction visible when querying Branch A inventory from headquarters

### Implementation for User Story 3

- [x] T033 [P] [US3] Create inventory sync service in src/services/inventorySyncService.ts (uploadStockMovements to POST /api/sync/inventory, downloadBranchInventory from GET /api/sync/inventory/:branchId)
- [x] T034 [US3] Add auto-enqueue for stock movements: when stock_movements created, insert into sync_queue with entity_type='stock_movement'
- [x] T035 [US3] Implement stock movement upload in inventorySyncService (serialize movement with variant_id, quantity, type, timestamp)
- [x] T036 [US3] Implement branch inventory download: fetch consolidated stock from server, store in local cache for display
- [x] T037 [US3] Add branch inventory types to src/types/sync.ts (BranchInventory, BranchStockItem with branch_id, variant_id, quantity)
- [x] T038 [US3] Create useBranchInventory composable in src/composables/useBranchInventory.ts (fetchBranchStock, getConsolidatedStock, filterByBranch)
- [x] T039 [US3] Register inventory sync in syncService orchestrator alongside transaction sync
- [x] T040 [US3] Log inventory syncs to sync_log with appropriate direction and result

**Checkpoint**: User Story 3 complete - stock movements sync, branch-level inventory visible

---

## Phase 6: User Story 4 - Offline Queue Management (Priority: P1)

**Goal**: Cashiers see sync queue status, pending items, errors, and sync progress

**Independent Test**: Go offline, make 5 sales, verify pending count shows 5, reconnect, watch count decrease to 0

### Implementation for User Story 4

- [x] T041 [P] [US4] Create PendingSyncList.vue component in src/components/sync/PendingSyncList.vue (DataTable with entity_type, entity_id, status, attempts, last_error, created_at columns)
- [x] T042 [US4] Create SyncProgress.vue component in src/components/sync/SyncProgress.vue (progress bar during bulk sync, item count, estimated remaining)
- [x] T043 [US4] Create SyncQueueView.vue page in src/views/SyncQueueView.vue (PendingSyncList + SyncProgress + retry/clear actions)
- [x] T044 [US4] Add route for sync queue page: /sync-queue in src/router/index.ts
- [x] T045 [US4] Add click handler on SyncStatus.vue pending badge to navigate to /sync-queue
- [x] T046 [US4] Implement retry action for failed sync items in SyncQueueView.vue (reset attempts/status to pending)
- [x] T047 [US4] Implement clear completed items action in SyncQueueView.vue (delete status='completed' from sync_queue)
- [x] T048 [US4] Show toast notifications on sync success/failure from useSync composable
- [x] T049 [US4] Add sync-related menu item in AppMenu.vue (Sync Queue with pending count badge, requires reports.view permission)

**Checkpoint**: User Story 4 complete - full visibility into sync queue, progress, and error handling

---

## Phase 7: User Story 5 - Conflict Resolution (Priority: P2)

**Goal**: Deterministic conflict resolution with last-write-wins, admin visibility into conflicts, manual override capability

**Independent Test**: Edit same product at two offline terminals, sync both, verify server version wins and conflict is logged

### Implementation for User Story 5

- [x] T050 [P] [US5] Create conflict service in src/services/conflictService.ts (detectConflict comparing timestamps, resolveConflict applying LWW, logConflict, getConflictDetails)
- [ ] T051 [US5] Integrate conflict detection into catalogSyncService: when applying product update, check if local version was modified since last sync
- [x] T052 [US5] Implement last-write-wins resolution logic: compare local updated_at vs server updated_at, keep newer, log both versions
- [x] T053 [US5] Create ConflictList.vue component in src/components/sync/ConflictList.vue (DataTable with entity_type, entity_id, resolution, timestamps, resolved_by columns)
- [x] T054 [US5] Create ConflictDetail.vue dialog in src/components/sync/ConflictDetail.vue (side-by-side local vs server version, resolution applied, manual override button)
- [x] T055 [US5] Create ConflictsView.vue page in src/views/ConflictsView.vue (ConflictList + ConflictDetail dialog)
- [x] T056 [US5] Add route for conflicts page: /conflicts in src/router/index.ts (requires admin permission)
- [x] T057 [US5] Create useConflictResolution composable in src/composables/useConflictResolution.ts (loadConflicts, resolveManually, getConflictStats)
- [x] T058 [US5] Implement manual override: admin can select local or server version, update conflict_log resolved_by and resolved_at

**Checkpoint**: User Story 5 complete - conflicts detected, resolved deterministically, admin can review and override

---

## Phase 8: User Story 6 - Multi-Branch Dashboard (Priority: P2)

**Goal**: Business owners see consolidated dashboard with sales, transactions, and top products across all branches

**Independent Test**: Log into HQ dashboard, verify sales from all branches appear with branch filter

### Implementation for User Story 6

- [x] T059 [P] [US6] Create branch types in src/types/sync.ts (Branch, BranchSummary, BranchComparison with sales/transactions/lastSync fields)
- [x] T060 [US6] Create branch dashboard service in src/services/branchDashboardService.ts (fetchBranchSummaries from GET /api/branches/dashboard, fetchBranchComparison)
- [x] T061 [US6] Create useBranchDashboard composable in src/composables/useBranchDashboard.ts (branches, selectedBranch, branchSummaries, isLoading, refreshDashboard)
- [x] T062 [US6] Create BranchSelector.vue component in src/components/sync/BranchSelector.vue (dropdown of branches with "All Branches" option)
- [x] T063 [US6] Create BranchSummaryCard.vue component in src/components/sync/BranchSummaryCard.vue (branch name, today's sales, transaction count, last sync time, online/offline indicator)
- [x] T064 [US6] Create BranchDashboardView.vue page in src/views/BranchDashboardView.vue (BranchSelector + grid of BranchSummaryCards + comparison table)
- [x] T065 [US6] Add route for branch dashboard: /branches in src/router/index.ts (requires admin permission)
- [x] T066 [US6] Implement branch comparison view: side-by-side metrics table for selected branches
- [x] T067 [US6] Handle offline branches: show "last updated" timestamp with warning indicator
- [x] T068 [US6] Add Branches menu item in AppMenu.vue (requires admin permission)

**Checkpoint**: User Story 6 complete - consolidated multi-branch dashboard with filtering and comparison

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance, security, edge cases, and improvements affecting multiple sync areas

- [ ] T069 [P] Ensure sync operations do not block POS performance: run sync in background with requestIdleCallback or Web Worker consideration
- [x] T070 [P] Implement idempotent sync operations: server-side deduplication by entity_id + created_at, client marks completed
- [ ] T071 Implement large queue handling: batch processing for 1000+ items with progress reporting
- [ ] T072 Add sync error notification system: toast for recoverable, alert for persistent failures requiring escalation
- [x] T073 Handle mid-sync network interruption: resume from last successful item, not from beginning
- [x] T074 Handle server unavailability: detect 5xx errors specifically, different retry behavior than network errors
- [ ] T075 Add authentication token refresh in httpClient interceptor before sync requests
- [x] T076 [P] Ensure all sync payloads are JSON-sanitized and validated before upload
- [x] T077 Add cleanup job: purge sync_log entries older than 90 days, purge completed sync_queue entries older than 7 days
- [ ] T078 Performance: verify sync of 100+ items completes in under 5 minutes (SC-003)
- [ ] T079 Performance: verify transaction sync within 60 seconds of connectivity (SC-001)
- [ ] T080 Performance: verify catalog updates reach terminal within 5 minutes (SC-002)
- [ ] T081 Run quickstart.md verification scenarios (transaction sync, offline queue, catalog download, conflict resolution)
- [ ] T082 Code cleanup and component refactoring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - P1 stories (US1-US4) should complete before P2 stories (US5-US6)
  - US1 (Transaction Sync) should complete first as others build on its sync loop
  - US2 (Catalog Sync) depends on US1's sync orchestrator
  - US3 (Inventory Sync) depends on US1's sync orchestrator
  - US4 (Queue Management) depends on US1's sync queue being populated
  - US5 (Conflict Resolution) depends on US2 (conflict detection during catalog sync)
  - US6 (Branch Dashboard) independent but requires API to be meaningful
- **Polish (Phase 9)**: Can begin after at least US1-US4 complete

### User Story Dependencies

- **US1 (Transaction Sync)**: Core - no dependencies on other stories. Establishes sync loop.
- **US2 (Catalog Sync)**: Depends on US1 for sync orchestrator and HTTP client
- **US3 (Inventory Sync)**: Depends on US1 for sync orchestrator
- **US4 (Queue Management)**: Depends on US1 for sync queue data, light dependency on US2/US3 for variety
- **US5 (Conflict Resolution)**: Depends on US2 for catalog conflict scenario
- **US6 (Branch Dashboard)**: Independent API consumer but needs sync infrastructure from US1

### Within Each User Story

- Components marked [P] can run in parallel
- Services before composables
- Composables before components
- Core sync logic before UI
- Commit after each task or logical group

### Parallel Opportunities

- Setup: T002, T003, T004, T006 can run in parallel
- Foundational: T008, T009 can run in parallel; T010, T011 can run in parallel
- US1: T015 can start immediately (core service)
- US2: T025 can start while US1 UI tasks are being done
- US5+US6: Both P2 stories can run in parallel after P1 stories complete

---

## Parallel Example: User Story 1

```bash
# Launch service first:
Task: "Create transaction sync service in src/services/transactionSyncService.ts"

# Then launch UI components in parallel:
Task: "Create SyncStatus.vue indicator component"
Task: "Create useSync composable"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: Transaction Sync (US1)
4. **STOP and VALIDATE**: Test transaction sync online/offline independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Transaction Sync) → Test → Transactions safely synced (MVP!)
3. Add US2 (Catalog Sync) → Test → Product updates propagate
4. Add US3 (Inventory Sync) → Test → Stock visibility across branches
5. Add US4 (Queue Management) → Test → Full sync visibility (Production Ready!)
6. Add US5 (Conflict Resolution) → Test → Data integrity guaranteed
7. Add US6 (Branch Dashboard) → Test → Multi-branch oversight
8. Polish → Performance validated → Feature complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Transaction Sync) → US4 (Queue Management)
   - Developer B: US2 (Catalog Sync) → US5 (Conflict Resolution)
3. After US1 sync loop exists:
   - Developer A: US3 (Inventory Sync)
   - Developer B: US6 (Branch Dashboard)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Sync queue is persistent SQLite - survives app restart (critical for offline)
- Idempotent operations are essential - retries must be safe
- Conflict resolution: last-write-wins for simplicity
  - Transactions: append-only, no conflicts
  - Products/Categories: server version wins
  - Stock movements: additive (sum from all terminals)
- HTTP client uses Axios with interceptors for auth, retry, timeout
- Sync loop: setInterval (configurable) + navigator online event for immediate trigger
- Performance targets: TX sync < 60s, catalog < 5min, 100+ batch < 5min
- All sync operations must NOT degrade POS performance (sales < 30 seconds)
- Migration uses 006_sync.ts (follows 005_reports.ts sequence)
- Commit after each task or logical group
