# Tasks: Advanced Analytics Dashboards

**Input**: Design documents from `/specs/008-advanced-analytics/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Feature Branch**: `008-advanced-analytics`
**Depends On**: 004-reports-analytics (base reports/aggregates), 001-product-inventory (products)

**Organization**: Tasks grouped by user story. Adapted for Vue 3 + PrimeVue 4 + Pinia + sql.js frontend stack.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Existing Infrastructure (DO NOT recreate)

- **sales_aggregates table**: Already exists in migration 005_reports.ts — pre-calculated daily sales (gross_sales, net_sales, vat, transaction_count, void/refund counts, payment breakdown, average_ticket)
- **salesAggregateRepository**: `src/repositories/salesAggregateRepository.ts` — findAll, upsert, getForPeriod, getSummary, getToday
- **Report types**: `src/types/report.ts` — SalesAggregate, DailySalesReport, HourlyBreakdown, PaymentBreakdown, CategoryBreakdown, ProductPerformanceReport, CashierPerformanceReport, SalesSummaryReport, PeriodComparison
- **Report store**: `src/stores/report.ts` — xReadings, zReadings, salesAggregates, isLoading
- **Report composable**: `src/composables/useReports.ts` — wraps report store with load/export/print
- **Dashboard components**: `src/components/dashboard/` — StatsCard, RevenueChart, SalesChart, PaymentChart, TopProducts, RecentOrders
- **Report components**: `src/components/reports/` — ReportFilters, XReadingDisplay, ZReadingDisplay
- **DashboardView**: `src/views/DashboardView.vue` — currently uses mockData for stats
- **Existing report views**: ReportsView, DailySalesView, SalesSummaryView, XReadingView, ZReadingView
- **Routes**: `/reports/*` routes already exist; `/dashboard` exists
- **Menu**: Reports section with sub-items already in AppMenu.vue
- **PrimeVue Chart**: `primevue/chart` — Chart.js wrapper for line, bar, pie, doughnut charts
- **Next migration**: 011 (010_crm is latest)

## Patterns to Follow

- **Repository**: extends BaseRepository with tableName/idPrefix, uses db.query()/db.execute()
- **Store**: Pinia with ref() state, computed getters, async actions (see `src/stores/report.ts`)
- **Composable**: wraps store, exposes computed refs + methods (see `src/composables/useReports.ts`)
- **View**: Toast, DatePicker/SelectButton for filters, DataTable for tables (see `src/views/DailySalesView.vue`)
- **Chart**: PrimeVue Chart component with Chart.js data/options (see `src/components/dashboard/RevenueChart.vue`)
- **Stats card**: `src/components/dashboard/StatsCard.vue` pattern

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New database tables, types, and analytics service layer

- [x] T001 Create analytics types in `src/types/analytics.ts` — SalesHourlyAggregate, ProductDailyAggregate, SavedReport, SavedReportInput, HeatmapCell, StaffingRecommendation, ABCCategory, InventoryTurnoverItem, ReorderSuggestion, AnalyticsPeriod type ('today' | 'week' | 'month' | 'quarter' | 'year' | 'custom')
- [x] T002 Create database migration `src/db/migrations/011_analytics.ts` — Create tables: sales_hourly (id, date, hour, terminal_id, branch_id, sales, transaction_count, UNIQUE(terminal_id, date, hour)), product_daily (id, date, product_id, variant_id, category_id, branch_id, quantity_sold, revenue, cost, profit, UNIQUE(product_id, date, branch_id)), saved_reports (id, name, type, config TEXT as JSON, created_at, updated_at). Add indexes for date, branch, product lookups
- [x] T003 Register migration 011 in `src/db/database.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositories, services, and aggregation logic that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create `src/repositories/salesHourlyRepository.ts` — extends BaseRepository, methods: upsert(data), getForDate(date, branchId?), getForPeriod(dateFrom, dateTo, branchId?), getHeatmapData(dateFrom, dateTo, branchId?) returning day-of-week × hour grid
- [x] T005 [P] Create `src/repositories/productDailyRepository.ts` — extends BaseRepository, methods: upsert(data), getTopProducts(dateFrom, dateTo, limit, branchId?, sortBy?), getCategorySales(dateFrom, dateTo, branchId?), getSlowMovers(dateFrom, dateTo, threshold), getForProduct(productId, dateFrom, dateTo)
- [x] T006 [P] Create `src/repositories/savedReportRepository.ts` — extends BaseRepository, methods: findAll(), findById(id), create(input), update(id, input), delete(id)
- [x] T007 Create `src/services/analyticsAggregationService.ts` — aggregateHourlySales(date): queries orders grouped by hour, upserts into sales_hourly. aggregateProductDaily(date): queries transaction_items joined with products, upserts into product_daily. aggregateAll(date): calls both. Should be idempotent (upsert)
- [x] T008 Create `src/services/analyticsService.ts` — getTodayMetrics(branchId?): returns today's gross, net, count, avg ticket from sales_aggregates + live orders. getSalesTrend(period, branchId?): returns chart data for period. getPeriodComparison(period, branchId?): compares current vs previous period. Uses salesAggregateRepository and salesHourlyRepository
- [x] T009 Create `src/stores/analytics.ts` — Pinia store with state: currentPeriod, selectedBranch, todayMetrics, salesTrend, periodComparison, isLoading, error. Actions: loadTodayMetrics, loadSalesTrend, loadPeriodComparison, runAggregation(date). Expose as useAnalyticsStore
- [x] T010 Create `src/composables/useAnalytics.ts` — wraps analytics store, exposes computed refs + methods: todayMetrics, salesTrend, comparison, loadDashboard(period, branch), runAggregation, formatters
- [x] T011 Verify Phase 2 with `vue-tsc --noEmit` and `vite build`

**Checkpoint**: Foundation ready — hourly/product aggregation, analytics service, store, composable all working

---

## Phase 3: User Story 1 — Merchant Sales Dashboard (Priority: P1)

**Goal**: Upgrade the main dashboard from mock data to live analytics with today's metrics, hourly sales trend, and period-over-period comparison

**Independent Test**: View dashboard, verify today's sales/count/avg ticket from real data, hourly trend chart renders, period comparison shows change vs last week

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `src/components/analytics/SalesTrendChart.vue` — PrimeVue Chart (line) showing hourly or daily sales trend. Props: chartData, period, loading. Responsive, dark-mode-aware colors. Format y-axis as PHP currency
- [x] T013 [P] [US1] Create `src/components/analytics/PeriodComparisonCard.vue` — Shows current vs previous period side-by-side: gross sales, transactions, avg ticket. Displays change % with green/red arrows. Props: current, previous, periodLabel
- [x] T014 [P] [US1] Create `src/components/analytics/PeriodSelector.vue` — SelectButton with options: Today, This Week, This Month, This Quarter, Custom. DatePicker for custom range. Emits period change event with { type, dateFrom, dateTo }
- [x] T015 [US1] Update `src/views/DashboardView.vue` — Replace mock statsData with live data from useAnalytics composable. Add PeriodSelector. Wire StatsCard to todayMetrics. Add SalesTrendChart and PeriodComparisonCard below existing charts. Trigger aggregation on mount if today's data missing
- [x] T016 [US1] Update `src/components/dashboard/StatsCard.vue` or create adapter — ensure it can display live analytics data (today's gross sales, transaction count, average ticket, net sales) instead of hardcoded mock values
- [x] T017 [US1] Handle empty/loading states — Show skeleton loaders while analytics load. Show "No data for selected period" when no aggregates exist. Show "Data as of [time]" if aggregates are stale (>1 hour old)

**Checkpoint**: Dashboard shows live metrics, trend chart, and period comparison

---

## Phase 4: User Story 2 — Product Analytics (Priority: P1)

**Goal**: Product performance rankings, category sales chart, slow-movers, and product comparison

**Independent Test**: Navigate to product analytics, select date range, verify rankings match sales data, category chart renders, slow movers listed, two products compared side-by-side

### Implementation for User Story 2

- [x] T018 [P] [US2] Create `src/services/productAnalyticsService.ts` — getTopProducts(dateFrom, dateTo, limit, branchId?, sortBy): queries product_daily, returns ranked list. getCategorySales(dateFrom, dateTo, branchId?): aggregates by category for pie chart. getSlowMovers(dateFrom, dateTo, velocityThreshold): products below threshold. compareProducts(productIds[], dateFrom, dateTo): side-by-side metrics
- [x] T019 [P] [US2] Create `src/components/analytics/TopProductsTable.vue` — DataTable with rank, product name, category, units sold, revenue, profit margin columns. Sortable. Props: products[], loading. Paginator with 10/20/50 rows
- [x] T020 [P] [US2] Create `src/components/analytics/CategorySalesChart.vue` — PrimeVue Chart (doughnut) showing sales by category. Props: categoryData[], loading. Legend at bottom. Formatted tooltips with PHP currency
- [x] T021 [P] [US2] Create `src/components/analytics/SlowMoversTable.vue` — DataTable showing products with low sales velocity. Columns: product, category, units sold, revenue, last sold date, days since last sale. Warning Tag for very slow items
- [x] T022 [P] [US2] Create `src/components/analytics/ProductComparison.vue` — Two-product comparison. AutoComplete to select products. Side-by-side cards: units, revenue, profit, avg price, trend mini-chart. Props: compareData
- [x] T023 [US2] Create `src/views/ProductAnalyticsView.vue` — Full page with ReportFilters (date range + branch). Sections: TopProductsTable, CategorySalesChart (side-by-side row), SlowMoversTable, ProductComparison. Uses productAnalyticsService
- [x] T024 [US2] Add route `/analytics/products` in `src/router/index.ts`. Add breadcrumb in AppTopbar. Add "Product Analytics" menu item under Analytics section in AppMenu

**Checkpoint**: Product analytics page fully functional

---

## Phase 5: User Story 3 — Time-Based Analysis (Priority: P2)

**Goal**: Heatmap of sales by day/hour, staffing recommendations, period overlay comparison, and day drill-down

**Independent Test**: View time analysis, verify 7×24 heatmap renders correctly, staffing suggestions appear, overlay two periods, click a day for drill-down

### Implementation for User Story 3

- [x] T025 [P] [US3] Create `src/services/timeAnalysisService.ts` — getHeatmapData(dateFrom, dateTo, branchId?): pivots sales_hourly into 7×24 grid with intensity values. getStaffingRecommendations(dateFrom, dateTo, branchId?): calculates suggested staff per hour based on transaction volume. getPeriodOverlay(period1, period2, branchId?): returns two series for overlay chart. getDayDrilldown(date, branchId?): hourly breakdown, top products, payment methods for a single day
- [x] T026 [P] [US3] Create `src/components/analytics/SalesHeatmap.vue` — Custom 7-row × 24-col grid (Mon-Sun × 0:00-23:00). Color intensity from light to dark based on sales volume. Tooltip shows exact sales and count on hover. Click a cell to emit drill-down event. Pure CSS grid (no chart library needed)
- [x] T027 [P] [US3] Create `src/components/analytics/StaffingRecommendations.vue` — DataTable with hour, avg transactions, suggested staff columns. Color-coded rows: green (low), yellow (medium), red (peak). Props: recommendations[], loading
- [x] T028 [US3] Create `src/components/analytics/PeriodOverlayChart.vue` — PrimeVue Chart (line) with two datasets overlaid. Props: period1Data, period2Data, period1Label, period2Label. Dashed line for comparison period
- [x] T029 [US3] Create `src/views/TimeAnalysisView.vue` — Page with week/month selector, branch filter. Sections: SalesHeatmap (full width), StaffingRecommendations + PeriodOverlayChart (two-column row). Day drill-down in a Dialog showing hourly detail table, top products sold, payment breakdown
- [x] T030 [US3] Add route `/analytics/time` in `src/router/index.ts`. Add breadcrumb in AppTopbar. Add "Time Analysis" menu item under Analytics section in AppMenu

**Checkpoint**: Time analysis page fully functional with heatmap, staffing, overlay, and drill-down

---

## Phase 6: User Story 4 — Cashier Performance Dashboard (Priority: P2)

**Goal**: Cashier metrics, rankings, void drill-down, and performance comparison

**Independent Test**: View cashier dashboard, verify transaction counts and sales per cashier, drill into void details, sort by sales for rankings

### Implementation for User Story 4

- [x] T031 [P] [US4] Create `src/services/cashierAnalyticsService.ts` — getCashierMetrics(dateFrom, dateTo, branchId?): queries orders grouped by cashier_id (user_id), returns transaction count, total sales, avg transaction, void count, void rate, items per transaction. getCashierVoidDetails(userId, dateFrom, dateTo): list of voided transactions with reason. getCashierRanking(dateFrom, dateTo, sortBy): sorted list
- [x] T032 [P] [US4] Create `src/components/analytics/CashierRankingTable.vue` — DataTable with rank, cashier name, transaction count, total sales, avg transaction, items/transaction, void rate columns. Sortable. Void rate with severity Tag (success < 2%, warn 2-5%, danger > 5%). Click row to view details
- [x] T033 [US4] Create `src/components/analytics/CashierVoidDrilldown.vue` — Dialog/Drawer showing void details for selected cashier. DataTable: date, OR#, items, amount, reason. Summary stats at top: total voids, total void amount, void rate
- [x] T034 [US4] Create `src/components/analytics/CashierComparisonCards.vue` — StatsOverview showing team averages vs selected cashier. Cards: avg sales (team vs individual), avg transactions, avg void rate. Green/red indicators for above/below average
- [x] T035 [US4] Create `src/views/CashierPerformanceView.vue` — Page with date range filter + branch filter. Sections: CashierRankingTable (full width), CashierComparisonCards (shown when cashier selected), CashierVoidDrilldown (Dialog). Uses cashierAnalyticsService
- [x] T036 [US4] Add route `/analytics/cashiers` in `src/router/index.ts`. Add breadcrumb in AppTopbar. Add "Cashier Performance" menu item under Analytics section in AppMenu

**Checkpoint**: Cashier performance dashboard fully functional

---

## Phase 7: User Story 5 — Inventory Analytics (Priority: P2)

**Goal**: Inventory value, turnover rate, days of supply, expiry analytics, reorder suggestions, and ABC classification

**Independent Test**: View inventory analytics, verify turnover rates, expiry warnings, reorder suggestions, and ABC classification

### Implementation for User Story 5

- [x] T037 [P] [US5] Create `src/services/inventoryAnalyticsService.ts` — getInventoryOverview(branchId?): total value (SUM qty × cost), avg turnover rate, avg days of supply. getExpiryAnalytics(branchId?, daysAhead?): products expiring soon from batches table, estimated waste value. getReorderSuggestions(branchId?): products below low_stock_threshold with suggested qty. getAbcAnalysis(dateFrom, dateTo, branchId?): classify products by revenue contribution (A=80%, B=15%, C=5%)
- [x] T038 [P] [US5] Create `src/components/analytics/InventoryOverviewCards.vue` — Three stat cards: Total Inventory Value (₱), Average Turnover Rate (×/year), Average Days of Supply. Props: overview data, loading
- [x] T039 [P] [US5] Create `src/components/analytics/ExpiryAnalyticsTable.vue` — DataTable: product, batch, expiry date, days until expiry, quantity, estimated waste value. Severity Tags for urgency (expired=danger, <7 days=warn, <30 days=info). Sortable by expiry date
- [x] T040 [P] [US5] Create `src/components/analytics/ReorderSuggestionsTable.vue` — DataTable: product, current stock, reorder point, suggested qty, supplier name. Action button to create stock-in movement. Props: suggestions[], loading
- [x] T041 [P] [US5] Create `src/components/analytics/ABCAnalysisChart.vue` — PrimeVue Chart (bar or pie) showing A/B/C distribution. DataTable below with product, category, revenue, cumulative %, ABC class. Tag with severity per class (A=success, B=info, C=warn)
- [x] T042 [US5] Create `src/views/InventoryAnalyticsView.vue` — Page with branch filter. Sections: InventoryOverviewCards, ExpiryAnalyticsTable, ReorderSuggestionsTable, ABCAnalysisChart. Uses inventoryAnalyticsService
- [x] T043 [US5] Add route `/analytics/inventory` in `src/router/index.ts`. Add breadcrumb in AppTopbar. Add "Inventory Analytics" menu item under Analytics section in AppMenu

**Checkpoint**: Inventory analytics page fully functional

---

## Phase 8: User Story 6 — Custom Reports Builder (Priority: P3)

**Goal**: Pivot-table report builder with dimension/measure selection, save/load configurations, and CSV/Excel export

**Independent Test**: Create custom report with dimensions and measures, save it, reload it, export to CSV

### Implementation for User Story 6

- [x] T044 [P] [US6] Create `src/services/customReportService.ts` — buildReport(config: SavedReportInput): dynamically constructs SQL from selected dimensions (date, category, product, branch, cashier) and measures (quantity, revenue, profit, transaction count), executes, returns tabular data. getAvailableDimensions(): returns list. getAvailableMeasures(): returns list. Validate config before execution
- [x] T045 [P] [US6] Create `src/services/reportExportService.ts` — exportToCsv(data, columns, filename): generates CSV string with proper escaping, triggers Blob download. exportToExcel (stretch): if needed, reuse CSV with .xls extension or add SheetJS later
- [x] T046 [US6] Create `src/components/analytics/ReportBuilder.vue` — Form with: MultiSelect for dimensions, MultiSelect for measures, DatePicker range, branch Select. "Generate Report" button. Props: config (for loading saved). Emits: generate(config), save(config)
- [x] T047 [US6] Create `src/components/analytics/ReportResultsTable.vue` — Dynamic DataTable that renders columns based on selected dimensions + measures. Sortable columns. Summary row with totals. Props: data[], columns[], loading
- [x] T048 [US6] Create `src/components/analytics/SavedReportsList.vue` — Sidebar or panel listing saved reports. Each item: name, type, last run date. Actions: Load, Delete. Uses savedReportRepository. Emits: load(config), delete(id)
- [x] T049 [US6] Create `src/views/CustomReportsView.vue` — Page layout: SavedReportsList (sidebar or top section), ReportBuilder (form), ReportResultsTable (main area). Export buttons (CSV). Save button stores to saved_reports. Uses customReportService and savedReportRepository
- [x] T050 [US6] Add route `/analytics/custom-reports` in `src/router/index.ts`. Add breadcrumb in AppTopbar. Add "Custom Reports" menu item under Analytics section in AppMenu

**Checkpoint**: Custom reports builder fully functional — build, save, load, and export

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Navigation, empty states, performance, and verification

- [x] T051 [P] Add Analytics section to `src/components/layout/AppMenu.vue` — group with icon `pi pi-chart-bar` containing: Product Analytics, Time Analysis, Cashier Performance, Inventory Analytics, Custom Reports. Use PERMISSIONS.REPORTS_SALES for all
- [x] T052 [P] Add "Data as of [timestamp]" indicator component `src/components/analytics/DataFreshnessBanner.vue` — Shows when last aggregation ran. Warning if stale (>1 hour). "Refresh" button to trigger re-aggregation. Reusable across all analytics pages
- [x] T053 [P] Add consistent empty states across all analytics components — "No data for selected period" with suggestion to adjust date range. Reuse pattern from existing report views
- [x] T054 Wire aggregation trigger — In transaction completion flow (or on dashboard load), call analyticsAggregationService.aggregateAll(today) if today's hourly/product data is stale or missing. Ensure idempotent
- [x] T055 Update `src/components/layout/AppTopbar.vue` — Add breadcrumbs for all analytics routes: /analytics/products, /analytics/time, /analytics/cashiers, /analytics/inventory, /analytics/custom-reports
- [x] T056 Full build verification — Run `npx vue-tsc --noEmit` and `npx vite build`. Fix any type errors
- [x] T057 Run quickstart.md verification — Dashboard shows live metrics, product analytics ranks correctly, heatmap renders, cashier metrics load, inventory analytics shows ABC, custom report generates and exports
- [x] T058 Code cleanup — Remove unused imports, ensure consistent patterns, verify PrimeVue 4 conventions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 types and migration — BLOCKS all user stories
- **US1 Sales Dashboard (Phase 3)**: Depends on Phase 2 analytics service
- **US2 Product Analytics (Phase 4)**: Depends on Phase 2 product_daily repository
- **US3 Time Analysis (Phase 5)**: Depends on Phase 2 sales_hourly repository
- **US4 Cashier Performance (Phase 6)**: Depends on Phase 2 (queries orders directly)
- **US5 Inventory Analytics (Phase 7)**: Depends on Phase 2 + existing inventory repos
- **US6 Custom Reports (Phase 8)**: Depends on Phase 2 saved_reports repo
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Sales Dashboard)**: Independent — uses existing sales_aggregates + new sales_hourly
- **US2 (Product Analytics)**: Independent — uses product_daily from Phase 2
- **US3 (Time Analysis)**: Independent — uses sales_hourly from Phase 2
- **US4 (Cashier Performance)**: Independent — queries orders/transactions directly
- **US5 (Inventory Analytics)**: Independent — uses existing inventory repos + product_daily
- **US6 (Custom Reports)**: Independent — saved_reports + dynamic SQL on aggregates

### Within Each User Story

- Services before components (services provide data)
- Components marked [P] can run in parallel
- View page after components (page composes them)
- Route/menu after view (depends on view existing)

### Parallel Opportunities

- All Phase 1 tasks are sequential (migration depends on types)
- Phase 2: T004, T005, T006 (all repos) can run in parallel
- Phase 3: T012, T013, T014 (all components) can run in parallel
- Phase 4: T018-T022 (service + components) can run in parallel
- Phase 5: T025-T028 (service + components) can run in parallel
- Phase 6: T031, T032 (service + table) can run in parallel
- Phase 7: T037-T041 (service + components) can run in parallel
- Phase 8: T044, T045 (services) can run in parallel; T046-T048 (components) can run in parallel
- All user stories (Phases 3-8) can run in parallel after Phase 2

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011)
3. Complete Phase 3: Sales Dashboard (T012-T017) — upgrade existing dashboard
4. Complete Phase 4: Product Analytics (T018-T024) — new analytics page
5. **STOP and VALIDATE**: Dashboard shows live data, product rankings accurate
6. Deploy/demo MVP if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Dashboard live (MVP!)
3. Add US2 → Test → Product insights
4. Add US3 → Test → Time heatmap
5. Add US4 → Test → Cashier metrics
6. Add US5 → Test → Inventory optimization
7. Add US6 → Test → Custom reports
8. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All data comes from local sql.js database (offline-first)
- Charts use PrimeVue Chart component (Chart.js wrapper)
- Aggregation runs locally — no server-side jobs needed
- Export uses Blob + URL.createObjectURL CSV pattern (see CustomerExport.vue)
- No Laravel/Filament/PHP — everything is Vue 3 + TypeScript + PrimeVue 4
- Currency formatted as ₱ with toLocaleString('en-PH')
- Commit after each task or logical group
