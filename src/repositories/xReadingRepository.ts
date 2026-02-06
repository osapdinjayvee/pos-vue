/**
 * X-Reading Repository
 * Manages shift X-Reading snapshot reports
 */

import db from '@/db/database'
import type { XReading, XReadingInput, XReadingCalculation } from '@/types/xReading'

export interface XReadingFilters {
  terminalId?: string
  branchId?: string
  shiftId?: string
  cashierId?: string
  dateFrom?: string
  dateTo?: string
}

class XReadingRepository {
  /**
   * Find an X-Reading by ID
   */
  async findById(id: string): Promise<XReading | null> {
    return await db.getOne<XReading>(
      'SELECT * FROM x_readings WHERE id = ?',
      [id]
    )
  }

  /**
   * Find X-Readings by shift
   */
  async findByShift(shiftId: string): Promise<XReading[]> {
    return await db.query<XReading>(
      'SELECT * FROM x_readings WHERE shift_id = ? ORDER BY x_counter DESC',
      [shiftId]
    )
  }

  /**
   * Get all X-Readings with optional filters
   */
  async findAll(filters?: XReadingFilters): Promise<XReading[]> {
    let sql = 'SELECT * FROM x_readings WHERE 1=1'
    const params: any[] = []

    if (filters?.terminalId) {
      sql += ' AND terminal_id = ?'
      params.push(filters.terminalId)
    }

    if (filters?.branchId) {
      sql += ' AND branch_id = ?'
      params.push(filters.branchId)
    }

    if (filters?.shiftId) {
      sql += ' AND shift_id = ?'
      params.push(filters.shiftId)
    }

    if (filters?.cashierId) {
      sql += ' AND cashier_id = ?'
      params.push(filters.cashierId)
    }

    if (filters?.dateFrom) {
      sql += ' AND generated_at >= ?'
      params.push(filters.dateFrom)
    }

    if (filters?.dateTo) {
      sql += ' AND generated_at <= ?'
      params.push(filters.dateTo)
    }

    sql += ' ORDER BY x_counter DESC'

    return await db.query<XReading>(sql, params)
  }

  /**
   * Create a new X-Reading
   */
  async create(
    input: XReadingInput,
    calculation: XReadingCalculation,
    xCounter: number,
    branchId: string
  ): Promise<XReading> {
    const id = db.generateId('xread')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO x_readings (
        id, x_counter, terminal_id, branch_id, shift_id, cashier_id,
        gross_sales, discount_total, net_sales,
        vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
        transaction_count, void_count, void_amount,
        beginning_or, ending_or, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        xCounter,
        input.terminal_id,
        branchId,
        input.shift_id,
        input.cashier_id,
        calculation.grossSales,
        calculation.discountTotal,
        calculation.netSales,
        calculation.vatableSales,
        calculation.vatAmount,
        calculation.vatExemptSales,
        calculation.zeroRatedSales,
        calculation.transactionCount,
        calculation.voidCount,
        calculation.voidAmount,
        calculation.beginningOR,
        calculation.endingOR,
        now
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Get the latest X-Reading for a terminal
   */
  async getLatest(terminalId: string): Promise<XReading | null> {
    return await db.getOne<XReading>(
      'SELECT * FROM x_readings WHERE terminal_id = ? ORDER BY x_counter DESC LIMIT 1',
      [terminalId]
    )
  }

  /**
   * Get X-Readings generated today for a terminal
   */
  async getTodayReadings(terminalId: string): Promise<XReading[]> {
    const today = new Date().toISOString().split('T')[0]
    return await db.query<XReading>(
      `SELECT * FROM x_readings
       WHERE terminal_id = ? AND date(generated_at) = ?
       ORDER BY x_counter DESC`,
      [terminalId, today]
    )
  }

  /**
   * Mark X-Reading as synced
   */
  async markSynced(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      'UPDATE x_readings SET synced_at = ? WHERE id = ?',
      [now, id]
    )
  }

  /**
   * Get unsynced X-Readings
   */
  async getUnsynced(terminalId?: string): Promise<XReading[]> {
    let sql = 'SELECT * FROM x_readings WHERE synced_at IS NULL'
    const params: any[] = []

    if (terminalId) {
      sql += ' AND terminal_id = ?'
      params.push(terminalId)
    }

    sql += ' ORDER BY x_counter'
    return await db.query<XReading>(sql, params)
  }

  /**
   * Count X-Readings for a terminal
   */
  async count(terminalId?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM x_readings'
    const params: any[] = []

    if (terminalId) {
      sql += ' WHERE terminal_id = ?'
      params.push(terminalId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return result?.count || 0
  }
}

export const xReadingRepository = new XReadingRepository()
export default xReadingRepository
