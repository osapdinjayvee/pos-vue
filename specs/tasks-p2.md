# Tasks: P2 Features (High Priority)

**Input**: Design documents from `/specs/004-reports-analytics/`, `/specs/005-multi-branch-sync/`, `/specs/006-admin-panel/`
**Prerequisites**: All P1 features completed

**Features Covered**:
- 001-product-inventory P2 stories (Low stock alerts, batch/expiry, suppliers)
- 004-reports-analytics (BIR X/Z-Reading, VAT reports)
- 005-multi-branch-sync (Cloud sync, conflict resolution)
- 006-admin-panel (Filament admin for SaaS management)

## Format: `[ID] [P?] [Feature-Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Feature-Story]**: Feature code + story number
- Feature codes: RA = Reports & Analytics, MS = Multi-Branch Sync, AP = Admin Panel

---

## Phase 1: P2 Setup & Foundations

**Purpose**: Database migrations and core infrastructure for P2 features

### Vue Frontend (Reports & Sync)

- [ ] T201 Create migration `src/db/migrations/004_reports.ts` (z_counters, x_counters, z_readings, x_readings, sales_aggregates)
- [ ] T202 Create migration `src/db/migrations/005_sync.ts` (sync_queue, sync_log, conflict_log, sync_status)
- [ ] T203 [P] Initialize Z-counter for terminal in seeder
- [ ] T204 [P] Initialize X-counter for terminal in seeder

### Laravel Backend (Admin Panel)

- [ ] T205 Install Filament 4: `composer require filament/filament`
- [ ] T206 Run `php artisan filament:install --panels`
- [ ] T207 Create migration `006_admin_panel.php` (merchants, plans, subscriptions, admin_audit_logs)
- [ ] T208 [P] Install Spatie Activity Log: `composer require spatie/laravel-activitylog`
- [ ] T209 [P] Install Spatie Permission: `composer require spatie/laravel-permission`
- [ ] T210 Create admin user seeder

---

## Phase 2: Reports & Analytics - US1 (X-Reading Report)

**Feature**: 004-reports-analytics | **Priority**: P1 within feature
**Goal**: Generate X-Reading reports for shift monitoring

### Types & Repositories

- [ ] T211 [P] [RA-US1] Create XReading type in `src/types/xReading.ts`
- [ ] T212 [P] [RA-US1] Create xReadingRepository in `src/repositories/xReadingRepository.ts`
- [ ] T213 [RA-US1] Create xCounterRepository in `src/repositories/xCounterRepository.ts`

### Services

- [ ] T214 [RA-US1] Create xReadingService in `src/services/xReadingService.ts` (generateXReading, getXReadings, calculateShiftTotals)

### Components

- [ ] T215 [P] [RA-US1] Create XReadingReport.vue in `src/components/reports/XReadingReport.vue`
- [ ] T216 [P] [RA-US1] Create ReportFilters.vue in `src/components/reports/ReportFilters.vue`
- [ ] T217 [RA-US1] Create ReportPrint.vue in `src/components/reports/ReportPrint.vue`

### Composables

- [ ] T218 [RA-US1] Create useXReading composable in `src/composables/useXReading.ts`

**Checkpoint**: X-Reading generates with correct shift totals and X-counter

---

## Phase 3: Reports & Analytics - US2 (Z-Reading Report)

**Feature**: 004-reports-analytics | **Priority**: P1 within feature
**Goal**: Generate end-of-day Z-Reading with BIR compliance

### Types & Repositories

- [ ] T219 [P] [RA-US2] Create ZReading type in `src/types/zReading.ts`
- [ ] T220 [P] [RA-US2] Create zReadingRepository in `src/repositories/zReadingRepository.ts`
- [ ] T221 [RA-US2] Create zCounterRepository in `src/repositories/zCounterRepository.ts`

### Services

- [ ] T222 [RA-US2] Create zReadingService in `src/services/zReadingService.ts` (generateZReading, getZReadings, incrementZCounter, checkDuplicateWarning)

### Components

- [ ] T223 [P] [RA-US2] Create ZReadingReport.vue in `src/components/reports/ZReadingReport.vue`
- [ ] T224 [RA-US2] Create ZReadingConfirmation.vue in `src/components/reports/ZReadingConfirmation.vue` (duplicate warning)

### Composables

- [ ] T225 [RA-US2] Create useZReading composable in `src/composables/useZReading.ts`

### Integration

- [ ] T226 [RA-US2] Ensure Z-counter atomic increment in transaction
- [ ] T227 [RA-US2] Reset X-counter after Z-Reading generation

**Checkpoint**: Z-Reading generates with sequential Z-counter; X-counter resets

---

