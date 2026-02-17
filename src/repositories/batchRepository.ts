import db from '@/db/database'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { Batch, BatchInput } from '@/types/inventory'

export type { QueryOptions }

class BatchRepository extends BaseRepository<Batch> {
  protected tableName = 'batches'
  protected idPrefix = 'bat'

  async findByVariantId(variantId: string, options?: QueryOptions): Promise<Batch[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE variant_id = ?`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY expiry_date ASC NULLS LAST, received_date DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Batch>(sql, [variantId])
  }

  async findByBatchNumber(batchNumber: string, variantId?: string): Promise<Batch | null> {
    let sql = `SELECT * FROM ${this.tableName} WHERE batch_number = ?`
    const params: any[] = [batchNumber]

    if (variantId) {
      sql += ' AND variant_id = ?'
      params.push(variantId)
    }

    return await db.getOne<Batch>(sql, params)
  }

  async findExpiringSoon(daysUntilExpiry: number = 7): Promise<Batch[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + daysUntilExpiry)
    const cutoffStr = toLocalDateStr(cutoffDate)

    return await db.query<Batch>(
      `SELECT * FROM ${this.tableName}
       WHERE expiry_date IS NOT NULL
       AND expiry_date <= ?
       AND expiry_date >= date('now')
       ORDER BY expiry_date ASC`,
      [cutoffStr]
    )
  }

  async findExpired(): Promise<Batch[]> {
    return await db.query<Batch>(
      `SELECT * FROM ${this.tableName}
       WHERE expiry_date IS NOT NULL
       AND expiry_date < date('now')
       ORDER BY expiry_date DESC`
    )
  }

  async batchNumberExists(batchNumber: string, variantId: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE batch_number = ? AND variant_id = ?`
    const params: any[] = [batchNumber, variantId]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  async createBatch(data: BatchInput): Promise<Batch> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, variant_id, batch_number, expiry_date, manufacture_date, received_date, supplier_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.variant_id,
        data.batch_number,
        data.expiry_date || null,
        data.manufacture_date || null,
        data.received_date,
        data.supplier_id || null,
        data.notes || null,
        now
      ]
    )

    return await this.findById(id) as Batch
  }

  async updateBatch(id: string, data: Partial<BatchInput>): Promise<Batch | null> {
    const updates: string[] = []
    const values: any[] = []

    if (data.batch_number !== undefined) {
      updates.push('batch_number = ?')
      values.push(data.batch_number)
    }
    if (data.expiry_date !== undefined) {
      updates.push('expiry_date = ?')
      values.push(data.expiry_date || null)
    }
    if (data.manufacture_date !== undefined) {
      updates.push('manufacture_date = ?')
      values.push(data.manufacture_date || null)
    }
    if (data.received_date !== undefined) {
      updates.push('received_date = ?')
      values.push(data.received_date)
    }
    if (data.supplier_id !== undefined) {
      updates.push('supplier_id = ?')
      values.push(data.supplier_id || null)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes || null)
    }

    if (updates.length === 0) {
      return await this.findById(id)
    }

    values.push(id)

    await db.execute(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    return await this.findById(id)
  }

  async deleteByVariantId(variantId: string): Promise<number> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
    return result.changes
  }

  async countByVariantId(variantId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
    return result?.count || 0
  }

  async findWithStockQuantity(variantId: string): Promise<(Batch & { current_quantity: number })[]> {
    return await db.query(
      `SELECT b.*, COALESCE(SUM(m.quantity), 0) as current_quantity
       FROM ${this.tableName} b
       LEFT JOIN stock_movements m ON b.id = m.batch_id
       WHERE b.variant_id = ?
       GROUP BY b.id
       ORDER BY b.expiry_date ASC NULLS LAST, b.received_date DESC`,
      [variantId]
    )
  }

  async findActiveBatches(variantId: string): Promise<(Batch & { current_quantity: number })[]> {
    // Batches with positive stock that haven't expired
    return await db.query(
      `SELECT b.*, COALESCE(SUM(m.quantity), 0) as current_quantity
       FROM ${this.tableName} b
       LEFT JOIN stock_movements m ON b.id = m.batch_id
       WHERE b.variant_id = ?
       AND (b.expiry_date IS NULL OR b.expiry_date >= date('now'))
       GROUP BY b.id
       HAVING current_quantity > 0
       ORDER BY b.expiry_date ASC NULLS LAST`,
      [variantId]
    )
  }

  async getOldestBatchWithStock(variantId: string): Promise<(Batch & { current_quantity: number }) | null> {
    // FIFO: Get the oldest non-expired batch with available stock
    return await db.getOne(
      `SELECT b.*, COALESCE(SUM(m.quantity), 0) as current_quantity
       FROM ${this.tableName} b
       LEFT JOIN stock_movements m ON b.id = m.batch_id
       WHERE b.variant_id = ?
       AND (b.expiry_date IS NULL OR b.expiry_date >= date('now'))
       GROUP BY b.id
       HAVING current_quantity > 0
       ORDER BY b.expiry_date ASC NULLS LAST, b.received_date ASC
       LIMIT 1`,
      [variantId]
    )
  }

  async findWithSupplierDetails(variantId: string): Promise<any[]> {
    return await db.query(
      `SELECT b.*, s.name as supplier_name, COALESCE(SUM(m.quantity), 0) as current_quantity
       FROM ${this.tableName} b
       LEFT JOIN suppliers s ON b.supplier_id = s.id
       LEFT JOIN stock_movements m ON b.id = m.batch_id
       WHERE b.variant_id = ?
       GROUP BY b.id
       ORDER BY b.expiry_date ASC NULLS LAST, b.received_date DESC`,
      [variantId]
    )
  }

  async getExpiringBatchesSummary(daysAhead: number = 30): Promise<any[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead)
    const cutoffStr = toLocalDateStr(cutoffDate)

    return await db.query(
      `SELECT b.*, v.name as variant_name, v.sku, p.name as product_name, COALESCE(SUM(m.quantity), 0) as current_quantity
       FROM ${this.tableName} b
       JOIN product_variants v ON b.variant_id = v.id
       JOIN products p ON v.product_id = p.id
       LEFT JOIN stock_movements m ON b.id = m.batch_id
       WHERE b.expiry_date IS NOT NULL
       AND b.expiry_date <= ?
       AND b.expiry_date >= date('now')
       GROUP BY b.id
       HAVING current_quantity > 0
       ORDER BY b.expiry_date ASC`,
      [cutoffStr]
    )
  }

  async findBySupplier(supplierId: string): Promise<Batch[]> {
    return await db.query<Batch>(
      `SELECT * FROM ${this.tableName}
       WHERE supplier_id = ?
       ORDER BY received_date DESC`,
      [supplierId]
    )
  }
}

export const batchRepository = new BatchRepository()
export default batchRepository
