# Implementation Plan: Product & Inventory Management

**Branch**: `001-product-inventory` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-inventory/spec.md`
**Depends On**: 003-user-management (for permissions)

## Summary

Implement product catalog management with variants, stock tracking, batch/expiry management, and supplier integration. Products are stored locally in SQLite for offline operation and synced to cloud. Stock movements are tracked atomically to ensure accurate inventory levels. Low-stock alerts notify managers when reorder is needed.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4, Pinia, sql.js (SQLite)
**Storage**: SQLite (local via sql.js), MySQL (server via Laravel API)
**Testing**: Vitest (unit), Vue Test Utils (component), Playwright (E2E)
**Target Platform**: Web browser (Chrome/Edge), Electron (optional)
**Project Type**: Web application (Vue frontend + Laravel backend API)
**Performance Goals**: Barcode lookup < 500ms, 50,000+ products supported
**Constraints**: Offline-capable, sync on connectivity, collision-resistant IDs
**Scale/Scope**: 50,000+ products, 500+ transactions/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-011: Full offline support; FR-012: Queue for sync; FR-013: Offline UUIDs |
| II. BIR Compliance | ✅ PASS | Inventory not directly BIR-related; VAT type per product supports compliance |
| III. Data Integrity | ✅ PASS | Stock derived from movements (audit trail); sync with server confirmation |
| IV. Stack Alignment | ✅ PASS | Vue 3 + PrimeVue + SQLite + Pinia per constitution |
| V. Simplicity | ✅ PASS | Standard CRUD; variants as separate entities; YAGNI approach |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-product-inventory/
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
│   └── inventory/
│       ├── ProductForm.vue
│       ├── ProductList.vue
│       ├── ProductCard.vue
│       ├── VariantForm.vue
│       ├── StockMovementDialog.vue
│       ├── BatchForm.vue
│       ├── SupplierForm.vue
│       └── LowStockAlert.vue
├── composables/
│   ├── useProducts.ts
│   ├── useInventory.ts
│   ├── useSuppliers.ts
│   └── useBatches.ts
├── stores/
│   ├── product.ts
│   ├── inventory.ts
│   ├── supplier.ts
│   └── stockAlert.ts
├── services/
│   ├── productService.ts
│   ├── inventoryService.ts
│   └── stockSyncService.ts
├── repositories/
│   ├── productRepository.ts
│   ├── variantRepository.ts
│   ├── stockMovementRepository.ts
│   ├── batchRepository.ts
│   └── supplierRepository.ts
├── db/
│   └── migrations/
│       └── 002_inventory.ts
├── types/
│   ├── product.ts
│   ├── variant.ts
│   ├── stockMovement.ts
│   └── supplier.ts
└── utils/
    ├── barcode.ts
    └── stockCalculator.ts

tests/
├── unit/
│   ├── services/
│   │   └── inventoryService.spec.ts
│   └── utils/
│       └── stockCalculator.spec.ts
├── component/
│   └── inventory/
│       └── ProductForm.spec.ts
└── e2e/
    └── inventory.spec.ts
```

**Structure Decision**: Web application with Vue frontend. Extends database schema from user management. Products and stock movements stored in SQLite with sync to server.

## Complexity Tracking

> No violations - standard inventory management patterns.

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Stock calculation | Derived from movements | Audit trail; never edit stock directly |
| Variant handling | Separate entity with parent FK | Clean separation; independent inventory |
| Barcode indexing | SQLite index on barcode column | Fast lookup for POS scanning |
