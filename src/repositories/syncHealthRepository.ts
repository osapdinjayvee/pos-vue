/**
 * Sync Health Repository
 * Manages sync_health records for terminal health monitoring
 */

import db from '@/db/database'
import type { SyncHealth, SyncHealthStatus } from '@/types/sync'

class SyncHealthRepository {
  /**
   * Upsert a sync health record
   */
  async upsert(health: SyncHealth): Promise<void> {
    await db.execute(
      `INSERT INTO sync_health (terminal_id, branch_id, last_heartbeat, last_upload, last_download, queue_depth, error_count, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(terminal_id) DO UPDATE SET
         branch_id = excluded.branch_id,
         last_heartbeat = excluded.last_heartbeat,
         last_upload = excluded.last_upload,
         last_download = excluded.last_download,
         queue_depth = excluded.queue_depth,
         error_count = excluded.error_count,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [
        health.terminal_id,
        health.branch_id,
        health.last_heartbeat,
        health.last_upload,
        health.last_download,
        health.queue_depth,
        health.error_count,
        health.status,
        health.updated_at
      ]
    )
  }

  /**
   * Find health record by terminal ID
   */
  async findByTerminal(terminalId: string): Promise<SyncHealth | null> {
    return await db.getOne<SyncHealth>(
      'SELECT * FROM sync_health WHERE terminal_id = ?',
      [terminalId]
    )
  }

  /**
   * Get all health records
   */
  async findAll(): Promise<SyncHealth[]> {
    return await db.query<SyncHealth>(
      'SELECT * FROM sync_health ORDER BY updated_at DESC'
    )
  }

  /**
   * Find health records by status
   */
  async findByStatus(status: SyncHealthStatus): Promise<SyncHealth[]> {
    return await db.query<SyncHealth>(
      'SELECT * FROM sync_health WHERE status = ? ORDER BY updated_at DESC',
      [status]
    )
  }

  /**
   * Find health records by branch
   */
  async findByBranch(branchId: string): Promise<SyncHealth[]> {
    return await db.query<SyncHealth>(
      'SELECT * FROM sync_health WHERE branch_id = ? ORDER BY updated_at DESC',
      [branchId]
    )
  }

  /**
   * Update heartbeat timestamp
   */
  async updateHeartbeat(terminalId: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE sync_health SET last_heartbeat = ?, updated_at = ? WHERE terminal_id = ?`,
      [now, now, terminalId]
    )
  }

  /**
   * Update queue depth
   */
  async updateQueueDepth(terminalId: string, depth: number): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE sync_health SET queue_depth = ?, updated_at = ? WHERE terminal_id = ?`,
      [depth, now, terminalId]
    )
  }

  /**
   * Increment error count
   */
  async incrementErrorCount(terminalId: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE sync_health SET error_count = error_count + 1, updated_at = ? WHERE terminal_id = ?`,
      [now, terminalId]
    )
  }

  /**
   * Reset error count to zero
   */
  async resetErrorCount(terminalId: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE sync_health SET error_count = 0, updated_at = ? WHERE terminal_id = ?`,
      [now, terminalId]
    )
  }

  /**
   * Get terminals with stale heartbeat (older than threshold minutes)
   */
  async getStaleTerminals(thresholdMins: number): Promise<SyncHealth[]> {
    return await db.query<SyncHealth>(
      `SELECT * FROM sync_health
       WHERE last_heartbeat IS NOT NULL
         AND last_heartbeat < datetime('now', '-' || ? || ' minutes')
       ORDER BY last_heartbeat ASC`,
      [thresholdMins]
    )
  }
}

export const syncHealthRepository = new SyncHealthRepository()
export default syncHealthRepository
