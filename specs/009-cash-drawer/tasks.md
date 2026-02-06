# Tasks: Cash Drawer Management

**Input**: Design documents from `/specs/009-cash-drawer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md
**Depends On**: 003-user-management (shifts), 002-sales-checkout (payments)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Vue 3 frontend with local SQLite (sql.js)
- **Base path**: `src/` at repository root
- **Components**: `src/components/cash-drawer/`
- **Composables**: `src/composables/`
- **Stores**: `src/stores/`
- **Services**: `src/services/`
- **Repositories**: `src/repositories/`
- **Types**: `src/types/`
- **DB Migrations**: `src/db/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, migration, and Philippine denomination configuration

- [x] T001 Create cash drawer TypeScript types (DrawerSession, DrawerOperation, DenominationCount, VarianceConfig, DrawerStatus enum, OperationType enum) with Philippine currency denominations constant (PHP_DENOMINATIONS array from research.md) in `src/types/cashDrawer.ts`
- [x] T002 Create SQLite migration for `drawer_sessions`, `drawer_operations`, and `denomination_counts` tables with all fields, constraints, indexes, and CHECK constraints per data-model.md schema in `src/db/migrations/009_cash_drawer.ts`
- [x] T003 Register migration 009_cash_drawer in the database migration runner in `src/db/migrations/` index file (follow existing pattern from other migration registrations)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositories, core services, and store that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create DrawerSessionRepository in `src/repositories/drawerSessionRepository.ts` with methods: `create(session)`, `findByShiftId(shiftId)`, `findOpen(userId)`, `update(id, data)`, `close(id, closingAmount, variance, reason)` — all using sql.js to query `drawer_sessions` table
- [x] T005 [P] Create DrawerOperationRepository in `src/repositories/drawerOperationRepository.ts` with methods: `create(operation)`, `findBySessionId(sessionId)`, `findByType(sessionId, type)`, `createWithDenominations(operation, denominations)` — querying `drawer_operations` and `denomination_counts` tables, wrapping denomination inserts in a transaction
- [x] T006 Create CashDrawerService in `src/services/cashDrawerService.ts` with methods: `openDrawer(shiftId, userId, terminalId, denominations)` that creates a DrawerSession + open operation + denomination counts, `getExpectedCash(sessionId)` implementing the formula: opening + cash sales - cash refunds - drops + paid-ins (per research.md), `closeDrawer(sessionId, denominations)` that calculates variance and closes session, `recordDrop(sessionId, amount, reason, supervisorId)`, `recordPaidIn(sessionId, amount, reason, supervisorId)`, `recordNoSale(sessionId, supervisorId)` — all using repositories
- [x] T007 Create cashDrawer Pinia store in `src/stores/cashDrawer.ts` with state: `currentSession`, `operations`, `expectedCash`, `isDrawerOpen`, `varianceThreshold` (default 100); actions that delegate to CashDrawerService: `openDrawer()`, `closeDrawer()`, `performDrop()`, `performPaidIn()`, `refreshExpectedCash()`; getters: `hasOpenSession`, `currentVariance`, `totalDrops`, `totalPaidIns`
- [x] T008 Create useDenominationCount composable in `src/composables/useDenominationCount.ts` with reactive state for all PHP denominations (from PHP_DENOMINATIONS constant), computed `total` that sums denomination × quantity, methods: `reset()`, `getDenominations()` returning array of {denomination, quantity, subtotal}, `setFromExisting(counts)` to populate from saved data — uses PrimeVue InputNumber for quantity entry
- [x] T009 Create useCashDrawer composable in `src/composables/useCashDrawer.ts` that wraps the cashDrawer store with convenience methods: `startShift(denominations)`, `endShift(denominations)`, `doCashDrop(amount, reason, supervisorPin)`, `doCashPaidIn(amount, reason, supervisorPin)`, `doNoSale(supervisorPin)`, computed properties: `drawerStatus`, `expectedCash`, `isOpen`, `requiresOpeningCount` — handles supervisor PIN validation by delegating to auth composable

**Checkpoint**: Foundation ready — types, migration, repositories, service, store, and composables in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — Opening Count (Priority: P1) 🎯 MVP

**Goal**: Cashier starts shift by entering denomination-based opening count; system records amount and opens drawer session.

