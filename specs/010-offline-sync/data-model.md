# Data Model: Offline Sync & Conflict Handling

**Feature**: 010-offline-sync
**Date**: 2026-02-04

## Entities

### ORAllocation

Pre-allocated OR ranges.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| terminal_id | string(50) | NOT NULL | Terminal |
| branch_id | UUID | FK | Branch |
| prefix | string(20) | NOT NULL | OR prefix |
| start_number | integer | NOT NULL | Range start |
| end_number | integer | NOT NULL | Range end |
| current_number | integer | NOT NULL | Next to use |
| allocated_at | datetime | NOT NULL | Allocation time |
| exhausted_at | datetime | NULL | When used up |
| status | enum | DEFAULT active | active, exhausted |

### ConflictRecord

Conflict history with resolution.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| entity_type | string(50) | NOT NULL | Entity type |
| entity_id | UUID | NOT NULL | Entity ID |
| terminal_id | string(50) | NOT NULL | Source terminal |
| local_version | text | NOT NULL | Local JSON |
| server_version | text | NOT NULL | Server JSON |
| local_timestamp | datetime | NOT NULL | Local edit time |
| server_timestamp | datetime | NOT NULL | Server edit time |
| resolution | enum | NOT NULL | local, server, merged, manual |
| resolved_by | UUID | NULL | Admin if manual |
| created_at | datetime | NOT NULL | Detection time |
| resolved_at | datetime | NULL | Resolution time |

### SyncHealth

Terminal sync status.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| terminal_id | string(50) | PK | Terminal |
| branch_id | UUID | FK | Branch |
| last_heartbeat | datetime | NULL | Last ping |
| last_upload | datetime | NULL | Last transaction upload |
| last_download | datetime | NULL | Last catalog download |
| queue_depth | integer | DEFAULT 0 | Pending items |
| error_count | integer | DEFAULT 0 | Recent errors |
| status | enum | DEFAULT unknown | healthy, warning, critical, unknown |
| updated_at | datetime | NOT NULL | Last update |

## MySQL Schema (Server)

```sql
-- OR allocations
CREATE TABLE or_allocations (
    id CHAR(36) PRIMARY KEY,
    terminal_id VARCHAR(50) NOT NULL,
    branch_id CHAR(36) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    start_number INT NOT NULL,
    end_number INT NOT NULL,
    current_number INT NOT NULL,
    allocated_at TIMESTAMP NOT NULL,
    exhausted_at TIMESTAMP,
    status ENUM('active', 'exhausted') DEFAULT 'active',
    INDEX idx_alloc_terminal (terminal_id),
    INDEX idx_alloc_status (status)
);

-- Conflict records
CREATE TABLE conflict_records (
    id CHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    terminal_id VARCHAR(50) NOT NULL,
    local_version JSON NOT NULL,
    server_version JSON NOT NULL,
    local_timestamp TIMESTAMP NOT NULL,
    server_timestamp TIMESTAMP NOT NULL,
    resolution ENUM('local', 'server', 'merged', 'manual') NOT NULL,
    resolved_by CHAR(36),
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    INDEX idx_conflict_entity (entity_type, entity_id),
    INDEX idx_conflict_resolution (resolution)
);

-- Sync health
CREATE TABLE sync_health (
    terminal_id VARCHAR(50) PRIMARY KEY,
    branch_id CHAR(36) NOT NULL,
    last_heartbeat TIMESTAMP,
    last_upload TIMESTAMP,
    last_download TIMESTAMP,
    queue_depth INT DEFAULT 0,
    error_count INT DEFAULT 0,
    status ENUM('healthy', 'warning', 'critical', 'unknown') DEFAULT 'unknown',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
