# Implementation Plan: CRM & Loyalty Programs

**Branch**: `007-crm-loyalty` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-crm-loyalty/spec.md`
**Depends On**: 002-sales-checkout (transactions), 003-user-management

## Summary

Implement customer management with loyalty points system. Customers can be registered at checkout, accumulate points on purchases, and redeem points for discounts. Supports membership tiers with automatic upgrades based on lifetime spend. Works offline with sync.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4, Pinia, sql.js
**Storage**: SQLite (local), MySQL (server)
**Testing**: Vitest (unit), Vue Test Utils (component)
**Target Platform**: Web browser (Chrome/Edge)
**Project Type**: Web application (Vue frontend)
**Performance Goals**: Customer search < 1 second, points calculation instant
**Constraints**: Offline customer lookup and basic operations
**Scale/Scope**: 10,000+ customers per merchant

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-009: Offline lookup; FR-010: Bidirectional sync |
| II. BIR Compliance | ✅ PASS | Customer on receipt; points don't affect VAT |
| III. Data Integrity | ✅ PASS | Points adjusted on voids/refunds |
| IV. Stack Alignment | ✅ PASS | Vue + PrimeVue + SQLite |
| V. Simplicity | ✅ PASS | Standard points model; configurable rates |

**Gate Status**: PASSED

## Project Structure

```text
src/
├── components/
│   └── crm/
│       ├── CustomerSearch.vue
│       ├── CustomerRegistration.vue
│       ├── CustomerProfile.vue
│       ├── LoyaltyPointsDisplay.vue
│       ├── PointsRedemption.vue
│       ├── TierBadge.vue
│       └── CustomerHistory.vue
├── composables/
│   ├── useCustomer.ts
│   ├── useLoyalty.ts
│   └── usePointsCalculation.ts
├── stores/
│   └── customer.ts
├── services/
│   ├── customerService.ts
│   ├── loyaltyService.ts
│   └── tierService.ts
├── repositories/
│   ├── customerRepository.ts
│   ├── loyaltyTransactionRepository.ts
│   └── tierRepository.ts
├── db/
│   └── migrations/
│       └── 007_crm.ts
└── types/
    ├── customer.ts
    ├── loyalty.ts
    └── tier.ts
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Points calculation | Configurable rate | Merchant flexibility |
| Tier upgrades | Batch process daily | Performance; not real-time |
| Offline points | Queue for sync | Eventual consistency acceptable |