**Independent Test**: Log in, start shift, enter counts by denomination (e.g., 5 × ₱1,000 = ₱5,000), verify total calculates correctly, confirm opening, verify drawer session is created with "open" status.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create DenominationEntry component in `src/components/cash-drawer/DenominationEntry.vue` — reusable denomination grid showing all PHP_DENOMINATIONS (bills section, coins section), each with PrimeVue InputNumber for quantity input, auto-calculated subtotal per row, grand total at bottom, emits `update:denominations` with array of {denomination, quantity, subtotal}, uses useDenominationCount composable
- [x] T011 [P] [US1] Create DrawerStatus component in `src/components/cash-drawer/DrawerStatus.vue` — displays current drawer state: session status (open/closed), opening amount, expected cash (live-updating), total drops, total paid-ins, elapsed shift time; uses cashDrawer store getters; shows "No active session" when no open session
- [x] T012 [US1] Create OpeningCount component in `src/components/cash-drawer/OpeningCount.vue` — full-page dialog/panel shown at shift start, contains DenominationEntry component, displays calculated total prominently, "Confirm Opening" PrimeVue Button (disabled until total > 0), on confirm calls useCashDrawer.startShift(denominations), shows success toast via PrimeVue Toast, emits `drawer-opened` event
- [x] T013 [US1] Integrate opening count requirement into shift start flow — in the shift start logic (existing shift composable/store), before allowing first transaction, check if drawer session exists for current shift; if not, show OpeningCount component as blocking modal; prevent POS transaction processing until drawer session status is "open"
- [x] T014 [US1] Add offline support for opening count — ensure DrawerSessionRepository and DrawerOperationRepository use local SQLite only (no network calls), add `synced_at` field handling to drawer_sessions for later sync, verify opening count works without network connectivity

**Checkpoint**: Opening Count fully functional — cashier can enter denomination-based opening count, total auto-calculates, drawer session created, and POS is blocked until opening count is complete.

---

## Phase 4: User Story 2 — Closing Count & Reconciliation (Priority: P1)

**Goal**: Cashier ends shift by entering closing denomination count; system calculates expected cash, shows variance (over/short), and requires reason if variance exceeds threshold.

**Independent Test**: After processing sales during a shift, close drawer by entering closing count, verify expected cash = opening + cash sales - cash refunds - drops + paid-ins, verify variance shows correctly, enter reason if over threshold, confirm close.

### Implementation for User Story 2

- [x] T015 [P] [US2] Create VarianceDisplay component in `src/components/cash-drawer/VarianceDisplay.vue` — shows side-by-side comparison: expected cash (calculated), actual cash (from closing count), variance amount with color coding (green for within threshold, red for over/short exceeding threshold), variance percentage; uses PrimeVue Card layout
- [x] T016 [US2] Create ClosingCount component in `src/components/cash-drawer/ClosingCount.vue` — contains DenominationEntry for closing count, VarianceDisplay showing real-time comparison as denominations are entered, PrimeVue Textarea for variance reason (required if |variance| > threshold from store), "Close Drawer" PrimeVue Button (disabled if reason required but empty), on confirm calls useCashDrawer.endShift(denominations), shows reconciliation summary toast
- [x] T017 [US2] Implement expected cash calculation in CashDrawerService in `src/services/cashDrawerService.ts` — `getExpectedCash(sessionId)` must query actual cash transactions from the shift: sum cash payments from completed transactions, subtract cash refunds, subtract drops, add paid-ins, add opening amount; cache result in store for display
- [x] T018 [US2] Implement variance threshold logic in cashDrawer store in `src/stores/cashDrawer.ts` — add `varianceThreshold` to state (default PHP 100, configurable), add `isVarianceOverThreshold` getter, add `requiresVarianceReason` getter; `closeDrawer` action must validate reason is provided when variance exceeds threshold before calling service
- [x] T019 [US2] Integrate closing count into shift end flow — in the shift close logic, show ClosingCount component as blocking modal before shift can be finalized; drawer session must be closed before shift record is closed; show final reconciliation summary with option to print

**Checkpoint**: Closing Count & Reconciliation fully functional — expected vs actual comparison, variance display, mandatory reason for large variances, and shift cannot close until drawer is reconciled.

---

## Phase 5: User Story 3 — Cash Drop (Float) (Priority: P2)

**Goal**: Supervisor removes excess cash from drawer, recording the drop with amount, reason, and supervisor authorization; expected balance adjusts.

**Independent Test**: During an open shift, perform a cash drop of ₱5,000 with supervisor PIN, verify expected cash decreases by ₱5,000, verify drop appears in shift operations list.

### Implementation for User Story 3

