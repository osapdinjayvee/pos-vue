/**
 * Sales Aggregate Repository
 * Manages daily sales aggregate records for fast reporting
 */

import db from '@/db/database'
import type { SalesAggregate } from '@/types/report'

export interface AggregateFilters {
  terminalId?: string
  branchId?: string
  dateFrom?: string
  dateTo?: string
  date?: string
}

class SalesAggregateRepository {
  /**
   * Find aggregate by ID
   */
  async findById(id: string): Promise<SalesAggregate | null> {
    return await db.getOne<SalesAggregate>(
      'SELECT * FROM sales_aggregates WHERE id = ?',
      [id]
    )
  }

  /**
   * Find aggregate by terminal and date
   */
  async findByTerminalDate(terminalId: string, date: string): Promise<SalesAggregate | null> {
    return await db.getOne<SalesAggregate>(
      'SELECT * FROM sales_aggregates WHERE terminal_id = ? AND date = ?',
      [terminalId, date]
    )
  }

  /**
   * Get aggregates with optional filters
   */
  async findAll(filters?: AggregateFilters): Promise<SalesAggregate[]> {
    let sql = 'SELECT * FROM sales_aggregates WHERE 1=1'
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

    sql += ' ORDER BY date DESC'

    return await db.query<SalesAggregate>(sql, params)
  }

  /**
   * Upsert a sales aggregate (create or update)
   */
  async upsert(data: Omit<SalesAggregate, 'id' | 'created_at'>): Promise<SalesAggregate> {
    const existing = await this.findByTerminalDate(data.terminal_id, data.date)

    if (existing) {
      await db.execute(
        `UPDATE sales_aggregates SET
          gross_sales = ?, discount_total = ?, net_sales = ?,
          vatable_sales = ?, vat_amount = ?,
          vat_exempt_sales = ?, zero_rated_sales = ?,
          transaction_count = ?, void_count = ?, void_amount = ?,
          refund_count = ?, refund_amount = ?,
          cash_sales = ?, card_sales = ?, other_sales = ?,
          average_ticket = ?
         WHERE id = ?`,
        [
          data.gross_sales, data.discount_total, data.net_sales,
          data.vatable_sales, data.vat_amount,
          data.vat_exempt_sales, data.zero_rated_sales,
          data.transaction_count, data.void_count, data.void_amount,
          data.refund_count, data.refund_amount,
          data.cash_sales, data.card_sales, data.other_sales,
          data.average_ticket,
          existing.id
        ]
      )

      return (await this.findById(existing.id))!
    }

    const id = db.generateId('sagg')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO sales_aggregates (
        id, date, terminal_id, branch_id,
        gross_sales, discount_total, net_sales,
        vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales,
        transaction_count, void_count, void_amount,
        refund_count, refund_amount,
        cash_sales, card_sales, other_sales,
        average_ticket, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.date, data.terminal_id, data.branch_id,
        data.gross_sales, data.discount_total, data.net_sales,
        data.vatable_sales, data.vat_amount, data.vat_exempt_sales, data.zero_rated_sales,
        data.transaction_count, data.void_count, data.void_amount,
        data.refund_count, data.refund_amount,
        data.cash_sales, data.card_sales, data.other_sales,
        data.average_ticket, now
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Get aggregates for a date range (for summary reports)
   */
  async getForPeriod(
    branchId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<SalesAggregate[]> {
    return await db.query<SalesAggregate>(
      `SELECT * FROM sales_aggregates
       WHERE branch_id = ? AND date >= ? AND date <= ?
       ORDER BY date`,
      [branchId, dateFrom, dateTo]
    )
  }

  /**
   * Get summary totals for a date range
   */
  async getSummary(
    branchId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{
    totalGross: number
    totalNet: number
    totalVAT: number
    totalTransactions: number
    totalVoids: number
    totalRefunds: number
    averageDaily: number
  }> {
    const result = await db.getOne<{
      total_gross: number
      total_net: number
      total_vat: number
      total_transactions: number
      total_voids: number
      total_refunds: number
      day_count: number
    }>(
      `SELECT
        COALESCE(SUM(gross_sales), 0) as total_gross,
        COALESCE(SUM(net_sales), 0) as total_net,
        COALESCE(SUM(vat_amount), 0) as total_vat,
        COALESCE(SUM(transaction_count), 0) as total_transactions,
        COALESCE(SUM(void_count), 0) as total_voids,
        COALESCE(SUM(refund_count), 0) as total_refunds,
        COUNT(DISTINCT date) as day_count
       FROM sales_aggregates
       WHERE branch_id = ? AND date >= ? AND date <= ?`,
      [branchId, dateFrom, dateTo]
    )

    const dayCount = result?.day_count || 1

    return {
      totalGross: result?.total_gross || 0,
      totalNet: result?.total_net || 0,
      totalVAT: result?.total_vat || 0,
      totalTransactions: result?.total_transactions || 0,
      totalVoids: result?.total_voids || 0,
      totalRefunds: result?.total_refunds || 0,
      averageDaily: (result?.total_net || 0) / dayCount
    }
  }

  /**
   * Get today's aggregate for a terminal
   */
  async getToday(terminalId: string): Promise<SalesAggregate | null> {
    const { toLocalDateStr } = await import('@/utils/dateHelpers')
    const today = toLocalDateStr()
    return this.findByTerminalDate(terminalId, today)
  }

  /**
   * Delete aggregate (for recalculation)
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.execute(
      'DELETE FROM sales_aggregates WHERE id = ?',
      [id]
    )
    return result.changes > 0
  }

  /**
   * Count aggregates
   */
  async count(branchId?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM sales_aggregates'
    const params: any[] = []

    if (branchId) {
      sql += ' WHERE branch_id = ?'
      params.push(branchId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return result?.count || 0
  }
}

export const salesAggregateRepository = new SalesAggregateRepository()
export default salesAggregateRepository
