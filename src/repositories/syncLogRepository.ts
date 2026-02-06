/**
 * Sync Log Repository
 * Records history of completed sync operations for auditing and diagnostics
 */

import db from '@/db/database'
import type { SyncLog, SyncLogInput, SyncDirection, SyncResultType } from '@/types/sync'

class SyncLogRepository {
  /**
   * Create a sync log entry
   */
  async create(input: SyncLogInput): Promise<SyncLog> {
    const id = db.generateId('sl')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO sync_log (id, entity_type, entity_id, operation, direction, result, duration_ms, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.entity_type, input.entity_id, input.operation, input.direction, input.result, input.duration_ms, now]
    )

    return (await this.findById(id))!
  }

  /**
   * Find a log entry by ID
   */
  async findById(id: string): Promise<SyncLog | null> {
    return await db.getOne<SyncLog>(
      'SELECT * FROM sync_log WHERE id = ?',
      [id]
    )
  }

  /**
   * Find log entries for a specific entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<SyncLog[]> {
    return await db.query<SyncLog>(
      'SELECT * FROM sync_log WHERE entity_type = ? AND entity_id = ? ORDER BY synced_at DESC',
      [entityType, entityId]
    )
  }

  /**
   * Get recent sync log entries
   */
  async getRecent(limit: number = 50): Promise<SyncLog[]> {
    return await db.query<SyncLog>(
      'SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT ?',
      [limit]
    )
  }

  /**
   * Get log entries filtered by direction and/or result
   */
  async findAll(filters?: {
    direction?: SyncDirection
    result?: SyncResultType
    since?: string
    limit?: number
  }): Promise<SyncLog[]> {
    let sql = 'SELECT * FROM sync_log WHERE 1=1'
    const params: unknown[] = []

    if (filters?.direction) {
      sql += ' AND direction = ?'
      params.push(filters.direction)
    }
    if (filters?.result) {
      sql += ' AND result = ?'
      params.push(filters.result)
    }
    if (filters?.since) {
      sql += ' AND synced_at >= ?'
      params.push(filters.since)
    }

    sql += ' ORDER BY synced_at DESC'

    if (filters?.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    return await db.query<SyncLog>(sql, params)
  }

  /**
   * Count log entries by result type
   */
  async countByResult(): Promise<Record<SyncResultType, number>> {
    const rows = await db.query<{ result: SyncResultType; count: number }>(
      'SELECT result, COUNT(*) as count FROM sync_log GROUP BY result'
    )

    const counts: Record<SyncResultType, number> = {
      success: 0,
      conflict: 0,
      error: 0
    }

    for (const row of rows) {
      counts[row.result] = row.count
    }

    return counts
  }

  /**
   * Get sync stats for a time period
   */
  async getStats(since: string): Promise<{
    totalSynced: number
    totalErrors: number
    totalConflicts: number
    averageDuration: number
  }> {
    const result = await db.getOne<{
      total_synced: number
      total_errors: number
      total_conflicts: number
      avg_duration: number
    }>(
      `SELECT
         SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) as total_synced,
         SUM(CASE WHEN result = 'error' THEN 1 ELSE 0 END) as total_errors,
         SUM(CASE WHEN result = 'conflict' THEN 1 ELSE 0 END) as total_conflicts,
         AVG(duration_ms) as avg_duration
       FROM sync_log
       WHERE synced_at >= ?`,
      [since]
    )

    return {
      totalSynced: result?.total_synced || 0,
      totalErrors: result?.total_errors || 0,
      totalConflicts: result?.total_conflicts || 0,
      averageDuration: Math.round(result?.avg_duration || 0)
    }
  }

  /**
   * Purge old log entries
   */
  async purgeOlderThan(days: number): Promise<number> {
    const result = await db.execute(
      `DELETE FROM sync_log WHERE synced_at < datetime('now', '-' || ? || ' days')`,
      [days]
    )
    return result.changes || 0
  }
}

export const syncLogRepository = new SyncLogRepository()
export default syncLogRepository