- [x] T020 [US3] Create CashDrop component in `src/components/cash-drawer/CashDrop.vue` — PrimeVue Dialog triggered from drawer status area, contains: PrimeVue InputNumber for drop amount (required, > 0), PrimeVue InputText for reason (required), PrimeVue Password for supervisor PIN (required), current expected balance display, new expected balance preview (expected - drop amount), "Confirm Drop" button calls useCashDrawer.doCashDrop(amount, reason, pin), validates supervisor PIN before recording, shows success toast with new expected balance, refreshes DrawerStatus
- [x] T021 [US3] Add supervisor PIN validation for cash operations — in useCashDrawer composable `src/composables/useCashDrawer.ts`, implement `validateSupervisorPin(pin)` method that checks against supervisor credentials (delegate to existing auth/user composable), reject operation with error toast if PIN invalid; apply to cash drop authorization flow
- [x] T022 [US3] Update DrawerStatus component to show drop history — in `src/components/cash-drawer/DrawerStatus.vue`, add "Cash Drops" section listing all drops for current session with timestamp, amount, supervisor name, and reason; add "Cash Drop" action button visible when session is open; show running total of drops

**Checkpoint**: Cash Drop fully functional — supervisor-authorized drops recorded, expected balance adjusts, drop history visible in drawer status.

---

## Phase 6: User Story 4 — Cash Paid In (Priority: P2)

**Goal**: Supervisor adds cash to the drawer (for change), recording the paid-in with amount, reason, and supervisor authorization; expected balance adjusts.

**Independent Test**: During an open shift, perform a cash paid-in of ₱2,000 with supervisor PIN, verify expected cash increases by ₱2,000, verify paid-in appears in operations list.

### Implementation for User Story 4

- [x] T023 [US4] Create CashPaidIn component in `src/components/cash-drawer/CashPaidIn.vue` — PrimeVue Dialog triggered from drawer status area, contains: PrimeVue InputNumber for paid-in amount (required, > 0), PrimeVue InputText for reason (required, e.g., "Change replenishment"), PrimeVue Password for supervisor PIN (required), current expected balance display, new expected balance preview (expected + paid-in amount), "Confirm Paid-In" button calls useCashDrawer.doCashPaidIn(amount, reason, pin), validates supervisor PIN, shows success toast, refreshes DrawerStatus
- [x] T024 [US4] Update DrawerStatus component to show paid-in history — in `src/components/cash-drawer/DrawerStatus.vue`, add "Cash Paid-In" section listing all paid-ins for current session with timestamp, amount, supervisor name, and reason; add "Cash Paid-In" action button visible when session is open; show running total of paid-ins
- [x] T025 [US4] Update closing reconciliation to account for drops and paid-ins — in `src/components/cash-drawer/ClosingCount.vue` and VarianceDisplay, show breakdown: Opening Amount + Cash Sales - Cash Refunds - Total Drops + Total Paid-Ins = Expected Cash; ensure each line item is visible in the reconciliation summary

**Checkpoint**: Cash Paid-In fully functional — supervisor-authorized paid-ins recorded, expected balance adjusts, reconciliation shows complete breakdown.

---

## Phase 7: User Story 5 — Drawer Hardware Integration (Priority: P3)

**Goal**: Cash drawer opens automatically on cash sale completion and on "no sale" with supervisor authorization; graceful degradation when hardware not connected.

**Independent Test**: Complete a cash sale and verify drawer opens automatically (Electron mode); use "no sale" function with supervisor PIN; verify fallback notification when no hardware.

### Implementation for User Story 5

- [x] T026 [P] [US5] Create drawer hardware service in `src/services/drawerHardwareService.ts` — implement `openDrawer()` that sends ESC/POS command (0x1B, 0x70, 0x00, 0x19, 0xFA) via Electron IPC `window.electronAPI.openDrawer()` if available, returns `{success, error?}`; implement `isHardwareAvailable()` check; implement `onDrawerStateChange(callback)` for monitoring; graceful fallback returning `{success: false, error: 'No hardware'}` in browser mode
- [x] T027 [US5] Integrate automatic drawer open on cash sale — in the payment completion flow (existing sales checkout composable/store), after a cash payment is finalized, call `drawerHardwareService.openDrawer()`; if hardware unavailable, show PrimeVue Toast info message "Please open drawer manually"; log the drawer open attempt in DrawerOperationRepository as audit trail
- [x] T028 [US5] Create No Sale function in DrawerStatus component — in `src/components/cash-drawer/DrawerStatus.vue`, add "No Sale / Open Drawer" button, on click show supervisor PIN dialog, validate PIN, call `drawerHardwareService.openDrawer()`, record no_sale operation via useCashDrawer.doNoSale(pin) with timestamp and supervisor ID in audit log, show toast confirmation
- [x] T029 [US5] Handle hardware failure gracefully — in `src/services/drawerHardwareService.ts`, add retry logic (1 retry after 500ms), timeout handling (2 second max), and fallback notification; ensure all POS operations continue uninterrupted regardless of drawer hardware status; never block a sale due to drawer failure