## Phase 4: Reports & Analytics - US3/US4 (Daily Sales & VAT Reports)

**Feature**: 004-reports-analytics | **Priority**: P1 within feature
**Goal**: Daily sales and VAT summary reports for BIR filing

### Services

- [ ] T228 [P] [RA-US3] Create salesReportService in `src/services/salesReportService.ts` (getDailySales, getSalesSummary, getHourlyBreakdown)
- [ ] T229 [P] [RA-US4] Create vatReportService in `src/services/vatReportService.ts` (getVATSummary, getVATDetails)

### Repositories

- [ ] T230 [RA-US3] Create salesAggregateRepository in `src/repositories/salesAggregateRepository.ts`

### Components

- [ ] T231 [P] [RA-US3] Create DailySalesReport.vue in `src/components/reports/DailySalesReport.vue`
- [ ] T232 [P] [RA-US4] Create VATSummaryReport.vue in `src/components/reports/VATSummaryReport.vue`
- [ ] T233 [P] [RA-US3] Create SalesChart.vue in `src/components/reports/SalesChart.vue` (PrimeVue Chart)

### Export

- [ ] T234 [RA-US3] Create reportExportService in `src/services/reportExportService.ts` (exportPDF, exportCSV)
- [ ] T235 [RA-US3] Create ReportExport.vue in `src/components/reports/ReportExport.vue`

**Checkpoint**: Daily and VAT reports generate correctly; export works

---

## Phase 5: Reports & Analytics - US5/US6/US7 (Performance Reports)

**Feature**: 004-reports-analytics | **Priority**: P2 within feature
**Goal**: Product and cashier performance analytics

### Services

- [ ] T236 [P] [RA-US5] Create productReportService in `src/services/productReportService.ts`
- [ ] T237 [P] [RA-US6] Create cashierReportService in `src/services/cashierReportService.ts`

### Components

- [ ] T238 [P] [RA-US5] Create ProductReport.vue in `src/components/reports/ProductReport.vue`
- [ ] T239 [P] [RA-US6] Create CashierReport.vue in `src/components/reports/CashierReport.vue`
- [ ] T240 [RA-US7] Create SalesSummaryReport.vue in `src/components/reports/SalesSummaryReport.vue`

**Checkpoint**: Performance reports show rankings and metrics

---

## Phase 5.5: Product Inventory - P2 Stories

**Feature**: 001-product-inventory | **Priority**: P2 within feature
**Goal**: Low stock alerts, batch/expiry tracking, supplier management

### US4 - Low Stock Alerts

- [ ] T240a [P] [PI-US4] Create StockAlert type in `src/types/stockAlert.ts`
- [ ] T240b [PI-US4] Create stockAlertRepository in `src/repositories/stockAlertRepository.ts`
- [ ] T240c [PI-US4] Create alertService in `src/services/alertService.ts` (checkThresholds, generateAlerts, dismissAlert)
- [ ] T240d [P] [PI-US4] Create LowStockAlert.vue in `src/components/inventory/LowStockAlert.vue`
- [ ] T240e [P] [PI-US4] Create AlertDashboard.vue in `src/components/inventory/AlertDashboard.vue`
- [ ] T240f [PI-US4] Add stock threshold field to ProductForm.vue
- [ ] T240g [PI-US4] Create useStockAlerts composable in `src/composables/useStockAlerts.ts`

### US5 - Batch & Expiry Tracking

- [ ] T240h [P] [PI-US5] Create Batch type in `src/types/batch.ts`
- [ ] T240i [PI-US5] Create batchRepository in `src/repositories/batchRepository.ts`
- [ ] T240j [PI-US5] Create batchService in `src/services/batchService.ts` (createBatch, getExpiringBatches, blockExpiredSales)
- [ ] T240k [P] [PI-US5] Create BatchForm.vue in `src/components/inventory/BatchForm.vue`
- [ ] T240l [P] [PI-US5] Create BatchList.vue in `src/components/inventory/BatchList.vue`
- [ ] T240m [P] [PI-US5] Create ExpiryWarning.vue in `src/components/inventory/ExpiryWarning.vue`
- [ ] T240n [PI-US5] Add batch selection to StockReceiving.vue
- [ ] T240o [PI-US5] Add expiry check to cart validation

### US6 - Supplier Management

- [ ] T240p [P] [PI-US6] Create Supplier type in `src/types/supplier.ts`
- [ ] T240q [PI-US6] Create supplierRepository in `src/repositories/supplierRepository.ts`
- [ ] T240r [PI-US6] Create supplierService in `src/services/supplierService.ts` (createSupplier, linkProducts, getReorderList)
- [ ] T240s [P] [PI-US6] Create SupplierForm.vue in `src/components/inventory/SupplierForm.vue`
- [ ] T240t [P] [PI-US6] Create SupplierList.vue in `src/components/inventory/SupplierList.vue`
- [ ] T240u [PI-US6] Add supplier selection to ProductForm.vue
- [ ] T240v [PI-US6] Create ReorderReport.vue in `src/components/inventory/ReorderReport.vue`

