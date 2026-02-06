# Tasks: Product & Inventory Management

**Input**: Design documents from `/specs/001-product-inventory/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/

**Tests**: Tests included where specified in quickstart.md verification steps.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and project structure for inventory feature

- [x] T001 Create database migration for inventory tables in src/db/migrations/002_inventory.ts
- [x] T002 [P] Create TypeScript type definitions in src/types/inventory.ts
- [x] T003 [P] Create barcode utility functions in src/utils/barcode.ts
- [x] T004 [P] Create stock calculator utility in src/utils/stockCalculator.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repositories and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create supplier repository in src/repositories/supplierRepository.ts
- [x] T006 Create product variant repository in src/repositories/variantRepository.ts
- [x] T007 Create stock movement repository in src/repositories/stockMovementRepository.ts
- [x] T008 Create batch repository in src/repositories/batchRepository.ts
- [x] T009 Create stock alert repository in src/repositories/stockAlertRepository.ts
- [x] T010 Create inventory service in src/services/inventoryService.ts
- [x] T011 Create product service in src/services/productService.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add New Product (Priority: P1) 🎯 MVP

**Goal**: Store managers can add new products with name, price, barcode, and category

**Independent Test**: Add a product with basic details and verify it appears in product listings

### Implementation for User Story 1

- [x] T012 [P] [US1] Create ProductForm.vue component in src/components/inventory/ProductForm.vue
- [x] T013 [P] [US1] Create ProductList.vue component in src/components/inventory/ProductList.vue
- [x] T014 [US1] Create useProducts composable in src/composables/useProducts.ts
- [x] T015 [US1] Update product store with create/update actions in src/stores/product.ts
- [x] T016 [US1] Add barcode validation (duplicate check) in product repository
- [x] T017 [US1] Add offline queue support for product creation in src/services/productService.ts
- [x] T018 [US1] Create ProductsView page integration in src/views/ProductsView.vue

**Checkpoint**: User Story 1 complete - products can be created and listed

---

## Phase 4: User Story 2 - Manage Product Variants (Priority: P1)

**Goal**: Create product variants with independent SKU, barcode, and stock levels

**Independent Test**: Create product "T-Shirt" with variants Small/Medium/Large, verify each has own stock

### Implementation for User Story 2

- [x] T019 [P] [US2] Create VariantForm.vue component in src/components/inventory/VariantForm.vue
- [x] T020 [P] [US2] Create VariantList.vue component in src/components/inventory/VariantList.vue
- [x] T021 [US2] Add variant CRUD operations to variantRepository.ts
- [x] T022 [US2] Update ProductForm to support adding/editing variants
- [x] T023 [US2] Add variant barcode lookup for POS scanning
- [x] T024 [US2] Display total stock across variants in product detail view

**Checkpoint**: User Story 2 complete - variants can be created and managed independently

---

## Phase 5: User Story 3 - Track Stock Levels (Priority: P1)

**Goal**: Track stock in/out movements with accurate current stock calculation

**Independent Test**: Receive stock (+5), make sale (-3), verify stock level reflects both

### Implementation for User Story 3

- [x] T025 [P] [US3] Create StockMovementDialog.vue in src/components/inventory/StockMovementDialog.vue
- [x] T026 [P] [US3] Create StockMovementHistory.vue in src/components/inventory/StockMovementHistory.vue
- [x] T027 [US3] Implement stock movement recording in stockMovementRepository.ts
- [x] T028 [US3] Create inventory store in src/stores/inventory.ts
- [x] T029 [US3] Implement useInventory composable in src/composables/useInventory.ts
- [x] T030 [US3] Add stock calculation from movement history (derived stock levels)
- [x] T031 [US3] Add insufficient stock warning when selling more than available
- [x] T032 [US3] Integrate stock movement with product detail view

**Checkpoint**: User Story 3 complete - stock movements tracked with accurate levels

---

## Phase 6: User Story 4 - Low Stock Alerts (Priority: P2)

**Goal**: Generate alerts when products reach low stock threshold

**Independent Test**: Set threshold=5, reduce stock to 4, verify alert appears

### Implementation for User Story 4

- [x] T033 [P] [US4] Create LowStockAlert.vue component in src/components/inventory/LowStockAlert.vue
- [x] T034 [P] [US4] Create LowStockList.vue dashboard component in src/components/inventory/LowStockList.vue
- [x] T035 [US4] Create stockAlert store in src/stores/stockAlert.ts (using inventory store instead)
- [x] T036 [US4] Implement alert generation logic when stock changes
- [x] T037 [US4] Add alert acknowledgement functionality
- [x] T038 [US4] Add low stock dashboard widget to main dashboard
- [x] T039 [US4] Remove alert when stock replenished above threshold

**Checkpoint**: User Story 4 complete - low stock alerts generated and displayed

---

## Phase 7: User Story 5 - Batch & Expiry Tracking (Priority: P2)

**Goal**: Track batch numbers and expiry dates for perishable products

**Independent Test**: Add batch "LOT001" expiring in 7 days, verify expiry warning appears

### Implementation for User Story 5

- [x] T040 [P] [US5] Create BatchForm.vue component in src/components/inventory/BatchForm.vue
- [x] T041 [P] [US5] Create BatchList.vue component in src/components/inventory/BatchList.vue
- [x] T042 [US5] Create useBatches composable in src/composables/useBatches.ts
- [x] T043 [US5] Implement batch CRUD in batchRepository.ts
- [x] T044 [US5] Link batches to stock movements
- [x] T045 [US5] Add expiry date warnings (7 days before expiration)
- [x] T046 [US5] Block sales from expired batches with warning dialog
- [x] T047 [US5] Add "expiring soon" alerts to alert system

**Checkpoint**: User Story 5 complete - batches tracked with expiry warnings

---

## Phase 8: User Story 6 - Supplier Management (Priority: P2)

**Goal**: Manage supplier information and link products to suppliers

**Independent Test**: Create supplier, link products, generate reorder list by supplier

### Implementation for User Story 6

- [x] T048 [P] [US6] Create SupplierForm.vue component in src/components/inventory/SupplierForm.vue
- [x] T049 [P] [US6] Create SupplierList.vue component in src/components/inventory/SupplierList.vue
- [x] T050 [US6] Create supplier store in src/stores/supplier.ts
- [x] T051 [US6] Create useSuppliers composable in src/composables/useSuppliers.ts
- [x] T052 [US6] Implement supplier CRUD in supplierRepository.ts
- [x] T053 [US6] Add supplier selection to ProductForm.vue
- [x] T054 [US6] Create SuppliersView page in src/views/SuppliersView.vue
- [x] T055 [US6] Generate reorder report grouped by supplier

**Checkpoint**: User Story 6 complete - suppliers managed and linked to products

---

## Phase 9: User Story 7 - Inventory Transfer (Priority: P3)

**Goal**: Transfer inventory between branches with confirmation workflow

**Independent Test**: Transfer 10 units from Branch A to B, verify stock adjusts at both locations

### Implementation for User Story 7

- [x] T056 [P] [US7] Create TransferForm.vue component in src/components/inventory/TransferForm.vue
- [x] T057 [P] [US7] Create TransferList.vue component in src/components/inventory/TransferList.vue
- [x] T058 [US7] Create transfer workflow logic (initiate → confirm receipt)
- [x] T059 [US7] Record transfer_out and transfer_in movements
- [x] T060 [US7] Track pending transfers (in-transit quantity)
- [x] T061 [US7] Create TransfersView page in src/views/TransfersView.vue
- [x] T062 [US7] Add transfer status notifications

**Checkpoint**: User Story 7 complete - inter-branch transfers functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T063 [P] Add loading states and error handling across all inventory components
- [x] T064 [P] Add form validation messages for all inventory forms
- [x] T065 Performance optimization for product/variant barcode lookup (<500ms)
- [x] T066 Add offline sync queue for all inventory operations
- [x] T067 Create inventory reports (stock value, movement history)
- [x] T068 Run quickstart.md validation scenarios
- [x] T069 Code cleanup and component refactoring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3) should complete before P2 stories
  - P2 stories (US4, US5, US6) can proceed in parallel
  - P3 story (US7) can start after P1 completion
- **Polish (Phase 10)**: Depends on at least US1-US3 being complete

### User Story Dependencies

- **US1 (Add Product)**: Core functionality - no dependencies on other stories
- **US2 (Variants)**: Extends US1 product functionality
- **US3 (Stock Tracking)**: Requires US2 for variant stock tracking
- **US4 (Low Stock Alerts)**: Requires US3 for stock level monitoring
- **US5 (Batch/Expiry)**: Requires US3 for stock movements
- **US6 (Suppliers)**: Can run parallel to US4/US5, extends US1
- **US7 (Transfers)**: Requires US3, extends branch functionality

### Within Each User Story

- Components marked [P] can run in parallel
- Repositories before services
- Services before composables
- Composables before view integration
- Commit after each task or logical group

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- US1 and US6 component tasks can run in parallel
- US4 and US5 can be developed in parallel after US3 completion
- All component creation tasks marked [P] within a story can run in parallel

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: Add Products (US1)
4. Complete Phase 4: Product Variants (US2)
5. Complete Phase 5: Stock Tracking (US3)
6. **STOP and VALIDATE**: Test core inventory independently
7. Deploy/demo MVP if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Products can be added
3. Add US2 → Test → Variants work
4. Add US3 → Test → Stock tracking works (MVP!)
5. Add US4 → Test → Alerts work
6. Add US5 → Test → Batches work
7. Add US6 → Test → Suppliers work
8. Add US7 → Test → Transfers work
9. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Stock levels are ALWAYS derived from movement history, never directly edited
- Barcode lookup must be < 500ms for good POS experience
- All operations must work offline with sync queue
- Commit after each task or logical group
- Verify component renders before moving to next task
