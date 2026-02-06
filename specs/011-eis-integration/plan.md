# Implementation Plan: EIS Electronic OR Submission

**Branch**: `011-eis-integration` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-eis-integration/spec.md`
**Depends On**: 002-sales-checkout, 006-admin-panel

## Summary

Implement optional BIR Electronic Invoicing System (EIS) integration for automatic submission of electronic receipts. Transactions queue for submission, batch processing for efficiency, retry mechanism for failures, and compliance reporting for audit.

## Technical Context

**Language/Version**: PHP 8.2+, Laravel 11
**Primary Dependencies**: Laravel, Guzzle (HTTP), Laravel Queue
**Storage**: MySQL (server)
**Testing**: PHPUnit with BIR sandbox
**Target Platform**: Laravel backend
**Project Type**: Laravel backend service
**Performance Goals**: 1000 items in < 10 minutes, 99% success rate
**Constraints**: BIR API specification compliance, retry handling
**Scale/Scope**: 500+ transactions/day

## Constitution Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Offline-First | N/A | Server-side submission |
| II. BIR Compliance | ✅ PASS | FR-001-012: Full EIS compliance |
| III. Data Integrity | ✅ PASS | FR-004: Retry; FR-006: Status tracking |
| IV. Stack Alignment | ✅ PASS | Laravel backend |
| V. Simplicity | ✅ PASS | Queue-based; batch processing |

**Gate Status**: PASSED

## Project Structure

```text
backend/
├── app/
│   ├── Services/
│   │   ├── EISService.php
│   │   ├── EISBatchService.php
│   │   └── EISReportService.php
│   ├── Jobs/
│   │   ├── SubmitToEIS.php
│   │   └── ProcessEISBatch.php
│   ├── Models/
│   │   ├── EISConfig.php
│   │   ├── EISSubmission.php
│   │   └── EISBatch.php
│   └── Filament/
│       └── Resources/
│           ├── EISConfigResource.php
│           └── EISSubmissionResource.php
├── database/
│   └── migrations/
│       └── 011_eis.php
└── tests/
    └── Feature/
        └── EISIntegrationTest.php
```

## Complexity Tracking

| Consideration | Decision | Rationale |
|---------------|----------|-----------|
| BIR API | Configurable endpoint | Test vs production |
| Batch size | 100 items | BIR recommendation |
| Retry | Exponential backoff | Prevent overload |
