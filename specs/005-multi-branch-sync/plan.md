# Implementation Plan: Multi-Branch & Cloud Sync

**Branch**: `005-multi-branch-sync` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-multi-branch-sync/spec.md`
**Depends On**: All P1 features (001, 002, 003)

## Summary

Implement robust bidirectional synchronization between POS terminals and cloud server. Transactions sync up, product catalog syncs down. Handle extended offline periods, conflict resolution, and multi-branch inventory visibility. Zero data loss is the primary goal.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3.5+, Laravel 11 (backend)
**Primary Dependencies**: Vue 3, Pinia, sql.js, Axios (HTTP client)
**Storage**: SQLite (local), MySQL (server)
**Testing**: Vitest (unit), Playwright (E2E with network simulation)
**Target Platform**: Web browser (Chrome/Edge)
**Project Type**: Web application (Vue frontend + Laravel backend API)
**Performance Goals**: Sync 100+ items in < 5 minutes, no POS degradation during sync
**Constraints**: Idempotent operations, zero data loss, offline-resilient
**Scale/Scope**: 10+ branches, 500+ transactions/day/branch

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | ✅ PASS | FR-002: Queue offline; FR-011: Idempotent; FR-012: No delete until ACK |
| II. BIR Compliance | ✅ PASS | OR numbers pre-allocated; Z-Reading syncs |
| III. Data Integrity | ✅ PASS | FR-006: Retry mechanism; FR-007/008: Conflict logging |
| IV. Stack Alignment | ✅ PASS | Vue + SQLite + Laravel API per constitution |
| V. Simplicity | ✅ PASS | Last-write-wins conflict resolution; queue-based sync |

**Gate Status**: PASSED

## Project Structure

### Source Code

```text
src/
├── components/
│   └── sync/
│       ├── SyncStatus.vue           # Status indicator
│       ├── SyncProgress.vue         # Progress during bulk sync
│       ├── PendingSyncList.vue      # Queue viewer
│       └── ConflictList.vue         # Conflict viewer
├── composables/
│   ├── useSync.ts
│   ├── useOfflineStatus.ts
│   └── useConflictResolution.ts
├── stores/
│   └── sync.ts
├── services/
│   ├── syncService.ts               # Main sync orchestrator
│   ├── transactionSyncService.ts    # Transaction upload
│   ├── catalogSyncService.ts        # Product download
│   ├── inventorySyncService.ts      # Stock sync
│   ├── conflictService.ts           # Conflict resolution
│   └── connectivityService.ts       # Network detection
├── repositories/
│   ├── syncQueueRepository.ts
│   ├── syncLogRepository.ts
│   └── conflictLogRepository.ts
├── db/
│   └── migrations/
│       └── 005_sync.ts
└── types/
    ├── sync.ts
    └── conflict.ts
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| Conflict resolution | Last-write-wins (server preference) | Simple, deterministic, auditable |
| Sync queue | Persistent SQLite table | Survives app restart |
| Retry strategy | Exponential backoff | Prevents server overload |
| Bulk sync | Batch processing | Performance for large queues |
