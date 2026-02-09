/**
 * Analytics Aggregation Service
 * Aggregates raw order/transaction data into hourly sales and product daily tables.
 * All operations are idempotent (upsert-based).
 */

import db from '@/db/database'
import { salesHourlyRepository } from '@/repositories/salesHourlyRepository'
import { productDailyRepository } from '@/repositories/productDailyRepository'

class AnalyticsAggregationService {
  /**
   * Aggregate hourly sales for a given date.
   * Queries completed orders grouped by hour, upserts into sales_hourly.
   */
  async aggregateHourlySales(date: string): Promise<number> {
    const rows = await db.query<{
      hour: number
      terminal_id: string
      branch_id: string
      total_sales: number
      order_count: number
    }>(
      `SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        terminal_id,
        branch_id,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as order_count
       FROM transactions
       WHERE date(created_at) = ?
         AND status = 'completed'
       GROUP BY hour, terminal_id, branch_id`,
      [date]
    )

    for (const row of rows) {
      await salesHourlyRepository.upsert({
        date,
        hour: row.hour,
        terminal_id: row.terminal_id,
        branch_id: row.branch_id,
        sales: row.total_sales,
        transaction_count: row.order_count
      })
    }

    return rows.length
  }

  /**
   * Aggregate product daily sales for a given date.
   * Queries order_items joined with products for completed orders, upserts into product_daily.
   */
  async aggregateProductDaily(date: string): Promise<number> {
    const rows = await db.query<{
      product_id: string
      variant_id: string | null
      category_id: string | null
      branch_id: string
      quantity_sold: number
      revenue: number
      cost: number
    }>(
      `SELECT
        ti.product_id,
        ti.variant_id,
        p.category_id,
        t.branch_id,
        SUM(ti.quantity) as quantity_sold,
        SUM(ti.line_total) as revenue,
        SUM(ti.unit_price * ti.quantity) as cost
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN products p ON ti.product_id = p.id
       WHERE date(t.created_at) = ?
         AND t.status = 'completed'
       GROUP BY ti.product_id, t.branch_id`,
      [date]
    )

    for (const row of rows) {
      const cost = row.cost || 0
      await productDailyRepository.upsert({
        date,
        product_id: row.product_id,
        variant_id: row.variant_id,
        category_id: row.category_id,
        branch_id: row.branch_id,
        quantity_sold: row.quantity_sold,
        revenue: row.revenue,
        cost,
        profit: row.revenue - cost
      })
    }

    return rows.length
  }

  /**
   * Run all aggregations for a date (idempotent)
   */
  async aggregateAll(date: string): Promise<{ hourly: number; product: number }> {
    const hourly = await this.aggregateHourlySales(date)
    const product = await this.aggregateProductDaily(date)
    return { hourly, product }
  }

  /**
   * Get the last aggregation timestamp for a date
   */
  async getLastAggregationTime(date: string): Promise<string | null> {
    const result = await db.getOne<{ latest: string }>(
      `SELECT MAX(created_at) as latest FROM sales_hourly WHERE date = ?`,
      [date]
    )
    return result?.latest || null
  }

  /**
   * Aggregate all dates in a range (inclusive).
   * Loops through each day and calls aggregateAll() which is idempotent.
   */
  async aggregateDateRange(startDate: string, endDate: string): Promise<void> {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      await this.aggregateAll(dateStr)
      current.setDate(current.getDate() + 1)
    }
  }

  /**
   * Ensure aggregation data exists for a date range.
   * Checks if transactions exist but aggregation data is missing, then triggers aggregation.
   * Lightweight: skips if aggregation rows already exist for the range.
   */
  async ensureAggregated(dateFrom: string, dateTo: string): Promise<void> {
    // Check if there are transactions in the range
    const txnResult = await db.getOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE date(created_at) >= ? AND date(created_at) <= ? AND status = 'completed'`,
      [dateFrom, dateTo]
    )
    if (!txnResult || txnResult.cnt === 0) return

    // Check if aggregation data exists
    const aggResult = await db.getOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sales_hourly WHERE date >= ? AND date <= ?`,
      [dateFrom, dateTo]
    )
    if (aggResult && aggResult.cnt > 0) return

    // Transactions exist but no aggregation — run it
    await this.aggregateDateRange(dateFrom, dateTo)
  }

  /**
   * Check if aggregation data is stale (older than given minutes)
   */
  async isStale(date: string, maxAgeMinutes: number = 60): Promise<boolean> {
    const lastTime = await this.getLastAggregationTime(date)
    if (!lastTime) return true

    const lastDate = new Date(lastTime)
    const now = new Date()
    const diffMs = now.getTime() - lastDate.getTime()
    const diffMinutes = diffMs / (1000 * 60)

    return diffMinutes > maxAgeMinutes
  }
}

export const analyticsAggregationService = new AnalyticsAggregationService()
export default analyticsAggregationService
