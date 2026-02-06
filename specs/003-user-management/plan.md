# Implementation Plan: User Management

**Branch**: `003-user-management` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-user-management/spec.md`

## Summary

Implement user authentication, role-based access control, and shift management for the POS terminal. This feature provides the security foundation for all other features. Users authenticate with username and PIN, are assigned roles (Cashier/Supervisor/Admin) with specific permissions, and work within tracked shifts for cash accountability. All authentication must work offline using SQLite-cached credentials.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+
**Primary Dependencies**: Vue 3, PrimeVue 4, Pinia, sql.js (SQLite for browser)
**Storage**: SQLite (local via sql.js), MySQL (server via Laravel API)
**Testing**: Vitest (unit), Vue Test Utils (component), Playwright (E2E)
**Target Platform**: Web browser (Chrome/Edge), Electron (optional future)
**Project Type**: Web application (Vue frontend + Laravel backend API)
**Performance Goals**: Login < 2 seconds, 50+ users per branch
**Constraints**: Offline-capable, 7-day credential cache, auto-lock on inactivity
**Scale/Scope**: 50+ users per branch, multi-terminal support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-010: Offline auth with cached credentials; FR-011: User sync to terminals |
| II. BIR Compliance | ✅ PASS | User Management not directly BIR-related; audit logging supports compliance |
| III. Data Integrity | ✅ PASS | FR-012: Auth logging; shift tracking for accountability |
| IV. Stack Alignment | ✅ PASS | Vue 3 + PrimeVue + SQLite + Pinia per constitution |
| V. Simplicity | ✅ PASS | 3 default roles cover 95% of cases; custom permissions P3 |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-user-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── auth/
│       ├── LoginForm.vue
│       ├── PinPad.vue
│       ├── LockScreen.vue
│       └── ShiftDialog.vue
├── composables/
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   └── useShift.ts
├── stores/
│   ├── auth.ts
│   ├── user.ts
│   └── shift.ts
├── services/
│   ├── authService.ts
│   └── syncService.ts
├── repositories/
│   ├── userRepository.ts
│   ├── roleRepository.ts
│   └── shiftRepository.ts
├── db/
│   ├── schema.ts
│   ├── migrations/
│   └── seeders/
├── types/
│   └── user.ts
└── utils/
    ├── crypto.ts
    └── validators.ts

tests/
├── unit/
│   ├── services/
│   └── utils/
├── component/
│   └── auth/
└── e2e/
    └── auth.spec.ts
```

**Structure Decision**: Web application structure with Vue frontend. Backend Laravel API is assumed to exist or will be built separately. Frontend focuses on offline-capable user management with SQLite persistence.

## Complexity Tracking

> No violations - standard implementation with minimal complexity.

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| PIN hashing | bcrypt via crypto-js | Industry standard; works in browser |
| SQLite access | sql.js | Pure JS SQLite; no native dependencies |
| Session storage | Pinia + localStorage | Survives page refresh; encrypts sensitive data |
