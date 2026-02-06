/**
 * Conflict Log Repository
 * Records conflict detection and resolution during sync operations
 */

import db from '@/db/database'
import type { ConflictLog, ConflictLogInput, ConflictResolutionType } from '@/types/conflict'

class ConflictLogRepository {
  /**
   * Create a conflict log entry
   */
  async create(input: ConflictLogInput): Promise<ConflictLog> {
    const id = db.generateId('cl')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO conflict_log (id, entity_type, entity_id, local_version, server_version, resolution, resolved_by, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.entity_type,
        input.entity_id,
        input.local_version,
        input.server_version,
        input.resolution,
        input.resolved_by || null,
        now,
        input.resolution !== 'manual' ? now : null
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Find a conflict log entry by ID
   */
  async findById(id: string): Promise<ConflictLog | null> {
    return await db.getOne<ConflictLog>(
      'SELECT * FROM conflict_log WHERE id = ?',
      [id]
    )
  }

  /**
   * Find unresolved conflicts (manual resolution pending)
   */
  async findUnresolved(): Promise<ConflictLog[]> {
    return await db.query<ConflictLog>(
      `SELECT * FROM conflict_log WHERE resolution = 'manual' AND resolved_at IS NULL ORDER BY created_at DESC`
    )
  }

  /**
   * Find conflicts for a specific entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<ConflictLog[]> {
    return await db.query<ConflictLog>(
      'SELECT * FROM conflict_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      [entityType, entityId]
    )
  }

  /**
   * Get recent conflicts
   */
  async getRecent(limit: number = 50): Promise<ConflictLog[]> {
    return await db.query<ConflictLog>(
      'SELECT * FROM conflict_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    )
  }

  /**
   * Resolve a conflict manually
   */
  async resolve(id: string, resolution: ConflictResolutionType, resolvedBy: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE conflict_log SET resolution = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`,
      [resolution, resolvedBy, now, id]
    )
  }

  /**
   * Get conflict statistics
   */
  async getStats(): Promise<{
    total: number
    unresolved: number
    resolvedByLocal: number
    resolvedByServer: number
    resolvedManually: number
  }> {
    const result = await db.getOne<{
      total: number
      unresolved: number
      resolved_local: number
      resolved_server: number
      resolved_manual: number
    }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN resolution = 'manual' AND resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved,
         SUM(CASE WHEN resolution = 'local' THEN 1 ELSE 0 END) as resolved_local,
         SUM(CASE WHEN resolution = 'server' THEN 1 ELSE 0 END) as resolved_server,
         SUM(CASE WHEN resolution = 'manual' AND resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_manual
       FROM conflict_log`
    )

    return {
      total: result?.total || 0,
      unresolved: result?.unresolved || 0,
      resolvedByLocal: result?.resolved_local || 0,
      resolvedByServer: result?.resolved_server || 0,
      resolvedManually: result?.resolved_manual || 0
    }
  }

  /**
   * Find all conflicts with optional filters
   */
  async findAll(filters?: {
    entityType?: string
    resolution?: ConflictResolutionType
    unresolvedOnly?: boolean
    limit?: number
  }): Promise<ConflictLog[]> {
    let sql = 'SELECT * FROM conflict_log WHERE 1=1'
    const params: unknown[] = []

    if (filters?.entityType) {
      sql += ' AND entity_type = ?'
      params.push(filters.entityType)
    }
    if (filters?.resolution) {
      sql += ' AND resolution = ?'
      params.push(filters.resolution)
    }
    if (filters?.unresolvedOnly) {
      sql += ' AND resolved_at IS NULL'
    }

    sql += ' ORDER BY created_at DESC'

    if (filters?.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }

    return await db.query<ConflictLog>(sql, params)
  }
}

export const conflictLogRepository = new ConflictLogRepository()
export default conflictLogRepository
