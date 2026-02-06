# Tasks: P4 Features (Low Priority - Future/Optional)

**Input**: Design documents from `/specs/009-cash-drawer/`, `/specs/010-offline-sync/`, `/specs/011-eis-integration/`
**Prerequisites**: P1, P2, and ideally P3 features completed

**Features Covered**:
- 009-cash-drawer (Cash accountability, denomination counting)
- 010-offline-sync (Advanced sync, conflict dashboard, OR allocation)
- 011-eis-integration (BIR Electronic OR Submission)

## Format: `[ID] [P?] [Feature-Story] Description`

- **[P]**: Can run in parallel
- Feature codes: CD = Cash Drawer, OS = Offline Sync, EI = EIS Integration

---

## Phase 1: P4 Setup & Foundations

**Purpose**: Database migrations for P4 features

### Vue Frontend (Cash Drawer & Sync)

- [ ] T401 Create migration `src/db/migrations/009_cash_drawer.ts` (drawer_sessions, drawer_operations, denomination_counts)
- [ ] T402 Create PHP denominations constant (1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25)

### Laravel Backend (Sync & EIS)

- [ ] T403 Create migration for or_allocations, conflict_records, sync_health tables
- [ ] T404 Create migration `011_eis.php` (eis_configs, eis_submissions, eis_batches)
- [ ] T405 Create EIS queue configuration

---

## Phase 2: Cash Drawer - US1 (Opening Count)

**Feature**: 009-cash-drawer | **Priority**: P1 within feature
**Goal**: Record opening cash with denomination breakdown

### Types

- [ ] T406 [P] [CD-US1] Create DrawerSession type in `src/types/cashDrawer.ts`
- [ ] T407 [P] [CD-US1] Create DrawerOperation type in `src/types/cashDrawer.ts`
- [ ] T408 [P] [CD-US1] Create DenominationCount type in `src/types/cashDrawer.ts`

### Repositories

- [ ] T409 [P] [CD-US1] Create drawerSessionRepository in `src/repositories/drawerSessionRepository.ts`
- [ ] T410 [P] [CD-US1] Create drawerOperationRepository in `src/repositories/drawerOperationRepository.ts`

### Services

- [ ] T411 [CD-US1] Create cashDrawerService in `src/services/cashDrawerService.ts` (openDrawer, recordOpeningCount)

### Store

- [ ] T412 [CD-US1] Create cashDrawer store in `src/stores/cashDrawer.ts` (activeSession, expectedCash)

### Components

- [ ] T413 [P] [CD-US1] Create DenominationEntry.vue in `src/components/cash-drawer/DenominationEntry.vue`
- [ ] T414 [CD-US1] Create OpeningCount.vue in `src/components/cash-drawer/OpeningCount.vue`

### Composables

- [ ] T415 [CD-US1] Create useCashDrawer composable in `src/composables/useCashDrawer.ts`
- [ ] T416 [CD-US1] Create useDenominationCount composable in `src/composables/useDenominationCount.ts`

### Integration

- [ ] T417 [CD-US1] Require opening count before shift can start
- [ ] T418 [CD-US1] Link drawer session to shift

**Checkpoint**: Opening count required; denominations tracked

---

## Phase 3: Cash Drawer - US2 (Closing Count & Reconciliation)

**Feature**: 009-cash-drawer | **Priority**: P1 within feature
**Goal**: Reconcile closing count with expected cash

### Services

- [ ] T419 [CD-US2] Add calculateExpectedCash to cashDrawerService
- [ ] T420 [CD-US2] Add closeDrawer to cashDrawerService
- [ ] T421 [CD-US2] Create varianceService in `src/services/varianceService.ts` (calculateVariance, checkThreshold)

### Components

- [ ] T422 [CD-US2] Create ClosingCount.vue in `src/components/cash-drawer/ClosingCount.vue`
- [ ] T423 [CD-US2] Create VarianceReport.vue in `src/components/cash-drawer/VarianceReport.vue`

### Integration

- [ ] T424 [CD-US2] Show expected vs actual on close
- [ ] T425 [CD-US2] Require reason if variance > threshold
- [ ] T426 [CD-US2] Include drawer reconciliation in shift close

**Checkpoint**: Variance calculated; reason required for large variance

---

## Phase 4: Cash Drawer - US3/US4 (Drops & Paid-Ins)

**Feature**: 009-cash-drawer | **Priority**: P2 within feature
**Goal**: Record mid-shift cash movements

### Services

- [ ] T427 [CD-US3] Add recordCashDrop to cashDrawerService
- [ ] T428 [CD-US4] Add recordPaidIn to cashDrawerService

### Components

- [ ] T429 [P] [CD-US3] Create CashDrop.vue in `src/components/cash-drawer/CashDrop.vue`
- [ ] T430 [P] [CD-US4] Create CashPaidIn.vue in `src/components/cash-drawer/CashPaidIn.vue`
- [ ] T431 [CD-US3] Create DrawerStatus.vue in `src/components/cash-drawer/DrawerStatus.vue`