**Checkpoint**: Low stock alerts trigger; batches track expiry; suppliers linked to products

---

## Phase 6: Multi-Branch Sync - US1 (Transaction Sync)

**Feature**: 005-multi-branch-sync | **Priority**: P1 within feature
**Goal**: Sync transactions to cloud automatically

### Types

- [ ] T241 [P] [MS-US1] Create SyncQueue type in `src/types/sync.ts`
- [ ] T242 [P] [MS-US1] Create SyncLog type in `src/types/syncLog.ts`

### Repositories

- [ ] T243 [P] [MS-US1] Create syncQueueRepository in `src/repositories/syncQueueRepository.ts`
- [ ] T244 [P] [MS-US1] Create syncLogRepository in `src/repositories/syncLogRepository.ts`

### Services

- [ ] T245 [MS-US1] Create syncService in `src/services/syncService.ts` (queueForSync, processQueue, markSynced)
- [ ] T246 [MS-US1] Create transactionSyncService in `src/services/transactionSyncService.ts` (uploadTransactions)
- [ ] T247 [MS-US1] Create connectivityService in `src/services/connectivityService.ts` (checkConnectivity, onOnline, onOffline)

### Store

- [ ] T248 [MS-US1] Create sync store in `src/stores/sync.ts` (pendingCount, lastSync, syncStatus)

### Components

- [ ] T249 [P] [MS-US1] Create SyncStatus.vue in `src/components/sync/SyncStatus.vue`
- [ ] T250 [P] [MS-US1] Create SyncProgress.vue in `src/components/sync/SyncProgress.vue`

### Integration

- [ ] T251 [MS-US1] Add transaction to sync queue on completion
- [ ] T252 [MS-US1] Trigger sync on connectivity restoration
- [ ] T253 [MS-US1] Add sync status to app header

**Checkpoint**: Transactions queue offline and sync when online

---

## Phase 7: Multi-Branch Sync - US2/US3 (Catalog & Inventory Sync)

**Feature**: 005-multi-branch-sync | **Priority**: P1 within feature
**Goal**: Sync product catalog and inventory levels

### Services

- [ ] T254 [P] [MS-US2] Create catalogSyncService in `src/services/catalogSyncService.ts` (downloadCatalog, applyUpdates)
- [ ] T255 [P] [MS-US3] Create inventorySyncService in `src/services/inventorySyncService.ts` (uploadMovements, downloadLevels)

### Integration

- [ ] T256 [MS-US2] Apply catalog updates to local SQLite
- [ ] T257 [MS-US3] Reconcile inventory after sync

**Checkpoint**: Catalog updates flow from server; inventory syncs

---

## Phase 8: Multi-Branch Sync - US4/US5 (Queue & Conflicts)

**Feature**: 005-multi-branch-sync | **Priority**: P1-P2 within feature
**Goal**: Queue visibility and conflict handling

### Types

- [ ] T258 [MS-US5] Create ConflictLog type in `src/types/conflict.ts`

### Repositories

- [ ] T259 [MS-US5] Create conflictLogRepository in `src/repositories/conflictLogRepository.ts`

### Services

- [ ] T260 [MS-US5] Create conflictService in `src/services/conflictService.ts` (detectConflict, resolveConflict, logConflict)

### Components

- [ ] T261 [P] [MS-US4] Create PendingSyncList.vue in `src/components/sync/PendingSyncList.vue`
- [ ] T262 [P] [MS-US5] Create ConflictList.vue in `src/components/sync/ConflictList.vue`

### Composables

- [ ] T263 [MS-US4] Create useSync composable in `src/composables/useSync.ts`
- [ ] T264 [MS-US5] Create useConflictResolution composable in `src/composables/useConflictResolution.ts`

**Checkpoint**: Queue visible; conflicts detected and resolved

---

## Phase 9: Admin Panel - US1 (Plan Management)

**Feature**: 006-admin-panel | **Priority**: P1 within feature
**Goal**: Manage subscription plans for merchants

### Filament Resources

- [ ] T265 [AP-US1] Create PlanResource in `app/Filament/Resources/PlanResource.php`
- [ ] T266 [AP-US1] Create Plan model in `app/Models/Plan.php`

### Features

