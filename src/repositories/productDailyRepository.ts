/**
 * Product Daily Repository
 * Manages daily product performance aggregates for product analytics
 */

import db from '@/db/database'
import type { ProductDailyAggregate, ProductDailyInput } from '@/types/analytics'

class ProductDailyRepository {
  /**
   * Upsert product daily aggregate (idempotent)
   */
  async upsert(data: ProductDailyInput): Promise<ProductDailyAggregate> {
    const existing = await db.getOne<ProductDailyAggregate>(
      'SELECT * FROM product_daily WHERE product_id = ? AND date = ? AND branch_id = ?',
      [data.product_id, data.date, data.branch_id]
    )

    if (existing) {
      await db.execute(
        `UPDATE product_daily SET
          variant_id = ?, category_id = ?,
          quantity_sold = ?, revenue = ?, cost = ?, profit = ?
         WHERE id = ?`,
        [data.variant_id, data.category_id, data.quantity_sold, data.revenue, data.cost, data.profit, existing.id]
      )
      return (await db.getOne<ProductDailyAggregate>(
        'SELECT * FROM product_daily WHERE id = ?', [existing.id]
      ))!
    }

    const id = db.generateId('pdaily')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO product_daily (id, date, product_id, variant_id, category_id, branch_id, quantity_sold, revenue, cost, profit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.date, data.product_id, data.variant_id, data.category_id, data.branch_id,
       data.quantity_sold, data.revenue, data.cost, data.profit, now]
    )

    return (await db.getOne<ProductDailyAggregate>(
      'SELECT * FROM product_daily WHERE id = ?', [id]
    ))!
  }

  /**
   * Get top products by revenue or quantity for a period
   */
  async getTopProducts(
    dateFrom: string,
    dateTo: string,
    limit: number = 20,
    branchId?: string,
    sortBy: 'revenue' | 'quantity' = 'revenue'
  ): Promise<{
    product_id: string
    product_name: string
    category_name: string
    quantity_sold: number
    revenue: number
    cost: number
    profit: number
  }[]> {
    let sql = `
      SELECT
        pd.product_id,
        p.name as product_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(pd.quantity_sold) as quantity_sold,
        SUM(pd.revenue) as revenue,
        SUM(pd.cost) as cost,
        SUM(pd.profit) as profit
      FROM product_daily pd
      LEFT JOIN products p ON pd.product_id = p.id
      LEFT JOIN categories c ON pd.category_id = c.id
      WHERE pd.date >= ? AND pd.date <= ?
    `
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND pd.branch_id = ?'
      params.push(branchId)
    }

    sql += ' GROUP BY pd.product_id'
    sql += sortBy === 'revenue'
      ? ' ORDER BY revenue DESC'
      : ' ORDER BY quantity_sold DESC'
    sql += ' LIMIT ?'
    params.push(limit)

    return await db.query(sql, params)
  }

  /**
   * Get sales aggregated by category for a period
   */
  async getCategorySales(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<{
    category_id: string
    category_name: string
    total_revenue: number
    total_quantity: number
  }[]> {
    let sql = `
      SELECT
        COALESCE(pd.category_id, 'none') as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(pd.revenue) as total_revenue,
        SUM(pd.quantity_sold) as total_quantity
      FROM product_daily pd
      LEFT JOIN categories c ON pd.category_id = c.id
      WHERE pd.date >= ? AND pd.date <= ?
    `
    const params: any[] = [dateFrom, dateTo]

    if (branchId) {
      sql += ' AND pd.branch_id = ?'
      params.push(branchId)
    }

    sql += ' GROUP BY pd.category_id ORDER BY total_revenue DESC'
    return await db.query(sql, params)
  }

  /**
   * Get slow-moving products (below quantity threshold)
   */
  async getSlowMovers(
    dateFrom: string,
    dateTo: string,
    threshold: number = 5,
    branchId?: string
  ): Promise<{
    product_id: string
    product_name: string
    category_name: string
    quantity_sold: number
    revenue: number
    last_sold_date: string | null
  }[]> {
    let sql = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(agg.quantity_sold, 0) as quantity_sold,
        COALESCE(agg.revenue, 0) as revenue,
        agg.last_sold_date
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT
          product_id,
          SUM(quantity_sold) as quantity_sold,
          SUM(revenue) as revenue,
          MAX(date) as last_sold_date
        FROM product_daily
        WHERE date >= ? AND date <= ?
        ${branchId ? 'AND branch_id = ?' : ''}
        GROUP BY product_id
      ) agg ON p.id = agg.product_id
      WHERE p.status = 'active'
        AND COALESCE(agg.quantity_sold, 0) <= ?
      ORDER BY COALESCE(agg.quantity_sold, 0) ASC
    `
    const params: any[] = [dateFrom, dateTo]
    if (branchId) params.push(branchId)
    params.push(threshold)

    return await db.query(sql, params)
  }

  /**
   * Get daily data for a specific product
   */
  async getForProduct(
    productId: string,
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<ProductDailyAggregate[]> {
    let sql = 'SELECT * FROM product_daily WHERE product_id = ? AND date >= ? AND date <= ?'
    const params: any[] = [productId, dateFrom, dateTo]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    sql += ' ORDER BY date ASC'
    return await db.query<ProductDailyAggregate>(sql, params)
  }

  /**
   * Delete all product daily data for a date (for re-aggregation)
   */
  async deleteForDate(date: string, branchId?: string): Promise<void> {
    let sql = 'DELETE FROM product_daily WHERE date = ?'
    const params: any[] = [date]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    await db.execute(sql, params)
  }

  /**
   * Check if data exists for a date
   */
  async hasDataForDate(date: string, branchId?: string): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM product_daily WHERE date = ?'
    const params: any[] = [date]

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}

export const productDailyRepository = new ProductDailyRepository()
export default productDailyRepository
