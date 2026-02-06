# Tasks: P1 Features (Critical Priority)

**Input**: Design documents from `/specs/003-user-management/`, `/specs/001-product-inventory/`, `/specs/002-sales-checkout/`
**Prerequisites**: All P1 feature plans, specs, research, data-models, and contracts

**Features Covered**:
- 003-user-management (Foundation - must be first)
- 001-product-inventory (Depends on user management)
- 002-sales-checkout (Depends on user management and products)

## Format: `[ID] [P?] [Feature-Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Feature-Story]**: Feature code + story number (e.g., UM-US1 = User Management User Story 1)
- Feature codes: UM = User Management, PI = Product Inventory, SC = Sales Checkout

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared dependencies for all P1 features

- [ ] T001 Create project structure per implementation plan (`src/components/`, `src/stores/`, `src/services/`, `src/repositories/`, `src/db/`, `src/types/`, `src/utils/`)
- [ ] T002 Initialize Vue 3 project with TypeScript 5.x, PrimeVue 4, Pinia dependencies
- [ ] T003 [P] Configure sql.js (SQLite WebAssembly) for offline-first database
- [ ] T004 [P] Install bcryptjs for PIN hashing in browser
- [ ] T005 [P] Configure Vitest and Vue Test Utils for testing
- [ ] T006 [P] Setup ESLint and Prettier for code formatting
- [ ] T007 Create base TypeScript configuration (`tsconfig.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, migrations framework, and core services that ALL features depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Setup

- [ ] T008 Create migration framework in `src/db/migrations/index.ts`
- [ ] T009 [P] Create migration 001_users.ts with User, Role, Permission, UserRole, Shift, AuthLog tables
- [ ] T010 [P] Create migration 002_inventory.ts with Category, Product, ProductVariant, StockMovement, Batch, Supplier, StockAlert tables
- [ ] T011 [P] Create migration 003_sales.ts with Transaction, TransactionItem, Payment, ORSeries, Void, Refund, RefundItem, Discount tables
- [ ] T012 Create database initialization service `src/db/database.ts` to run migrations on app start

### Core Services & Infrastructure

- [ ] T013 [P] Create base repository pattern `src/repositories/baseRepository.ts`
- [ ] T014 [P] Create sync queue service `src/services/syncQueueService.ts` for offline-first operations
- [ ] T015 [P] Create business config `src/config/business.ts` (store name, TIN, VAT rate, branch info)
- [ ] T016 Create app initialization composable `src/composables/useAppInit.ts`

### Seed Data

- [ ] T017 [P] Create default roles seeder (Cashier, Supervisor, Admin) `src/db/seeders/roles.ts`
- [ ] T018 [P] Create permissions seeder `src/db/seeders/permissions.ts`
- [ ] T019 [P] Create sample admin user seeder `src/db/seeders/users.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Management - US1 (User Authentication) 🎯 MVP

**Feature**: 003-user-management | **Priority**: P1
**Goal**: Enable users to log in with credentials for terminal accountability

**Independent Test**: Log in with valid credentials and verify access to POS interface

### Types & Models

- [ ] T020 [P] [UM-US1] Create User type in `src/types/user.ts`
- [ ] T021 [P] [UM-US1] Create Role type in `src/types/role.ts`
- [ ] T022 [P] [UM-US1] Create AuthLog type in `src/types/auth.ts`

### Repositories

- [ ] T023 [P] [UM-US1] Create userRepository in `src/repositories/userRepository.ts`
- [ ] T024 [P] [UM-US1] Create roleRepository in `src/repositories/roleRepository.ts`
- [ ] T025 [P] [UM-US1] Create authLogRepository in `src/repositories/authLogRepository.ts`

### Services

- [ ] T026 [UM-US1] Create authService in `src/services/authService.ts` (login, logout, validatePIN, cacheCredentials)
- [ ] T027 [UM-US1] Create sessionService in `src/services/sessionService.ts` (track active session, inactivity timeout)

### Store

- [ ] T028 [UM-US1] Create auth store in `src/stores/auth.ts` (currentUser, isAuthenticated, permissions)

### Components

- [ ] T029 [P] [UM-US1] Create LoginForm.vue in `src/components/auth/LoginForm.vue`
- [ ] T030 [P] [UM-US1] Create PINEntry.vue in `src/components/auth/PINEntry.vue`
- [ ] T031 [UM-US1] Create LockScreen.vue in `src/components/auth/LockScreen.vue` (for inactivity timeout)

### Composables

- [ ] T032 [UM-US1] Create useAuth composable in `src/composables/useAuth.ts`

**Checkpoint**: Users can log in with username/PIN, session tracked, auto-lock on inactivity

---

## Phase 4: User Management - US2 (Role-Based Access Control)

**Feature**: 003-user-management | **Priority**: P1
**Goal**: Enforce permissions so cashiers cannot access admin functions

**Independent Test**: Log in as cashier and verify admin functions are not accessible

### Types & Models

- [ ] T033 [P] [UM-US2] Create Permission type in `src/types/permission.ts`
- [ ] T034 [P] [UM-US2] Create UserRole join type in `src/types/userRole.ts`

### Repositories

- [ ] T035 [UM-US2] Create permissionRepository in `src/repositories/permissionRepository.ts`

### Services

- [ ] T036 [UM-US2] Create permissionService in `src/services/permissionService.ts` (checkPermission, getUserPermissions)

### Components

- [ ] T037 [P] [UM-US2] Create SupervisorAuth.vue in `src/components/auth/SupervisorAuth.vue` (PIN prompt for elevated actions)
- [ ] T038 [P] [UM-US2] Create PermissionGuard.vue in `src/components/auth/PermissionGuard.vue` (wrap protected content)

### Composables

- [ ] T039 [UM-US2] Create usePermission composable in `src/composables/usePermission.ts`

### Integration

- [ ] T040 [UM-US2] Add permission checks to auth store in `src/stores/auth.ts`
- [ ] T041 [UM-US2] Create Vue router guards for permission-based routing

**Checkpoint**: Role-based access enforced; supervisor auth required for sensitive operations

---

## Phase 5: User Management - US3 (Shift Management)

**Feature**: 003-user-management | **Priority**: P1
**Goal**: Track cashier shifts for cash accountability

**Independent Test**: Start shift, process sales, end shift and verify shift report

### Types

- [ ] T042 [UM-US3] Create Shift type in `src/types/shift.ts`

### Repositories

- [ ] T043 [UM-US3] Create shiftRepository in `src/repositories/shiftRepository.ts`

### Services

- [ ] T044 [UM-US3] Create shiftService in `src/services/shiftService.ts` (startShift, endShift, getActiveShift, generateReport)

### Store

- [ ] T045 [UM-US3] Create shift store in `src/stores/shift.ts` (activeShift, shiftTransactions)

### Components

- [ ] T046 [P] [UM-US3] Create StartShiftDialog.vue in `src/components/shift/StartShiftDialog.vue`
- [ ] T047 [P] [UM-US3] Create EndShiftDialog.vue in `src/components/shift/EndShiftDialog.vue`
- [ ] T048 [P] [UM-US3] Create ShiftReport.vue in `src/components/shift/ShiftReport.vue`
- [ ] T049 [UM-US3] Create ShiftStatus.vue in `src/components/shift/ShiftStatus.vue` (header indicator)

### Composables

- [ ] T050 [UM-US3] Create useShift composable in `src/composables/useShift.ts`

**Checkpoint**: Shifts tracked with opening/closing cash; shift reports generated

---

## Phase 6: Product & Inventory - US1 (Add New Product)

**Feature**: 001-product-inventory | **Priority**: P1
**Goal**: Enable managers to add products to the catalog for selling

**Independent Test**: Add product with name, price, barcode and verify it appears in product list

### Types

- [ ] T051 [P] [PI-US1] Create Product type in `src/types/product.ts`
- [ ] T052 [P] [PI-US1] Create Category type in `src/types/category.ts`

### Repositories

- [ ] T053 [P] [PI-US1] Create productRepository in `src/repositories/productRepository.ts`
- [ ] T054 [P] [PI-US1] Create categoryRepository in `src/repositories/categoryRepository.ts`

### Services

- [ ] T055 [PI-US1] Create productService in `src/services/productService.ts` (createProduct, updateProduct, getProducts, searchByBarcode)

### Store

- [ ] T056 [PI-US1] Create product store in `src/stores/product.ts` (products, categories, searchResults)

### Components

- [ ] T057 [P] [PI-US1] Create ProductForm.vue in `src/components/inventory/ProductForm.vue`
- [ ] T058 [P] [PI-US1] Create ProductList.vue in `src/components/inventory/ProductList.vue`
- [ ] T059 [P] [PI-US1] Create CategorySelect.vue in `src/components/inventory/CategorySelect.vue`

### Composables

- [ ] T060 [PI-US1] Create useProduct composable in `src/composables/useProduct.ts`

**Checkpoint**: Products can be created with all required fields; visible in product list

---

## Phase 7: Product & Inventory - US2 (Manage Product Variants)

**Feature**: 001-product-inventory | **Priority**: P1
**Goal**: Track inventory for each product variation separately

**Independent Test**: Create product with variants and verify each has own stock level

### Types

- [ ] T061 [PI-US2] Create ProductVariant type in `src/types/productVariant.ts`

### Repositories

- [ ] T062 [PI-US2] Create variantRepository in `src/repositories/variantRepository.ts`

### Services

- [ ] T063 [PI-US2] Update productService to handle variants in `src/services/productService.ts`

### Components

- [ ] T064 [P] [PI-US2] Create VariantForm.vue in `src/components/inventory/VariantForm.vue`
- [ ] T065 [P] [PI-US2] Create VariantList.vue in `src/components/inventory/VariantList.vue`
- [ ] T066 [PI-US2] Update ProductForm.vue to include variant management

### Composables

- [ ] T067 [PI-US2] Create useVariant composable in `src/composables/useVariant.ts`

**Checkpoint**: Products can have variants with independent SKU, barcode, price, stock

---

## Phase 8: Product & Inventory - US3 (Track Stock Levels)

**Feature**: 001-product-inventory | **Priority**: P1
**Goal**: Accurate stock tracking via movement history

**Independent Test**: Receive stock, make sale, verify stock level reflects both

### Types

- [ ] T068 [PI-US3] Create StockMovement type in `src/types/stockMovement.ts`

### Repositories

- [ ] T069 [PI-US3] Create stockMovementRepository in `src/repositories/stockMovementRepository.ts`

### Services

- [ ] T070 [PI-US3] Create stockService in `src/services/stockService.ts` (recordMovement, getStockLevel, adjustStock)

### Store

- [ ] T071 [PI-US3] Create stock store in `src/stores/stock.ts` (stockLevels, movements)

### Components

- [ ] T072 [P] [PI-US3] Create StockReceiving.vue in `src/components/inventory/StockReceiving.vue`
- [ ] T073 [P] [PI-US3] Create StockAdjustment.vue in `src/components/inventory/StockAdjustment.vue`
- [ ] T074 [P] [PI-US3] Create StockHistory.vue in `src/components/inventory/StockHistory.vue`
- [ ] T075 [PI-US3] Create StockLevel.vue in `src/components/inventory/StockLevel.vue` (display component)

### Composables

- [ ] T076 [PI-US3] Create useStock composable in `src/composables/useStock.ts`

### Integration

- [ ] T077 [PI-US3] Add stock level warnings to cart (insufficient stock alert)

**Checkpoint**: Stock tracked via movement history; levels accurate; warnings on low stock

---

## Phase 9: Sales & Checkout - US1 (Basic Sale Transaction) 🎯 MVP

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: Process customer purchases with receipt generation

**Independent Test**: Scan products, accept cash, generate BIR-compliant receipt

### Types

- [ ] T078 [P] [SC-US1] Create Transaction type in `src/types/transaction.ts`
- [ ] T079 [P] [SC-US1] Create TransactionItem type in `src/types/transactionItem.ts`
- [ ] T080 [P] [SC-US1] Create Payment type in `src/types/payment.ts`
- [ ] T081 [P] [SC-US1] Create CartItem type in `src/types/cart.ts`

### Repositories

- [ ] T082 [P] [SC-US1] Create transactionRepository in `src/repositories/transactionRepository.ts`
- [ ] T083 [P] [SC-US1] Create transactionItemRepository in `src/repositories/transactionItemRepository.ts`
- [ ] T084 [P] [SC-US1] Create paymentRepository in `src/repositories/paymentRepository.ts`

### Services

- [ ] T085 [SC-US1] Create transactionService in `src/services/transactionService.ts` (createTransaction, getTransaction, listTransactions)

### Store

- [ ] T086 [SC-US1] Create cart store in `src/stores/cart.ts` (items, totals, addItem, removeItem, updateQuantity, clear)
- [ ] T087 [SC-US1] Create transaction store in `src/stores/transaction.ts` (currentTransaction, transactionHistory)

### Components

- [ ] T088 [P] [SC-US1] Create POSTerminal.vue in `src/components/pos/POSTerminal.vue` (main interface)
- [ ] T089 [P] [SC-US1] Create CartView.vue in `src/components/pos/CartView.vue`
- [ ] T090 [P] [SC-US1] Create CartItem.vue in `src/components/pos/CartItem.vue`
- [ ] T091 [SC-US1] Create CheckoutSummary.vue in `src/components/pos/CheckoutSummary.vue`

### Composables

- [ ] T092 [SC-US1] Create useCart composable in `src/composables/useCart.ts`

**Checkpoint**: Basic sale flow works - add to cart, checkout, payment

---

## Phase 10: Sales & Checkout - US2 (Product Search)

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: Find products by barcode scan or text search

**Independent Test**: Search by partial name, select from results, add to cart

### Services

- [ ] T093 [SC-US2] Update productService with search functionality (searchProducts, findByBarcode)

### Components

- [ ] T094 [P] [SC-US2] Create ProductSearch.vue in `src/components/pos/ProductSearch.vue`
- [ ] T095 [P] [SC-US2] Create BarcodeScanner.vue in `src/components/pos/BarcodeScanner.vue` (keyboard input handler)
- [ ] T096 [SC-US2] Create ProductSearchResults.vue in `src/components/pos/ProductSearchResults.vue`

### Integration

- [ ] T097 [SC-US2] Integrate ProductSearch into POSTerminal.vue

**Checkpoint**: Products searchable by barcode scan or text; results selectable

---

## Phase 11: Sales & Checkout - US3 (VAT Computation)

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: BIR-compliant VAT computation on all sales

**Independent Test**: Sell VATable, exempt, zero-rated items; verify VAT breakdown

### Utils

- [ ] T098 [SC-US3] Create vatCalculator in `src/utils/vatCalculator.ts` (calculateVAT, getVATBreakdown)

### Services

- [ ] T099 [SC-US3] Create vatService in `src/services/vatService.ts` (computeTransactionVAT, validateVATBreakdown)

### Composables

- [ ] T100 [SC-US3] Create useVAT composable in `src/composables/useVAT.ts`

### Components

- [ ] T101 [SC-US3] Create VATBreakdown.vue in `src/components/pos/VATBreakdown.vue` (display component)

### Integration

- [ ] T102 [SC-US3] Integrate VAT computation into cart store
- [ ] T103 [SC-US3] Add VAT breakdown to CheckoutSummary.vue

**Checkpoint**: VAT correctly computed for all tax types; breakdown displayed

---

## Phase 12: Sales & Checkout - US4 (Multiple Payment Methods)

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: Accept cash, card, e-wallet with split payments

**Independent Test**: Process split payment (cash + card) and verify both recorded

### Services

- [ ] T104 [SC-US4] Create paymentService in `src/services/paymentService.ts` (processPayment, validatePayment, calculateChange)

### Composables

- [ ] T105 [SC-US4] Create usePayment composable in `src/composables/usePayment.ts`

### Components

- [ ] T106 [P] [SC-US4] Create PaymentDialog.vue in `src/components/pos/PaymentDialog.vue`
- [ ] T107 [P] [SC-US4] Create CashPayment.vue in `src/components/pos/CashPayment.vue`
- [ ] T108 [P] [SC-US4] Create CardPayment.vue in `src/components/pos/CardPayment.vue`
- [ ] T109 [P] [SC-US4] Create EWalletPayment.vue in `src/components/pos/EWalletPayment.vue`
- [ ] T110 [SC-US4] Create SplitPayment.vue in `src/components/pos/SplitPayment.vue`

**Checkpoint**: All payment methods work; split payments supported

---

## Phase 13: Sales & Checkout - US5 (BIR-Compliant Receipt)

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: Generate receipts with all BIR-required fields

**Independent Test**: Print receipt and verify all required fields present

### Types

- [ ] T111 [P] [SC-US5] Create ORSeries type in `src/types/orSeries.ts`
- [ ] T112 [P] [SC-US5] Create Receipt type in `src/types/receipt.ts`

### Repositories

- [ ] T113 [SC-US5] Create orSeriesRepository in `src/repositories/orSeriesRepository.ts`

### Utils

- [ ] T114 [SC-US5] Create orGenerator in `src/utils/orGenerator.ts` (getNextORNumber, formatORNumber)
- [ ] T115 [SC-US5] Create receiptFormatter in `src/utils/receiptFormatter.ts` (formatReceipt, formatBIRFields)

### Services

- [ ] T116 [SC-US5] Create receiptService in `src/services/receiptService.ts` (generateReceipt, printReceipt)
- [ ] T117 [SC-US5] Create orSeriesService in `src/services/orSeriesService.ts` (getCurrentSeries, incrementOR, checkSeriesExhaustion)

### Store

- [ ] T118 [SC-US5] Create orSeries store in `src/stores/orSeries.ts` (currentSeries, seriesAlert)

### Composables

- [ ] T119 [SC-US5] Create useReceipt composable in `src/composables/useReceipt.ts`
- [ ] T120 [SC-US5] Create useORNumber composable in `src/composables/useORNumber.ts`

### Components

- [ ] T121 [P] [SC-US5] Create ReceiptPreview.vue in `src/components/pos/ReceiptPreview.vue`
- [ ] T122 [P] [SC-US5] Create ReceiptTemplate.vue in `src/components/pos/ReceiptTemplate.vue` (BIR format)
- [ ] T123 [SC-US5] Create PrintButton.vue in `src/components/pos/PrintButton.vue`

### Seeders

- [ ] T124 [SC-US5] Create OR series seeder in `src/db/seeders/orSeries.ts`

**Checkpoint**: Receipts contain all BIR fields; OR numbers sequential; print works

---

## Phase 14: Sales & Checkout - US9 (Offline Mode Operation)

**Feature**: 002-sales-checkout | **Priority**: P1
**Goal**: Full POS operation without network connectivity

**Independent Test**: Disconnect network, process 10 sales, reconnect, verify sync

### Services

- [ ] T125 [SC-US9] Create transactionSyncService in `src/services/transactionSyncService.ts` (queueForSync, syncPending, handleConflicts)
- [ ] T126 [SC-US9] Create offlineStatusService in `src/services/offlineStatusService.ts` (checkConnectivity, onOnline, onOffline)

### Store

- [ ] T127 [SC-US9] Create sync store in `src/stores/sync.ts` (pendingSync, lastSyncTime, syncStatus)

### Components

- [ ] T128 [P] [SC-US9] Create OfflineIndicator.vue in `src/components/common/OfflineIndicator.vue`
- [ ] T129 [P] [SC-US9] Create SyncStatus.vue in `src/components/common/SyncStatus.vue`
- [ ] T130 [SC-US9] Create PendingSyncList.vue in `src/components/admin/PendingSyncList.vue`

### Composables

- [ ] T131 [SC-US9] Create useOfflineSync composable in `src/composables/useOfflineSync.ts`

### Integration

- [ ] T132 [SC-US9] Add offline detection to app initialization
- [ ] T133 [SC-US9] Add automatic sync trigger on connectivity restoration
- [ ] T134 [SC-US9] Add sync status to POSTerminal header

**Checkpoint**: All sales work offline; automatic sync on reconnect; no data loss

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Integration, refinement, and validation across all P1 features

### Integration Tasks

- [ ] T135 [P] Update cart to deduct stock on sale completion
- [ ] T136 [P] Link transactions to active shift
- [ ] T137 [P] Add permission checks to all admin components
- [ ] T138 Add shift transaction totals calculation

### Validation & Testing

- [ ] T139 [P] Run quickstart.md verification for user-management
- [ ] T140 [P] Run quickstart.md verification for product-inventory
- [ ] T141 [P] Run quickstart.md verification for sales-checkout
- [ ] T142 End-to-end test: Login → Start Shift → Add Product → Make Sale → Print Receipt → End Shift

### Documentation

- [ ] T143 [P] Update README with setup instructions
- [ ] T144 [P] Document offline-first architecture decisions

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → All User Story Phases
                                         ↓
                          ┌──────────────┼──────────────┐
                          ↓              ↓              ↓
                    UM Stories     PI Stories     SC Stories
                    (Phase 3-5)    (Phase 6-8)    (Phase 9-14)
                          ↓              ↓              ↓
                          └──────────────┼──────────────┘
                                         ↓
                                  Phase 15 (Polish)
```

### Feature Dependencies

1. **User Management (003)**: No dependencies - start first
2. **Product & Inventory (001)**: Depends on UM-US1 (authentication) and UM-US2 (permissions)
3. **Sales & Checkout (002)**: Depends on all User Management + all Product Inventory P1 stories

### Within Feature Phases (Sequential)

- **UM**: US1 (Auth) → US2 (RBAC) → US3 (Shifts)
- **PI**: US1 (Products) → US2 (Variants) → US3 (Stock)
- **SC**: US1 (Basic Sale) → US2 (Search) → US3 (VAT) → US4 (Payments) → US5 (Receipt) → US9 (Offline)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Within each user story, components marked [P] can be developed in parallel
- Different developers can work on different features once Phase 2 completes

---

## Implementation Strategy

### MVP Path (Minimum Viable POS)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Complete UM-US1 (Login) + UM-US2 (RBAC) + UM-US3 (Shifts)
3. Complete PI-US1 (Products) + PI-US3 (Stock) - skip variants for MVP
4. Complete SC-US1 (Basic Sale) + SC-US3 (VAT) + SC-US5 (Receipt)
5. **STOP**: Functional POS that can login, manage products, make sales, print receipts

### Full P1 Implementation

1. Follow all phases sequentially
2. Each checkpoint validates the story independently
3. Phase 15 validates complete integration

### Team Distribution

With 2-3 developers after Phase 2:
- **Dev A**: User Management (Phases 3-5)
- **Dev B**: Product & Inventory (Phases 6-8)
- **Dev C**: Sales & Checkout (Phases 9-14) - after PI basics ready

---

## Notes

- All tasks follow offline-first principle - SQLite operations only
- BIR compliance is validated at receipt generation (Phase 13)
- Stock levels are derived from movement history, never direct edits
- OR numbers must be sequential with no gaps - critical for BIR audit
- Supervisor authentication required for voids/refunds (implemented in UM-US2)
- [P] tasks can run in parallel within the same phase
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
