import { BaseRepository } from './baseRepository'
import db from '@/db/database'
import type { EISSubmission, EISSubmissionStatus, EISStatusCounts } from '@/types/eis'

class EISSubmissionRepository extends BaseRepository<EISSubmission> {
  protected tableName = 'eis_submissions'
  protected idPrefix = 'eiss'

  async findByTransactionId(transactionId: string): Promise<EISSubmission | null> {
    return await db.getOne<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    )
  }

  async getPending(limit?: number): Promise<EISSubmission[]> {
    const sql = limit
      ? `SELECT * FROM ${this.tableName} WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`
      : `SELECT * FROM ${this.tableName} WHERE status = 'pending' ORDER BY created_at ASC`
    return await db.query<EISSubmission>(sql, limit ? [limit] : [])
  }

  async getByStatus(status: EISSubmissionStatus, limit?: number): Promise<EISSubmission[]> {
    const sql = limit
      ? `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`
    return await db.query<EISSubmission>(sql, limit ? [status, limit] : [status])
  }

  async getBatch(batchSize: number): Promise<EISSubmission[]> {
    return await db.query<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [batchSize]
    )
  }

  async updateStatus(id: string, status: EISSubmissionStatus, birReference?: string, error?: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    const params: unknown[] = [status, now]
    let sql = `UPDATE ${this.tableName} SET status = ?, last_attempt = ?`

    if (birReference !== undefined) {
      sql += ', bir_reference = ?'
      params.push(birReference)
    }
    if (error !== undefined) {
      sql += ', last_error = ?'
      params.push(error)
    }
    if (status === 'submitted') {
      sql += ', submitted_at = ?'
      params.push(now)
    }

    sql += ' WHERE id = ?'
    params.push(id)
    await db.execute(sql, params)
  }

  async incrementAttempts(id: string, error: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET attempts = attempts + 1, last_attempt = ?, last_error = ? WHERE id = ?`,
      [now, error, id]
    )
  }

  async markSubmitted(id: string, birReference: string): Promise<void> {
    await this.updateStatus(id, 'submitted', birReference)
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.updateStatus(id, 'failed', undefined, error)
  }

  async markRejected(id: string, error: string): Promise<void> {
    await this.updateStatus(id, 'rejected', undefined, error)
  }

  async setBatchId(ids: string[], batchId: string): Promise<void> {
    if (ids.length === 0) return
    const placeholders = ids.map(() => '?').join(',')
    await db.execute(
      `UPDATE ${this.tableName} SET batch_id = ? WHERE id IN (${placeholders})`,
      [batchId, ...ids]
    )
  }

  async countByStatus(): Promise<EISStatusCounts> {
    const results = await db.query<{ status: EISSubmissionStatus; cnt: number }>(
      `SELECT status, COUNT(*) as cnt FROM ${this.tableName} GROUP BY status`
    )
    const counts: EISStatusCounts = { pending: 0, submitted: 0, failed: 0, rejected: 0 }
    for (const row of results) {
      counts[row.status] = row.cnt
    }
    return counts
  }

  async getForDateRange(dateFrom: string, dateTo: string): Promise<EISSubmission[]> {
    return await db.query<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
      [dateFrom, dateTo]
    )
  }

  async findByORNumber(orNumber: string): Promise<EISSubmission | null> {
    return await db.getOne<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE or_number = ?`,
      [orNumber]
    )
  }

  async findByBirReference(birReference: string): Promise<EISSubmission | null> {
    return await db.getOne<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE bir_reference = ?`,
      [birReference]
    )
  }

  async getRecentFailed(limit: number = 20): Promise<EISSubmission[]> {
    return await db.query<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE status IN ('failed','rejected') ORDER BY last_attempt DESC LIMIT ?`,
      [limit]
    )
  }

  async getRetryable(maxRetries: number): Promise<EISSubmission[]> {
    return await db.query<EISSubmission>(
      `SELECT * FROM ${this.tableName} WHERE status = 'failed' AND attempts < ? ORDER BY created_at ASC`,
      [maxRetries]
    )
  }

  async resetFailedToPending(): Promise<number> {
    const result = await db.execute(
      `UPDATE ${this.tableName} SET status = 'pending', last_error = NULL WHERE status = 'failed'`
    )
    return result.changes
  }
}

export const eisSubmissionRepository = new EISSubmissionRepository()
export default eisSubmissionRepository
