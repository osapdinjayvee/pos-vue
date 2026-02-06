# Tasks: EIS Electronic OR Submission

**Input**: Design documents from `/specs/011-eis-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Feature Branch**: `011-eis-integration`
**Depends On**: 002-sales-checkout (transactions), 001-product-inventory (products)

**Organization**: Tasks grouped by user story. Adapted for Vue 3 + PrimeVue 4 + Pinia + sql.js frontend stack.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Existing Infrastructure (DO NOT recreate)

- **Transaction types**: `src/types/transaction.ts` — Transaction (id, or_number, shift_id, user_id, terminal_id, branch_id, subtotal, discount_total, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, total_amount, status, synced_at), TransactionItem (product_id, product_name, sku, quantity, unit_price, discount, line_total, tax_type, vatable_sales, vat_amount)
- **Receipt types**: `src/types/receipt.ts` — ORSeries (prefix, start_number, end_number, current_number, ptu_number, machine_serial, min_number), ReceiptData, BusinessInfo, TerminalInfo, VATBreakdown
- **Transaction store**: `src/stores/transaction.ts` — processTransaction(), voidTransaction(), currentTransaction, lastCompletedTransaction, lastORNumber
- **Transaction service**: `src/services/transactionService.ts` — createTransaction() → generates OR, calculates VAT, enqueues for sync. Returns { success, transaction, items, orNumber }
- **Receipt service**: `src/services/receiptService.ts` — generateReceiptData(), generateReceiptText(), setBusinessInfo(), setTerminalInfo()
- **Sync infrastructure**: `src/services/syncService.ts` (registerHandler, enqueueItem, processBatch, runSyncCycle), `src/config/sync.ts` (apiBaseUrl, batchSize: 50, maxRetries: 5, backoff), `src/stores/sync.ts`, `src/composables/useSync.ts`
- **Sync queue table**: `sync_queue` (entity_type, entity_id, operation, payload, status, attempts, last_error) — via migration 009_sync.ts
- **HTTP client**: Uses fetch/httpClient with apiBaseUrl from sync config
- **Settings view**: `src/views/SettingsView.vue` — PrimeVue Tabs with 8 tabs (Business, BIR Compliance, Tax, Receipt, Payment, Loyalty, System, Backup). BIR Compliance tab has TIN, branch_code, PTU, machine_serial, MIN, OR series management
- **Export pattern**: `src/utils/exportCsv.ts` — exportToCsv(data, filename, columns: ExportColumn[]) with formatters
- **Report export**: `src/services/reportExportService.ts` — CSV export with currency/date formatting
- **Menu**: `src/components/layout/AppMenu.vue` — Reports section, Settings item, Analytics section with permission checks
- **Routes**: `src/router/index.ts` — Settings at `/settings`, Reports at `/reports/*`
- **Breadcrumbs**: `src/components/layout/AppTopbar.vue` — route-to-title mapping
- **Next migration**: 013 (012_cash_drawer is latest registered)

## Patterns to Follow

- **Repository**: extends BaseRepository with tableName/idPrefix, uses db.query()/db.execute()
- **Store**: Pinia with ref() state, computed getters, async actions (see `src/stores/transaction.ts`)
- **Composable**: wraps store, exposes computed refs + methods (see `src/composables/useSync.ts`)
- **View**: Toast, DataTable, PrimeVue Tabs, DatePicker filters (see `src/views/SettingsView.vue`)
- **Sync handler**: Register entity type handler via syncService.registerHandler() (see `src/services/transactionSyncService.ts`)
- **CSV export**: exportToCsv() from `src/utils/exportCsv.ts`

## Architecture Note

EIS submission requires BIR API connectivity. In the offline-first architecture:
1. Transaction completes → EIS submission record created locally in SQLite
2. When online, submissions upload to server via sync service (or directly to BIR if credentials on client)
3. Server proxies to BIR API, returns reference numbers and statuses
4. Client downloads updated submission statuses
5. Retry logic handles temporary BIR failures with exponential backoff

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, migration, and EIS payload configuration

- [x] T001 Create EIS TypeScript types in `src/types/eis.ts` — EISConfig interface (id, tin, branch_code, api_key, api_secret, environment: 'test' | 'production', endpoint_url, is_enabled, batch_size: number default 100, submission_interval_mins: number default 5, max_retries: number default 5, created_at, updated_at). EISSubmission interface (id, transaction_id, or_number, payload: string JSON, status: EISSubmissionStatus, bir_reference, batch_id, attempts, last_attempt, last_error, submitted_at, created_at). EISSubmissionStatus type ('pending' | 'submitted' | 'failed' | 'rejected'). EISBatch interface (id, item_count, success_count, failed_count, status: 'processing' | 'completed' | 'partial', submitted_at, completed_at). EISPayload interface per research.md (tin, branch_code, or_number, or_date, gross_sales, vat_amount, vatable_sales, vat_exempt_sales, zero_rated_sales, net_sales, discount_amount, items: EISLineItem[], machine_id, ptu_number, payment_method, transaction_type: 'sale' | 'void' | 'refund'). EISLineItem interface (description, quantity, unit_price, amount, vat_amount, tax_type). EISErrorType enum ('temporary' | 'validation' | 'rejected' | 'duplicate'). EISSubmissionResult interface (success, bir_reference?, error?, errorType?: EISErrorType). EIS_ENDPOINTS constant with test and production BIR URLs
- [x] T002 Create database migration `src/db/migrations/013_eis.ts` — Create table: eis_config (id TEXT PK, tin TEXT NOT NULL, branch_code TEXT NOT NULL, api_key TEXT NOT NULL, api_secret TEXT NOT NULL, environment TEXT DEFAULT 'test' CHECK(environment IN ('test','production')), endpoint_url TEXT, is_enabled INTEGER DEFAULT 0, batch_size INTEGER DEFAULT 100, submission_interval_mins INTEGER DEFAULT 5, max_retries INTEGER DEFAULT 5, created_at TEXT NOT NULL, updated_at TEXT NOT NULL). Create table: eis_submissions (id TEXT PK, transaction_id TEXT NOT NULL, or_number TEXT NOT NULL, payload TEXT NOT NULL, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','submitted','failed','rejected')), bir_reference TEXT, batch_id TEXT, attempts INTEGER DEFAULT 0, last_attempt TEXT, last_error TEXT, submitted_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY (transaction_id) REFERENCES transactions(id)). Create table: eis_batches (id TEXT PK, item_count INTEGER NOT NULL, success_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, status TEXT DEFAULT 'processing' CHECK(status IN ('processing','completed','partial')), submitted_at TEXT NOT NULL, completed_at TEXT). Add indexes: idx_eis_sub_status on eis_submissions(status), idx_eis_sub_transaction on eis_submissions(transaction_id), idx_eis_sub_batch on eis_submissions(batch_id), idx_eis_batch_status on eis_batches(status)
- [x] T003 Register migration 013 in `src/db/database.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositories, services, and store that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create `src/repositories/eisConfigRepository.ts` — extends BaseRepository, tableName: 'eis_config', idPrefix: 'eisc'. Methods: getConfig() returns first record or null, saveConfig(config: Partial<EISConfig>) upserts (creates if none exists, updates otherwise), updateField(field, value), isEnabled() returns boolean, getEnvironment() returns 'test' | 'production'
- [x] T005 [P] Create `src/repositories/eisSubmissionRepository.ts` — extends BaseRepository, tableName: 'eis_submissions', idPrefix: 'eiss'. Methods: create(submission), findByTransactionId(transactionId), getPending(limit?: number) ordered by created_at ASC, getByStatus(status: EISSubmissionStatus, limit?), getBatch(batchSize: number) returns oldest pending items, updateStatus(id, status, birReference?, error?), incrementAttempts(id, error), markSubmitted(id, birReference), markFailed(id, error, errorType), markRejected(id, error), setBatchId(ids: string[], batchId), countByStatus() returns {pending, submitted, failed, rejected}, getForDateRange(dateFrom, dateTo) for history, findByORNumber(orNumber), findByBirReference(birReference), getRecentFailed(limit?) for error review
- [x] T006 [P] Create `src/repositories/eisBatchRepository.ts` — extends BaseRepository, tableName: 'eis_batches', idPrefix: 'eisb'. Methods: create(batch: Partial<EISBatch>), updateCounts(id, successCount, failedCount), markCompleted(id), markPartial(id), getRecent(limit?), getByStatus(status), getById(id)
- [x] T007 Create `src/services/eisService.ts` — Core EIS service. Methods: buildPayload(transaction: Transaction, items: TransactionItem[]): EISPayload — maps transaction fields to BIR EIS format (or_number, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, total_amount as gross_sales, items mapped to EISLineItem[], reads TIN/branch_code/ptu_number/machine_id from eisConfigRepository and existing BIR settings). enqueueTransaction(transactionId): creates EIS submission record from transaction data, builds payload, stores in eis_submissions with status 'pending'. enqueueVoid(transactionId): same but with transaction_type 'void'. enqueueRefund(transactionId): same but with transaction_type 'refund'. isEnabled(): checks eisConfigRepository.isEnabled(). getSubmissionForTransaction(transactionId): returns submission status and BIR reference
- [x] T008 Create `src/services/eisBatchService.ts` — Batch submission logic. Methods: processPendingBatch(): gets batch of pending submissions (batch_size from config), creates EIS batch record, calls submitBatch(), updates individual submission statuses and batch counts. submitBatch(submissions: EISSubmission[]): sends batch to BIR endpoint (or server proxy at apiBaseUrl + '/eis/submit') via fetch, parses response to get per-item results. handleSubmissionResult(submission, result: EISSubmissionResult): if success → markSubmitted with bir_reference; if duplicate → markSubmitted with existing reference; if validation → markRejected; if temporary → incrementAttempts (retry later). shouldRetry(submission): checks attempts < max_retries from config. getRetryDelay(attempts): exponential backoff (60s, 300s, 900s, 3600s, 7200s per research.md)
- [x] T009 Create `src/stores/eis.ts` — Pinia store. State: config (EISConfig | null), pendingCount (number), submittedCount (number), failedCount (number), rejectedCount (number), recentSubmissions (EISSubmission[]), recentBatches (EISBatch[]), isProcessing (boolean), lastProcessedAt (string | null), error (string | null). Computed: isEnabled, isConfigured, totalSubmissions, hasFailures, statusCounts. Actions: loadConfig(), saveConfig(config), loadCounts() from eisSubmissionRepository.countByStatus(), loadRecentSubmissions(limit?), loadRecentBatches(limit?), processBatch() delegates to eisBatchService.processPendingBatch(), retryFailed() resets failed items to pending, clearError()
- [x] T010 Create `src/composables/useEIS.ts` — Wraps EIS store. Exposes: config (readonly), isEnabled, isConfigured, pendingCount, failedCount, statusCounts, recentSubmissions, isProcessing, lastProcessedAt. Methods: loadDashboard() loads config + counts + recent, saveConfig(config), processBatch(), retryFailed(), enqueueTransaction(transactionId), getSubmissionStatus(transactionId). Formatters: formatEISStatus(status) returns { label, severity } for PrimeVue Tag
- [x] T011 Verify Phase 2 with `npx vue-tsc --noEmit` and `npx vite build`

**Checkpoint**: Foundation ready — EIS types, tables, repositories, services, store, composable all working

---

## Phase 3: User Story 1 — Automatic EIS Submission (Priority: P1) 🎯 MVP

**Goal**: When EIS is enabled and a sale completes, OR data is automatically queued and submitted to BIR EIS

**Independent Test**: Enable EIS in settings (test mode), process a sale, verify EIS submission record created with 'pending' status, trigger batch processing, verify status changes to 'submitted' with BIR reference

### Implementation for User Story 1

- [x] T012 [US1] Wire EIS enqueue into transaction completion — In `src/services/transactionService.ts` createTransaction(), after successful transaction creation (after sync enqueue, similar to loyalty/analytics pattern), add non-blocking EIS enqueue: check eisService.isEnabled(), if true call eisService.enqueueTransaction(transaction.id). Same pattern for void: in voidTransaction(), call eisService.enqueueVoid(). Use dynamic import to avoid circular dependencies. Wrap in try/catch — EIS failure MUST NOT fail the transaction
- [x] T013 [US1] Add EIS submission status to transaction display — In existing transaction list/detail components where transaction status is shown, add EIS status badge: if transaction has an EIS submission, show PrimeVue Tag with submission status (pending=info, submitted=success, failed=warn, rejected=danger) and BIR reference number when available. Create small `src/components/eis/EISStatusBadge.vue` — Props: transactionId. Uses eisSubmissionRepository.findByTransactionId() to get status. Shows Tag with label and severity from useEIS.formatEISStatus()
- [x] T014 [US1] Implement automatic batch processing trigger — In `src/composables/useEIS.ts`, add startAutoProcess(intervalMs?): uses setInterval (default from config.submission_interval_mins * 60000, fallback 5 minutes) to call processBatch() when isOnline (from connectivityService). Add stopAutoProcess(). In `src/composables/useSync.ts` initializeSync(), if EIS is enabled, call useEIS().startAutoProcess(). On destroySync(), call stopAutoProcess(). Also trigger processBatch() when connectivity restores (onOnline callback)
- [x] T015 [US1] Handle failed submission retry — In `src/services/eisBatchService.ts` processPendingBatch(), after processing pending items, also pick up failed items where shouldRetry() is true AND enough time has elapsed since last_attempt (based on getRetryDelay). Process retries in same batch. Update eisSubmissionRepository with new attempt count and result. If max_retries exceeded, leave as 'failed' for manual review

**Checkpoint**: Automatic EIS submission working — transactions auto-enqueue, batch processing runs on interval, retries on failure

---

## Phase 4: User Story 2 — EIS Configuration (Priority: P1)

**Goal**: Admin configures EIS credentials, enables/disables submission, switches between test and production environments

**Independent Test**: Open Settings, navigate to EIS tab, enter BIR credentials (TIN, branch code, API key/secret), select test environment, enable EIS, verify connection test succeeds, process a sale, verify EIS submission created

### Implementation for User Story 2

- [x] T016 [P] [US2] Create `src/components/eis/EISConfigForm.vue` — Form panel for EIS configuration. Fields: PrimeVue InputText for TIN (required, validate format), InputText for branch_code (required), Password for api_key (required, masked), Password for api_secret (required, masked), SelectButton for environment ('Test' / 'Production') with 'Production' showing ConfirmDialog warning, InputNumber for batch_size (default 100, min 10, max 500), InputNumber for submission_interval_mins (default 5, min 1, max 60), ToggleSwitch for is_enabled. "Test Connection" button that calls testConnection(). "Save" button calls useEIS.saveConfig(). Show success/error Toast on save. Props: config (EISConfig | null). Emits: save(config), test
- [x] T017 [US2] Create `src/services/eisConnectionTestService.ts` — testConnection(config: Partial<EISConfig>): sends test request to BIR endpoint (or server proxy at apiBaseUrl + '/eis/test-connection') with provided credentials, returns { success, message, latencyMs }. If test mode: use test/sandbox BIR URL from EIS_ENDPOINTS constant. If production: use production URL. Timeout after 10 seconds. Returns user-friendly error messages for common failures (invalid credentials, network error, BIR unavailable)
- [x] T018 [US2] Add EIS Configuration tab to `src/views/SettingsView.vue` — Add new Tab "EIS Compliance" (9th tab, icon pi pi-cloud-upload) after the BIR Compliance tab. Tab content renders EISConfigForm component. On mount, load existing config via useEIS.loadDashboard(). On save, persist via useEIS.saveConfig(). Show inline info message: "EIS (Electronic Invoicing System) automatically submits electronic receipts to BIR. Requires valid BIR EIS accreditation credentials." Note: reads TIN and branch_code defaults from existing BIR Compliance tab values
- [x] T019 [US2] Pre-populate EIS config from existing BIR settings — In `src/composables/useEIS.ts` loadDashboard(), if no EIS config exists yet, create default config with TIN and branch_code pulled from the business settings (SettingsView BIR Compliance tab values). This avoids admin re-entering TIN. When EIS config form loads, show these pre-populated values

**Checkpoint**: EIS configuration fully functional — credentials entry, test/production toggle, connection test, enable/disable

---

## Phase 5: User Story 3 — EIS Batch Submission (Priority: P2)

**Goal**: Submissions processed in efficient batches, partial failures handled per-item, offline-synced transactions included in next batch

**Independent Test**: Process 100 sales, verify they submit in batches (not individually), verify one failing item doesn't block others, process offline transactions, sync them, verify they appear in next EIS batch

### Implementation for User Story 3

- [x] T020 [P] [US3] Create `src/components/eis/EISBatchProgress.vue` — Displays current batch processing progress. Shows: PrimeVue ProgressBar (success_count / item_count), batch status Tag, item counts (total, success in green, failed in red), processing duration, "Items" expandable section showing DataTable of batch items with individual statuses. Props: batch (EISBatch), submissions (EISSubmission[]), isProcessing. Emits: retry-failed
- [x] T021 [US3] Create `src/components/eis/EISBatchHistory.vue` — DataTable of recent batches. Columns: batch ID (short), submitted_at (formatted), item_count, success_count (Tag success), failed_count (Tag danger if > 0), status (Tag with severity), duration (completed_at - submitted_at). Click row to expand and show batch items. PrimeVue Paginator with 10 rows per page. Props: batches (EISBatch[]), loading. Emits: view-batch(batchId)
- [x] T022 [US3] Wire synced offline transactions into EIS queue — In `src/services/transactionSyncService.ts` uploadBatch() success handler, after marking transactions as synced, check if EIS is enabled via eisService.isEnabled(). If yes, for each successfully synced transaction that doesn't already have an EIS submission (check eisSubmissionRepository.findByTransactionId), call eisService.enqueueTransaction(). This ensures offline transactions get EIS submissions when they eventually sync
- [x] T023 [US3] Add batch size optimization — In `src/services/eisBatchService.ts`, add getBatchStats(): returns average items per batch, average success rate, average processing time. In processPendingBatch(), if pending count > batch_size * 3, process multiple sequential batches in one run (up to 5 batches) to catch up. Add yield between batches (setTimeout(0)) to avoid blocking UI. Track batch timing for estimated completion

**Checkpoint**: Batch submission working — efficient batching, per-item failure handling, offline transactions included

---

## Phase 6: User Story 4 — EIS Submission History (Priority: P2)

**Goal**: View all EIS submissions with status, date range filtering, search by OR/BIR reference, retry failed items, export compliance report

**Independent Test**: View EIS submissions page, filter by date range, search by OR number, find a failed submission, retry it, export history as CSV

### Implementation for User Story 4

- [x] T024 [P] [US4] Create `src/components/eis/EISSubmissionTable.vue` — DataTable of EIS submissions. Columns: OR number, transaction date, gross sales (₱ formatted), VAT (₱ formatted), status (Tag with severity: pending=info, submitted=success, failed=warn, rejected=danger), BIR reference (shown if submitted), attempts, last error (truncated, tooltip for full). Sortable by date, status. PrimeVue Paginator 20/50/100 rows. Row expansion shows full payload preview and error details. Props: submissions[], loading, totalRecords. Emits: retry(id), view-detail(id)
- [x] T025 [P] [US4] Create `src/components/eis/EISSubmissionFilters.vue` — Filter bar above submission table. Contains: PrimeVue DatePicker for date range, SelectButton for status filter (All, Pending, Submitted, Failed, Rejected), InputText for search (OR number or BIR reference), Button "Export CSV", Button "Retry All Failed". Emits: filter-change({ dateFrom, dateTo, status, search }), export, retry-all
- [x] T026 [US4] Create `src/views/EISSubmissionsView.vue` — Full page with: summary cards row at top (Total Submissions, Pending count with info Tag, Submitted count with success Tag, Failed count with warn Tag, Rejected count with danger Tag), EISSubmissionFilters, EISSubmissionTable (filtered by current filters), EISBatchHistory in collapsible Panel below. Uses useEIS composable for data. Export button calls exportToCsv() with columns: OR Number, Date, Gross Sales, VAT Amount, Net Sales, Status, BIR Reference, Submitted At, Error. Retry calls eisStore.retryFailed()
- [x] T027 [US4] Add route `/eis-submissions` in `src/router/index.ts` with reports.view permission. Add breadcrumb "EIS Submissions" in `src/components/layout/AppTopbar.vue`. Add "EIS Submissions" menu item in `src/components/layout/AppMenu.vue` under the Reports section, icon `pi pi-cloud-upload`, permission PERMISSIONS.REPORTS_SALES

**Checkpoint**: EIS submission history fully functional — filtering, search, retry, export

---

## Phase 7: User Story 5 — EIS Error Handling (Priority: P2)

**Goal**: Categorized error handling (temporary → retry, validation → flag, rejected → manual review, duplicate → mark success), exponential backoff, admin alerts on threshold

**Independent Test**: Simulate temporary error (verify retry), simulate validation error (verify flagged with field details), simulate multiple failures (verify alert), simulate BIR downtime (verify queue builds and recovers)

### Implementation for User Story 5

- [x] T028 [US5] Implement categorized error handling in `src/services/eisBatchService.ts` — Update handleSubmissionResult() to classify errors by EISErrorType. Parse BIR API response: HTTP 5xx or timeout → 'temporary' (schedule retry). HTTP 400 with field errors → 'validation' (mark rejected, store field-level error details in last_error as JSON). HTTP 409 duplicate → 'duplicate' (mark submitted with existing reference). Any other rejection → 'rejected' (mark rejected, requires manual review). Store errorType in last_error JSON alongside message. Update shouldRetry() to only retry 'temporary' errors
- [x] T029 [P] [US5] Create `src/components/eis/EISErrorDetail.vue` — Dialog showing detailed error information for a failed/rejected submission. Sections: submission summary (OR number, date, amount), error classification (Tag with EISErrorType), error message from BIR, field-level validation errors (DataTable: field, expected, actual — parsed from last_error JSON), retry history (attempts count, last attempt timestamp), action buttons: "Retry Now" (for temporary errors), "Edit & Resubmit" (for validation — not implemented in v1, placeholder), "Dismiss" (mark as manually reviewed). Props: submission (EISSubmission), visible. Emits: close, retry(id)
- [x] T030 [US5] Implement failure threshold alerting — In `src/services/eisBatchService.ts`, after processPendingBatch(), check failure count: if failed_count in current batch > 50% of item_count OR total failed submissions > config.max_retries * 2, set alert flag in EIS store. In `src/stores/eis.ts`, add state: alertActive (boolean), alertMessage (string). In `src/components/eis/EISStatusBadge.vue`, when alertActive, show pulsing danger indicator. In EISSubmissionsView, show PrimeVue Message severity="error" banner: "EIS submission failure rate is high — X items failed. Please check BIR connectivity and credentials." with dismiss action
- [x] T031 [US5] Handle BIR system downtime gracefully — In `src/services/eisBatchService.ts`, if all items in a batch fail with 'temporary' error, set a backoff multiplier for next batch processing cycle (double the interval, up to 1 hour max). Reset backoff on first successful batch. In `src/composables/useEIS.ts` startAutoProcess(), respect the backoff multiplier when scheduling next batch. Show "BIR system may be unavailable" info message in EISSubmissionsView when all recent items are temporary failures. Queue continues to build — no data loss

**Checkpoint**: Error handling fully functional — categorized errors, exponential backoff, threshold alerts, graceful BIR downtime

---

## Phase 8: User Story 6 — EIS Reports for BIR Filing (Priority: P3)

**Goal**: Generate monthly/periodic EIS summary reports for BIR filing, show submission totals and status breakdown, compare with Z-Reading totals, export in BIR-compatible format

**Independent Test**: Generate monthly EIS report, verify total submissions match actual transactions, compare with Z-Reading totals, export report as CSV

### Implementation for User Story 6

- [x] T032 [P] [US6] Create `src/services/eisReportService.ts` — Methods: getSubmissionSummary(dateFrom, dateTo): returns { totalSubmissions, submittedCount, failedCount, rejectedCount, pendingCount, totalGrossSales, totalVatAmount, totalNetSales, totalDiscounts } by aggregating eis_submissions for period. getComparisonWithZReading(dateFrom, dateTo): queries Z-Reading totals for same period (from existing report store/repository), returns { eisGross, zReadingGross, difference, matchPercentage, discrepancies[] }. getDailyBreakdown(dateFrom, dateTo): returns daily totals and status counts for detailed reporting. getFailedSubmissionsReport(dateFrom, dateTo): returns all failed/rejected items with error details for compliance review
- [x] T033 [P] [US6] Create `src/components/eis/EISSummaryReport.vue` — Report display with: period selector (PrimeVue DatePicker month picker), summary cards row (Total Submitted, Gross Sales ₱, VAT ₱, Net Sales ₱, Failed/Pending counts with severity Tags), comparison section showing EIS totals vs Z-Reading totals with match percentage (green if > 99.9%, yellow if > 99%, red if < 99%), daily breakdown DataTable (date, submitted count, gross, VAT, net, failed count). Props: summary data, comparison data, dailyBreakdown[], loading
- [x] T034 [US6] Create `src/components/eis/EISComplianceExport.vue` — Export panel with: month selector, format selection (CSV), "Generate Report" button. Generates CSV with columns matching BIR filing format: Date, OR Number, TIN, Branch Code, Gross Sales, VAT Amount, Vatable Sales, VAT Exempt, Zero Rated, Net Sales, Machine ID, PTU Number, Status, BIR Reference. Uses reportExportService pattern. Shows preview count before export. Props: dateFrom, dateTo. Emits: export(format)
- [x] T035 [US6] Create `src/views/EISReportsView.vue` — Full page with: PrimeVue Tabs — "Summary" (EISSummaryReport), "Export" (EISComplianceExport). Summary tab loads data from eisReportService on period change. Export tab allows generating and downloading compliance reports. Add route `/eis-reports` in `src/router/index.ts` with reports.view permission. Add breadcrumb in AppTopbar. Add "EIS Reports" menu item under Reports section in AppMenu, icon `pi pi-file-check`

**Checkpoint**: EIS reports fully functional — summary with Z-Reading comparison, daily breakdown, BIR-format export

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, integration, and cross-story improvements

- [x] T036 [P] Handle edge case: void and refund EIS submissions — In `src/services/transactionService.ts` voidTransaction(), after voiding, check EIS enabled and enqueue void record via eisService.enqueueVoid(). Void payload includes original OR number, void reason, and void timestamp. Ensure original submission status is not affected (both original sale and void are separate EIS entries per BIR requirement)
- [x] T037 [P] Handle edge case: EIS enable date boundary — In `src/services/eisService.ts` enqueueTransaction(), check that transaction created_at is AFTER eis_config.created_at (EIS enable date). Do not retroactively submit historical transactions from before EIS was enabled. Show info message in EIS config form: "Only transactions after the enable date will be submitted to EIS"
- [x] T038 [P] Handle edge case: BIR API format changes — In `src/services/eisService.ts` buildPayload(), extract payload construction into a configurable schema. Store BIR API version in eis_config table (add field api_version TEXT DEFAULT 'v1'). If BIR changes format, admin updates version and payload builder switches schema. Add migration alter if needed or handle via config JSON field
- [x] T039 [P] Add EIS status summary to dashboard — Create `src/components/eis/EISDashboardWidget.vue` — compact card showing: "EIS" title, submission counts (pending/submitted/failed as mini Tags), last processed timestamp. Only visible when EIS is enabled. Add to DashboardView.vue below existing stats row (conditional render)
- [x] T040 Enhance SyncStatus topbar indicator — In `src/components/sync/SyncStatus.vue`, when EIS is enabled and has pending/failed items, show a small EIS badge count alongside the sync status icon. Clicking navigates to /eis-submissions if EIS items are the concern
- [x] T041 Full build verification — Run `npx vue-tsc --noEmit` and `npx vite build`. Fix any type errors
- [x] T042 Run quickstart.md verification — Test: enable EIS in test mode, process a sale, verify queued, trigger batch, verify submitted with reference, view submission history, export compliance report, retry a failed item

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 types and migration — BLOCKS all user stories
- **Phase 3 (US1 Auto Submission)**: Depends on Phase 2 eisService and eisBatchService
- **Phase 4 (US2 Configuration)**: Depends on Phase 2 eisConfigRepository and store
- **Phase 5 (US3 Batch Submission)**: Depends on Phase 2 eisBatchService
- **Phase 6 (US4 Submission History)**: Depends on Phase 2 eisSubmissionRepository
- **Phase 7 (US5 Error Handling)**: Depends on Phase 2 eisBatchService; benefits from US1 for testing
- **Phase 8 (US6 Reports)**: Depends on Phase 2; benefits from US1+US4 data for testing
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Auto Submission)**: Independent — core enqueue and batch processing
- **US2 (Configuration)**: Independent — settings UI, can enable/disable
- **US3 (Batch Submission)**: Benefits from US1 for data but independently testable
- **US4 (Submission History)**: Independent — reads eis_submissions table
- **US5 (Error Handling)**: Benefits from US1 for error scenarios but independently testable
- **US6 (Reports)**: Independent — aggregates from eis_submissions

### Within Each User Story

- Service logic before components
- Components before view pages
- Composable/store wiring before UI integration
- Route/menu after view exists

### Parallel Opportunities

- **Phase 2**: T004, T005, T006 (all repos) can run in parallel
- **Phase 4**: T016 (config form) can start in parallel with T017 (connection test service)
- **Phase 5**: T020 (batch progress) can start in parallel with other US3 tasks
- **Phase 6**: T024, T025 (table + filters) can run in parallel
- **Phase 7**: T029 (error detail) can start in parallel with other US5 tasks
- **Phase 8**: T032, T033 (report service + summary component) can run in parallel
- **Phase 9**: T036, T037, T038, T039 (all edge cases) can run in parallel
- **All user stories (Phases 3–8)** can run in parallel after Phase 2 completes

---

## Parallel Example: User Story 4

```bash
# Launch table and filters in parallel (different files, no deps):
Task: "Create EISSubmissionTable in src/components/eis/EISSubmissionTable.vue"
Task: "Create EISSubmissionFilters in src/components/eis/EISSubmissionFilters.vue"

# Then compose the view (depends on both components):
Task: "Create EISSubmissionsView in src/views/EISSubmissionsView.vue"
```

## Parallel Example: User Story 6

```bash
# Launch service and component in parallel:
Task: "Create eisReportService in src/services/eisReportService.ts"
Task: "Create EISSummaryReport in src/components/eis/EISSummaryReport.vue"

# Then compose the view and add route:
Task: "Create EISReportsView in src/views/EISReportsView.vue"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T011)
3. Complete Phase 4: US2 — EIS Configuration (T016–T019) — enable EIS first
4. Complete Phase 3: US1 — Automatic Submission (T012–T015) — transactions start submitting
5. **STOP and VALIDATE**: Enable EIS test mode, process sale, verify submission queued and submitted
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US2 (Config) + US1 (Auto Submission) → Test → **Deploy (MVP!)**
3. Add US3 (Batch Submission) → Test → Deploy (efficiency)
4. Add US4 (Submission History) → Test → Deploy (visibility)
5. Add US5 (Error Handling) → Test → Deploy (reliability)
6. Add US6 (EIS Reports) → Test → Deploy (compliance)
7. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: US2 (Configuration) → US1 (Auto Submission)
- **Developer B**: US3 (Batch Submission) → US5 (Error Handling)
- **Developer C**: US4 (Submission History) → US6 (Reports)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All EIS data stored locally in sql.js database (offline-first queue)
- BIR API submission goes through server proxy (apiBaseUrl + '/eis/*') — credentials not exposed to client
- Alternatively, direct BIR API call if credentials stored locally (less secure, simpler)
- Transaction completion MUST NOT fail due to EIS errors (non-blocking enqueue)
- Void and refund are separate EIS entries (not modifications to original)
- Historical transactions before EIS enable date are NOT retroactively submitted
- BIR test/sandbox environment used during development
- No Laravel/Filament/PHP — everything is Vue 3 + TypeScript + PrimeVue 4
- Currency formatted as ₱ with toLocaleString('en-PH')
- Commit after each task or logical group
