/**
 * Z-Reading Repository
 * Manages end-of-day Z-Reading reports for BIR compliance
 */

import db from '@/db/database'
import type { ZReading, ZReadingInput, ZReadingCalculation } from '@/types/zReading'

export interface ZReadingFilters {
  terminalId?: string
  branchId?: string
  dateFrom?: string
  dateTo?: string
  date?: string
}

class ZReadingRepository {
  /**
   * Find a Z-Reading by ID
   */
  async findById(id: string): Promise<ZReading | null> {
    return await db.getOne<ZReading>(
      'SELECT * FROM z_readings WHERE id = ?',
      [id]
    )
  }

  /**
   * Find Z-Reading by terminal and counter
   */
  async findByCounter(terminalId: string, zCounter: number): Promise<ZReading | null> {
    return await db.getOne<ZReading>(
      'SELECT * FROM z_readings WHERE terminal_id = ? AND z_counter = ?',
      [terminalId, zCounter]
    )
  }

  /**
   * Find Z-Reading by terminal and date
   */
  async findByDate(terminalId: string, date: string): Promise<ZReading | null> {
    return await db.getOne<ZReading>(
      'SELECT * FROM z_readings WHERE terminal_id = ? AND date = ?',
      [terminalId, date]
    )
  }

  /**
   * Get all Z-Readings with optional filters
   */
  async findAll(filters?: ZReadingFilters): Promise<ZReading[]> {
    let sql = 'SELECT * FROM z_readings WHERE 1=1'
    const params: any[] = []

    if (filters?.terminalId) {
      sql += ' AND terminal_id = ?'
      params.push(filters.terminalId)
    }

    if (filters?.branchId) {
      sql += ' AND branch_id = ?'
      params.push(filters.branchId)
    }

    if (filters?.date) {
      sql += ' AND date = ?'
      params.push(filters.date)
    }

    if (filters?.dateFrom) {
      sql += ' AND date >= ?'
      params.push(filters.dateFrom)
    }

    if (filters?.dateTo) {
      sql += ' AND date <= ?'
      params.push(filters.dateTo)
    }

    sql += ' ORDER BY z_counter DESC'

    return await db.query<ZReading>(sql, params)
  }

  /**
   * Create a new Z-Reading
   */
  async create(
    input: ZReadingInput,
    calculation: ZReadingCalculation,
    zCounter: number,
    branchId: string
  ): Promise<ZReading> {
    const id = db.generateId('zread')
    const now = db.getCurrentTimestamp()
    const today = now.split('T')[0]

    await db.execute(
      `INSERT INTO z_readings (
        id, z_counter, terminal_id, branch_id, date,
        beginning_or, ending_or, beginning_balance,
        gross_sales, discount_total, net_sales,
        vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
        void_count, void_amount, refund_count, refund_amount,
        transaction_count, sc_discount_count, pwd_discount_count,
        generated_by, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        zCounter,
        input.terminal_id,
        branchId,
        today,
        calculation.beginningOR,
        calculation.endingOR,
        calculation.beginningBalance,
        calculation.grossSales,
        calculation.discountTotal,
        calculation.netSales,
        calculation.vatableSales,
        calculation.vatAmount,
        calculation.vatExemptSales,
        calculation.zeroRatedSales,
        calculation.voidCount,
        calculation.voidAmount,
        calculation.refundCount,
        calculation.refundAmount,
        calculation.transactionCount,
        calculation.scDiscountCount,
        calculation.pwdDiscountCount,
        input.supervisor_id,
        now
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Get the latest Z-Reading for a terminal
   */
  async getLatest(terminalId: string): Promise<ZReading | null> {
    return await db.getOne<ZReading>(
      'SELECT * FROM z_readings WHERE terminal_id = ? ORDER BY z_counter DESC LIMIT 1',
      [terminalId]
    )
  }

  /**
   * Get Z-Readings for a date range (for summary reports)
   */
  async getForPeriod(
    branchId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<ZReading[]> {
    return await db.query<ZReading>(
      `SELECT * FROM z_readings
       WHERE branch_id = ? AND date >= ? AND date <= ?
       ORDER BY date, z_counter`,
      [branchId, dateFrom, dateTo]
    )
  }

  /**
   * Mark Z-Reading as synced
   */
  async markSynced(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      'UPDATE z_readings SET synced_at = ? WHERE id = ?',
      [now, id]
    )
  }

  /**
   * Get unsynced Z-Readings
   */
  async getUnsynced(terminalId?: string): Promise<ZReading[]> {
    let sql = 'SELECT * FROM z_readings WHERE synced_at IS NULL'
    const params: any[] = []

    if (terminalId) {
      sql += ' AND terminal_id = ?'
      params.push(terminalId)
    }

    sql += ' ORDER BY z_counter'
    return await db.query<ZReading>(sql, params)
  }

  /**
   * Count Z-Readings for a terminal
   */
  async count(terminalId?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM z_readings'
    const params: any[] = []

    if (terminalId) {
      sql += ' WHERE terminal_id = ?'
      params.push(terminalId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return result?.count || 0
  }
}

export const zReadingRepository = new ZReadingRepository()
export default zReadingRepository
