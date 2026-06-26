/**
 * Analytics Service
 * High-level analytics business logic — today's metrics, sales trends, period comparisons.
 * Uses salesAggregateRepository (existing) + salesHourlyRepository (new).
 */

import db from '@/db/database'
import type {
  TodayMetrics,
  SalesTrendPoint,
  PeriodComparisonData,
  AnalyticsPeriod
} from '@/types/analytics'
import { getHourLabel } from '@/types/report'
import { toLocalDateStr } from '@/utils/dateHelpers'

class AnalyticsService {
  /**
   * Get today's metrics from completed orders (live query)
   */
  async getTodayMetrics(branchId?: string): Promise<TodayMetrics> {
    const today = toLocalDateStr()
    return this.getMetricsForPeriod(today, today, branchId)
  }

  /**
   * Get metrics for an arbitrary date range
   * - Gross/Net sales only from completed positive-amount transactions (excludes returns)
   * - Transaction count only counts completed sales (not voids or returns)
   * - Void and refund counts tracked separately
   */
  async getMetricsForPeriod(dateFrom: string, dateTo: string, branchId?: string): Promise<TodayMetrics> {
    let txSql = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN total_amount ELSE 0 END), 0) as gross_sales,
        COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN total_amount ELSE 0 END), 0) as refund_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as transaction_count,
        COALESCE(SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END), 0) as void_count,
        COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN 1 ELSE 0 END), 0) as refund_count
      FROM transactions
      WHERE date(created_at) >= ? AND date(created_at) <= ?
        AND status IN ('completed', 'voided')
    `
    // Net income: (selling price - latest cost) * quantity for completed sales
    let netIncomeSql = `
      SELECT COALESCE(SUM(
        (ti.unit_price - COALESCE(
          (SELECT sm.unit_cost
           FROM stock_movements sm
           JOIN product_variants pv ON pv.id = sm.variant_id
           WHERE pv.product_id = ti.product_id
             AND sm.movement_type = 'receive'
             AND sm.unit_cost IS NOT NULL
           ORDER BY sm.created_at DESC LIMIT 1),
          p.cost
        )) * ti.quantity
      ), 0) as net_income
      FROM transaction_items ti
      INNER JOIN transactions t ON t.id = ti.transaction_id
      INNER JOIN products p ON p.id = ti.product_id
      WHERE t.status = 'completed'
        AND date(t.created_at) >= ? AND date(t.created_at) <= ?
    `
    const params: any[] = [dateFrom, dateTo]
    const netParams: any[] = [dateFrom, dateTo]

    if (branchId) {
      txSql += ' AND branch_id = ?'
      netIncomeSql += ' AND t.branch_id = ?'
      params.push(branchId)
      netParams.push(branchId)
    }

    const [txResult, netResult] = await Promise.all([
      db.getOne<{
        gross_sales: number
        refund_amount: number
        transaction_count: number
        void_count: number
        refund_count: number
      }>(txSql, params),
      db.getOne<{ net_income: number }>(netIncomeSql, netParams)
    ])

    const grossSales = txResult?.gross_sales || 0
    const refundAmount = txResult?.refund_amount || 0
    const adjustedGrossSales = grossSales + refundAmount // refundAmount is negative
    const txCount = txResult?.transaction_count || 0

    return {
      grossSales: adjustedGrossSales,
      netSales: netResult?.net_income || 0,
      transactionCount: txCount,
      averageTicket: txCount > 0 ? adjustedGrossSales / txCount : 0,
      voidCount: txResult?.void_count || 0,
      refundCount: txResult?.refund_count || 0,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get sales trend data points for a period.
   * Queries the transactions table live so it always reflects actual sales
   * (the pre-aggregated tables are only populated when reports are generated).
   */
  async getSalesTrend(period: AnalyticsPeriod, branchId?: string, dateFrom?: string, dateTo?: string): Promise<SalesTrendPoint[]> {
    const { from, to } = this.resolvePeriodDates(period, dateFrom, dateTo)
    const branchClause = branchId ? ' AND branch_id = ?' : ''

    if (period === 'today') {
      // Live hourly trend for a single day
      const params: any[] = [from]
      if (branchId) params.push(branchId)
      const rows = await db.query<{ hour: number; sales: number; transaction_count: number }>(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as sales,
                COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as transaction_count
         FROM transactions
         WHERE date(created_at) = ?${branchClause}
         GROUP BY hour`,
        params
      )

      const points: SalesTrendPoint[] = []
      for (let h = 0; h < 24; h++) {
        const match = rows.find(r => r.hour === h)
        points.push({
          label: getHourLabel(h),
          sales: match?.sales || 0,
          transactionCount: match?.transaction_count || 0
        })
      }
      return points
    }

    // Live daily trend for longer periods
    const params: any[] = [from, to]
    if (branchId) params.push(branchId)
    const rows = await db.query<{ d: string; sales: number; transaction_count: number }>(
      `SELECT date(created_at) as d,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as sales,
              COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as transaction_count
       FROM transactions
       WHERE date(created_at) >= ? AND date(created_at) <= ?${branchClause}
       GROUP BY date(created_at)`,
      params
    )
    const byDate = new Map(rows.map(r => [r.d, r]))

    // Fill every day in the range so the chart is continuous (cap to a year)
    const [sy, sm, sd] = from.split('-').map(Number)
    const [ey, em, ed] = to.split('-').map(Number)
    const start = new Date(sy!, sm! - 1, sd!)
    const end = new Date(ey!, em! - 1, ed!)
    const dayMs = 1000 * 60 * 60 * 24
    const totalDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1

    const points: SalesTrendPoint[] = []
    if (totalDays > 0 && totalDays <= 366) {
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start.getTime() + i * dayMs)
        const match = byDate.get(toLocalDateStr(d))
        points.push({
          label: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
          sales: match?.sales || 0,
          transactionCount: match?.transaction_count || 0
        })
      }
    } else {
      for (const r of rows) {
        points.push({
          label: new Date(r.d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
          sales: r.sales,
          transactionCount: r.transaction_count
        })
      }
    }
    return points
  }

  /**
   * Live gross + transaction totals for a date range (from the transactions table).
   */
  private async getLiveSummary(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<{ totalGross: number; totalTransactions: number }> {
    let sql = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_gross,
        COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as total_transactions
      FROM transactions
      WHERE date(created_at) >= ? AND date(created_at) <= ?
    `
    const params: any[] = [dateFrom, dateTo]
    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    const r = await db.getOne<{ total_gross: number; total_transactions: number }>(sql, params)
    return {
      totalGross: r?.total_gross || 0,
      totalTransactions: r?.total_transactions || 0
    }
  }

  /**
   * Compare current period vs previous period (live from transactions).
   */
  async getPeriodComparison(
    period: AnalyticsPeriod,
    branchId?: string,
    customFrom?: string,
    customTo?: string
  ): Promise<PeriodComparisonData> {
    const { from: currentFrom, to: currentTo } = this.resolvePeriodDates(period, customFrom, customTo)
    const { from: previousFrom, to: previousTo } = this.getPreviousPeriodDates(period, currentFrom, currentTo)

    const [current, previous] = await Promise.all([
      this.getLiveSummary(currentFrom, currentTo, branchId),
      this.getLiveSummary(previousFrom, previousTo, branchId)
    ])

    const grossChange = current.totalGross - previous.totalGross
    const grossChangePercent = previous.totalGross > 0
      ? (grossChange / previous.totalGross) * 100
      : current.totalGross > 0 ? 100 : 0

    const transactionChange = current.totalTransactions - previous.totalTransactions
    const transactionChangePercent = previous.totalTransactions > 0
      ? (transactionChange / previous.totalTransactions) * 100
      : current.totalTransactions > 0 ? 100 : 0

    const currentAvgTicket = current.totalTransactions > 0
      ? current.totalGross / current.totalTransactions : 0
    const previousAvgTicket = previous.totalTransactions > 0
      ? previous.totalGross / previous.totalTransactions : 0
    const avgTicketChange = currentAvgTicket - previousAvgTicket
    const avgTicketChangePercent = previousAvgTicket > 0
      ? (avgTicketChange / previousAvgTicket) * 100
      : currentAvgTicket > 0 ? 100 : 0

    return {
      currentGross: current.totalGross,
      previousGross: previous.totalGross,
      grossChange,
      grossChangePercent,
      currentTransactions: current.totalTransactions,
      previousTransactions: previous.totalTransactions,
      transactionChange,
      transactionChangePercent,
      currentAvgTicket,
      previousAvgTicket,
      avgTicketChange,
      avgTicketChangePercent,
      periodLabel: this.getPeriodLabel(period)
    }
  }

  /**
   * Resolve period to date range
   */
  resolvePeriodDates(period: AnalyticsPeriod, customFrom?: string, customTo?: string): { from: string; to: string } {
    const now = new Date()
    const today = toLocalDateStr(now)

    switch (period) {
      case 'today':
        return { from: today, to: today }

      case 'week': {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        return { from: toLocalDateStr(start), to: today }
      }

      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: toLocalDateStr(start), to: today }
      }

      case 'quarter': {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        const start = new Date(now.getFullYear(), quarterMonth, 1)
        return { from: toLocalDateStr(start), to: today }
      }

      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1)
        return { from: toLocalDateStr(start), to: today }
      }

      case 'custom':
        return { from: customFrom || today, to: customTo || today }

      default:
        return { from: today, to: today }
    }
  }

  /**
   * Get previous period dates for comparison
   */
  private getPreviousPeriodDates(period: AnalyticsPeriod, currentFrom: string, currentTo: string): { from: string; to: string } {
    const from = new Date(currentFrom)
    const to = new Date(currentTo)
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - daysDiff + 1)

    return {
      from: toLocalDateStr(prevFrom),
      to: toLocalDateStr(prevTo)
    }
  }

  /**
   * Get human-readable period label
   */
  private getPeriodLabel(period: AnalyticsPeriod): string {
    const labels: Record<AnalyticsPeriod, string> = {
      today: 'vs Yesterday',
      week: 'vs Last Week',
      month: 'vs Last Month',
      quarter: 'vs Last Quarter',
      year: 'vs Last Year',
      custom: 'vs Previous Period'
    }
    return labels[period]
  }
}

export const analyticsService = new AnalyticsService()
export default analyticsService
