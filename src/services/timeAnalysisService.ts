/**
 * Time Analysis Service (T025)
 * Provides time-based analytics: heatmap, staffing recommendations,
 * period overlay comparison, and day drill-down.
 */

import db from '@/db/database'
import { salesHourlyRepository } from '@/repositories/salesHourlyRepository'
import type {
  HeatmapCell,
  StaffingRecommendation,
  SalesTrendPoint,
  DayDrilldown
} from '@/types/analytics'
import { getHourLabel } from '@/types/report'

class TimeAnalysisService {
  /**
   * Get heatmap data (day-of-week x hour) for the given date range.
   * Delegates to salesHourlyRepository.
   */
  async getHeatmapData(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<HeatmapCell[]> {
    return await salesHourlyRepository.getHeatmapData(dateFrom, dateTo, branchId)
  }

  /**
   * Generate staffing recommendations based on average hourly transaction counts.
   * Peak levels: 'low' < 10 tx, 'medium' 10-25, 'high' > 25
   * Suggested staff = ceil(avgTransactions / 10)
   */
  async getStaffingRecommendations(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<StaffingRecommendation[]> {
    let sql = `
      SELECT
        hour,
        AVG(transaction_count) as avgTransactions
      FROM sales_hourly
      WHERE date >= ? AND date <= ?
    `
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' GROUP BY hour ORDER BY hour'

    const rows = await db.query<{ hour: number; avgTransactions: number }>(sql, params)

    return rows.map((row) => {
      const avg = row.avgTransactions
      let peakLevel: 'low' | 'medium' | 'high'

      if (avg < 10) {
        peakLevel = 'low'
      } else if (avg <= 25) {
        peakLevel = 'medium'
      } else {
        peakLevel = 'high'
      }

      return {
        hour: row.hour,
        hourLabel: getHourLabel(row.hour),
        avgTransactions: Math.round(avg * 100) / 100,
        suggestedStaff: Math.ceil(avg / 10),
        peakLevel
      }
    })
  }

  /**
   * Get period overlay data for comparing two date ranges side-by-side.
   * Returns daily sales trend points for each period.
   */
  async getPeriodOverlay(
    period1From: string,
    period1To: string,
    period2From: string,
    period2To: string,
    branchId?: string
  ): Promise<{ period1: SalesTrendPoint[]; period2: SalesTrendPoint[] }> {
    const fetchPeriod = async (
      dateFrom: string,
      dateTo: string
    ): Promise<SalesTrendPoint[]> => {
      let sql = `
        SELECT
          date as label,
          SUM(sales) as sales,
          SUM(transaction_count) as transactionCount
        FROM sales_hourly
        WHERE date >= ? AND date <= ?
      `
      const params: any[] = [dateFrom, dateTo]

      if (branchId) {
        sql += ' AND branch_id = ?'
        params.push(branchId)
      }

      sql += ' GROUP BY date ORDER BY date'

      return await db.query<SalesTrendPoint>(sql, params)
    }

    const [period1, period2] = await Promise.all([
      fetchPeriod(period1From, period1To),
      fetchPeriod(period2From, period2To)
    ])

    return { period1, period2 }
  }

  /**
   * Get detailed drill-down for a specific date.
   * Includes hourly breakdown, top 10 products, and payment breakdown.
   */
  async getDayDrilldown(
    date: string,
    branchId?: string
  ): Promise<DayDrilldown> {
    // --- Hourly breakdown from sales_hourly ---
    let hourlySql = `
      SELECT
        hour,
        SUM(sales) as sales,
        SUM(transaction_count) as count
      FROM sales_hourly
      WHERE date = ?
    `
    const hourlyParams: any[] = [date]

    if (branchId) {
      hourlySql += ' AND branch_id = ?'
      hourlyParams.push(branchId)
    }

    hourlySql += ' GROUP BY hour ORDER BY hour'

    const hourlyRows = await db.query<{ hour: number; sales: number; count: number }>(
      hourlySql,
      hourlyParams
    )

    const hourlyBreakdown = hourlyRows.map((r) => ({
      hour: r.hour,
      label: getHourLabel(r.hour),
      sales: r.sales,
      count: r.count
    }))

    // --- Top 10 products from order_items joined with products ---
    let productsSql = `
      SELECT
        p.name as name,
        SUM(oi.quantity) as quantity,
        SUM(oi.total) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE DATE(o.created_at) = ?
        AND o.status IN ('completed', 'confirmed', 'processing')
    `
    const productsParams: any[] = [date]

    if (branchId) {
      productsSql += ' AND o.branch_id = ?'
      productsParams.push(branchId)
    }

    productsSql += ' GROUP BY oi.product_id ORDER BY revenue DESC LIMIT 10'

    const topProducts = await db.query<{ name: string; quantity: number; revenue: number }>(
      productsSql,
      productsParams
    )

    // --- Payment breakdown from payments ---
    let paymentSql = `
      SELECT
        py.payment_method as method,
        SUM(py.amount) as amount,
        COUNT(py.id) as count
      FROM payments py
      JOIN orders o ON py.order_id = o.id
      WHERE DATE(o.created_at) = ?
        AND o.status IN ('completed', 'confirmed', 'processing')
        AND py.status = 'completed'
    `
    const paymentParams: any[] = [date]

    if (branchId) {
      paymentSql += ' AND o.branch_id = ?'
      paymentParams.push(branchId)
    }

    paymentSql += ' GROUP BY py.payment_method ORDER BY amount DESC'

    const paymentBreakdown = await db.query<{
      method: string
      amount: number
      count: number
    }>(paymentSql, paymentParams)

    // --- Totals ---
    const totalSales = hourlyBreakdown.reduce((sum, h) => sum + h.sales, 0)
    const totalTransactions = hourlyBreakdown.reduce((sum, h) => sum + h.count, 0)

    return {
      date,
      hourlyBreakdown,
      topProducts,
      paymentBreakdown,
      totalSales,
      totalTransactions
    }
  }
}

export const timeAnalysisService = new TimeAnalysisService()
export default timeAnalysisService
