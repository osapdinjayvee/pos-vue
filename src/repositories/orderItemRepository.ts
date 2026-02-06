import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { OrderItem, OrderItemInput } from '@/types/order'

class OrderItemRepository extends BaseRepository<OrderItem> {
  protected tableName = 'order_items'
  protected idPrefix = 'item'

  /**
   * Find all items for an order
   */
  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    return await db.query<OrderItem>(
      `SELECT oi.*, p.name as product_name, pv.name as variant_name,
              COALESCE(pv.sku, p.sku) as sku
       FROM ${this.tableName} oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_variants pv ON oi.variant_id = pv.id
       WHERE oi.order_id = ?
       ORDER BY oi.created_at ASC`,
      [orderId]
    )
  }

  /**
   * Find items by product
   */
  async findByProductId(productId: string, options?: QueryOptions): Promise<OrderItem[]> {
    let sql = `
      SELECT oi.*, p.name as product_name
       FROM ${this.tableName} oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.product_id = ?
    `
    const params: any[] = [productId]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY oi.created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<OrderItem>(sql, params)
  }

  /**
   * Create multiple order items in a batch
   */
  async createBatch(items: OrderItemInput[]): Promise<OrderItem[]> {
    const createdItems: OrderItem[] = []

    for (const item of items) {
      const created = await this.create(item as Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>)
      createdItems.push(created)
    }

    return createdItems
  }

  /**
   * Delete all items for an order
   */
  async deleteByOrderId(orderId: string): Promise<number> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE order_id = ?`,
      [orderId]
    )
    return result.rowsAffected
  }

  /**
   * Calculate order subtotal from items
   */
  async calculateOrderSubtotal(orderId: string): Promise<number> {
    const result = await db.getOne<{ subtotal: number }>(
      `SELECT COALESCE(SUM(total), 0) as subtotal FROM ${this.tableName} WHERE order_id = ?`,
      [orderId]
    )
    return result?.subtotal || 0
  }

  /**
   * Get total quantity sold for a product
   */
  async getProductSoldQuantity(productId: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM ${this.tableName} oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.status = 'completed'
    `
    const params: any[] = [productId]

    if (startDate) {
      sql += ' AND o.created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND o.created_at <= ?'
      params.push(endDate)
    }

    const result = await db.getOne<{ total_quantity: number }>(sql, params)
    return result?.total_quantity || 0
  }

  /**
   * Get total revenue for a product
   */
  async getProductRevenue(productId: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = `
      SELECT COALESCE(SUM(oi.total), 0) as total_revenue
      FROM ${this.tableName} oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.status = 'completed'
    `
    const params: any[] = [productId]

    if (startDate) {
      sql += ' AND o.created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND o.created_at <= ?'
      params.push(endDate)
    }

    const result = await db.getOne<{ total_revenue: number }>(sql, params)
    return result?.total_revenue || 0
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{ product_id: string; product_name: string; total_quantity: number; total_revenue: number }>> {
    let sql = `
      SELECT oi.product_id, p.name as product_name,
             SUM(oi.quantity) as total_quantity,
             SUM(oi.total) as total_revenue
      FROM ${this.tableName} oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
    `
    const params: any[] = []

    if (startDate) {
      sql += ' AND o.created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND o.created_at <= ?'
      params.push(endDate)
    }

    sql += ' GROUP BY oi.product_id, p.name ORDER BY total_quantity DESC LIMIT ?'
    params.push(limit)

    return await db.query(sql, params)
  }
}

export const orderItemRepository = new OrderItemRepository()
export default orderItemRepository
