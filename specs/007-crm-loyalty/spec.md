# Feature Specification: CRM & Loyalty Programs

**Feature Branch**: `007-crm-loyalty`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P3 (Medium)
**Input**: PRD Section 2.2.1 - Customer & CRM

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Registration (Priority: P1)

As a cashier, I need to register customers so that I can track their purchases and apply member benefits.

**Why this priority**: Customer records are the foundation for all CRM features.

**Independent Test**: Can be fully tested by registering a customer and associating them with a transaction.

**Acceptance Scenarios**:

1. **Given** I am at checkout, **When** I create a new customer with name and phone, **Then** the customer is saved and linked to current transaction
2. **Given** a customer exists, **When** I search by phone number, **Then** I find the customer and can attach them to the sale
3. **Given** I am offline, **When** I register a customer, **Then** customer is saved locally and syncs when online
4. **Given** a customer is attached to a sale, **When** receipt prints, **Then** customer name appears on receipt

---

### User Story 2 - Purchase History (Priority: P1)

As a store associate, I need to view customer purchase history so that I can provide better service and handle returns.

**Why this priority**: History lookup enables customer service and supports return verification.

**Independent Test**: Can be tested by making purchases for a customer and viewing their history.

**Acceptance Scenarios**:

1. **Given** a customer has made purchases, **When** I view their profile, **Then** I see a list of all their transactions
2. **Given** I am viewing purchase history, **When** I click a transaction, **Then** I see full transaction details
3. **Given** a customer requests a refund, **When** I search their history, **Then** I can find the original transaction
4. **Given** a customer is offline-registered, **When** synced, **Then** their complete history is consolidated

---

### User Story 3 - Loyalty Points Earning (Priority: P2)

As a customer, I want to earn loyalty points on my purchases so that I can redeem rewards later.

**Why this priority**: Points system drives repeat business but store operates without it.

**Independent Test**: Can be tested by making a purchase and verifying points are added to customer account.

**Acceptance Scenarios**:

1. **Given** I am a registered customer, **When** I complete a purchase, **Then** I earn points based on spend (e.g., 1 point per PHP 100)
2. **Given** I complete a purchase, **When** I check my points, **Then** I see updated points balance
3. **Given** a transaction is voided, **When** I check customer points, **Then** points from that transaction are deducted
4. **Given** I am offline, **When** points are earned, **Then** they are recorded locally and sync later

---

### User Story 4 - Points Redemption (Priority: P2)

As a customer, I want to redeem my loyalty points so that I can get discounts on my purchases.

**Why this priority**: Redemption completes the loyalty loop; earning without redemption has limited value.

**Independent Test**: Can be tested by accumulating points and applying them to reduce a transaction total.

**Acceptance Scenarios**:

1. **Given** I have 1000 points, **When** I redeem 500 points, **Then** I receive PHP 50 discount (at 10 points = PHP 1)
2. **Given** I try to redeem more points than I have, **When** I attempt redemption, **Then** system shows error
3. **Given** I redeem points, **When** transaction is voided, **Then** redeemed points are returned to my account
4. **Given** I am offline, **When** points redemption occurs, **Then** it is recorded locally with later sync

---

### User Story 5 - Membership Tiers (Priority: P3)

As a business owner, I want to offer membership tiers so that I can reward my best customers with special pricing.

**Why this priority**: Advanced CRM feature; basic loyalty works without tiers.

**Independent Test**: Can be tested by creating a Gold tier with 10% discount and verifying it applies at checkout.

**Acceptance Scenarios**:

1. **Given** I configure a Gold tier with 10% discount, **When** Gold member checks out, **Then** discount auto-applies
2. **Given** a customer reaches Gold threshold (e.g., PHP 50,000 lifetime spend), **When** they next visit, **Then** they are upgraded to Gold
3. **Given** I view customer profile, **When** I check their tier, **Then** I see current tier and progress to next tier
4. **Given** a tier has special pricing, **When** member purchases, **Then** member price is used instead of regular price

---

### User Story 6 - Customer Insights (Priority: P3)

As a store manager, I want customer analytics so that I can understand buying patterns and target marketing.

**Why this priority**: Strategic tool for marketing; operations work without it.

**Independent Test**: Can be tested by generating a customer report showing top customers by spend.

**Acceptance Scenarios**:

1. **Given** I view customer insights, **When** I filter by date range, **Then** I see top customers ranked by spend
2. **Given** I view a customer, **When** I see their profile, **Then** I see average transaction value, visit frequency
3. **Given** I need to identify inactive customers, **When** I run a report, **Then** I see customers who haven't purchased in 30+ days
4. **Given** I need to send promotions, **When** I export customer list, **Then** I get contacts for email/SMS marketing

---

### Edge Cases

- What happens when a customer is merged (duplicate found)? (Transactions and points consolidated; audit trail created)
- What happens when points expire? (Points have expiry date; expired points archived but visible in history)
- How does system handle points when customer is not identified at checkout? (Points not earned; cannot retroactively apply)
- What happens when loyalty program rules change? (Changes apply to new transactions; existing points unaffected)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow customer registration with name, phone, email (optional)
- **FR-002**: System MUST search customers by phone number or name
- **FR-003**: System MUST track purchase history per customer
- **FR-004**: System MUST calculate and award loyalty points based on configurable rules
- **FR-005**: System MUST allow points redemption at checkout with validation
- **FR-006**: System MUST adjust points on voids and refunds
- **FR-007**: System MUST support membership tiers with automatic upgrade/downgrade
- **FR-008**: System MUST apply tier-based pricing at checkout
- **FR-009**: System MUST work offline for customer lookup and basic operations
- **FR-010**: System MUST sync customer data bidirectionally
- **FR-011**: System MUST generate customer analytics reports
- **FR-012**: System MUST support customer data export for marketing

### Key Entities

- **Customer**: Individual buyer - name, phone, email, tier, points balance, lifetime spend, registered date
- **LoyaltyTransaction**: Points activity - customer reference, type (earn/redeem/expire/adjust), points, transaction reference, timestamp
- **MembershipTier**: Customer level - name, minimum spend threshold, discount percentage, special pricing rules
- **LoyaltyRule**: Points configuration - points per spend unit, redemption rate, expiry period, active status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customer search by phone returns results in under 1 second
- **SC-002**: Points are calculated and displayed correctly on 100% of transactions
- **SC-003**: Customer registration takes under 30 seconds
- **SC-004**: Loyalty program increases repeat customer rate by 20%
- **SC-005**: Tier upgrades process automatically within 24 hours of qualification
- **SC-006**: Customer data syncs within 5 minutes of connectivity
- **SC-007**: Customer insights reports generate in under 10 seconds
- **SC-008**: 90% of registered customers have complete profile (name + phone)

## Assumptions

- Customer registration is optional (guest checkout still allowed)
- Phone number is primary customer identifier (unique per merchant)
- Points earning rate defaults to 1 point per PHP 100 spent
- Points redemption rate defaults to 10 points = PHP 1 discount
- Points expire after 1 year of inactivity (configurable)
- Tier thresholds are based on lifetime spend (not within a period)
- Customer marketing features (email/SMS) are out of scope for v1
