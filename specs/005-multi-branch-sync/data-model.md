# Data Model: Multi-Branch & Cloud Sync

**Feature**: 005-multi-branch-sync
**Date**: 2026-02-04

## Entities

### SyncQueue

Pending items to sync to server.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| entity_type | enum | NOT NULL | transaction, void, refund, stock_movement |
| entity_id | UUID | NOT NULL | ID of entity to sync |
| operation | enum | NOT NULL | create, update |
| payload | text | NOT NULL | JSON payload |
| priority | integer | DEFAULT 1 | Higher = more urgent |
| created_at | datetime | NOT NULL | When queued |
| attempts | integer | DEFAULT 0 | Retry count |
| last_attempt | datetime | NULL | Last try time |
| last_error | text | NULL | Error message |
| status | enum | DEFAULT pending | pending, syncing, failed, completed |

### SyncLog

History of completed syncs.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| entity_type | string | NOT NULL | Entity type |
| entity_id | UUID | NOT NULL | Entity ID |
| operation | string | NOT NULL | Operation performed |
| direction | enum | NOT NULL | upload, download |
| result | enum | NOT NULL | success, conflict, error |
| duration_ms | integer | NOT NULL | Sync duration |
| synced_at | datetime | NOT NULL | Completion time |

### ConflictLog

Conflict resolution history.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| entity_type | string | NOT NULL | Entity type |
| entity_id | UUID | NOT NULL | Entity ID |
| local_version | text | NOT NULL | Local JSON |
| server_version | text | NOT NULL | Server JSON |
| resolution | enum | NOT NULL | local, server, merged, manual |
| resolved_by | UUID | NULL | User if manual |
| created_at | datetime | NOT NULL | When detected |
| resolved_at | datetime | NULL | When resolved |

### SyncStatus

Per-terminal sync status.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| terminal_id | string | PK | Terminal ID |
| last_sync | datetime | NULL | Last successful sync |
| last_download | datetime | NULL | Last catalog download |
| pending_count | integer | DEFAULT 0 | Queue depth |
| error_count | integer | DEFAULT 0 | Failed items |
| status | enum | DEFAULT idle | idle, syncing, error |

## SQLite Schema

```sql
-- Sync queue
CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'void', 'refund', 'stock_movement')),
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update')),
    payload TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_attempt TEXT,
    last_error TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'failed', 'completed'))
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC);

-- Sync log
CREATE TABLE sync_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('upload', 'download')),
    result TEXT NOT NULL CHECK (result IN ('success', 'conflict', 'error')),
    duration_ms INTEGER NOT NULL,
    synced_at TEXT NOT NULL
);

CREATE INDEX idx_sync_log_entity ON sync_log(entity_type, entity_id);
CREATE INDEX idx_sync_log_date ON sync_log(synced_at);

-- Conflict log
CREATE TABLE conflict_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_version TEXT NOT NULL,
    server_version TEXT NOT NULL,
    resolution TEXT NOT NULL CHECK (resolution IN ('local', 'server', 'merged', 'manual')),
    resolved_by TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

-- Sync status
CREATE TABLE sync_status (
    terminal_id TEXT PRIMARY KEY,
    last_sync TEXT,
    last_download TEXT,
    pending_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'error'))
);
```
