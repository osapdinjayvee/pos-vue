# Implementation Plan: Cash Drawer Management

**Branch**: `009-cash-drawer` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-cash-drawer/spec.md`
**Depends On**: 003-user-management (shifts), 002-sales-checkout (payments)

## Summary

Implement cash drawer accountability features including opening/closing counts with denomination breakdown, cash drops, paid-ins, and variance reconciliation. Works offline with local SQLite. Hardware integration for automatic drawer opening is optional.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4, Pinia, sql.js
**Storage**: SQLite (local)
**Testing**: Vitest (unit), Vue Test Utils (component)
**Target Platform**: Web browser, Electron (for hardware)
**Project Type**: Web application (Vue frontend)
**Performance Goals**: Count entry < 2 minutes, variance calculation instant
**Constraints**: Offline-capable, denomination breakdown
**Scale/Scope**: Multiple shifts per day per terminal

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-012: All operations work offline |
| II. BIR Compliance | ✅ PASS | Cash accountability supports BIR audit |
| III. Data Integrity | ✅ PASS | FR-008: All operations logged |
| IV. Stack Alignment | ✅ PASS | Vue + PrimeVue + SQLite |
| V. Simplicity | ✅ PASS | Standard cash management workflow |

**Gate Status**: PASSED

## Project Structure

```text
src/
├── components/
│   └── cash-drawer/
│       ├── OpeningCount.vue
│       ├── ClosingCount.vue
│       ├── DenominationEntry.vue
│       ├── CashDrop.vue
│       ├── CashPaidIn.vue
│       ├── VarianceReport.vue
│       └── DrawerStatus.vue
├── composables/
│   ├── useCashDrawer.ts
│   └── useDenominationCount.ts
├── stores/
│   └── cashDrawer.ts
├── services/
│   ├── cashDrawerService.ts
│   └── varianceService.ts
├── repositories/
│   ├── drawerSessionRepository.ts
│   └── drawerOperationRepository.ts
├── db/
│   └── migrations/
│       └── 009_cash_drawer.ts
└── types/
    └── cashDrawer.ts
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Denomination list | Philippine currency | Locale-specific |
| Hardware integration | Optional via Electron | Not all setups have drawer |
| Variance threshold | Configurable | Merchant preference |
