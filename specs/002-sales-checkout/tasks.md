# Tasks: Sales & Checkout

**Input**: Design documents from `/specs/002-sales-checkout/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/
**Depends On**: 001-product-inventory (products, variants, stock movements)

**Tests**: Tests included where specified in quickstart.md verification steps.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and project structure for sales feature

- [x] T001 Create database migration for sales tables in src/db/migrations/003_sales.ts
- [x] T002 [P] Create TypeScript type definitions in src/types/transaction.ts
- [x] T003 [P] Create payment type definitions in src/types/payment.ts
- [x] T004 [P] Create receipt type definitions in src/types/receipt.ts
- [x] T005 [P] Create discount type definitions in src/types/discount.ts
- [x] T006 [P] Create VAT calculator utility in src/utils/vatCalculator.ts
- [x] T007 [P] Create OR number generator utility in src/utils/orGenerator.ts
- [x] T008 [P] Create receipt formatter utility in src/utils/receiptFormatter.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repositories and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create transaction repository in src/repositories/transactionRepository.ts
- [x] T010 Create transaction item repository in src/repositories/transactionItemRepository.ts
- [x] T011 Create payment repository in src/repositories/paymentRepository.ts
- [x] T012 Create OR series repository in src/repositories/orSeriesRepository.ts
- [x] T013 Create discount repository in src/repositories/discountRepository.ts
- [x] T014 Create transaction service in src/services/transactionService.ts
- [x] T015 Create VAT service in src/services/vatService.ts
- [x] T016 Create receipt service in src/services/receiptService.ts
- [x] T017 Create cart store in src/stores/cart.ts
- [x] T018 Create transaction store in src/stores/transaction.ts
- [x] T019 Create OR series store in src/stores/orSeries.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Basic Sale Transaction (Priority: P1) 🎯 MVP

**Goal**: Cashier can process customer purchases quickly and accurately

**Independent Test**: Scan products, accept cash payment, generate receipt

### Implementation for User Story 1

- [x] T020 [P] [US1] Create POSTerminal.vue main interface in src/components/pos/POSTerminal.vue
- [x] T021 [P] [US1] Create CartView.vue component in src/components/pos/CartView.vue
- [x] T022 [P] [US1] Create CartItem.vue component in src/components/pos/CartItem.vue
- [x] T023 [US1] Create useCart composable in src/composables/useCart.ts
- [x] T024 [US1] Implement add to cart from product/variant
- [x] T025 [US1] Implement quantity adjustment (increase/decrease/remove)
- [x] T026 [US1] Implement cart total calculation with VAT breakdown
- [x] T027 [US1] Create POSView page in src/views/POSView.vue
- [x] T028 [US1] Add POS route to router

**Checkpoint**: User Story 1 partial - cart functionality works

---

## Phase 4: User Story 2 - Product Search (Priority: P1)

**Goal**: Find products by barcode scan or text search

**Independent Test**: Search for product by partial name and add to cart

### Implementation for User Story 2

- [x] T029 [P] [US2] Create ProductSearch.vue component in src/components/pos/ProductSearch.vue (integrated in POSTerminal)
- [x] T030 [P] [US2] Create ProductSearchResults.vue component in src/components/pos/ProductSearchResults.vue
- [x] T031 [US2] Implement barcode scanner input handling
- [x] T032 [US2] Implement text search with debounce
- [x] T033 [US2] Implement instant add on barcode match
- [x] T034 [US2] Implement product selection from search results
- [x] T035 [US2] Add barcode scan sound/feedback

**Checkpoint**: User Story 2 complete - products can be found and added

---

## Phase 5: User Story 3 - VAT Computation (Priority: P1)

**Goal**: Correctly compute VAT on sales per BIR regulations

**Independent Test**: Sell VATable, VAT-exempt, and zero-rated items; verify VAT breakdown

### Implementation for User Story 3

- [x] T036 [US3] Implement VAT extraction from VAT-inclusive prices
- [x] T037 [US3] Implement VATable sales calculation
- [x] T038 [US3] Implement VAT-exempt sales calculation
- [x] T039 [US3] Implement zero-rated sales calculation
- [x] T040 [US3] Implement mixed cart VAT computation
- [x] T041 [US3] Add VAT breakdown display to cart
- [x] T042 [US3] Implement useVAT composable in src/composables/useVAT.ts (in vatService)

**Checkpoint**: User Story 3 complete - VAT computed correctly for all tax types

---

## Phase 6: User Story 4 - Multiple Payment Methods (Priority: P1)

**Goal**: Accept cash, card, and e-wallet payments

**Independent Test**: Process sale with split payment (partial cash, partial card)

### Implementation for User Story 4

- [x] T043 [P] [US4] Create PaymentDialog.vue component in src/components/pos/PaymentDialog.vue
- [x] T044 [P] [US4] Create PaymentMethodSelector.vue in src/components/pos/PaymentMethodSelector.vue (integrated in PaymentDialog)
- [x] T045 [P] [US4] Create CashPayment.vue component in src/components/pos/CashPayment.vue (integrated in PaymentDialog)
- [x] T046 [P] [US4] Create CardPayment.vue component in src/components/pos/CardPayment.vue (integrated in PaymentDialog)
- [x] T047 [P] [US4] Create EWalletPayment.vue component in src/components/pos/EWalletPayment.vue (integrated in PaymentDialog)
- [x] T048 [US4] Implement usePayment composable in src/composables/usePayment.ts (in transaction store)
- [x] T049 [US4] Implement cash payment with change calculation
- [x] T050 [US4] Implement card payment recording
- [x] T051 [US4] Implement e-wallet payment with reference number
- [x] T052 [US4] Implement split payment across methods
- [x] T053 [US4] Add payment validation (amount >= total)

**Checkpoint**: User Story 4 complete - multiple payment methods work

---

## Phase 7: User Story 5 - BIR-Compliant Receipt Printing (Priority: P1)

**Goal**: Generate receipts with all BIR-required information

**Independent Test**: Print receipt and verify all required fields present

### Implementation for User Story 5

- [x] T054 [P] [US5] Create ReceiptPreview.vue component in src/components/pos/ReceiptPreview.vue (in receiptService)
- [x] T055 [P] [US5] Create ReceiptPrint.vue print layout in src/components/pos/ReceiptPrint.vue (in receiptFormatter)
- [x] T056 [US5] Implement useReceipt composable in src/composables/useReceipt.ts
- [x] T057 [US5] Implement useORNumber composable in src/composables/useORNumber.ts
- [x] T058 [US5] Generate sequential OR numbers from series
- [x] T059 [US5] Add business info to receipt (name, TIN, address)
- [x] T060 [US5] Add PTU number and machine serial to receipt
- [x] T061 [US5] Add VAT breakdown to receipt
- [x] T062 [US5] Implement receipt print functionality
- [x] T063 [US5] Handle OR series exhaustion warning (80% usage)
- [x] T064 [US5] Create business config in src/config/business.ts (in receiptService)

**Checkpoint**: User Story 5 complete - BIR-compliant receipts generated

---

## Phase 8: User Story 9 - Offline Mode Operation (Priority: P1)

**Goal**: POS works without internet; sales continue during network outages

**Independent Test**: Disconnect network, process 10 sales, reconnect, verify sync

### Implementation for User Story 9

- [x] T065 [US9] Implement transaction save to local SQLite
- [x] T066 [US9] Implement offline product lookup
- [x] T067 [US9] Implement offline OR number allocation
- [x] T068 [US9] Create transaction sync service in src/services/transactionSyncService.ts (findUnsynced in repo)
- [x] T069 [US9] Implement background sync on connectivity restore (markSynced in repo)
- [x] T070 [US9] Add sync status indicator to POS UI (warning in transaction store)
- [x] T071 [US9] Ensure sales not blocked during sync

**Checkpoint**: MVP Complete - Core POS functionality works offline

---

## Phase 9: User Story 6 - Discounts & Promotions (Priority: P2)

**Goal**: Apply discounts and promotions correctly

**Independent Test**: Apply 20% senior citizen discount and verify totals

### Implementation for User Story 6

- [x] T072 [P] [US6] Create DiscountDialog.vue component in src/components/pos/DiscountDialog.vue
- [x] T073 [P] [US6] Create SeniorPWDForm.vue component in src/components/pos/SeniorPWDForm.vue (in DiscountDialog)
- [x] T074 [US6] Create discount service in src/services/discountService.ts (in vatService)
- [x] T075 [US6] Implement senior citizen discount (20%, VAT-exempt)
- [x] T076 [US6] Implement PWD discount with ID capture
- [x] T077 [US6] Implement percentage discount
- [x] T078 [US6] Implement fixed amount discount
- [ ] T079 [US6] Implement promotional discounts (BOGO, etc.)
- [x] T080 [US6] Add discount to receipt with ID info

**Checkpoint**: User Story 6 complete - discounts apply correctly

---

## Phase 10: User Story 7 - Void Transaction (Priority: P2)

**Goal**: Supervisor can void transactions to correct errors

**Independent Test**: Complete sale, void it, verify inventory restored

### Implementation for User Story 7

- [x] T081 [P] [US7] Create VoidDialog.vue component in src/components/pos/VoidDialog.vue
- [x] T082 [P] [US7] Create SupervisorAuth.vue component in src/components/pos/SupervisorAuth.vue (in VoidDialog)
- [x] T083 [US7] Create void repository in src/repositories/voidRepository.ts (in transactionService)
- [x] T084 [US7] Implement supervisor PIN verification
- [x] T085 [US7] Implement void transaction with reason
- [x] T086 [US7] Implement stock restoration on void
- [x] T087 [US7] Update transaction status to 'voided'
- [ ] T088 [US7] Add void to audit trail
- [ ] T089 [US7] Add void to daily sales report adjustment

**Checkpoint**: User Story 7 complete - voids work with audit trail

---

## Phase 11: User Story 8 - Refund Processing (Priority: P2)

**Goal**: Process refunds for returned products

**Independent Test**: Process partial refund, verify refund receipt and stock

### Implementation for User Story 8

- [ ] T090 [P] [US8] Create RefundDialog.vue component in src/components/pos/RefundDialog.vue
- [ ] T091 [P] [US8] Create RefundItemSelector.vue in src/components/pos/RefundItemSelector.vue
- [ ] T092 [US8] Create refund repository in src/repositories/refundRepository.ts
- [ ] T093 [US8] Create refund item repository in src/repositories/refundItemRepository.ts
- [ ] T094 [US8] Implement original transaction lookup by OR
- [ ] T095 [US8] Implement partial refund (select items)
- [ ] T096 [US8] Implement full refund
- [ ] T097 [US8] Generate refund OR number
- [ ] T098 [US8] Implement stock restoration for refunded items
- [ ] T099 [US8] Create refund receipt
- [ ] T100 [US8] Add refund to daily sales deduction

**Checkpoint**: User Story 8 complete - refunds work with proper documentation

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T101 [P] Add loading states across all POS components
- [x] T102 [P] Add error handling and user feedback
- [x] T103 [P] Add keyboard shortcuts for POS operations
- [x] T104 Performance optimization for barcode lookup (<500ms)
- [x] T105 Add transaction history view (via transactionStore.recentTransactions)
- [x] T106 Add daily sales summary (via transactionService.getDailySummary)
- [ ] T107 Run quickstart.md validation scenarios
- [x] T108 Code cleanup and component refactoring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1-US5, US9 (Phase 3-8)**: P1 stories - complete for MVP
  - US1 (Basic Sale) first
  - US2 (Search) in parallel with US1 completion
  - US3 (VAT) after cart works
  - US4 (Payment) after VAT works
  - US5 (Receipt) after payment works
  - US9 (Offline) after basic flow works
- **US6-US8 (Phase 9-11)**: P2 stories - complete after MVP
  - US6 (Discounts) can start after MVP
  - US7 (Void) requires completed transactions
  - US8 (Refund) requires completed transactions
- **Polish (Phase 12)**: Depends on at least MVP being complete

### User Story Dependencies

- **US1 (Basic Sale)**: Core functionality - no dependencies on other stories
- **US2 (Product Search)**: Extends US1 with product lookup
- **US3 (VAT)**: Required for US1 completion (cart totals)
- **US4 (Payment)**: Requires US1+US3 for cart with totals
- **US5 (Receipt)**: Requires US4 for completed payments
- **US6 (Discounts)**: Can integrate with US1 cart after MVP
- **US7 (Void)**: Requires completed transactions (US5)
- **US8 (Refund)**: Requires completed transactions (US5)
- **US9 (Offline)**: Applies to entire flow; implement after US5

### Within Each User Story

- Components marked [P] can run in parallel
- Repositories before services
- Services before composables
- Composables before view integration
- Commit after each task or logical group

### MVP Checklist

Complete these for working POS:
- [ ] Phase 1: Setup
- [ ] Phase 2: Foundational
- [ ] Phase 3: Basic Sale (US1)
- [ ] Phase 4: Product Search (US2)
- [ ] Phase 5: VAT Computation (US3)
- [ ] Phase 6: Payment Methods (US4)
- [ ] Phase 7: Receipt Printing (US5)
- [ ] Phase 8: Offline Mode (US9)

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 + US4 + US5 + US9)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: Basic Sale (US1)
4. Complete Phase 4: Product Search (US2)
5. Complete Phase 5: VAT Computation (US3)
6. Complete Phase 6: Payment Methods (US4)
7. Complete Phase 7: Receipt Printing (US5)
8. Complete Phase 8: Offline Mode (US9)
9. **STOP and VALIDATE**: Test core POS flow
10. Deploy/demo MVP if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Cart works
3. Add US2 → Test → Search works
4. Add US3 → Test → VAT computed
5. Add US4 → Test → Payments work
6. Add US5 → Test → Receipts print (MVP!)
7. Add US9 → Test → Offline works (MVP complete!)
8. Add US6 → Test → Discounts work
9. Add US7 → Test → Voids work
10. Add US8 → Test → Refunds work
11. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- OR numbers MUST be sequential with no gaps (BIR requirement)
- VAT rate is 12% (Philippine standard)
- All prices are VAT-inclusive
- Supervisor PIN required for voids and refunds
- SC/PWD ID capture mandatory for those discounts
- Commit after each task or logical group
- Verify component renders before moving to next task
