import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { StockMovement, StockMovementInput, MovementType } from '@/types/inventory'

export type { QueryOptions, MovementType }

class StockMovementRepository extends BaseRepository<StockMovement> {
  protected tableName = 'stock_movements'
  protected idPrefix = 'mov'

  async getAll(): Promise<StockMovement[]> {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC' })
  }

  async getAllWithDetails(limit: number = 100): Promise<any[]> {
    const sql = `
      SELECT m.*, v.name as variant_name, v.sku, p.name as product_name, b.batch_number
      FROM ${this.tableName} m
      JOIN product_variants v ON m.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      LEFT JOIN batches b ON m.batch_id = b.id
      ORDER BY m.created_at DESC
      LIMIT ?
    `
    return await db.query(sql, [limit])
  }

  async findByVariantId(variantId: string, options?: QueryOptions): Promise<StockMovement[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE variant_id = ?`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<StockMovement>(sql, [variantId])
  }

  async findByBatchId(batchId: string): Promise<StockMovement[]> {
    return await db.query<StockMovement>(
      `SELECT * FROM ${this.tableName} WHERE batch_id = ? ORDER BY created_at DESC`,
      [batchId]
    )
  }

  async findByType(movementType: MovementType, options?: QueryOptions): Promise<StockMovement[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE movement_type = ?`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<StockMovement>(sql, [movementType])
  }

  async findByReference(referenceType: string, referenceId: string): Promise<StockMovement[]> {
    return await db.query<StockMovement>(
      `SELECT * FROM ${this.tableName}
       WHERE reference_type = ? AND reference_id = ?
       ORDER BY created_at DESC`,
      [referenceType, referenceId]
    )
  }

