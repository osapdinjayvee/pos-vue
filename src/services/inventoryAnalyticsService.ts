/**
 * Inventory Analytics Service
 * High-level inventory analytics — overview stats, expiry tracking, reorder suggestions, ABC analysis.
 * Queries products, batches, product_daily, and suppliers tables directly.
 */

import db from '@/db/database'
import { analyticsAggregationService } from '@/services/analyticsAggregationService'
import type {
  InventoryOverview,
  ExpiryItem,
  ReorderSuggestion,
  ABCClassification
} from '@/types/analytics'

class InventoryAnalyticsService {
  /**
   * Get inventory overview metrics:
   * - Total inventory value (SUM stock * cost)
   * - Average turnover rate (quantity_sold_per_year / avg_stock)
   * - Average days of supply (current_stock / avg_daily_sales)
   */
  async getInventoryOverview(branchId?: string): Promise<InventoryOverview> {
    // Ensure recent data is aggregated (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    await analyticsAggregationService.ensureAggregated(
      thirtyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    )

    // Total inventory value from products table
    let valueSql = `
      SELECT COALESCE(SUM(stock * cost), 0) as total_value
      FROM products
      WHERE status = 'active'
    `
    const valueParams: any[] = []

    if (branchId) {
      // If branch filtering is needed in future, extend here
    }

    const valueResult = await db.getOne<{ total_value: number }>(valueSql, valueParams)
    const totalValue = valueResult?.total_value || 0

    // Average turnover rate and days of supply from product_daily
    // Turnover Rate = quantity_sold_per_year / avg_stock
    // Days of Supply = current_stock / (avg_daily_sales or 1)
    let turnoverSql = `
      SELECT
        p.id,
        p.stock as current_stock,
        COALESCE(SUM(pd.quantity_sold), 0) as total_sold,
        COUNT(DISTINCT pd.date) as days_with_sales
      FROM products p
      LEFT JOIN product_daily pd ON pd.product_id = p.id
        AND pd.date >= date('now', '-365 days')
    `

    if (branchId) {
      turnoverSql += ` AND pd.branch_id = ?`
    }

    turnoverSql += `
      WHERE p.status = 'active'
      GROUP BY p.id
    `

    const turnoverParams: any[] = []
    if (branchId) {
      turnoverParams.push(branchId)
    }

    const turnoverRows = await db.query<{
      id: string
      current_stock: number
      total_sold: number
      days_with_sales: number
    }>(turnoverSql, turnoverParams)

    let totalTurnoverRate = 0
    let totalDaysOfSupply = 0
    let productCount = 0

    for (const row of turnoverRows) {
      const avgStock = row.current_stock > 0 ? row.current_stock : 1
      const annualSold = row.total_sold // already covers up to 365 days
      const turnoverRate = annualSold / avgStock

      // Average daily sales over days observed (default to 365 if no sales)
      const daysObserved = row.days_with_sales > 0 ? 365 : 1
      const avgDailySales = row.total_sold / daysObserved
      const daysOfSupply = avgDailySales > 0
        ? row.current_stock / avgDailySales
        : row.current_stock > 0 ? 999 : 0

      totalTurnoverRate += turnoverRate
      totalDaysOfSupply += daysOfSupply
      productCount++
    }

    const avgTurnoverRate = productCount > 0 ? totalTurnoverRate / productCount : 0
    const avgDaysOfSupply = productCount > 0 ? totalDaysOfSupply / productCount : 0

