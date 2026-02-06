# Feature Specification: Cash Drawer Management

**Feature Branch**: `009-cash-drawer`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P4 (Low)
**Input**: PRD Section 2.1.2 - Cash drawer management (last in priority)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Opening Count (Priority: P1)

As a cashier starting my shift, I need to count and record opening cash so that I can be accountable for my drawer.

**Why this priority**: Opening count establishes baseline for shift reconciliation.

**Independent Test**: Can be fully tested by logging in, entering opening count by denomination, and verifying the total.

**Acceptance Scenarios**:

1. **Given** I start my shift, **When** I enter opening cash count, **Then** system records the amount with timestamp
2. **Given** I am counting cash, **When** I enter by denomination (bills and coins), **Then** system calculates total automatically
3. **Given** I complete opening count, **When** I confirm, **Then** my drawer is officially "open" and I can process sales
4. **Given** I work offline, **When** I enter opening count, **Then** it is recorded locally for later sync

---

### User Story 2 - Closing Count & Reconciliation (Priority: P1)

As a cashier ending my shift, I need to count and reconcile cash so that I know if my drawer is over or short.

**Why this priority**: Closing reconciliation is critical for cash accountability.

**Independent Test**: Can be tested by processing sales, then closing shift and verifying expected vs actual calculation.

**Acceptance Scenarios**:

1. **Given** I am ending my shift, **When** I enter closing count by denomination, **Then** system calculates total
2. **Given** I enter closing count, **When** I submit, **Then** system shows expected cash (opening + cash sales - cash refunds)
3. **Given** expected vs actual differs, **When** I view reconciliation, **Then** I see the over/short amount clearly
4. **Given** I have a variance, **When** I submit close, **Then** I must enter a reason if over/short exceeds threshold

---

### User Story 3 - Cash Drop (Float) (Priority: P2)

As a supervisor, I need to remove excess cash from the drawer so that the drawer doesn't have too much cash.

**Why this priority**: Security practice to limit cash exposure; operations work without formal drops.

**Independent Test**: Can be tested by performing a cash drop and verifying the expected drawer balance adjusts.

**Acceptance Scenarios**:

1. **Given** drawer has excess cash, **When** supervisor performs cash drop, **Then** amount is recorded and expected balance decreases
2. **Given** a cash drop is made, **When** I view shift report, **Then** the drop is listed with timestamp and supervisor ID
3. **Given** I perform a drop, **When** I enter the amount, **Then** system shows new expected drawer balance
4. **Given** a drop is recorded, **When** shift closes, **Then** reconciliation accounts for all drops

---

### User Story 4 - Cash Paid In (Priority: P2)

As a supervisor, I need to add cash to the drawer so that I can provide change for the cashier.

**Why this priority**: Operational need when drawer runs low on small denominations.

**Independent Test**: Can be tested by adding cash and verifying expected drawer balance increases.

**Acceptance Scenarios**:

1. **Given** drawer needs more change, **When** supervisor performs paid-in, **Then** amount is recorded and expected balance increases
2. **Given** a paid-in is made, **When** I view shift report, **Then** the paid-in is listed with reason and supervisor ID
3. **Given** I perform paid-in, **When** shift closes, **Then** reconciliation accounts for all paid-ins

---

### User Story 5 - Drawer Hardware Integration (Priority: P3)

As a merchant, I want the cash drawer to open automatically so that cashiers don't need to manually open it.

**Why this priority**: Convenience feature; manual drawer operation is acceptable.

**Independent Test**: Can be tested by completing a cash sale and verifying the drawer opens automatically.

**Acceptance Scenarios**:

1. **Given** a cash sale is completed, **When** I finalize payment, **Then** the connected cash drawer opens automatically
2. **Given** I need to open drawer manually, **When** supervisor uses "no sale" function, **Then** drawer opens with audit log
3. **Given** drawer is not connected, **When** I process a cash sale, **Then** system notifies that manual drawer open is needed
4. **Given** drawer hardware fails, **When** I process sales, **Then** sales continue uninterrupted (graceful degradation)

---

### User Story 6 - Cash Variance Reporting (Priority: P3)

As a supervisor, I need reports on cash variances so that I can identify patterns and training needs.

**Why this priority**: Management analytics; basic accountability works without trend analysis.

**Independent Test**: Can be tested by generating variance report for a period and verifying accuracy.

**Acceptance Scenarios**:

1. **Given** shifts have variances, **When** I generate variance report, **Then** I see all variances by cashier and shift
2. **Given** I need pattern analysis, **When** I view report, **Then** I see total over/short by cashier over time
3. **Given** variance exceeds threshold, **When** I view alerts, **Then** I see flagged shifts requiring review
4. **Given** I drill into a shift, **When** I view details, **Then** I see the denomination count and reconciliation

---

### Edge Cases

- What happens if opening count is forgotten and sales start? (System requires opening count before first transaction)
- What happens when cash drawer hardware is disconnected mid-shift? (System continues; logs hardware error; manual drawer use)
- How does system handle shift close without physical cash count? (Supervisor override required; logged as unverified close)
- What happens when expected cash is negative due to refunds? (System allows; flags for review; likely indicates error)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require opening cash count before shift can begin
- **FR-002**: System MUST support denomination-based cash counting
- **FR-003**: System MUST calculate expected cash balance throughout shift
- **FR-004**: System MUST perform closing reconciliation with variance calculation
- **FR-005**: System MUST require reason for variances exceeding threshold (configurable)
- **FR-006**: System MUST support cash drops with supervisor authorization
- **FR-007**: System MUST support cash paid-ins with supervisor authorization
- **FR-008**: System MUST log all drawer operations with timestamp and user
- **FR-009**: System MUST support automatic drawer opening on cash transactions (hardware dependent)
- **FR-010**: System MUST support "no sale" drawer open with audit trail
- **FR-011**: System MUST generate variance reports by cashier, shift, and period
- **FR-012**: System MUST work offline for all drawer operations

### Key Entities

- **DrawerSession**: Shift cash tracking - cashier, terminal, opening amount, expected amount, closing amount, status
- **DrawerOperation**: Cash movement - session reference, type (open/close/drop/paid-in/no-sale), amount, reason, user, timestamp
- **DenominationCount**: Cash breakdown - operation reference, denomination (coin/bill value), quantity, subtotal
- **VarianceRecord**: Over/short tracking - session reference, expected, actual, variance, reason, reviewed by

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening and closing counts complete in under 2 minutes each
- **SC-002**: Expected cash calculation is 100% accurate based on recorded transactions
- **SC-003**: Variance threshold alerts trigger correctly 100% of the time
- **SC-004**: Cash drawer opens within 1 second of cash sale completion (when hardware connected)
- **SC-005**: 95% of shifts close with variance under PHP 100
- **SC-006**: All drawer operations are logged with 100% capture rate
- **SC-007**: Variance reports generate in under 5 seconds
- **SC-008**: Offline drawer operations sync correctly upon connectivity

## Assumptions

- Cash drawer uses standard kick-drawer interface (RJ11 connected to receipt printer)
- Denomination breakdown includes Philippine currency: PHP 1000, 500, 200, 100, 50, 20 bills; PHP 10, 5, 1, 0.25 coins
- Variance threshold defaults to PHP 100 (configurable per merchant)
- Opening cash (float) defaults to PHP 5,000 (configurable)
- Cash drops and paid-ins require supervisor PIN
- Multiple drawers per terminal not supported in v1