### Integration

- [ ] T432 [CD-US3] Require supervisor PIN for drops
- [ ] T433 [CD-US4] Require supervisor PIN for paid-ins
- [ ] T434 [CD-US3] Update expected cash after drops/paid-ins

**Checkpoint**: Drops and paid-ins tracked; expected cash updated

---

## Phase 5: Cash Drawer - US5/US6 (Hardware & Reporting)

**Feature**: 009-cash-drawer | **Priority**: P3 within feature
**Goal**: Hardware integration and variance reports

### Hardware (Electron Only)

- [ ] T435 [CD-US5] Create drawer kick IPC handler in Electron main process
- [ ] T436 [CD-US5] Add auto-open drawer on cash sale
- [ ] T437 [CD-US5] Add "No Sale" drawer open with audit

### Reporting

- [ ] T438 [CD-US6] Create variance report generation
- [ ] T439 [CD-US6] Add variance by cashier report
- [ ] T440 [CD-US6] Add variance threshold alerting

**Checkpoint**: Hardware integration (optional); variance reports

---

## Phase 6: Offline Sync - US1 (Bulk Sync Recovery)

**Feature**: 010-offline-sync | **Priority**: P1 within feature
**Goal**: Reliable sync after extended offline periods

### Services (Vue)

- [ ] T441 [OS-US1] Create bulkSyncService in `src/services/bulkSyncService.ts` (processBulkQueue, resumeSync)
- [ ] T442 [OS-US1] Add progress tracking to sync

### Services (Laravel)

- [ ] T443 [OS-US1] Create BulkSyncService in `app/Services/BulkSyncService.php`
- [ ] T444 [OS-US1] Add batch transaction processing

### Components

- [ ] T445 [OS-US1] Create BulkSyncProgress.vue in `src/components/sync/BulkSyncProgress.vue`

### Integration

- [ ] T446 [OS-US1] Ensure sync doesn't block POS operations
- [ ] T447 [OS-US1] Resume sync from last successful point

**Checkpoint**: 500+ items sync reliably; progress shown

---

## Phase 7: Offline Sync - US2/US3 (Conflict & Inventory)

**Feature**: 010-offline-sync | **Priority**: P1 within feature
**Goal**: Deterministic conflict resolution and inventory reconciliation

### Services (Laravel)

- [ ] T448 [OS-US2] Create ConflictResolver in `app/Services/ConflictResolver.php`
- [ ] T449 [OS-US2] Implement last-write-wins for products
- [ ] T450 [OS-US3] Create inventory reconciliation logic

### Models

- [ ] T451 [OS-US2] Create ConflictRecord model
- [ ] T452 [OS-US3] Add inventory movement aggregation

### Integration

- [ ] T453 [OS-US2] Log all conflicts with both versions
- [ ] T454 [OS-US3] Reconcile inventory across terminals

**Checkpoint**: Conflicts resolved deterministically; inventory accurate

---

## Phase 8: Offline Sync - US4 (OR Number Synchronization)

**Feature**: 010-offline-sync | **Priority**: P1 within feature
**Goal**: Maintain OR number sequence integrity

### Services (Vue)

- [ ] T455 [OS-US4] Create orAllocationService in `src/services/orAllocationService.ts` (requestAllocation, useORNumber)

### Services (Laravel)

- [ ] T456 [OS-US4] Create ORAllocationService in `app/Services/ORAllocationService.php`
- [ ] T457 [OS-US4] Validate no gaps between ranges
- [ ] T458 [OS-US4] Pre-allocate ranges at 20% remaining

### Models

- [ ] T459 [OS-US4] Create ORAllocation model

### Integration

- [ ] T460 [OS-US4] Request new range before exhaustion
- [ ] T461 [OS-US4] Block sales if range exhausted offline (alert supervisor)

**Checkpoint**: OR numbers sequential across all terminals

---

## Phase 9: Offline Sync - US5/US6 (Dashboard & Monitoring)

**Feature**: 010-offline-sync | **Priority**: P2 within feature
**Goal**: Admin visibility into sync health

### Filament Pages

- [ ] T462 [OS-US5] Create ConflictDashboard in `app/Filament/Pages/ConflictDashboard.php`
- [ ] T463 [OS-US6] Create SyncMonitor in `app/Filament/Pages/SyncMonitor.php`

### Widgets

- [ ] T464 [P] [OS-US5] Create UnresolvedConflicts widget
- [ ] T465 [P] [OS-US6] Create TerminalHealthTable widget
- [ ] T466 [OS-US6] Create SyncQueueDepthChart widget

### Services

- [ ] T467 [OS-US6] Create SyncHealthService
- [ ] T468 [OS-US6] Add terminal heartbeat tracking

