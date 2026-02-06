# Feature Specification: Sales & Checkout

**Feature Branch**: `002-sales-checkout`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P1 (Critical)
**Input**: PRD Section 2.1.2 - Sales & Checkout

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Sale Transaction (Priority: P1)

As a cashier, I need to process customer purchases quickly so that I can serve customers efficiently and accurately.

**Why this priority**: This is the core POS function. Without sales processing, the system has no value.

**Independent Test**: Can be fully tested by scanning products, accepting cash payment, and generating a receipt.

**Acceptance Scenarios**:

1. **Given** I am logged in as a cashier, **When** I scan a product barcode, **Then** the product is added to the current transaction with correct price
2. **Given** products are in the cart, **When** I accept cash payment equal to or greater than total, **Then** the transaction completes and change is calculated
3. **Given** a transaction is complete, **When** the receipt prints, **Then** it contains all BIR-required information
4. **Given** I am offline, **When** I complete a sale, **Then** the transaction is saved locally with a unique ID for later sync

---

### User Story 2 - Product Search (Priority: P1)

As a cashier, I need to find products by barcode scan or text search so that I can add items to the cart even without a barcode.

**Why this priority**: Not all products have scannable barcodes; manual lookup is essential for POS usability.

**Independent Test**: Can be tested by searching for a product by partial name and adding it to the cart.

**Acceptance Scenarios**:

1. **Given** I have a barcode scanner, **When** I scan a valid barcode, **Then** the product is found and added to cart instantly
2. **Given** a product has no barcode, **When** I type partial product name, **Then** matching products appear for selection
3. **Given** I search for a product, **When** multiple matches exist, **Then** I can select the correct one from a list
4. **Given** I am offline, **When** I search for products, **Then** search works using local database

---

### User Story 3 - VAT Computation (Priority: P1)

As a business owner, I need the system to correctly compute VAT on sales so that I am compliant with BIR tax regulations.

**Why this priority**: BIR compliance is non-negotiable; incorrect VAT computation can result in penalties.

**Independent Test**: Can be tested by selling VATable, VAT-exempt, and zero-rated items and verifying VAT breakdown on receipt.

**Acceptance Scenarios**:

1. **Given** a VATable product priced at PHP 112, **When** I complete the sale, **Then** the receipt shows VATable Sales: PHP 100, VAT: PHP 12
2. **Given** a VAT-exempt product, **When** I complete the sale, **Then** the receipt shows VAT-Exempt Sales with zero VAT
3. **Given** a zero-rated product, **When** I complete the sale, **Then** the receipt shows Zero-Rated Sales with zero VAT
4. **Given** a mixed cart with VATable and exempt items, **When** I complete the sale, **Then** VAT is computed only on VATable items

---

### User Story 4 - Multiple Payment Methods (Priority: P1)

As a cashier, I need to accept various payment methods so that customers can pay however they prefer.

**Why this priority**: Modern retail requires multiple payment options; cash-only limits sales.

**Independent Test**: Can be tested by processing a sale with split payment (partial cash, partial card).

**Acceptance Scenarios**:

1. **Given** a transaction total of PHP 500, **When** customer pays PHP 500 cash, **Then** transaction completes with payment method recorded as cash
2. **Given** a transaction total of PHP 500, **When** customer pays by card, **Then** I record the card payment and transaction completes
3. **Given** a transaction total of PHP 500, **When** customer pays PHP 300 cash and PHP 200 card, **Then** both payments are recorded and transaction completes
4. **Given** e-wallet payment (GCash, Maya), **When** customer shows payment confirmation, **Then** I record e-wallet payment with reference number

---

### User Story 5 - BIR-Compliant Receipt Printing (Priority: P1)

As a business owner, I need receipts to contain all BIR-required information so that my business remains compliant.

**Why this priority**: BIR compliance is legally required; non-compliant receipts can result in business closure.

**Independent Test**: Can be tested by printing a receipt and verifying all required fields are present.

**Acceptance Scenarios**:

1. **Given** a sale is complete, **When** receipt prints, **Then** it shows business name, address, TIN, and branch code
2. **Given** a sale is complete, **When** receipt prints, **Then** it shows PTU number and machine serial number
3. **Given** a sale is complete, **When** receipt prints, **Then** it shows sequential OR number with no gaps
4. **Given** a sale is complete, **When** receipt prints, **Then** it shows VAT breakdown (VATable Sales, VAT Amount, VAT-Exempt, Zero-Rated)
5. **Given** I am offline, **When** receipt prints, **Then** OR number is still sequential and unique (from pre-allocated range)

---

### User Story 6 - Discounts & Promotions (Priority: P2)

As a cashier, I need to apply discounts and promotions so that customers receive correct pricing and promotional offers.

**Why this priority**: Discounts are common but the core POS can operate with manual price overrides initially.

**Independent Test**: Can be tested by applying a 20% senior citizen discount and verifying the discounted total.

**Acceptance Scenarios**:

1. **Given** a senior citizen discount of 20%, **When** I apply it to VAT-exempt eligible items, **Then** discount is applied and VAT is exempt
2. **Given** a PWD discount of 20%, **When** I apply it, **Then** I must enter PWD ID number for audit trail
3. **Given** a promotional discount (buy 1 get 1), **When** qualifying products are in cart, **Then** promotion auto-applies
4. **Given** multiple discounts could apply, **When** I select one, **Then** system uses the most beneficial discount (or as configured)

---

### User Story 7 - Void Transaction (Priority: P2)

As a supervisor, I need to void transactions so that I can correct cashier errors or handle customer cancellations.

**Why this priority**: Essential for error correction but requires supervisor controls; basic sales work without this.