  async findByDateRange(startDate: string, endDate: string, variantId?: string): Promise<StockMovement[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE created_at >= ? AND created_at <= ?`
    const params: any[] = [startDate, endDate]

    if (variantId) {
      sql += ' AND variant_id = ?'
      params.push(variantId)
    }

    sql += ' ORDER BY created_at DESC'

    return await db.query<StockMovement>(sql, params)
  }

  async calculateStock(variantId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
    return result?.total || 0
  }

  async calculateBatchStock(batchId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM ${this.tableName} WHERE batch_id = ?`,
      [batchId]
    )
    return result?.total || 0
  }

  async createMovement(data: StockMovementInput): Promise<StockMovement> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, variant_id, batch_id, quantity, movement_type, reference_type, reference_id, unit_cost, reason, user_id, terminal_id, branch_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.variant_id,
        data.batch_id || null,
        data.quantity,
        data.movement_type,
        data.reference_type || null,
        data.reference_id || null,
        data.unit_cost ?? null,
        data.reason || null,
        data.user_id,
        data.terminal_id,
        data.branch_id,
        now
      ]
    )

    return await this.findById(id) as StockMovement
  }

  async recordReceive(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    branchId: string,
    options?: { batchId?: string; unitCost?: number; reason?: string }
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      batch_id: options?.batchId,
      quantity: Math.abs(quantity), // Always positive for receive
      movement_type: 'receive',
      unit_cost: options?.unitCost,
      reason: options?.reason,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: branchId
    })
  }

  async recordSale(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    branchId: string,
    options?: { batchId?: string; referenceId?: string; unitCost?: number }
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      batch_id: options?.batchId,
      quantity: -Math.abs(quantity), // Always negative for sale
      movement_type: 'sale',
      reference_type: options?.referenceId ? 'transaction' : undefined,
      reference_id: options?.referenceId,
      unit_cost: options?.unitCost,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: branchId
    })
  }

  async recordAdjustment(
    variantId: string,
    quantity: number, // Can be positive or negative
    reason: string,
    userId: string,
    terminalId: string,
    branchId: string,
    batchId?: string
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      batch_id: batchId,
      quantity,
      movement_type: 'adjustment',
      reason,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: branchId
    })
  }

  async recordTransferOut(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    sourceBranchId: string,
    reference: string,
    notes?: string
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      quantity: -Math.abs(quantity),
      movement_type: 'transfer_out',
      reference_type: 'transfer',
      reference_id: reference,
      reason: notes,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: sourceBranchId
    })
  }

  async recordTransferIn(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    destBranchId: string,
    reference: string,
    notes?: string
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      quantity: Math.abs(quantity),
      movement_type: 'transfer_in',
      reference_type: 'transfer',
      reference_id: reference,
      reason: notes,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: destBranchId
    })
  }

  async recordReturn(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    branchId: string,
    reason?: string,
    referenceId?: string
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      quantity: Math.abs(quantity), // Positive - adding stock back
      movement_type: 'return',
      reference_type: referenceId ? 'transaction' : undefined,
      reference_id: referenceId,
      reason,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: branchId
    })
  }

  async recordVoid(
    variantId: string,
    quantity: number,
    userId: string,
    terminalId: string,
    branchId: string,
    referenceId: string
  ): Promise<StockMovement> {
    return this.createMovement({
      variant_id: variantId,
      quantity: Math.abs(quantity), // Positive - restoring stock
      movement_type: 'void',
      reference_type: 'transaction',
      reference_id: referenceId,
      user_id: userId,
      terminal_id: terminalId,
      branch_id: branchId
    })
  }

  async getMovementSummary(variantId: string): Promise<Record<MovementType, { count: number; totalQuantity: number }>> {
    const movements = await this.findByVariantId(variantId)
    const summary: Record<string, { count: number; totalQuantity: number }> = {}

    const types: MovementType[] = ['receive', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'void']

    for (const type of types) {
      summary[type] = { count: 0, totalQuantity: 0 }
    }

    for (const movement of movements) {
      const entry = summary[movement.movement_type]
      if (entry) {
        entry.count++
        entry.totalQuantity += movement.quantity
      }
    }

    return summary as Record<MovementType, { count: number; totalQuantity: number }>
  }

  async getUnsyncedMovements(): Promise<StockMovement[]> {
    return await db.query<StockMovement>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC`
    )
  }

  async markAsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const now = db.getCurrentTimestamp()
    const placeholders = ids.map(() => '?').join(',')

    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ? WHERE id IN (${placeholders})`,
      [now, ...ids]
    )
  }

  async findWithDetails(variantId: string, options?: QueryOptions): Promise<any[]> {
    let sql = `
      SELECT m.*, v.name as variant_name, v.sku, p.name as product_name, b.batch_number
      FROM ${this.tableName} m
      JOIN product_variants v ON m.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      LEFT JOIN batches b ON m.batch_id = b.id
      WHERE m.variant_id = ?
    `

    if (options?.orderBy) {
      sql += ` ORDER BY m.${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY m.created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query(sql, [variantId])
  }

  async countByVariantId(variantId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
    return result?.count || 0
  }

  async getFilteredWithDetails(filters: {
    movementType?: MovementType
    search?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }): Promise<{ data: any[]; total: number }> {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.movementType) {
      conditions.push('m.movement_type = ?')
      params.push(filters.movementType)
    }

    if (filters.search) {
      conditions.push('(p.name LIKE ? OR v.name LIKE ? OR v.sku LIKE ? OR m.reason LIKE ?)')
      const term = `%${filters.search}%`
      params.push(term, term, term, term)
    }

    if (filters.dateFrom) {
      conditions.push('m.created_at >= ?')
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      conditions.push('m.created_at <= ?')
      params.push(filters.dateTo + 'T23:59:59')
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countResult = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM ${this.tableName} m
       JOIN product_variants v ON m.variant_id = v.id
       JOIN products p ON v.product_id = p.id
       ${whereClause}`,
      params
    )

    const data = await db.query(
      `SELECT m.*, v.name as variant_name, v.sku, p.name as product_name, p.id as product_id, b.batch_number
       FROM ${this.tableName} m
       JOIN product_variants v ON m.variant_id = v.id
       JOIN products p ON v.product_id = p.id
       LEFT JOIN batches b ON m.batch_id = b.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit || 25, filters.offset || 0]
    )

    return { data, total: countResult?.count || 0 }
  }
}

export const stockMovementRepository = new StockMovementRepository()
export default stockMovementRepository