**Checkpoint**: Drawer Hardware Integration functional — auto-open on cash sale, no-sale function, graceful degradation when hardware unavailable.

---

## Phase 8: User Story 6 — Cash Variance Reporting (Priority: P3)

**Goal**: Supervisor views variance reports showing all over/short amounts by cashier and shift, pattern analysis, threshold alerts, and drill-down to denomination details.

**Independent Test**: Generate variance report for a period, verify all variances listed, check cashier totals, confirm threshold alerts trigger, drill into a shift to see denomination breakdown.

### Implementation for User Story 6

- [x] T030 [P] [US6] Create VarianceService in `src/services/varianceService.ts` with methods: `getVarianceReport(dateRange, branchId?)` returning all closed sessions with variances, `getCashierVarianceSummary(dateRange)` returning total over/short per cashier, `getFlaggedShifts(dateRange, threshold)` returning shifts where |variance| > threshold, `getShiftDetail(sessionId)` returning full session with operations and denomination counts — all querying SQLite via repositories
- [x] T031 [US6] Create VarianceReport component in `src/components/cash-drawer/VarianceReport.vue` — full page/view with: PrimeVue DatePicker for date range selection, summary cards (total over, total short, net variance, flagged shifts count), PrimeVue DataTable listing all shifts with columns: date, cashier, opening, expected, actual, variance (color-coded), reason; sortable and filterable by cashier; uses VarianceService
- [x] T032 [US6] Add cashier variance summary section to VarianceReport — in `src/components/cash-drawer/VarianceReport.vue`, add a "By Cashier" tab/section showing PrimeVue DataTable with columns: cashier name, shift count, total over, total short, net variance, average variance per shift; sorted by worst variance first; uses VarianceService.getCashierVarianceSummary()
- [x] T033 [US6] Add threshold alerts section to VarianceReport — in `src/components/cash-drawer/VarianceReport.vue`, add "Alerts" section showing shifts where |variance| exceeds threshold, flagged with PrimeVue Tag severity="danger", include review status; uses VarianceService.getFlaggedShifts()
- [x] T034 [US6] Add shift drill-down to VarianceReport — in `src/components/cash-drawer/VarianceReport.vue`, clicking a shift row opens PrimeVue Dialog/Drawer showing full details: opening denomination breakdown, closing denomination breakdown, all operations (drops, paid-ins, no-sales) with timestamps, expected cash calculation breakdown, variance with reason; uses VarianceService.getShiftDetail()
- [x] T035 [US6] Add route for variance report view — create `src/views/CashVarianceView.vue` that renders VarianceReport component, add route `/cash-variance` to `src/router/index.ts` with supervisor role guard, add navigation menu entry

**Checkpoint**: Cash Variance Reporting fully functional — date range reports, cashier summaries, threshold alerts, and shift drill-down all working.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, offline sync, and improvements across all user stories

