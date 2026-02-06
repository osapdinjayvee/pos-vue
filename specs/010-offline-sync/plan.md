# Implementation Plan: Offline Sync & Conflict Handling

**Branch**: `010-offline-sync` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-offline-sync/spec.md`
**Depends On**: 005-multi-branch-sync (base sync)

## Summary

Implement advanced sync scenarios including bulk recovery after extended offline periods, conflict resolution dashboard, OR number synchronization across terminals, and sync health monitoring. This builds on top of the base sync feature with focus on edge cases and reliability.

## Technical Context

**Language/Version**: TypeScript 5.x (Vue), PHP 8.2+ (Laravel)
**Primary Dependencies**: Vue 3, Pinia, sql.js, Laravel, Filament 4
**Storage**: SQLite (local), MySQL (server)
**Testing**: Vitest, PHPUnit, Playwright (with network simulation)
**Target Platform**: Web browser, Laravel backend
**Project Type**: Full stack (Vue + Laravel)
**Performance Goals**: 500 items sync < 5 minutes, zero data loss
**Constraints**: Idempotent, BIR OR number integrity
**Scale/Scope**: 1000+ items per sync, 10+ terminals

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-001: All transactions sync; FR-003: No block during sync |
| II. BIR Compliance | ✅ PASS | FR-008/009: OR sequence integrity |
| III. Data Integrity | ✅ PASS | FR-001: Zero data loss; FR-004: Resume interrupted |
| IV. Stack Alignment | ✅ PASS | Vue + SQLite + Laravel |
| V. Simplicity | ✅ PASS | Last-write-wins; admin override for edge cases |

**Gate Status**: PASSED

## Project Structure

```text
# Vue Frontend
src/
├── components/
│   └── sync/
│       ├── BulkSyncProgress.vue
│       ├── ConflictResolution.vue
│       └── SyncHealthDashboard.vue
├── services/
│   ├── bulkSyncService.ts
│   ├── conflictResolutionService.ts
│   └── orAllocationService.ts

# Laravel Backend
backend/
├── app/
│   ├── Services/
│   │   ├── BulkSyncService.php
│   │   ├── ConflictResolver.php
│   │   └── ORAllocationService.php
│   └── Filament/
│       └── Pages/
│           ├── SyncMonitor.php
│           └── ConflictDashboard.php
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| OR allocation | Pre-allocate ranges | BIR requires no gaps |
| Conflict resolution | Last-write-wins + manual | Deterministic + override |
| Bulk sync | Batch with progress | Performance + UX |
