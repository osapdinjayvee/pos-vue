/**
 * Analytics Service
 * High-level analytics business logic — today's metrics, sales trends, period comparisons.
 * Uses salesAggregateRepository (existing) + salesHourlyRepository (new).
 */

import db from '@/db/database'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import { salesHourlyRepository } from '@/repositories/salesHourlyRepository'
import type {
  TodayMetrics,
  SalesTrendPoint,
  PeriodComparisonData,
  AnalyticsPeriod
} from '@/types/analytics'
import { getHourLabel } from '@/types/report'

class AnalyticsService {
  /**
   * Get today's metrics from completed orders (live query)
   */
  async getTodayMetrics(branchId?: string): Promise<TodayMetrics> {
    const today = new Date().toISOString().split('T')[0]

    let sql = `
      SELECT
        COALESCE(SUM(total), 0) as gross_sales,
        COALESCE(SUM(total - discount_amount), 0) as net_sales,
        COUNT(*) as transaction_count,
        CASE WHEN COUNT(*) > 0 THEN SUM(total) / COUNT(*) ELSE 0 END as avg_ticket,
        COALESCE(SUM(CASE WHEN status = 'void' THEN 1 ELSE 0 END), 0) as void_count,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END), 0) as refund_count
      FROM orders
      WHERE date(created_at) = ?
        AND status IN ('completed', 'void', 'refunded')
    `
    const params: any[] = [today]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    const result = await db.getOne<{
      gross_sales: number
      net_sales: number
      transaction_count: number
      avg_ticket: number
      void_count: number
      refund_count: number
    }>(sql, params)

    return {
      grossSales: result?.gross_sales || 0,
      netSales: result?.net_sales || 0,
      transactionCount: result?.transaction_count || 0,
      averageTicket: result?.avg_ticket || 0,
      voidCount: result?.void_count || 0,
      refundCount: result?.refund_count || 0,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get sales trend data points for a period
   */
  async getSalesTrend(period: AnalyticsPeriod, branchId?: string, dateFrom?: string, dateTo?: string): Promise<SalesTrendPoint[]> {
    const { from, to } = this.resolvePeriodDates(period, dateFrom, dateTo)

    if (period === 'today') {
      // Hourly trend for today
      const hourlyData = await salesHourlyRepository.getForDate(from, branchId)

      // Fill all 24 hours
      const points: SalesTrendPoint[] = []
      for (let h = 0; h < 24; h++) {
        const match = hourlyData.find(d => d.hour === h)
        points.push({
          label: getHourLabel(h),
          sales: match?.sales || 0,
          transactionCount: match?.transaction_count || 0
        })
      }
      return points
    }

    // Daily trend for longer periods
    const aggregates = await salesAggregateRepository.findAll({
      branchId,
      dateFrom: from,
      dateTo: to
    })

    return aggregates.map(a => ({
      label: new Date(a.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      sales: a.gross_sales,
      transactionCount: a.transaction_count
    })).reverse()
  }

  /**
   * Compare current period vs previous period
   */
  async getPeriodComparison(period: AnalyticsPeriod, branchId?: string): Promise<PeriodComparisonData> {
    const { from: currentFrom, to: currentTo } = this.resolvePeriodDates(period)
    const { from: previousFrom, to: previousTo } = this.getPreviousPeriodDates(period, currentFrom, currentTo)

    const branch = branchId || 'branch-main'

    const current = await salesAggregateRepository.getSummary(branch, currentFrom, currentTo)
    const previous = await salesAggregateRepository.getSummary(branch, previousFrom, previousTo)

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
    const today = now.toISOString().split('T')[0]

    switch (period) {
      case 'today':
        return { from: today, to: today }

      case 'week': {
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay())
        return { from: start.toISOString().split('T')[0], to: today }
      }

      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: start.toISOString().split('T')[0], to: today }
      }

      case 'quarter': {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        const start = new Date(now.getFullYear(), quarterMonth, 1)
        return { from: start.toISOString().split('T')[0], to: today }
      }

      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1)
        return { from: start.toISOString().split('T')[0], to: today }
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
      from: prevFrom.toISOString().split('T')[0],
      to: prevTo.toISOString().split('T')[0]
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
