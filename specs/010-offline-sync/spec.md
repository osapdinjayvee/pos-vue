# Feature Specification: Offline Mode Final Sync & Conflict Handling

**Feature Branch**: `010-offline-sync`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P4 (Low) - Note: Core offline functionality is P1 in Sales/Checkout; this covers advanced sync scenarios
**Input**: PRD Section 4 - Offline mode final sync & conflict handling

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bulk Sync Recovery (Priority: P1)

As a store manager, after extended offline period, I need all accumulated data to sync reliably so that headquarters has complete records.

**Why this priority**: Data integrity is critical; extended offline periods must not result in data loss.

**Independent Test**: Can be tested by accumulating 100+ transactions offline, then syncing and verifying 100% completeness.

**Acceptance Scenarios**:

1. **Given** terminal was offline for 8 hours with 200 transactions, **When** connectivity restores, **Then** all transactions sync without data loss
2. **Given** bulk sync is in progress, **When** I check status, **Then** I see progress percentage and estimated time
3. **Given** sync is running, **When** I continue selling, **Then** new sales are not blocked by sync operations
4. **Given** sync partially completes before disconnect, **When** connectivity returns, **Then** sync resumes from last successful point

---

### User Story 2 - Product Catalog Conflict (Priority: P1)

As a system, when product data is modified at both HQ and terminal while offline, I need to resolve conflicts deterministically so that data integrity is maintained.

**Why this priority**: Product conflicts can cause pricing errors; deterministic resolution is essential.

**Independent Test**: Can be tested by modifying same product at HQ and offline terminal, then syncing and verifying resolution.

**Acceptance Scenarios**:

1. **Given** product price changed at HQ and terminal offline, **When** terminal syncs, **Then** HQ (server) version wins
2. **Given** a conflict occurs, **When** I check conflict log, **Then** I see both versions and the resolution applied
3. **Given** new product created at HQ while terminal offline, **When** terminal syncs, **Then** new product appears in local catalog
4. **Given** product deleted at HQ while terminal had sales, **When** syncing, **Then** sales preserved; product marked discontinued

---

### User Story 3 - Inventory Reconciliation (Priority: P1)

As a store manager, after offline period with sales, I need inventory levels to reconcile correctly so that stock counts are accurate.

**Why this priority**: Inventory accuracy is critical for reordering and preventing overselling.

**Independent Test**: Can be tested by making sales offline, syncing, and verifying central inventory reflects all movements.

**Acceptance Scenarios**:

1. **Given** 50 units sold offline, **When** sync completes, **Then** central inventory is reduced by 50 units
2. **Given** stock was received at HQ while offline, **When** terminal syncs, **Then** terminal sees updated stock level
3. **Given** same product sold at two offline terminals, **When** both sync, **Then** total deduction is sum of both sales
4. **Given** stock goes negative after sync, **When** I view inventory, **Then** system flags for reconciliation review

---

### User Story 4 - OR Number Synchronization (Priority: P1)

As a system, I need to ensure OR numbers remain sequential and gap-free across all terminals so that BIR compliance is maintained.

**Why this priority**: BIR compliance requires sequential OR numbers with no gaps - non-negotiable.

**Independent Test**: Can be tested by having multiple terminals issue ORs offline and verifying no duplicates or gaps after sync.

**Acceptance Scenarios**:

1. **Given** Terminal A has OR range 001-100 and Terminal B has 101-200, **When** both sync, **Then** no duplicate OR numbers exist
2. **Given** terminal used 80 of 100 allocated ORs, **When** it syncs, **Then** server allocates a new range before exhaustion
3. **Given** terminal went offline before getting new range, **When** range exhausts, **Then** terminal alerts and blocks new sales until sync
4. **Given** OR numbers from offline period, **When** synced, **Then** they integrate into central sequence without gaps

---

### User Story 5 - Conflict Dashboard (Priority: P2)

As a system admin, I need a conflict resolution dashboard so that I can review and manually resolve complex conflicts.

**Why this priority**: Most conflicts auto-resolve; dashboard handles edge cases requiring human judgment.

**Independent Test**: Can be tested by triggering a conflict and verifying it appears in the dashboard for review.

