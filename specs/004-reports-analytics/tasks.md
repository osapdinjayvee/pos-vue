# Tasks: Reports & Analytics

**Input**: Design documents from `/specs/004-reports-analytics/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api.yaml, research.md, quickstart.md
**Depends On**: 002-sales-checkout (transactions), 003-user-management (shifts, users)

**Tests**: Tests included where specified in quickstart.md verification steps.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, and project structure for reports feature

- [x] T001 Create database migration for reports tables in src/db/migrations/005_reports.ts
- [x] T002 [P] Create TypeScript types for X-Reading in src/types/xReading.ts
- [x] T003 [P] Create TypeScript types for Z-Reading in src/types/zReading.ts
- [x] T004 [P] Create TypeScript types for sales reports in src/types/report.ts
- [x] T005 [P] Create report calculation utilities in src/utils/reportCalculations.ts
- [x] T006 [P] Create report formatting utilities in src/utils/reportFormatter.ts
- [x] T007 Initialize Z/X counters for default terminal in migration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repositories and services that ALL report stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create Z-counter repository in src/repositories/zCounterRepository.ts
- [x] T009 [P] Create X-counter repository in src/repositories/xCounterRepository.ts
- [x] T010 Create X-Reading repository in src/repositories/xReadingRepository.ts
- [x] T011 [P] Create Z-Reading repository in src/repositories/zReadingRepository.ts
- [x] T012 [P] Create sales aggregate repository in src/repositories/salesAggregateRepository.ts
- [x] T013 Create report filters composable in src/composables/useReportFilters.ts (implemented as ReportFilters.vue component)
- [x] T014 Create report export service in src/services/reportExportService.ts (integrated into reportFormatter.ts)
- [x] T015 Add reports route and ReportsView.vue page in src/views/ReportsView.vue
- [x] T016 Update router with reports sub-routes in src/router/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - X-Reading Report (Priority: P1) 🎯 MVP

**Goal**: Supervisors can generate X-Reading reports to check current shift totals without closing the register

**Independent Test**: Process several sales, generate X-Reading, verify totals match shift transactions and X-counter increments

### Implementation for User Story 1

- [x] T017 [P] [US1] Create X-Reading service with calculation logic in src/services/reportService.ts
- [x] T018 [US1] Create useXReading composable in src/composables/useReports.ts
- [x] T019 [US1] Create XReadingReport.vue display component in src/components/reports/XReadingDisplay.vue
- [x] T020 [US1] Create XReadingGenerator with generate button in src/views/XReadingView.vue
- [x] T021 [US1] Implement X-counter atomic increment in xCounterRepository
- [x] T022 [US1] Add X-Reading generation in reportService
- [x] T023 [US1] Create X-Reading history list in src/views/XReadingView.vue (DataTable)
- [x] T024 [US1] Add print layout for X-Reading (print CSS in XReadingDisplay.vue)
- [x] T025 [US1] Implement offline X-Reading generation with sync status indicator

**Checkpoint**: User Story 1 complete - X-Reading reports can be generated and viewed

---

## Phase 4: User Story 2 - Z-Reading Report (Priority: P1)

**Goal**: Supervisors can generate end-of-day Z-Reading reports with BIR-compliant sequential Z-counter

**Independent Test**: Process a full day of sales, generate Z-Reading, verify Z-counter increments and X-counter resets

### Implementation for User Story 2

- [x] T026 [P] [US2] Create Z-Reading service with calculation logic in src/services/reportService.ts
- [x] T027 [US2] Create useZReading composable in src/composables/useReports.ts
- [x] T028 [US2] Create ZReadingReport.vue display component in src/components/reports/ZReadingDisplay.vue
- [x] T029 [US2] Create ZReadingGenerator with supervisor confirmation in src/views/ZReadingView.vue
- [x] T030 [US2] Implement Z-counter atomic increment (NEVER resets) in zCounterRepository
- [x] T031 [US2] Implement duplicate Z-Reading warning with supervisor override
- [x] T032 [US2] Create Z-Reading history list in src/views/ZReadingView.vue (DataTable)
- [x] T033 [US2] Add print layout for Z-Reading (print CSS in ZReadingDisplay.vue)
- [x] T034 [US2] Reset X-counter to 0 after Z-Reading generation
- [x] T035 [US2] Create sales aggregate on Z-Reading for historical performance

**Checkpoint**: User Story 2 complete - Z-Reading with BIR-compliant counters works

---

## Phase 5: User Story 3 - Daily Sales Report (Priority: P1)

**Goal**: Store managers can view daily sales reports with totals, breakdowns by hour/payment method/category

**Independent Test**: Select a date, verify report shows all transactions for that day with correct totals

### Implementation for User Story 3

- [x] T036 [P] [US3] Create sales report service in src/services/reportService.ts
- [x] T037 [US3] Create useSalesReport composable (integrated in src/views/DailySalesView.vue)
- [x] T038 [US3] Create DailySalesReport.vue main component in src/views/DailySalesView.vue
- [x] T039 [US3] Create ReportFilters.vue (date picker, branch filter) in src/components/reports/ReportFilters.vue
- [x] T040 [US3] Implement hourly breakdown calculation and table
- [x] T041 [US3] Implement payment method breakdown
- [x] T042 [US3] Implement category breakdown
- [ ] T043 [US3] Add drill-down from summary to transaction list
- [x] T044 [US3] Add void/refund tracking in daily report

**Checkpoint**: User Story 3 complete - daily sales reports with breakdowns available

---

## Phase 6: User Story 4 - VAT Summary Report (Priority: P1)

**Goal**: Accountants can generate VAT summary reports for BIR tax filing with correct VATable/exempt/zero-rated breakdown

**Independent Test**: Generate VAT summary, verify totals match sum of all receipt VAT breakdowns

### Implementation for User Story 4

- [ ] T045 [P] [US4] Create VAT report service in src/services/vatReportService.ts
- [ ] T046 [US4] Create useVATReport composable in src/composables/useVATReport.ts
- [ ] T047 [US4] Create VATSummaryReport.vue component in src/components/reports/VATSummaryReport.vue
- [ ] T048 [US4] Implement VATable/VAT-Exempt/Zero-Rated calculation from transactions
- [ ] T049 [US4] Handle SC/PWD discount VAT treatment correctly
- [ ] T050 [US4] Handle refund VAT deduction
- [ ] T051 [US4] Create CSV export for BIR filing format
- [ ] T052 [US4] Add transaction detail view for audit trail

**Checkpoint**: User Story 4 complete - VAT summary reports for BIR filing ready

---

## Phase 7: User Story 5 - Product Performance Report (Priority: P2)

**Goal**: Store managers can identify best sellers and slow movers by viewing product performance reports

**Independent Test**: Generate report, verify products ranked by sales volume with correct revenue/profit

### Implementation for User Story 5

- [ ] T053 [P] [US5] Create product report service in src/services/productReportService.ts
- [ ] T054 [US5] Create useProductReport composable in src/composables/useProductReport.ts
- [ ] T055 [US5] Create ProductReport.vue component in src/components/reports/ProductReport.vue
- [ ] T056 [US5] Implement ranking by quantity sold, revenue, profit margin
- [ ] T057 [US5] Add category filter for product reports
- [ ] T058 [US5] Add product variant breakdown option
- [ ] T059 [US5] Create top/bottom performers visualization (chart)

**Checkpoint**: User Story 5 complete - product performance analysis available

---

## Phase 8: User Story 6 - Cashier Performance Report (Priority: P2)

**Goal**: Supervisors can evaluate staff efficiency with cashier performance metrics

**Independent Test**: Generate report for a cashier, verify transaction counts and totals are correct

### Implementation for User Story 6

- [ ] T060 [P] [US6] Create cashier report service in src/services/cashierReportService.ts
- [ ] T061 [US6] Create useCashierReport composable in src/composables/useCashierReport.ts
- [ ] T062 [US6] Create CashierReport.vue component in src/components/reports/CashierReport.vue
- [ ] T063 [US6] Implement transaction count, total sales, average transaction metrics
- [ ] T064 [US6] Add void/refund/discount usage tracking
- [ ] T065 [US6] Create cashier comparison view (side by side)
- [ ] T066 [US6] Add cash variance display from shifts

**Checkpoint**: User Story 6 complete - cashier performance analysis available

---

## Phase 9: User Story 7 - Weekly/Monthly Sales Summary (Priority: P2)

**Goal**: Business owners can track trends over time with aggregated weekly/monthly summaries

**Independent Test**: Generate monthly summary, verify it aggregates daily data correctly with comparisons

### Implementation for User Story 7

- [x] T067 [P] [US7] Create summary report service (using salesAggregateRepository)
- [x] T068 [US7] Create useSummaryReport composable (integrated in SalesSummaryView.vue)
- [x] T069 [US7] Create SalesSummaryReport.vue in src/views/SalesSummaryView.vue
- [x] T070 [US7] Implement weekly aggregation from sales_aggregates
- [x] T071 [US7] Implement monthly aggregation with period comparison
- [ ] T072 [US7] Add year-to-date cumulative totals
- [ ] T073 [US7] Create trend visualization chart (line/bar)
- [ ] T074 [US7] Add previous period comparison (vs last week/month)

**Checkpoint**: User Story 7 complete - trend analysis and summaries available

---

## Phase 10: Report Export & Cross-Cutting Concerns

**Purpose**: Export functionality, offline support, and improvements affecting multiple report types

- [x] T075 [P] Implement PDF export via browser print API (window.print() in views)
- [x] T076 [P] Implement CSV export with proper formatting in src/utils/reportFormatter.ts
- [x] T077 Create ReportExport.vue component with format selection in src/components/reports/ReportExport.vue
- [x] T078 Add loading states and error handling across all report components
- [x] T079 Add sync status indicator for reports generated with pending transactions
- [x] T080 Ensure all reports work 100% offline from local SQLite
- [x] T081 Add report generation timestamp and metadata
- [x] T082 Create reports store for managing report state in src/stores/report.ts
- [x] T083 Add reports permission checks (require reports.xreading, reports.zreading, reports.sales)
- [ ] T084 Performance optimization: ensure X-Reading < 5 seconds (SC-001)
- [ ] T085 Performance optimization: ensure Z-Reading < 10 seconds (SC-002)
- [ ] T086 Performance optimization: ensure 1-year reports < 30 seconds (SC-005)
- [ ] T087 Run quickstart.md verification scenarios
- [ ] T088 Code cleanup and component refactoring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - P1 stories (US1-US4) should complete before P2 stories (US5-US7)
  - US2 depends on US1 (Z-Reading resets X-counter)
  - US3-US7 can run in parallel after US1/US2 complete
- **Export & Polish (Phase 10)**: Can begin after at least US1-US4 complete

### User Story Dependencies

- **US1 (X-Reading)**: Core functionality - no dependencies on other stories
- **US2 (Z-Reading)**: Depends on US1 for X-counter reset logic
- **US3 (Daily Sales)**: Independent - uses transaction data directly
- **US4 (VAT Summary)**: Independent - uses transaction data directly
- **US5 (Product Performance)**: Independent - uses transaction_items data
- **US6 (Cashier Performance)**: Independent - uses transaction and shift data
- **US7 (Weekly/Monthly)**: Depends on US2 for sales_aggregates (generated on Z-Reading)

### Within Each User Story

- Components marked [P] can run in parallel
- Services before composables
- Composables before components
- Core implementation before UI polish
- Commit after each task or logical group

### Parallel Opportunities

- Setup: T002, T003, T004, T005, T006 can run in parallel
- Foundational: T009, T010, T011, T012 can run in parallel
- US1: T017 can start immediately (core service)
- US3-US6: All service tasks (T036, T045, T053, T060) can run in parallel
- US7: Depends on sales_aggregates from US2

---

## Parallel Example: User Story 1

```bash
# Launch service first:
Task: "Create X-Reading service with calculation logic in src/services/xReadingService.ts"