**Independent Test**: Can be tested by completing a sale, then voiding it and verifying inventory and sales totals adjust.

**Acceptance Scenarios**:

1. **Given** a completed transaction, **When** supervisor voids it with reason, **Then** a void record is created (original transaction unchanged)
2. **Given** a void is processed, **When** I check inventory, **Then** stock levels are restored
3. **Given** a void is processed, **When** I check sales reports, **Then** void is reflected with supervisor ID and reason
4. **Given** I am a cashier (not supervisor), **When** I try to void, **Then** system requires supervisor authentication

---

### User Story 8 - Refund Processing (Priority: P2)

As a supervisor, I need to process refunds so that customers can return products and receive their money back.

**Why this priority**: Customer service essential but requires controls; basic sales work without this.

**Independent Test**: Can be tested by processing a refund against an original OR and verifying a refund receipt is generated.

**Acceptance Scenarios**:

1. **Given** an original transaction, **When** I process a partial refund, **Then** refund receipt references original OR number
2. **Given** a refund is processed, **When** inventory is checked, **Then** returned items are back in stock (or marked for inspection)
3. **Given** a refund is processed, **When** checking daily sales, **Then** refund amount is deducted from gross sales
4. **Given** I am a cashier, **When** I try to process refund, **Then** supervisor authentication is required

---

### User Story 9 - Offline Mode Operation (Priority: P1)

As a cashier, I need the POS to work without internet so that sales continue even during network outages.

**Why this priority**: Constitution Principle I - Offline-First. Network issues must never block sales.

**Independent Test**: Can be tested by disconnecting network, processing 10 sales, reconnecting, and verifying all sync correctly.

**Acceptance Scenarios**:

1. **Given** network is unavailable, **When** I process a sale, **Then** sale completes using local SQLite database
2. **Given** I am offline, **When** I scan products, **Then** product lookup uses locally synced product catalog
3. **Given** I was offline and processed sales, **When** network restores, **Then** all transactions sync to server automatically
4. **Given** sync is in progress, **When** I continue selling, **Then** new sales are not blocked by sync process

---

### Edge Cases

- What happens when receipt printer is offline? (Sale completes; receipt queued for printing; on-screen receipt shown)
- What happens when OR number range is exhausted offline? (System alerts supervisor to sync for new range before allowing more sales)
- How does system handle power failure mid-transaction? (Transaction not saved; cart recoverable from autosave)
- What happens when a voided transaction is attempted to be voided again? (System prevents double void)
- What happens when customer pays with foreign currency? (Not supported in v1; cash drawer tracks PHP only)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow adding products to cart by barcode scan or search
- **FR-002**: System MUST calculate transaction total including all line items
- **FR-003**: System MUST compute VAT correctly for VATable, VAT-exempt, and zero-rated items
- **FR-004**: System MUST support cash, card, and e-wallet payment methods
- **FR-005**: System MUST support split payments across multiple payment methods
- **FR-006**: System MUST calculate and display change for cash payments
- **FR-007**: System MUST generate BIR-compliant receipts with all required fields
- **FR-008**: System MUST maintain sequential OR numbering with no gaps
- **FR-009**: System MUST support senior citizen and PWD discounts with ID capture
- **FR-010**: System MUST support promotional discounts (percentage, fixed amount, BOGO)
- **FR-011**: System MUST require supervisor authentication for voids and refunds
- **FR-012**: System MUST create audit trail for all transactions, voids, and refunds
- **FR-013**: System MUST work fully offline using SQLite for all sales operations
- **FR-014**: System MUST sync transactions to server when connectivity resumes
- **FR-015**: System MUST pre-allocate OR number ranges for offline operation
- **FR-016**: System MUST update stock levels in real-time as sales are processed

### Key Entities

- **Transaction**: Sale record with unique ID, OR number, timestamp, cashier, total, VAT breakdown, status, payment details
- **TransactionItem**: Line item with product reference, quantity, unit price, discount, line total, VAT type
- **Payment**: Payment record with transaction reference, method (cash/card/e-wallet), amount, reference number, timestamp
- **Void**: Void record referencing original transaction, reason, supervisor ID, timestamp (original transaction immutable)
- **Refund**: Refund record referencing original transaction/items, reason, supervisor ID, amount, timestamp
- **ORSeries**: OR number series with prefix, current number, start range, end range, branch assignment
- **Discount**: Discount definition with type (senior/PWD/promo), percentage/amount, conditions, validity period

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cashier can complete a basic sale (scan, pay, receipt) in under 30 seconds
- **SC-002**: Product barcode lookup completes in under 500 milliseconds
- **SC-003**: VAT computation accuracy is 100% compliant with BIR regulations
- **SC-004**: Receipt prints within 3 seconds of payment completion
- **SC-005**: System supports 500+ transactions per day per terminal without degradation
- **SC-006**: Offline sales sync to server within 60 seconds of connectivity restoration
- **SC-007**: 100% of sales operations function without network connectivity
- **SC-008**: OR number sequence has zero gaps across all terminals and branches
- **SC-009**: Void and refund audit trail is 100% complete with supervisor identification
- **SC-010**: Senior/PWD discount application requires ID capture 100% of the time

## Assumptions

- Receipt printer is thermal printer connected via USB or network
- OR number ranges are pre-allocated per terminal (e.g., 0001-10000 for Terminal 1)
- VAT rate is 12% (current Philippine rate) and configurable for future changes
- Senior citizen and PWD discounts are 20% on applicable items (per Philippine law)
- E-wallet payments require manual reference number entry (no direct integration in v1)
- Card payments are processed externally; system records payment for reconciliation
- All prices are VAT-inclusive (standard Philippine retail practice)