### Alerts

- [ ] T469 [OS-US6] Alert when terminal hasn't synced in 4 hours
- [ ] T470 [OS-US5] Allow manual conflict override

**Checkpoint**: Conflicts and sync health visible in admin

---

## Phase 10: EIS Integration - US1/US2 (Config & Auto Submit)

**Feature**: 011-eis-integration | **Priority**: P1 within feature
**Goal**: Configure and submit to BIR EIS

### Models

- [ ] T471 [P] [EI-US1] Create EISConfig model
- [ ] T472 [P] [EI-US1] Create EISSubmission model
- [ ] T473 [P] [EI-US1] Create EISBatch model

### Filament Resources

- [ ] T474 [EI-US2] Create EISConfigResource in admin panel
- [ ] T475 [EI-US2] Add test/production environment toggle

### Services

- [ ] T476 [EI-US1] Create EISService in `app/Services/EISService.php` (submit, validatePayload)
- [ ] T477 [EI-US1] Create EIS API client

### Jobs

- [ ] T478 [EI-US1] Create SubmitToEIS job
- [ ] T479 [EI-US1] Configure exponential backoff retry

### Integration

- [ ] T480 [EI-US1] Queue transaction for EIS on completion
- [ ] T481 [EI-US1] Track submission status and BIR reference

**Checkpoint**: Transactions submit to BIR EIS

---

## Phase 11: EIS Integration - US3/US4 (Batch & History)

**Feature**: 011-eis-integration | **Priority**: P2 within feature
**Goal**: Efficient batch submission and history tracking

### Services

- [ ] T482 [EI-US3] Create EISBatchService in `app/Services/EISBatchService.php`
- [ ] T483 [EI-US3] Implement batch of 100 items

### Jobs

- [ ] T484 [EI-US3] Create ProcessEISBatch job
- [ ] T485 [EI-US3] Schedule batch processing every 5 minutes

### Filament Resources

- [ ] T486 [EI-US4] Create EISSubmissionResource for history
- [ ] T487 [EI-US4] Add filtering by status, date, merchant

### Components

- [ ] T488 [EI-US4] Add retry action for failed submissions
- [ ] T489 [EI-US4] Add export for compliance reports

**Checkpoint**: Batch submission efficient; history visible

---

## Phase 12: EIS Integration - US5/US6 (Errors & Reports)

**Feature**: 011-eis-integration | **Priority**: P2-P3 within feature
**Goal**: Error handling and compliance reporting

### Error Handling

- [ ] T490 [EI-US5] Categorize errors (temporary, validation, rejected)
- [ ] T491 [EI-US5] Implement different handling per error type
- [ ] T492 [EI-US5] Add alert on failure threshold exceeded

### Reporting

- [ ] T493 [EI-US6] Create EIS summary report (monthly)
- [ ] T494 [EI-US6] Add reconciliation with Z-Reading
- [ ] T495 [EI-US6] Export in BIR-required format

### Services

- [ ] T496 [EI-US6] Create EISReportService in `app/Services/EISReportService.php`

**Checkpoint**: Errors handled gracefully; compliance reports available

---

## Phase 13: P4 Integration & Polish

**Purpose**: Final integration and validation

### Cash Drawer Integration

- [ ] T497 [P] Integrate drawer with shift flow
- [ ] T498 [P] Add drawer status to POS header

### Sync Integration

- [ ] T499 [P] Connect OR allocation to sync flow
- [ ] T500 [P] Add conflict resolution to admin panel

### EIS Integration

- [ ] T501 [P] Connect EIS to transaction completion
- [ ] T502 [P] Add EIS status to merchant dashboard

### Validation

- [ ] T503 [P] Run quickstart.md verification for cash drawer
- [ ] T504 [P] Run quickstart.md verification for offline sync
- [ ] T505 [P] Run quickstart.md verification for EIS
- [ ] T506 Full system test: All features working together

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → All other phases
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
Cash Drawer  Offline Sync    EIS
(Phase 2-5)  (Phase 6-9)  (Phase 10-12)
    ↓           ↓           ↓
    └───────────┼───────────┘
                ↓
        Phase 13 (Integration)
```

### Feature Independence

- **Cash Drawer (009)**: Vue frontend, requires P1 shifts
- **Offline Sync (010)**: Vue + Laravel, requires P2 sync
- **EIS (011)**: Laravel backend only

### Parallel Opportunities

- All three P4 features can be developed in parallel
- Cash Drawer (Vue) is independent of EIS (Laravel)
- Offline Sync spans both but has separable components

---

## Notes

- Cash drawer hardware integration is optional (Electron only)
- OR number sequence is critical - must never have gaps
- EIS is optional until BIR mandates for specific business categories
- Conflict resolution defaults to last-write-wins (server preference)
- All P4 features are enhancements - system works without them