# Then launch components in parallel:
Task: "Create XReadingReport.vue display component"
Task: "Create XReadingHistory.vue list component"
Task: "Add print layout for X-Reading"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: X-Reading (US1)
4. Complete Phase 4: Z-Reading (US2)
5. **STOP and VALIDATE**: Test X/Z-Reading independently - BIR compliance verified
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (X-Reading) → Test → Shift monitoring works (MVP!)
3. Add US2 (Z-Reading) → Test → BIR daily closing works
4. Add US3 (Daily Sales) → Test → Daily visibility (Production Ready!)
5. Add US4 (VAT Summary) → Test → BIR filing ready
6. Add US5-US7 (Performance) → Test → Analytics complete
7. Add Export → Test → Reports exportable

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (X-Reading) → US2 (Z-Reading)
3. After US2 (Z-Reading creates aggregates):
   - Developer A: US3 (Daily Sales) + US7 (Weekly/Monthly)
   - Developer B: US4 (VAT) + US5 (Products)
   - Developer C: US6 (Cashier) + Export

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Z-counter is CRITICAL - must NEVER reset or skip (BIR requirement)
- X-counter resets on each Z-Reading
- All reports must work 100% offline from SQLite
- Export formats: PDF (print via browser), CSV (spreadsheet)
- Performance targets: X-Reading < 5s, Z-Reading < 10s, year report < 30s
- Commit after each task or logical group
- Verify each report matches expected totals before moving to next task
