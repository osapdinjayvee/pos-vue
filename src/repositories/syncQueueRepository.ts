/**
 * Sync Queue Repository
 * Manages the persistent queue of items waiting to sync to the cloud server
 */

import db from '@/db/database'
import type { SyncQueue, SyncQueueInput, SyncQueueStatus, SyncEntityType } from '@/types/sync'

class SyncQueueRepository {
  /**
   * Find a sync queue item by ID
   */
  async findById(id: string): Promise<SyncQueue | null> {
    return await db.getOne<SyncQueue>(
      'SELECT * FROM sync_queue WHERE id = ?',
      [id]
    )
  }

  /**
   * Get all pending items ordered by priority (highest first) then creation time
   */
  async getPending(limit?: number): Promise<SyncQueue[]> {
    const sql = `
      SELECT * FROM sync_queue
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      ${limit ? 'LIMIT ?' : ''}
    `
    return await db.query<SyncQueue>(sql, limit ? [limit] : [])
  }

  /**
   * Get a batch of items for sync processing
   */
  async getBatch(batchSize: number): Promise<SyncQueue[]> {
    return await db.query<SyncQueue>(
      `SELECT * FROM sync_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [batchSize]
    )
  }

  /**
   * Get items by status
   */
  async getByStatus(status: SyncQueueStatus): Promise<SyncQueue[]> {
    return await db.query<SyncQueue>(
      'SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC',
      [status]
    )
  }

  /**
   * Get items by entity type
   */
  async getByEntityType(entityType: SyncEntityType): Promise<SyncQueue[]> {
    return await db.query<SyncQueue>(
      'SELECT * FROM sync_queue WHERE entity_type = ? ORDER BY created_at ASC',
      [entityType]
    )
  }

  /**
   * Get all items (with optional status filter)
   */
  async findAll(filters?: { status?: SyncQueueStatus; entityType?: SyncEntityType }): Promise<SyncQueue[]> {
    let sql = 'SELECT * FROM sync_queue WHERE 1=1'
    const params: unknown[] = []

    if (filters?.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    }
    if (filters?.entityType) {
      sql += ' AND entity_type = ?'
      params.push(filters.entityType)
    }

    sql += ' ORDER BY priority DESC, created_at ASC'
    return await db.query<SyncQueue>(sql, params)
  }

  /**
   * Enqueue a new item for sync
   */
  async create(input: SyncQueueInput): Promise<SyncQueue> {
    const id = db.generateId('sq')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, priority, created_at, attempts, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
      [id, input.entity_type, input.entity_id, input.operation, input.payload, input.priority || 1, now]
    )

    return (await this.findById(id))!
  }

  /**
   * Update the status of a queue item
   */
  async updateStatus(id: string, status: SyncQueueStatus, error?: string): Promise<void> {
    const now = db.getCurrentTimestamp()

    if (error) {
      await db.execute(
        `UPDATE sync_queue SET status = ?, last_attempt = ?, last_error = ? WHERE id = ?`,
        [status, now, error, id]
      )
    } else {
      await db.execute(
        `UPDATE sync_queue SET status = ?, last_attempt = ? WHERE id = ?`,
        [status, now, id]
      )
    }
  }

  /**
   * Mark items as syncing (batch update)
   */
  async markBatchAsSyncing(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const now = db.getCurrentTimestamp()
    const placeholders = ids.map(() => '?').join(',')
    await db.execute(
      `UPDATE sync_queue SET status = 'syncing', last_attempt = ? WHERE id IN (${placeholders})`,
      [now, ...ids]
    )
  }

  /**
   * Increment attempt count for a failed item
   */
  async incrementAttempts(id: string, error: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE sync_queue SET attempts = attempts + 1, last_attempt = ?, last_error = ?, status = 'failed'
       WHERE id = ?`,
      [now, error, id]
    )
  }

  /**
   * Reset failed items back to pending for retry
   */
  async resetFailed(ids?: string[]): Promise<number> {
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      const result = await db.execute(
        `UPDATE sync_queue SET status = 'pending', last_error = NULL WHERE id IN (${placeholders}) AND status = 'failed'`,
        ids
      )
      return result.changes || 0
    }

    const result = await db.execute(
      `UPDATE sync_queue SET status = 'pending', last_error = NULL WHERE status = 'failed'`
    )
    return result.changes || 0
  }

  /**
   * Delete completed items
   */
  async clearCompleted(): Promise<number> {
    const result = await db.execute(
      `DELETE FROM sync_queue WHERE status = 'completed'`
    )
    return result.changes || 0
  }

  /**
   * Delete old completed items (cleanup)
   */
  async purgeOlderThan(days: number): Promise<number> {
    const result = await db.execute(
      `DELETE FROM sync_queue WHERE status = 'completed' AND created_at < datetime('now', '-' || ? || ' days')`,
      [days]
    )
    return result.changes || 0
  }

  /**
   * Count items by status
   */
  async countByStatus(): Promise<Record<SyncQueueStatus, number>> {
    const rows = await db.query<{ status: SyncQueueStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`
    )

    const counts: Record<SyncQueueStatus, number> = {
      pending: 0,
      syncing: 0,
      failed: 0,
      completed: 0
    }

    for (const row of rows) {
      counts[row.status] = row.count
    }

    return counts
  }

  /**
   * Get total pending count
   */
  async getPendingCount(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')`
    )
    return result?.count || 0
  }

  /**
   * Check if entity already exists in queue (avoid duplicates)
   */
  async existsForEntity(entityType: SyncEntityType, entityId: string): Promise<boolean> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue
       WHERE entity_type = ? AND entity_id = ? AND status IN ('pending', 'syncing')`,
      [entityType, entityId]
    )
    return (result?.count || 0) > 0
  }

  /**
   * Delete a queue item
   */
  async delete(id: string): Promise<void> {
    await db.execute('DELETE FROM sync_queue WHERE id = ?', [id])
  }
}

export const syncQueueRepository = new SyncQueueRepository()
export default syncQueueRepository
