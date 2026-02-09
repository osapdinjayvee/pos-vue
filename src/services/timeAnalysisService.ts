/**
 * Time Analysis Service (T025)
 * Provides time-based analytics: heatmap, staffing recommendations,
 * period overlay comparison, and day drill-down.
 */

import db from '@/db/database'
import { salesHourlyRepository } from '@/repositories/salesHourlyRepository'
import { analyticsAggregationService } from '@/services/analyticsAggregationService'
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
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
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
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
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
    await Promise.all([
      analyticsAggregationService.ensureAggregated(period1From, period1To),
      analyticsAggregationService.ensureAggregated(period2From, period2To)
    ])

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
    await analyticsAggregationService.ensureAggregated(date, date)

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

    // --- Top 10 products from transaction_items joined with products ---
    let productsSql = `
      SELECT
        p.name as name,
        SUM(ti.quantity) as quantity,
        SUM(ti.line_total) as revenue
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE DATE(t.created_at) = ?
        AND t.status IN ('completed')
    `
    const productsParams: any[] = [date]

    if (branchId) {
      productsSql += ' AND t.branch_id = ?'
      productsParams.push(branchId)
    }

    productsSql += ' GROUP BY ti.product_id ORDER BY revenue DESC LIMIT 10'

    const topProducts = await db.query<{ name: string; quantity: number; revenue: number }>(
      productsSql,
      productsParams
    )

    // --- Payment breakdown from transaction_payments ---
    let paymentSql = `
      SELECT
        tp.payment_method as method,
        SUM(tp.amount) as amount,
        COUNT(tp.id) as count
      FROM transaction_payments tp
      JOIN transactions t ON tp.transaction_id = t.id
      WHERE DATE(t.created_at) = ?
        AND t.status IN ('completed')
    `
    const paymentParams: any[] = [date]

    if (branchId) {
      paymentSql += ' AND t.branch_id = ?'
      paymentParams.push(branchId)
    }

    paymentSql += ' GROUP BY tp.payment_method ORDER BY amount DESC'

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
