# Implementation Plan: Filament Admin Panel

**Branch**: `006-admin-panel` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-admin-panel/spec.md`
**Depends On**: 005-multi-branch-sync (for data visibility)

## Summary

Implement the platform admin panel using Filament 4 (Laravel). This is the SaaS management layer for platform admins to manage merchants, subscription plans, OR series configuration, and audit trails. Separate from the merchant-facing Vue POS application.

## Technical Context

**Language/Version**: PHP 8.2+, Laravel 11
**Primary Dependencies**: Filament 4, Laravel Sanctum, Spatie Permission
**Storage**: MySQL (central database)
**Testing**: PHPUnit, Laravel Dusk
**Target Platform**: Web browser (Chrome/Edge/Firefox)
**Project Type**: Laravel backend with Filament admin
**Performance Goals**: Dashboard < 3 seconds, CRUD < 1 second
**Constraints**: Multi-tenant SaaS, secure admin isolation
**Scale/Scope**: 100+ merchants, 10+ branches per merchant

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | N/A | Admin panel requires network (server-side) |
| II. BIR Compliance | ✅ PASS | FR-003: OR series with PTU; FR-004: 80% alert |
| III. Data Integrity | ✅ PASS | FR-006: Audit logging; FR-011: Prevent destructive ops |
| IV. Stack Alignment | ✅ PASS | Filament 4 per PRD requirement |
| V. Simplicity | ✅ PASS | Filament CRUD resources; minimal custom code |

**Gate Status**: PASSED

## Project Structure

```text
backend/
├── app/
│   ├── Filament/
│   │   ├── Resources/
│   │   │   ├── MerchantResource.php
│   │   │   ├── PlanResource.php
│   │   │   ├── ORSeriesResource.php
│   │   │   ├── BranchResource.php
│   │   │   ├── TerminalResource.php
│   │   │   ├── UserResource.php
│   │   │   └── AuditLogResource.php
│   │   ├── Pages/
│   │   │   ├── Dashboard.php
│   │   │   └── MerchantOnboarding.php
│   │   └── Widgets/
│   │       ├── MerchantStats.php
│   │       ├── SubscriptionAlerts.php
│   │       └── ORSeriesAlerts.php
│   └── Models/
│       ├── Merchant.php
│       ├── Plan.php
│       ├── Subscription.php
│       └── AdminAuditLog.php
├── database/
│   └── migrations/
│       └── 006_admin_panel.php
└── tests/
    └── Feature/
        └── AdminPanelTest.php
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Multi-tenancy | Scoped queries per merchant | Filament tenant support |
| Audit logging | Spatie Activity Log | Established package |
| OR series validation | Custom validation rule | Prevent gaps/overlaps |
