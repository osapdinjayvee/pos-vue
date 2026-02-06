/**
 * Sales Hourly Repository
 * Manages hourly sales aggregates for time-based analytics
 */

import db from '@/db/database'
import type { SalesHourlyAggregate, SalesHourlyInput, HeatmapCell } from '@/types/analytics'

class SalesHourlyRepository {
  /**
   * Upsert hourly sales aggregate (idempotent)
   */
  async upsert(data: SalesHourlyInput): Promise<SalesHourlyAggregate> {
    const existing = await db.getOne<SalesHourlyAggregate>(
      'SELECT * FROM sales_hourly WHERE terminal_id = ? AND date = ? AND hour = ?',
      [data.terminal_id, data.date, data.hour]
    )

    if (existing) {
      await db.execute(
        `UPDATE sales_hourly SET sales = ?, transaction_count = ? WHERE id = ?`,
        [data.sales, data.transaction_count, existing.id]
      )
      return (await db.getOne<SalesHourlyAggregate>(
        'SELECT * FROM sales_hourly WHERE id = ?', [existing.id]
      ))!
    }

    const id = db.generateId('shour')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO sales_hourly (id, date, hour, terminal_id, branch_id, sales, transaction_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.date, data.hour, data.terminal_id, data.branch_id, data.sales, data.transaction_count, now]
    )

    return (await db.getOne<SalesHourlyAggregate>(
      'SELECT * FROM sales_hourly WHERE id = ?', [id]
    ))!
  }

  /**
   * Get hourly data for a specific date
   */
  async getForDate(date: string, branchId?: string): Promise<SalesHourlyAggregate[]> {
    let sql = 'SELECT * FROM sales_hourly WHERE date = ?'
    const params: any[] = [date]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' ORDER BY hour ASC'
    return await db.query<SalesHourlyAggregate>(sql, params)
  }

  /**
   * Get hourly data for a date range
   */
  async getForPeriod(dateFrom: string, dateTo: string, branchId?: string): Promise<SalesHourlyAggregate[]> {
    let sql = 'SELECT * FROM sales_hourly WHERE date >= ? AND date <= ?'
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' ORDER BY date ASC, hour ASC'
    return await db.query<SalesHourlyAggregate>(sql, params)
  }

  /**
   * Get heatmap data: day-of-week x hour grid with average sales
   */
  async getHeatmapData(dateFrom: string, dateTo: string, branchId?: string): Promise<HeatmapCell[]> {
    let sql = `
      SELECT
        CAST(strftime('%w', date) AS INTEGER) as dayOfWeek,
        hour,
        AVG(sales) as sales,
        AVG(transaction_count) as transactionCount
      FROM sales_hourly
      WHERE date >= ? AND date <= ?
    `
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' GROUP BY dayOfWeek, hour ORDER BY dayOfWeek, hour'

    const rows = await db.query<{
      dayOfWeek: number
      hour: number
      sales: number
      transactionCount: number
    }>(sql, params)

    // Find max sales for intensity calculation
    const maxSales = Math.max(...rows.map(r => r.sales), 1)

    return rows.map(row => ({
      dayOfWeek: row.dayOfWeek,
      hour: row.hour,
      sales: row.sales,
      transactionCount: row.transactionCount,
      intensity: row.sales / maxSales
    }))
  }

  /**
   * Get aggregated hourly totals for a period (for trend chart)
   */
  async getHourlyTotals(dateFrom: string, dateTo: string, branchId?: string): Promise<{
    hour: number
    totalSales: number
    totalCount: number
    avgSales: number
  }[]> {
    let sql = `
      SELECT
        hour,
        SUM(sales) as totalSales,
        SUM(transaction_count) as totalCount,
        AVG(sales) as avgSales
      FROM sales_hourly
      WHERE date >= ? AND date <= ?
    `
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' GROUP BY hour ORDER BY hour'
    return await db.query(sql, params)
  }

  /**
   * Delete all hourly data for a date (for re-aggregation)
   */
  async deleteForDate(date: string, terminalId?: string): Promise<void> {
    let sql = 'DELETE FROM sales_hourly WHERE date = ?'
    const params: any[] = [date]

    if (terminalId) {
      sql += ' AND terminal_id = ?'
      params.push(terminalId)
    }

    await db.execute(sql, params)
  }

  /**
   * Check if data exists for a date
   */
  async hasDataForDate(date: string, branchId?: string): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM sales_hourly WHERE date = ?'
    const params: any[] = [date]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}

export const salesHourlyRepository = new SalesHourlyRepository()
export default salesHourlyRepository
