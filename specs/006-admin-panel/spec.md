# Feature Specification: Filament Admin Panel

**Feature Branch**: `006-admin-panel`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P2 (High)
**Input**: PRD Section 2.2.4 - Filament Admin Panel

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan/Tier Management (Priority: P1)

As a platform admin, I need to manage subscription plans so that I can control what features merchants can access.

**Why this priority**: Multi-tenant SaaS model requires plan management to monetize the platform.

**Independent Test**: Can be fully tested by creating a plan, assigning it to a merchant, and verifying feature access.

**Acceptance Scenarios**:

1. **Given** I am a platform admin, **When** I create a new plan (e.g., Basic), **Then** I can define included features, limits, and pricing
2. **Given** a plan exists, **When** I assign it to a merchant, **Then** the merchant sees only features included in their plan
3. **Given** a merchant is on Free plan, **When** they try to access Pro features, **Then** they see an upgrade prompt
4. **Given** I modify a plan, **When** merchants on that plan log in, **Then** they see updated features/limits

---

### User Story 2 - OR Series Management (Priority: P1)

As a platform admin, I need to configure BIR OR series for merchants so that each merchant has compliant receipt numbering.

**Why this priority**: BIR compliance requires proper OR series configuration per merchant/branch.

**Independent Test**: Can be tested by creating an OR series for a branch and verifying receipts use that series.

**Acceptance Scenarios**:

1. **Given** I am configuring a new branch, **When** I set up OR series with prefix, start, and end numbers, **Then** the branch can print compliant receipts
2. **Given** an OR series is running low, **When** 80% is used, **Then** admin receives an alert to create new series
3. **Given** a branch needs new OR series, **When** I create one, **Then** new series starts from where old one ended (continuity)
4. **Given** BIR requires PTU tracking, **When** I configure OR series, **Then** I can enter PTU number and validity period

---

### User Story 3 - Merchant Onboarding (Priority: P1)

As a platform admin, I need to onboard new merchants so that they can start using the POS system.

**Why this priority**: Core admin function to grow the platform user base.

**Independent Test**: Can be tested by creating a merchant account and verifying they can access their dashboard.

**Acceptance Scenarios**:

1. **Given** I am onboarding a merchant, **When** I enter business details and assign a plan, **Then** merchant account is created
2. **Given** a merchant is created, **When** they log in, **Then** they see their merchant dashboard (not admin panel)
3. **Given** I am onboarding, **When** I set up their first branch and terminal, **Then** they are ready to start selling
4. **Given** a merchant needs multiple branches, **When** I add branches, **Then** each branch can have its own settings

---

### User Story 4 - Audit Trail Monitoring (Priority: P2)

As a platform admin, I need to view audit trails so that I can investigate issues and ensure compliance.

**Why this priority**: Important for security and compliance but not blocking for basic operations.

**Independent Test**: Can be tested by performing actions and verifying they appear in the audit log.

**Acceptance Scenarios**:

1. **Given** I am in admin panel, **When** I view audit logs, **Then** I see all actions with user, timestamp, and details
2. **Given** I filter audit logs by merchant, **When** I search, **Then** I see only actions for that merchant
3. **Given** a void was processed, **When** I search audit logs, **Then** I find the void with supervisor who approved it
4. **Given** I need to export audit data, **When** I export, **Then** I get a complete log for BIR or legal requirements

---

### User Story 5 - Product/Branch/User CRUD (Priority: P2)

As a platform admin, I need full CRUD access to all entities so that I can support merchants with data issues.

**Why this priority**: Support capability; merchants should self-serve but admin override is needed.

**Independent Test**: Can be tested by editing a merchant's product from admin panel and verifying the change.

**Acceptance Scenarios**:

1. **Given** I am in admin panel, **When** I search for any merchant's product, **Then** I can view and edit it
2. **Given** I need to help a merchant, **When** I edit their user, **Then** changes are applied to that merchant's account
3. **Given** a merchant requests branch deletion, **When** I archive the branch, **Then** data is preserved but branch is inactive
4. **Given** I make changes as admin, **When** audit log is checked, **Then** my admin user is recorded as the actor

---

### User Story 6 - Subscription & Billing (Priority: P3)

As a platform admin, I need to track subscriptions and billing so that I can manage revenue and renewals.

**Why this priority**: Business operations but can be managed manually initially.

**Independent Test**: Can be tested by creating a subscription, verifying expiry date, and checking renewal notifications.

**Acceptance Scenarios**:

1. **Given** a merchant subscribes to a plan, **When** I view their account, **Then** I see subscription start date and expiry
2. **Given** a subscription is expiring in 7 days, **When** I view dashboard, **Then** I see upcoming renewals
3. **Given** a subscription expires, **When** the merchant tries to log in, **Then** they are prompted to renew (or downgrade to free)
4. **Given** I need billing history, **When** I view a merchant, **Then** I see all past payments and invoices

---

### Edge Cases

- What happens when a plan is deleted that has active merchants? (Cannot delete; must migrate merchants first)
- What happens when an OR series is exhausted while merchant is offline? (POS alerts; queues sales; requires sync to get new series)
- How does admin edit work when merchant data is in sync queue? (Admin changes take precedence; queue item is updated)
- What happens when admin creates a duplicate OR series range? (System validates for gaps and overlaps; prevents duplicates)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admin to create and manage subscription plans with feature toggles
- **FR-002**: System MUST support plan assignment to merchants with immediate effect
- **FR-003**: System MUST manage BIR OR series with prefix, range, and PTU configuration
- **FR-004**: System MUST alert when OR series is 80% consumed
- **FR-005**: System MUST provide merchant onboarding workflow (account, branch, terminal, OR series)
- **FR-006**: System MUST log all admin actions in audit trail
- **FR-007**: System MUST provide searchable audit log with filtering by entity, user, date
- **FR-008**: System MUST allow admin to view and edit any merchant data
- **FR-009**: System MUST track subscription status and expiry dates
- **FR-010**: System MUST send notifications for expiring subscriptions
- **FR-011**: System MUST prevent destructive operations on entities with dependencies
- **FR-012**: System MUST use Filament 4 for admin panel implementation

### Key Entities

- **Plan**: Subscription tier - name, price, billing cycle, feature list, limits (branches, users, products)
- **Subscription**: Merchant's plan - merchant reference, plan reference, start date, expiry date, status
- **ORSeriesConfig**: Receipt configuration - branch reference, prefix, start number, end number, current number, PTU, validity
- **Merchant**: Business account - name, business name, TIN, address, contact, plan, status
- **AdminAuditLog**: Admin action history - admin user, action type, entity type, entity ID, before/after values, timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can onboard a new merchant in under 10 minutes
- **SC-002**: Plan changes take effect on merchant accounts within 5 minutes
- **SC-003**: OR series alerts trigger at exactly 80% consumption
- **SC-004**: Audit log search returns results in under 3 seconds
- **SC-005**: Admin panel supports 100+ concurrent admin users
- **SC-006**: All admin actions are logged with 100% capture rate
- **SC-007**: Subscription expiry notifications sent 7 days before expiry
- **SC-008**: Admin panel loads in under 3 seconds on standard connection

## Assumptions

- Filament 4 is used for admin panel (per PRD stack requirement)
- Admin panel is separate from merchant panel (different authentication)
- Platform supports multiple merchants (SaaS model)
- Billing integration is out of scope for v1 (manual tracking)
- Plans are defined by platform admin, not self-created by merchants
- OR series configuration follows BIR accreditation requirements