- [ ] T267 [AP-US1] Add plan form (name, price, limits, features)
- [ ] T268 [AP-US1] Add feature toggles JSON field
- [ ] T269 [AP-US1] Add plan list with filtering

**Checkpoint**: Plans can be created and managed

---

## Phase 10: Admin Panel - US2 (OR Series Management)

**Feature**: 006-admin-panel | **Priority**: P1 within feature
**Goal**: Configure BIR OR series for merchants

### Filament Resources

- [ ] T270 [AP-US2] Create ORSeriesResource in `app/Filament/Resources/ORSeriesResource.php`
- [ ] T271 [AP-US2] Create ORSeries model in `app/Models/ORSeries.php`

### Validation

- [ ] T272 [AP-US2] Create ORSeriesRange validation rule (gaps, overlaps)
- [ ] T273 [AP-US2] Add 80% exhaustion alert widget

### Features

- [ ] T274 [AP-US2] Add PTU number and validity fields
- [ ] T275 [AP-US2] Add terminal assignment

**Checkpoint**: OR series configurable with validation

---

## Phase 11: Admin Panel - US3 (Merchant Onboarding)

**Feature**: 006-admin-panel | **Priority**: P1 within feature
**Goal**: Onboard new merchants to the platform

### Filament Resources

- [ ] T276 [P] [AP-US3] Create MerchantResource in `app/Filament/Resources/MerchantResource.php`
- [ ] T277 [P] [AP-US3] Create Merchant model in `app/Models/Merchant.php`
- [ ] T278 [P] [AP-US3] Create Subscription model in `app/Models/Subscription.php`

### Onboarding Wizard

- [ ] T279 [AP-US3] Create MerchantOnboarding page in `app/Filament/Pages/MerchantOnboarding.php`
- [ ] T280 [AP-US3] Step 1: Business details form
- [ ] T281 [AP-US3] Step 2: Plan selection
- [ ] T282 [AP-US3] Step 3: Branch and terminal setup
- [ ] T283 [AP-US3] Step 4: OR series configuration

**Checkpoint**: Merchants can be onboarded via wizard

---

## Phase 12: Admin Panel - US4/US5 (Audit & CRUD)

**Feature**: 006-admin-panel | **Priority**: P2 within feature
**Goal**: Audit trail and full entity management

### Audit Logging

- [ ] T284 [AP-US4] Configure Spatie Activity Log
- [ ] T285 [AP-US4] Create AuditLogResource in `app/Filament/Resources/AuditLogResource.php`
- [ ] T286 [AP-US4] Add activity logging to models

### CRUD Resources

- [ ] T287 [P] [AP-US5] Create BranchResource in `app/Filament/Resources/BranchResource.php`
- [ ] T288 [P] [AP-US5] Create TerminalResource in `app/Filament/Resources/TerminalResource.php`
- [ ] T289 [P] [AP-US5] Create UserResource in `app/Filament/Resources/UserResource.php`

### Dashboard

- [ ] T290 [AP-US4] Create admin Dashboard with stats widgets
- [ ] T291 [AP-US4] Add MerchantStats widget
- [ ] T292 [AP-US4] Add SubscriptionAlerts widget
- [ ] T293 [AP-US4] Add ORSeriesAlerts widget

**Checkpoint**: Full admin panel with audit trail

---

## Phase 13: P2 Integration & Polish

**Purpose**: Cross-feature integration and validation

### Integration

- [ ] T294 [P] Connect reports to sync (mark synced reports)
- [ ] T295 [P] Add report generation to shift close flow
- [ ] T296 Connect admin panel to POS sync endpoints

### Validation

- [ ] T297 [P] Run quickstart.md verification for reports
- [ ] T298 [P] Run quickstart.md verification for sync
- [ ] T299 [P] Run quickstart.md verification for admin panel
- [ ] T300 End-to-end: Process sales → Generate X-Reading → Sync → View in admin

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → All other phases
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
Reports    Multi-Sync    Admin Panel
(Phase 2-5) (Phase 6-8)  (Phase 9-12)
    ↓           ↓           ↓
    └───────────┼───────────┘
                ↓
        Phase 13 (Integration)
```

### Feature Independence

- **Reports (004)**: Can be developed independently after P1
- **Sync (005)**: Can be developed independently after P1
- **Admin (006)**: Laravel/Filament, separate from Vue frontend

### Parallel Opportunities

- Reports and Sync features can be developed in parallel
- Admin panel (Laravel) can be developed alongside Vue features
- Within each feature, components marked [P] can run in parallel

---

## Notes

- Z-counter MUST never reset - critical for BIR compliance
- Sync uses last-write-wins for conflict resolution
- Admin panel is separate Laravel project with Filament
- All reports must work offline (generate from local SQLite)
