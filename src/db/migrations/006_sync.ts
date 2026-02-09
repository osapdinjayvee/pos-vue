/**
 * Migration 006: Multi-Branch & Cloud Sync
 * Creates tables for sync queue, sync log, conflict log, and sync status
 */

import type { Database } from 'sql.js'

export const migration006_sync = {
  version: 6,
  name: '006_sync',

  up(db: Database): void {
    // Sync queue - persistent queue of items to sync to server
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        last_error TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'failed', 'completed'))
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)`)

    // Sync log - history of completed sync operations
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('upload', 'download')),
        result TEXT NOT NULL CHECK (result IN ('success', 'conflict', 'error')),
        duration_ms INTEGER NOT NULL,
        synced_at TEXT NOT NULL
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_log_date ON sync_log(synced_at)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_log_result ON sync_log(result)`)

    // Conflict log - conflict detection and resolution history
    db.run(`
      CREATE TABLE IF NOT EXISTS conflict_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version TEXT NOT NULL,
        server_version TEXT NOT NULL,
        resolution TEXT NOT NULL CHECK (resolution IN ('local', 'server', 'merged', 'manual')),
        resolved_by TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `)

    db.run(`CREATE INDEX IF NOT EXISTS idx_conflict_entity ON conflict_log(entity_type, entity_id)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_conflict_resolution ON conflict_log(resolution)`)

    // Sync status - per-terminal sync state
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_status (
        terminal_id TEXT PRIMARY KEY,
        last_sync TEXT,
        last_download TEXT,
        pending_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'syncing', 'error'))
      )
    `)

    // Initialize sync status for default terminal
    db.run(`
      INSERT OR IGNORE INTO sync_status (terminal_id, pending_count, error_count, status)
      VALUES ('POS-001', 0, 0, 'idle')
    `)
  },

  down(db: Database): void {
    db.run('DROP TABLE IF EXISTS sync_status')
    db.run('DROP TABLE IF EXISTS conflict_log')
    db.run('DROP TABLE IF EXISTS sync_log')
    db.run('DROP TABLE IF EXISTS sync_queue')
  }
}

export default migration006_sync