**Acceptance Scenarios**:

1. **Given** conflicts have occurred, **When** I view conflict dashboard, **Then** I see list of unresolved conflicts by type
2. **Given** I select a conflict, **When** I view details, **Then** I see terminal version, server version, and recommended resolution
3. **Given** auto-resolution was wrong, **When** I manually override, **Then** my decision is applied and logged
4. **Given** conflicts are resolved, **When** I view history, **Then** I see resolution audit trail

---

### User Story 6 - Sync Health Monitoring (Priority: P2)

As a system admin, I need to monitor sync health across all terminals so that I can identify and fix connectivity issues.

**Why this priority**: Proactive monitoring prevents data buildup; reactive mode works but risks problems.

**Independent Test**: Can be tested by viewing sync dashboard and identifying terminals that haven't synced recently.

**Acceptance Scenarios**:

1. **Given** I view sync dashboard, **When** I check terminal status, **Then** I see last sync time for each terminal
2. **Given** a terminal hasn't synced in 4 hours, **When** I view alerts, **Then** the terminal is flagged for attention
3. **Given** I drill into a terminal, **When** I view queue, **Then** I see pending item count and oldest item age
4. **Given** a terminal has sync errors, **When** I view details, **Then** I see error messages and retry counts

---

### Edge Cases

- What happens when two terminals create a customer with same phone offline? (Merge on sync; combine transaction histories)
- What happens when sync queue becomes corrupted? (Queue has checksums; corruption detected; admin notified; queue rebuilt from transaction log)
- How does system handle clock drift between terminals? (Server time is authoritative; terminal timestamps adjusted on sync)
- What happens when server rejects a transaction as invalid? (Transaction quarantined; admin notified; doesn't block other syncs)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST sync all offline transactions without data loss
- **FR-002**: System MUST handle bulk sync of 1000+ items efficiently
- **FR-003**: System MUST not block POS operations during sync
- **FR-004**: System MUST resume interrupted syncs from last successful point
- **FR-005**: System MUST resolve product conflicts using last-write-wins (server preference)
- **FR-006**: System MUST log all conflicts with before/after values
- **FR-007**: System MUST reconcile inventory across all terminals after sync
- **FR-008**: System MUST maintain OR number sequence integrity across terminals
- **FR-009**: System MUST pre-allocate OR ranges to prevent exhaustion
- **FR-010**: System MUST provide conflict resolution dashboard for manual intervention
- **FR-011**: System MUST monitor and alert on sync health issues
- **FR-012**: System MUST handle customer deduplication on sync

### Key Entities

- **SyncQueue**: Pending items - entity type, entity ID, operation, payload, created timestamp, attempts, last error, checksum
- **SyncLog**: Completed syncs - entity type, entity ID, operation, synced timestamp, result, duration
- **ConflictRecord**: Resolution history - entity type, entity ID, terminal version, server version, resolution type, resolved by, timestamp
- **SyncHealth**: Terminal status - terminal ID, last sync time, queue depth, error count, status
- **ORAllocation**: Number ranges - terminal ID, prefix, start, end, current, allocated timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of offline transactions eventually sync successfully
- **SC-002**: Bulk sync of 500 items completes in under 5 minutes
- **SC-003**: Sync operations do not degrade POS performance (sales under 30 seconds)
- **SC-004**: OR number sequence has zero gaps or duplicates across all terminals
- **SC-005**: Product conflicts resolve within 1 sync cycle with correct server precedence
- **SC-006**: Terminals alert when sync is overdue (configurable threshold, default 4 hours)
- **SC-007**: Conflict resolution dashboard shows all conflicts within 5 minutes of detection
- **SC-008**: 99.9% of conflicts auto-resolve without manual intervention

## Assumptions

- Internet connectivity is available at least once per day for sync
- Sync uses idempotent operations (same sync can be retried safely)
- Server timestamps are authoritative for conflict resolution
- OR number ranges are pre-allocated in batches of 100-1000 per terminal
- Critical business data (transactions) has priority over reference data (product images)
- Sync queue is persisted to survive app restarts and device reboots
- Clock sync (NTP) is encouraged but system handles reasonable drift
