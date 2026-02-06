/**
 * Shift Repository
 * Data access for shift management
 */

import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Shift, ShiftStatus, ShiftStartInput, ShiftCloseInput } from '@/types/user'

class ShiftRepository extends BaseRepository<Shift> {
  protected tableName = 'shifts'
  protected idPrefix = 'shft'

  /**
   * Get current open shift for a user
   */
  async findOpenShift(userId: string): Promise<Shift | null> {
    return await db.getOne<Shift>(
      `SELECT s.*, u.first_name || ' ' || u.last_name as user_name
       FROM ${this.tableName} s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ? AND s.status = 'open'`,
      [userId]
    )
  }

  /**
   * Check if user has any open shift
   */
  async hasOpenShift(userId: string): Promise<boolean> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = ? AND status = 'open'`,
      [userId]
    )

    return (result?.count || 0) > 0
  }

  /**
   * Start a new shift
   */
  async startShift(
    userId: string,
    branchId: string,
    input: ShiftStartInput
  ): Promise<Shift> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, user_id, terminal_id, branch_id, started_at, opening_cash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [id, userId, input.terminal_id, branchId, now, input.opening_cash, now, now]
    )

    return (await this.findById(id))!
  }

  /**
   * Close a shift
   */
  async closeShift(
    shiftId: string,
    input: ShiftCloseInput,
    expectedCash: number
  ): Promise<Shift | null> {
    const now = db.getCurrentTimestamp()
    const variance = input.closing_cash - expectedCash

    await db.execute(
      `UPDATE ${this.tableName}
       SET ended_at = ?, closing_cash = ?, expected_cash = ?, variance = ?, variance_reason = ?, status = 'closed', updated_at = ?
       WHERE id = ?`,
      [
        now,
        input.closing_cash,
        expectedCash,
        variance,
        input.variance_reason || null,
        now,
        shiftId
      ]
    )

    return await this.findById(shiftId)
  }

  /**
   * Force close a shift (by supervisor)
   */
  async forceCloseShift(
    shiftId: string,
    closedBy: string,
    reason: string
  ): Promise<Shift | null> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `UPDATE ${this.tableName}
       SET ended_at = ?, status = 'force_closed', closed_by = ?, variance_reason = ?, updated_at = ?
       WHERE id = ?`,
      [now, closedBy, reason, now, shiftId]
    )

    return await this.findById(shiftId)
  }

  /**
   * Find shifts by user
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<Shift[]> {
    let sql = `
      SELECT s.*, u.first_name || ' ' || u.last_name as user_name
      FROM ${this.tableName} s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.user_id = ?
    `
    const params: any[] = [userId]

    sql += ' ORDER BY s.started_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Shift>(sql, params)
  }

  /**
   * Find shifts by branch
   */
  async findByBranch(branchId: string, options?: QueryOptions): Promise<Shift[]> {
    let sql = `
      SELECT s.*, u.first_name || ' ' || u.last_name as user_name
      FROM ${this.tableName} s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.branch_id = ?
    `
    const params: any[] = [branchId]

    sql += ' ORDER BY s.started_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Shift>(sql, params)
  }

  /**
   * Find shifts by terminal
   */
  async findByTerminal(terminalId: string, options?: QueryOptions): Promise<Shift[]> {
    let sql = `
      SELECT s.*, u.first_name || ' ' || u.last_name as user_name
      FROM ${this.tableName} s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.terminal_id = ?
    `
    const params: any[] = [terminalId]

    sql += ' ORDER BY s.started_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Shift>(sql, params)
  }

  /**
   * Find shifts by status
   */
  async findByStatus(status: ShiftStatus, options?: QueryOptions): Promise<Shift[]> {
    let sql = `
      SELECT s.*, u.first_name || ' ' || u.last_name as user_name
      FROM ${this.tableName} s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.status = ?
    `
    const params: any[] = [status]

    sql += ' ORDER BY s.started_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Shift>(sql, params)
  }

  /**
   * Find all open shifts (for supervisor view)
   */
  async findAllOpen(): Promise<Shift[]> {
    return await db.query<Shift>(
      `SELECT s.*, u.first_name || ' ' || u.last_name as user_name
       FROM ${this.tableName} s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.status = 'open'
       ORDER BY s.started_at ASC`
    )
  }

  /**
   * Find shifts by date range
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    branchId?: string,
    options?: QueryOptions
  ): Promise<Shift[]> {
    let sql = `
      SELECT s.*, u.first_name || ' ' || u.last_name as user_name
      FROM ${this.tableName} s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.started_at >= ? AND s.started_at <= ?
    `
    const params: any[] = [startDate, endDate]

    if (branchId) {
      sql += ' AND s.branch_id = ?'
      params.push(branchId)
    }

    sql += ' ORDER BY s.started_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Shift>(sql, params)
  }

  /**
   * Get shift summary for reporting
   */
  async getShiftSummary(shiftId: string): Promise<{
    totalSales: number
    totalVoids: number
    totalRefunds: number
    transactionCount: number
  }> {
    // This would typically join with orders table
    // For now, return placeholder values
    const ordersResult = await db.getOne<{
      total_sales: number
      void_count: number
      refund_count: number
      tx_count: number
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_sales,
         COALESCE(SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END), 0) as void_count,
         COALESCE(SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END), 0) as refund_count,
         COUNT(*) as tx_count
       FROM orders
       WHERE shift_id = ?`,
      [shiftId]
    )

    return {
      totalSales: ordersResult?.total_sales || 0,
      totalVoids: ordersResult?.void_count || 0,
      totalRefunds: ordersResult?.refund_count || 0,
      transactionCount: ordersResult?.tx_count || 0
    }
  }

  /**
   * Calculate expected cash for shift
   */
  async calculateExpectedCash(shiftId: string): Promise<number> {
    const shift = await this.findById(shiftId)
    if (!shift) return 0

    // Get cash transactions from orders
    const cashResult = await db.getOne<{ cash_in: number; cash_out: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN p.payment_method = 'cash' AND o.status = 'completed' THEN p.amount ELSE 0 END), 0) as cash_in,
         COALESCE(SUM(CASE WHEN p.payment_method = 'cash' AND o.status = 'refunded' THEN p.amount ELSE 0 END), 0) as cash_out
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.shift_id = ?`,
      [shiftId]
    )

    const cashIn = cashResult?.cash_in || 0
    const cashOut = cashResult?.cash_out || 0

    return shift.opening_cash + cashIn - cashOut
  }

  /**
   * Get unsynced shifts for sync
   */
  async getUnsynced(limit: number = 100): Promise<Shift[]> {
    return await db.query<Shift>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      [limit]
    )
  }

  /**
   * Mark shifts as synced
   */
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const placeholders = ids.map(() => '?').join(', ')
    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ? WHERE id IN (${placeholders})`,
      [db.getCurrentTimestamp(), ...ids]
    )
  }
}

export const shiftRepository = new ShiftRepository()
export default shiftRepository
