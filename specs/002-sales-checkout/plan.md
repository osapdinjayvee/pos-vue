# Implementation Plan: Sales & Checkout

**Branch**: `002-sales-checkout` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-sales-checkout/spec.md`
**Depends On**: 003-user-management (auth, shifts), 001-product-inventory (products, stock)

## Summary

Implement the core POS checkout functionality including product scanning/search, cart management, VAT computation, multiple payment methods, BIR-compliant receipt printing, discounts, voids, and refunds. This is the most critical feature as it enables actual sales. All operations must work fully offline with SQLite, syncing to cloud when connectivity resumes. OR numbering must be sequential and gap-free per BIR requirements.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4, Pinia, sql.js (SQLite)
**Storage**: SQLite (local via sql.js), MySQL (server via Laravel API)
**Testing**: Vitest (unit), Vue Test Utils (component), Playwright (E2E)
**Target Platform**: Web browser (Chrome/Edge), Electron for receipt printing
**Project Type**: Web application (Vue frontend + Laravel backend API)
**Performance Goals**: Barcode scan < 500ms, sale completion < 30 seconds
**Constraints**: 100% offline-capable, BIR-compliant receipts, sequential OR
**Scale/Scope**: 500+ transactions/day, 10,000+ products

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-013: Full offline; FR-014: Sync on connectivity; FR-15: Pre-allocated ORs |
| II. BIR Compliance | ✅ PASS | FR-07: BIR receipts; FR-08: Sequential ORs; FR-03: VAT computation |
| III. Data Integrity | ✅ PASS | FR-12: Audit trail; FR-11: Supervisor auth for voids; immutable transactions |
| IV. Stack Alignment | ✅ PASS | Vue 3 + PrimeVue + SQLite + Pinia per constitution |
| V. Simplicity | ✅ PASS | Standard POS flow; PrimeVue components; minimal custom code |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-sales-checkout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── pos/
│       ├── POSTerminal.vue       # Main POS interface
│       ├── ProductSearch.vue     # Barcode/search input
│       ├── CartView.vue          # Shopping cart
│       ├── CartItem.vue          # Individual cart line
│       ├── PaymentDialog.vue     # Payment processing
│       ├── ReceiptPreview.vue    # Receipt before print
│       ├── DiscountDialog.vue    # Apply discounts
│       ├── VoidDialog.vue        # Void transaction
│       ├── RefundDialog.vue      # Process refunds
│       └── SupervisorAuth.vue    # PIN entry for supervisor
├── composables/
│   ├── useCart.ts
│   ├── usePayment.ts
│   ├── useReceipt.ts
│   ├── useVAT.ts
│   └── useORNumber.ts
├── stores/
│   ├── cart.ts
│   ├── transaction.ts
│   └── orSeries.ts
├── services/
│   ├── transactionService.ts
│   ├── receiptService.ts
│   ├── vatService.ts
│   ├── discountService.ts
│   └── transactionSyncService.ts
├── repositories/
│   ├── transactionRepository.ts
│   ├── transactionItemRepository.ts
│   ├── paymentRepository.ts
│   ├── voidRepository.ts
│   ├── refundRepository.ts
│   └── orSeriesRepository.ts
├── db/
│   └── migrations/
│       └── 003_sales.ts
├── types/
│   ├── transaction.ts
│   ├── payment.ts
│   ├── receipt.ts
│   └── discount.ts
└── utils/
    ├── vatCalculator.ts
    ├── receiptFormatter.ts
    └── orGenerator.ts

tests/
├── unit/
│   ├── services/
│   │   ├── vatService.spec.ts
│   │   └── discountService.spec.ts
│   └── utils/
│       ├── vatCalculator.spec.ts
│       └── orGenerator.spec.ts
├── component/
│   └── pos/
│       ├── CartView.spec.ts
│       └── PaymentDialog.spec.ts
└── e2e/
    ├── sales.spec.ts
    └── refund.spec.ts
```

**Structure Decision**: Web application with Vue frontend. Core POS components in `src/components/pos/`. Receipt printing may require Electron wrapper for direct printer access. Web version can use print dialog.

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| VAT calculation | Derive from line items | Each item has tax type; sum VATable/exempt/zero-rated |
| OR numbering | Pre-allocated ranges | Offline needs guaranteed unique ORs |
| Receipt printing | Web print + Electron option | Web works anywhere; Electron for thermal printers |
| Void/Refund | Separate records | Original transaction immutable per BIR |
