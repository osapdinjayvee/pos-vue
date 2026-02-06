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
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(*) as order_count
       FROM orders
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
        oi.product_id,
        oi.variant_id,
        p.category_id,
        o.branch_id,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total) as revenue,
        SUM(oi.cost_price * oi.quantity) as cost
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE date(o.created_at) = ?
         AND o.status = 'completed'
       GROUP BY oi.product_id, o.branch_id`,
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
