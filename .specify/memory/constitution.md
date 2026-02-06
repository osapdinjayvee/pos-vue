<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version Change: 0.0.0 → 1.0.0 (MAJOR - initial ratification)

Modified Principles: N/A (initial creation)

Added Sections:
- Core Principles (5 principles)
- BIR Compliance Requirements (Section 2)
- Development Workflow (Section 3)
- Governance

Removed Sections: N/A (initial creation)

Templates Requiring Updates:
- .specify/templates/plan-template.md ✅ (compatible - Constitution Check section exists)
- .specify/templates/spec-template.md ✅ (compatible - priority-based user stories align)
- .specify/templates/tasks-template.md ✅ (compatible - phased approach supports offline-first)

Follow-up TODOs: None
================================================================================
-->

# POS-App Constitution

## Core Principles

### I. Offline-First Architecture

The POS terminal MUST function fully offline using SQLite as the local data store. All critical operations (product lookup, sales transactions, receipt generation, VAT computation) MUST work without network connectivity.

- Local SQLite database MUST contain all data required for POS operations
- Network-dependent features MUST degrade gracefully with clear user feedback
- Offline transactions MUST queue for sync when connectivity resumes
- User MUST never be blocked from completing a sale due to network issues

**Rationale**: Philippine retail environments frequently experience unreliable connectivity. Business continuity requires full offline capability.

### II. BIR Compliance (NON-NEGOTIABLE)

All sales, receipts, and tax computations MUST comply with Philippine Bureau of Internal Revenue (BIR) regulations. This principle cannot be relaxed or deferred.

- Official Receipts (OR) MUST follow sequential numbering with no gaps
- VAT computation MUST handle VATable, VAT-exempt, and zero-rated items correctly
- All transactions MUST be non-editable once completed (audit trail)
- X-Reading and Z-Reading reports MUST be accurate and available offline
- Data retention MUST support 10+ year requirement

**Rationale**: BIR compliance is a legal requirement. Non-compliance exposes the business to penalties, closure, or criminal liability.

### III. Data Integrity & Sync Reliability

Data MUST never be lost or corrupted during offline/online transitions. Sync conflicts MUST be detected and resolved deterministically.

- Every transaction MUST have a unique, collision-resistant identifier generated offline
- Sync MUST use idempotent operations to handle retries safely
- Conflict resolution strategy MUST be documented and deterministic
- Failed syncs MUST be logged with enough context for manual recovery
- Local data MUST NOT be deleted until server acknowledgment is confirmed

**Rationale**: Financial data loss or corruption directly impacts business operations and BIR compliance.

### IV. Vue + PrimeVue + SQLite Stack Alignment

All frontend code MUST use Vue 3 Composition API with TypeScript. UI components MUST use PrimeVue. Local persistence MUST use SQLite (via appropriate browser/Electron wrapper).

- Components MUST use `<script setup>` syntax with TypeScript
- State management MUST use Pinia stores
- PrimeVue components MUST be preferred over custom implementations
- SQLite access MUST be abstracted behind a repository layer for testability
- Tailwind CSS MUST be used for custom styling beyond PrimeVue defaults

**Rationale**: Stack consistency enables faster development, easier onboarding, and predictable maintenance.

### V. Simplicity & Incremental Delivery

Features MUST be implemented in the simplest way that satisfies requirements. Each user story MUST deliver independently testable value.

- YAGNI: Do not implement features until explicitly required
- Each phase/story MUST be deployable and demonstrable independently
- Abstractions MUST be introduced only when duplication becomes problematic
- Performance optimization MUST be driven by measured bottlenecks, not speculation

**Rationale**: Over-engineering delays delivery and introduces unnecessary complexity. Incremental delivery enables faster feedback.

## BIR Compliance Requirements

This section defines non-negotiable compliance constraints that MUST be verified in every feature touching sales, receipts, or tax.

**Receipt Requirements**:
- Business name, address, TIN displayed on every receipt
- PTU (Permit to Use) number and machine serial number
- Sequential OR number with series prefix
- VAT breakdown showing: VATable sales, VAT amount, VAT-exempt sales, zero-rated sales
- Date and time of transaction
- Cashier identification

**Audit Trail Requirements**:
- All transactions immutable after completion
- Voids and refunds MUST create new compensating transactions, not modify originals
- Supervisor approval MUST be logged for voids/refunds
- All actions MUST be traceable to user and timestamp

**Reporting Requirements**:
- X-Reading: Current shift totals, resettable
- Z-Reading: End-of-day totals, non-resettable, sequential Z-counter
- VAT summary reports exportable for BIR filing

## Development Workflow

**Code Review Gates**:
1. Offline functionality verified (no network calls in critical paths)
2. BIR compliance checklist passed (for sales/receipt features)
3. TypeScript strict mode compliance
4. PrimeVue component usage (no reinventing existing components)
5. Unit tests for business logic, E2E tests for critical user flows

**Testing Requirements**:
- Unit tests: Vitest for business logic and utilities
- Component tests: Vue Test Utils for component behavior
- E2E tests: Playwright for critical user journeys
- Offline simulation: Tests MUST verify behavior without network

**Branch Strategy**:
- Feature branches from `main`
- PRs require passing CI and review
- `main` MUST always be deployable

## Governance

This constitution establishes the non-negotiable principles for POS-App development. All code changes, architecture decisions, and feature implementations MUST comply with these principles.

**Amendment Process**:
1. Proposed changes documented with rationale
2. Impact assessment on existing features
3. Review and approval required
4. Version increment following semver (MAJOR for principle changes, MINOR for additions, PATCH for clarifications)

**Compliance Verification**:
- Every PR MUST verify Constitution Check in plan.md
- BIR-related changes require explicit compliance review
- Offline functionality MUST be demonstrated, not assumed

**Guidance File**: `.specify/memory/constitution.md` (this file)

**Version**: 1.0.0 | **Ratified**: 2026-02-04 | **Last Amended**: 2026-02-04
