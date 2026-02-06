import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Order, OrderInput, OrderStatus, OrderType } from '@/types/order'

interface OrderFilters {
  status?: OrderStatus
  orderType?: OrderType
  customerId?: string
  userId?: string
  terminalId?: string
  branchId?: string
  startDate?: string
  endDate?: string
}

class OrderRepository extends BaseRepository<Order> {
  protected tableName = 'orders'
  protected idPrefix = 'ord'

  /**
   * Generate a unique order number
   */
  async generateOrderNumber(): Promise<string> {
    const today = new Date()
    const prefix = `POS${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE order_number LIKE ?`,
      [`${prefix}%`]
    )

    const sequence = String((result?.count || 0) + 1).padStart(4, '0')
    return `${prefix}-${sequence}`
  }

  /**
   * Find order with customer details
   */
  async findWithCustomer(id: string): Promise<Order | null> {
    return await db.getOne<Order>(
      `SELECT o.*, c.name as customer_name
       FROM ${this.tableName} o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    )
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await db.getOne<Order>(
      `SELECT o.*, c.name as customer_name
       FROM ${this.tableName} o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.order_number = ?`,
      [orderNumber]
    )
  }

  /**
   * Find orders with filters
   */
  async findWithFilters(filters: OrderFilters, options?: QueryOptions): Promise<Order[]> {
    let sql = `
      SELECT o.*, c.name as customer_name
      FROM ${this.tableName} o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.status) {
      sql += ' AND o.status = ?'
      params.push(filters.status)
    }

    if (filters.orderType) {
      sql += ' AND o.order_type = ?'
      params.push(filters.orderType)
    }

    if (filters.customerId) {
      sql += ' AND o.customer_id = ?'
      params.push(filters.customerId)
    }

    if (filters.userId) {
      sql += ' AND o.user_id = ?'
      params.push(filters.userId)
    }

    if (filters.terminalId) {
      sql += ' AND o.terminal_id = ?'
      params.push(filters.terminalId)
    }

    if (filters.branchId) {
      sql += ' AND o.branch_id = ?'
      params.push(filters.branchId)
    }

    if (filters.startDate) {
      sql += ' AND o.created_at >= ?'
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      sql += ' AND o.created_at <= ?'
      params.push(filters.endDate)
    }

    if (options?.orderBy) {
      sql += ` ORDER BY o.${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY o.created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Order>(sql, params)
  }

  /**
   * Find orders by date range
   */
  async findByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Order[]> {
    return await this.findWithFilters({ startDate, endDate }, options)
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: OrderStatus, options?: QueryOptions): Promise<Order[]> {
    return await this.findWithFilters({ status }, options)
  }

  /**
   * Find orders by customer
   */
  async findByCustomer(customerId: string, options?: QueryOptions): Promise<Order[]> {
    return await this.findWithFilters({ customerId }, options)
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const now = db.getCurrentTimestamp()
    const updates: any = { status, updated_at: now }

    if (status === 'completed') {
      updates.completed_at = now
    }

    await db.execute(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ?${status === 'completed' ? ', completed_at = ?' : ''} WHERE id = ?`,
      status === 'completed' ? [status, now, now, id] : [status, now, id]
    )

    return await this.findById(id)
  }

  /**
   * Calculate daily sales
   */
  async calculateDailySales(date: string): Promise<{ total: number; count: number }> {
    const result = await db.getOne<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
       FROM ${this.tableName}
       WHERE DATE(created_at) = DATE(?) AND status = 'completed'`,
      [date]
    )
    return { total: result?.total || 0, count: result?.count || 0 }
  }

  /**
   * Calculate sales by date range
   */
  async calculateSalesByRange(startDate: string, endDate: string): Promise<{ total: number; count: number }> {
    const result = await db.getOne<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
       FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ? AND status = 'completed'`,
      [startDate, endDate]
    )
    return { total: result?.total || 0, count: result?.count || 0 }
  }

  /**
   * Get unsynced orders
   */
  async getUnsyncedOrders(): Promise<Order[]> {
    return await db.query<Order>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC`
    )
  }

  /**
   * Mark order as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), id]
    )
  }

  /**
   * Get order item count
   */
  async getItemCount(orderId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM order_items WHERE order_id = ?`,
      [orderId]
    )
    return result?.count || 0
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<Order[]> {
    return await db.query<Order>(
      `SELECT o.*, c.name as customer_name
       FROM ${this.tableName} o
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    )
  }
}

export const orderRepository = new OrderRepository()
export default orderRepository