    return {
      totalValue,
      avgTurnoverRate: Math.round(avgTurnoverRate * 100) / 100,
      avgDaysOfSupply: Math.round(avgDaysOfSupply)
    }
  }

  /**
   * Get expiry analytics — products expiring within N days.
   * Queries batches joined with product_variants and products.
   */
  async getExpiryAnalytics(branchId?: string, daysAhead: number = 30): Promise<ExpiryItem[]> {
    let sql = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.cost as product_cost,
        b.batch_number,
        b.expiry_date,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry,
        COALESCE(
          (SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.batch_id = b.id),
          0
        ) as quantity
      FROM batches b
      INNER JOIN product_variants pv ON pv.id = b.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY b.expiry_date ASC
    `

    const params: any[] = [daysAhead]

    const rows = await db.query<{
      product_id: string
      product_name: string
      product_cost: number
      batch_number: string
      expiry_date: string
      days_until_expiry: number
      quantity: number
    }>(sql, params)

    return rows.map(row => ({
      productId: row.product_id,
      productName: row.product_name || 'Unknown Product',
      batchNumber: row.batch_number || '',
      expiryDate: row.expiry_date,
      daysUntilExpiry: row.days_until_expiry,
      quantity: Math.abs(row.quantity),
      estimatedWasteValue: Math.abs(row.quantity) * (row.product_cost || 0)
    }))
  }

  /**
   * Get reorder suggestions for products below their low_stock_threshold.
   * Suggested qty = low_stock_threshold * 2 - current stock
   */
  async getReorderSuggestions(branchId?: string): Promise<ReorderSuggestion[]> {
    let sql = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.stock as current_stock,
        p.low_stock_threshold as reorder_point,
        s.name as supplier_name,
        s.id as supplier_id
      FROM products p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.stock <= p.low_stock_threshold
        AND p.status = 'active'
      ORDER BY (p.low_stock_threshold - p.stock) DESC
    `

    const params: any[] = []

    const rows = await db.query<{
      product_id: string
      product_name: string
      current_stock: number
      reorder_point: number
      supplier_name: string | null
      supplier_id: string | null
    }>(sql, params)

    return rows.map(row => {
      const reorderPoint = row.reorder_point || 10
      const suggestedQty = Math.max(reorderPoint * 2 - row.current_stock, 1)

      return {
        productId: row.product_id,
        productName: row.product_name || 'Unknown Product',
        currentStock: row.current_stock,
        reorderPoint,
        suggestedQty,
        supplierName: row.supplier_name || null,
        supplierId: row.supplier_id || null
      }
    })
  }

  /**
   * ABC analysis of products by revenue in a given date range.
   * A = top 80% of revenue, B = next 15%, C = remaining 5%.
   */
  async getAbcAnalysis(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<ABCClassification[]> {
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
    let sql = `
      SELECT
        pd.product_id,
        p.name as product_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(pd.revenue) as total_revenue
      FROM product_daily pd
      INNER JOIN products p ON p.id = pd.product_id
      LEFT JOIN categories c ON c.id = pd.category_id
      WHERE pd.date >= ? AND pd.date <= ?
    `

    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND pd.branch_id = ?'
      params.push(branchId)
    }

    sql += `
      GROUP BY pd.product_id
      HAVING total_revenue > 0
      ORDER BY total_revenue DESC
    `

    const rows = await db.query<{
      product_id: string
      product_name: string
      category_name: string
      total_revenue: number
    }>(sql, params)

    // Calculate total revenue for cumulative percentage
    const totalRevenue = rows.reduce((sum, row) => sum + (row.total_revenue || 0), 0)

    if (totalRevenue === 0) {
      return []
    }

    // Assign ABC classification based on cumulative revenue percentage
    let cumulativeRevenue = 0
    const classifications: ABCClassification[] = rows.map(row => {
      cumulativeRevenue += row.total_revenue
      const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100

      let abcClass: 'A' | 'B' | 'C'
      if (cumulativePercent <= 80) {
        abcClass = 'A'
      } else if (cumulativePercent <= 95) {
        abcClass = 'B'
      } else {
        abcClass = 'C'
      }

      return {
        productId: row.product_id,
        productName: row.product_name || 'Unknown Product',
        categoryName: row.category_name,
        revenue: row.total_revenue,
        cumulativePercent: Math.round(cumulativePercent * 100) / 100,
        abcClass
      }
    })

    return classifications
  }
}

export const inventoryAnalyticsService = new InventoryAnalyticsService()
export default inventoryAnalyticsService