- [x] T036 [P] Add offline sync support for all drawer operations — ensure `synced_at` field is populated when data syncs to backend, add drawer session and operations to the existing sync queue in `src/composables/useSync.ts` or equivalent sync mechanism
- [x] T037 [P] Handle edge case: shift start without opening count — in shift start flow, if cashier tries to process a transaction without opening count, show PrimeVue ConfirmDialog blocking the action with message "Opening cash count is required before processing sales" and redirect to OpeningCount
- [x] T038 [P] Handle edge case: supervisor override for unverified close — add "Close Without Count" option requiring supervisor PIN, record as unverified close in DrawerOperation with type "close" and reason "Supervisor override - unverified", log with audit trail
- [x] T039 [P] Handle edge case: negative expected cash — when expected cash calculation results in negative number, show PrimeVue Message severity="warn" in DrawerStatus indicating "Expected cash is negative — this may indicate a recording error", allow close but flag for review
- [x] T040 Add navigation menu entry for cash drawer status — add DrawerStatus indicator to POS toolbar/header showing current drawer state (open/closed/amount), quick access to drop/paid-in actions from main POS view
- [x] T041 Run quickstart.md verification — manually test: opening count flow, expected cash after sales, cash drop, closing reconciliation with variance, and verify all denomination calculations are correct

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 - Opening Count)**: Depends on Phase 2
- **Phase 4 (US2 - Closing Count)**: Depends on Phase 2; logically benefits from US1 but independently testable
- **Phase 5 (US3 - Cash Drop)**: Depends on Phase 2; uses open drawer session from US1
- **Phase 6 (US4 - Cash Paid-In)**: Depends on Phase 2; uses open drawer session from US1
- **Phase 7 (US5 - Hardware)**: Depends on Phase 2; integrates with payment flow from 002-sales-checkout
- **Phase 8 (US6 - Variance Reports)**: Depends on Phase 2; best tested with data from US1 + US2
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Opening Count)**: Independent — creates drawer session that others use
- **US2 (Closing Count)**: Logically follows US1 (needs open session) but independently testable with seed data
- **US3 (Cash Drop)**: Logically follows US1 (needs open session) but independently testable
- **US4 (Cash Paid-In)**: Logically follows US1 (needs open session) but independently testable
- **US5 (Hardware)**: Independent — integrates with payment flow, not other US
- **US6 (Variance Reports)**: Independent — reads closed session data, testable with seed data

### Within Each User Story

- Service/composable logic before UI components
- Reusable components (DenominationEntry) before page-level components
- Core flow before edge case handling
- Store integration before UI wiring

### Parallel Opportunities

- **Phase 1**: T001 types can be done first, then T002 + T003 sequentially
- **Phase 2**: T004, T005 (both repositories) can run in parallel; T008, T009 (both composables) can run in parallel after store
- **Phase 3**: T010, T011 (DenominationEntry + DrawerStatus) can run in parallel
- **Phase 5 + Phase 6**: US3 (Cash Drop) and US4 (Cash Paid-In) can run fully in parallel — different components/features
- **Phase 7**: T026 (hardware service) can start in parallel with any story after Phase 2
- **Phase 8**: T030 (VarianceService) can start in parallel with T031 (VarianceReport shell)
- **Phase 9**: T036, T037, T038, T039 can all run in parallel — different concerns

---

## Parallel Example: User Story 1

```bash
# Launch both reusable components in parallel (different files, no deps):
Task: "Create DenominationEntry component in src/components/cash-drawer/DenominationEntry.vue"
Task: "Create DrawerStatus component in src/components/cash-drawer/DrawerStatus.vue"

# Then compose the opening count flow (depends on DenominationEntry):
Task: "Create OpeningCount component in src/components/cash-drawer/OpeningCount.vue"
```

## Parallel Example: User Story 3 + User Story 4

```bash
# These two stories can run entirely in parallel (different components):
# Developer A:
Task: "Create CashDrop component in src/components/cash-drawer/CashDrop.vue"

# Developer B:
Task: "Create CashPaidIn component in src/components/cash-drawer/CashPaidIn.vue"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T009)
3. Complete Phase 3: User Story 1 — Opening Count (T010–T014)
4. **STOP and VALIDATE**: Enter opening count, verify total, confirm drawer opens
5. Complete Phase 4: User Story 2 — Closing Count (T015–T019)
6. **STOP and VALIDATE**: Process sales, close drawer, verify expected vs actual, check variance
7. Deploy/demo if ready — basic cash accountability is working

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Opening Count) → Test independently → **Deploy (MVP start!)**
3. Add US2 (Closing Count) → Test independently → **Deploy (MVP complete!)**
4. Add US3 (Cash Drop) + US4 (Cash Paid-In) → Test independently → Deploy
5. Add US5 (Hardware) → Test independently → Deploy
6. Add US6 (Variance Reports) → Test independently → Deploy
7. Polish phase → Final validation

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: US1 (Opening Count) → US2 (Closing Count)
- **Developer B**: US3 (Cash Drop) + US4 (Cash Paid-In) — can start after US1 provides session creation
- **Developer C**: US5 (Hardware) + US6 (Variance Reports) — independent

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- All operations use local SQLite for offline-first per constitution
- Philippine currency denominations: ₱1000, ₱500, ₱200, ₱100, ₱50, ₱20 bills; ₱10, ₱5, ₱1, 25¢ coins
- Variance threshold defaults to ₱100 (configurable per merchant)
- Cash drops and paid-ins require supervisor PIN validation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
