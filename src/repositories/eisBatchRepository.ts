import { BaseRepository } from './baseRepository'
import db from '@/db/database'
import type { EISBatch, EISBatchStatus } from '@/types/eis'

class EISBatchRepository extends BaseRepository<EISBatch> {
  protected tableName = 'eis_batches'
  protected idPrefix = 'eisb'

  async updateCounts(id: string, successCount: number, failedCount: number): Promise<void> {
    await db.execute(
      `UPDATE ${this.tableName} SET success_count = ?, failed_count = ? WHERE id = ?`,
      [successCount, failedCount, id]
    )
  }

  async markCompleted(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET status = 'completed', completed_at = ? WHERE id = ?`,
      [now, id]
    )
  }

  async markPartial(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET status = 'partial', completed_at = ? WHERE id = ?`,
      [now, id]
    )
  }

  async getRecent(limit: number = 20): Promise<EISBatch[]> {
    return await db.query<EISBatch>(
      `SELECT * FROM ${this.tableName} ORDER BY submitted_at DESC LIMIT ?`,
      [limit]
    )
  }

  async getByStatus(status: EISBatchStatus): Promise<EISBatch[]> {
    return await db.query<EISBatch>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY submitted_at DESC`,
      [status]
    )
  }
}

export const eisBatchRepository = new EISBatchRepository()
export default eisBatchRepository
