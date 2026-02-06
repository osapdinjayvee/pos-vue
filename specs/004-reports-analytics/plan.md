# Implementation Plan: Reports & Analytics

**Branch**: `004-reports-analytics` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-reports-analytics/spec.md`
**Depends On**: 002-sales-checkout (transactions), 003-user-management (shifts, users)

## Summary

Implement BIR-compliant reporting including X-Reading and Z-Reading reports, daily sales reports, VAT summaries, and performance analytics. All reports must work offline using local SQLite data. Z-Reading requires sequential Z-counter that never resets. Reports enable BIR compliance verification and business decision-making.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4 (DataTable, Charts), Pinia, sql.js (SQLite)
**Storage**: SQLite (local), MySQL (server via Laravel API)
**Testing**: Vitest (unit), Vue Test Utils (component), Playwright (E2E)
**Target Platform**: Web browser (Chrome/Edge)
**Project Type**: Web application (Vue frontend + Laravel backend API)
**Performance Goals**: X-Reading < 5 seconds, reports for 1 year < 30 seconds
**Constraints**: 100% offline-capable, BIR-compliant Z-Reading format
**Scale/Scope**: 500+ transactions/day, 10+ years data retention

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-011: Reports from local data offline; FR-012: Sync status indicated |
| II. BIR Compliance | ✅ PASS | FR-001/002: X/Z-Reading with counters; FR-003: Z-Reading once per day |
| III. Data Integrity | ✅ PASS | Z-counter never resets; sequential; immutable after generation |
| IV. Stack Alignment | ✅ PASS | Vue 3 + PrimeVue charts + SQLite per constitution |
| V. Simplicity | ✅ PASS | Standard reporting patterns; PrimeVue DataTable/Charts |

**Gate Status**: PASSED - Proceed to implementation

## Project Structure

### Documentation (this feature)

```text
specs/004-reports-analytics/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI specification
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── components/
│   └── reports/
│       ├── XReadingReport.vue      # X-Reading display
│       ├── ZReadingReport.vue      # Z-Reading display
│       ├── DailySalesReport.vue    # Daily sales summary
│       ├── VATSummaryReport.vue    # VAT breakdown
│       ├── ProductReport.vue       # Product performance
│       ├── CashierReport.vue       # Cashier performance
│       ├── ReportFilters.vue       # Date range, branch filters
│       ├── ReportExport.vue        # PDF/CSV export
│       └── ReportPrint.vue         # Print layout
├── composables/
│   ├── useXReading.ts
│   ├── useZReading.ts
│   ├── useReportFilters.ts
│   └── useReportExport.ts
├── stores/
│   └── reports.ts
├── services/
│   ├── xReadingService.ts
│   ├── zReadingService.ts
│   ├── salesReportService.ts
│   ├── vatReportService.ts
│   └── reportExportService.ts
├── repositories/
│   ├── xReadingRepository.ts
│   ├── zReadingRepository.ts
│   └── salesAggregateRepository.ts
├── db/
│   └── migrations/
│       └── 004_reports.ts
├── types/
│   ├── xReading.ts
│   ├── zReading.ts
│   └── report.ts
└── utils/
    ├── reportFormatter.ts
    └── reportCalculations.ts

tests/
├── unit/
│   └── services/
│       ├── xReadingService.spec.ts
│       └── zReadingService.spec.ts
└── e2e/
    └── reports.spec.ts
```

**Structure Decision**: Vue frontend components in `src/components/reports/`. Services handle calculation logic. Z-counter maintained in SQLite with strict increment rules.

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Z-counter persistence | Dedicated table with single row | Never resets; audit-critical |
| Report aggregation | Pre-calculate daily aggregates | Performance for large date ranges |
| VAT reconciliation | Sum from transaction_items | Source of truth is line items |
| Export formats | PDF (print), CSV (spreadsheet) | Standard business requirements |
