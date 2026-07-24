import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Customer, CustomerInput, CustomerType } from '@/types/order'

class CustomerRepository extends BaseRepository<Customer> {
  protected tableName = 'customers'
  protected idPrefix = 'cust'

  /**
   * Search customers by name, email, or phone
   */
  async search(query: string, options?: QueryOptions): Promise<Customer[]> {
    const searchTerm = `%${query}%`
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?)
      AND is_active = 1
    `
    const params: any[] = [searchTerm, searchTerm, searchTerm]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Customer>(sql, params)
  }

  /**
   * Find customers by type
   */
  async findByType(type: CustomerType, options?: QueryOptions): Promise<Customer[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE customer_type = ? AND is_active = 1`
    const params: any[] = [type]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Customer>(sql, params)
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return await db.getOne<Customer>(
      `SELECT * FROM ${this.tableName} WHERE phone = ?`,
      [phone]
    )
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return await db.getOne<Customer>(
      `SELECT * FROM ${this.tableName} WHERE email = ?`,
      [email]
    )
  }

  /**
   * Get all active customers
   */
  async findAllActive(options?: QueryOptions): Promise<Customer[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE is_active = 1`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Customer>(sql)
  }

  /**
   * Archive / reactivate a customer.
   *
   * Customers are never hard-deleted — sales history references them and a
   * removed record would orphan orders and credit ledger entries. Archiving
   * flips is_active; the list keeps showing archived customers (tagged
   * Inactive) so they remain reachable to reactivate.
   */
  async setActive(id: string, active: boolean): Promise<Customer | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET is_active = ?, updated_at = ? WHERE id = ?`,
      [active ? 1 : 0, db.getCurrentTimestamp(), id]
    )
    return await this.findById(id)
  }

  /**
   * Update customer balance
   */
  async updateBalance(id: string, amount: number): Promise<Customer | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?`,
      [amount, db.getCurrentTimestamp(), id]
    )
    return await this.findById(id)
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(id: string, points: number): Promise<Customer | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET loyalty_points = loyalty_points + ?, updated_at = ? WHERE id = ?`,
      [points, db.getCurrentTimestamp(), id]
    )
    return await this.findById(id)
  }

  /**
   * Deduct loyalty points
   */
  async deductLoyaltyPoints(id: string, points: number): Promise<Customer | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET loyalty_points = MAX(0, loyalty_points - ?), updated_at = ? WHERE id = ?`,
      [points, db.getCurrentTimestamp(), id]
    )
    return await this.findById(id)
  }

  /**
   * Get customer order stats
   */
  async getOrderStats(customerId: string): Promise<{ totalOrders: number; totalSpent: number; avgTicket: number; lastVisit: string | null }> {
    const result = await db.getOne<{ total_orders: number; total_spent: number; avg_ticket: number; last_visit: string | null }>(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent,
              COALESCE(AVG(total_amount), 0) as avg_ticket, MAX(created_at) as last_visit
       FROM transactions
       WHERE customer_id = ? AND status = 'completed'`,
      [customerId]
    )
    return {
      totalOrders: result?.total_orders || 0,
      totalSpent: result?.total_spent || 0,
      avgTicket: Math.round((result?.avg_ticket || 0) * 100) / 100,
      lastVisit: result?.last_visit || null
    }
  }

  /**
   * Get customer with recent order history
   */
  async getCustomerWithHistory(customerId: string, options?: { limit?: number; offset?: number }): Promise<{ customer: Customer; orders: any[] } | null> {
    const customer = await this.findById(customerId)
    if (!customer) return null

    let sql = `SELECT t.*, COUNT(ti.id) as item_count
               FROM transactions t
               LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
               WHERE t.customer_id = ?
               GROUP BY t.id
               ORDER BY t.created_at DESC`
    const params: any[] = [customerId]

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    const orders = await db.query<any>(sql, params)
    return { customer, orders }
  }

  /**
   * Get customer stats including visit frequency
   */
  async getCustomerDetailedStats(customerId: string): Promise<{
    totalOrders: number
    totalSpent: number
    avgTicket: number
    lastVisit: string | null
    firstVisit: string | null
    visitFrequency: string
  }> {
    const result = await db.getOne<{
      total_orders: number
      total_spent: number
      avg_ticket: number
      last_visit: string | null
      first_visit: string | null
    }>(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent,
              COALESCE(AVG(total_amount), 0) as avg_ticket, MAX(created_at) as last_visit,
              MIN(created_at) as first_visit
       FROM transactions
       WHERE customer_id = ? AND status = 'completed'`,
      [customerId]
    )

    const totalOrders = result?.total_orders || 0
    let visitFrequency = 'N/A'

    if (totalOrders > 1 && result?.first_visit && result?.last_visit) {
      const first = new Date(result.first_visit).getTime()
      const last = new Date(result.last_visit).getTime()
      const days = Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)))
      const avgDaysBetween = Math.round(days / (totalOrders - 1))
      visitFrequency = avgDaysBetween <= 7 ? 'Weekly' :
        avgDaysBetween <= 14 ? 'Bi-weekly' :
        avgDaysBetween <= 30 ? 'Monthly' :
        `Every ${avgDaysBetween} days`
    }

    return {
      totalOrders,
      totalSpent: result?.total_spent || 0,
      avgTicket: Math.round((result?.avg_ticket || 0) * 100) / 100,
      lastVisit: result?.last_visit || null,
      firstVisit: result?.first_visit || null,
      visitFrequency
    }
  }

  /**
   * Get top customers by spend
   */
  async getTopBySpend(limit = 10, dateRange?: { start: string; end: string }): Promise<any[]> {
    let sql = `
      SELECT c.*, COUNT(t.id) as order_count, COALESCE(SUM(t.total_amount), 0) as total_spent,
             COALESCE(AVG(t.total_amount), 0) as avg_ticket, MAX(t.created_at) as last_visit
      FROM ${this.tableName} c
      LEFT JOIN transactions t ON t.customer_id = c.id AND t.status = 'completed'
    `
    const params: any[] = []

    if (dateRange) {
      sql += ` AND t.created_at >= ? AND t.created_at <= ?`
      params.push(dateRange.start, dateRange.end)
    }

    sql += ` WHERE c.is_active = 1
             GROUP BY c.id
             HAVING order_count > 0
             ORDER BY total_spent DESC
             LIMIT ?`
    params.push(limit)

    return await db.query<any>(sql, params)
  }

  /**
   * Get top customers by frequency
   */
  async getTopByFrequency(limit = 10, dateRange?: { start: string; end: string }): Promise<any[]> {
    let sql = `
      SELECT c.*, COUNT(t.id) as order_count, COALESCE(SUM(t.total_amount), 0) as total_spent,
             MAX(t.created_at) as last_visit
      FROM ${this.tableName} c
      LEFT JOIN transactions t ON t.customer_id = c.id AND t.status = 'completed'
    `
    const params: any[] = []

    if (dateRange) {
      sql += ` AND t.created_at >= ? AND t.created_at <= ?`
      params.push(dateRange.start, dateRange.end)
    }

    sql += ` WHERE c.is_active = 1
             GROUP BY c.id
             HAVING order_count > 0
             ORDER BY order_count DESC
             LIMIT ?`
    params.push(limit)

    return await db.query<any>(sql, params)
  }

  /**
   * Get inactive customers (no purchase in X days)
   */
  async getInactive(days = 30): Promise<any[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString()

    const sql = `
      SELECT c.*, MAX(t.created_at) as last_visit,
             COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM ${this.tableName} c
      LEFT JOIN transactions t ON t.customer_id = c.id AND t.status = 'completed'
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING last_visit IS NOT NULL AND last_visit < ?
      ORDER BY last_visit ASC
    `
    return await db.query<any>(sql, [cutoffStr])
  }

  /**
   * Get customer distribution by type
   */
  async getTypeDistribution(): Promise<{ type: string; count: number }[]> {
    return await db.query<{ type: string; count: number }>(
      `SELECT customer_type as type, COUNT(*) as count
       FROM ${this.tableName}
       WHERE is_active = 1
       GROUP BY customer_type
       ORDER BY count DESC`
    )
  }

  /**
   * Get customer distribution by tier
   */
  async getTierDistribution(): Promise<{ tier_id: string | null; tier_name: string; count: number }[]> {
    return await db.query<{ tier_id: string | null; tier_name: string; count: number }>(
      `SELECT c.tier_id, COALESCE(mt.name, 'No Tier') as tier_name, COUNT(*) as count
       FROM ${this.tableName} c
       LEFT JOIN membership_tiers mt ON mt.id = c.tier_id
       WHERE c.is_active = 1
       GROUP BY c.tier_id
       ORDER BY count DESC`
    )
  }

  /**
   * Get new customers within a date range
   */
  async getNewCustomers(dateRange: { start: string; end: string }): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ?`,
      [dateRange.start, dateRange.end]
    )
    return result?.count || 0
  }

  /**
   * Get average loyalty points across all active customers
   */
  async getAveragePoints(): Promise<number> {
    const result = await db.getOne<{ avg_points: number }>(
      `SELECT AVG(loyalty_points) as avg_points FROM ${this.tableName} WHERE is_active = 1`
    )
    return Math.round(result?.avg_points || 0)
  }

  /**
   * Get total count of active customers
   */
  async getActiveCount(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1`
    )
    return result?.count || 0
  }

  /**
   * Get customers with outstanding credit balance
   */
  async getCustomersWithBalance(): Promise<Customer[]> {
    return await db.query<Customer>(
      `SELECT * FROM ${this.tableName} WHERE current_balance > 0 AND is_active = 1 ORDER BY current_balance DESC`
    )
  }

  /**
   * Deactivate customer
   */
  async deactivate(id: string): Promise<Customer | null> {
    return await this.update(id, { is_active: 0 } as Partial<Customer>)
  }

  /**
   * Reactivate customer
   */
  async reactivate(id: string): Promise<Customer | null> {
    return await this.update(id, { is_active: 1 } as Partial<Customer>)
  }
}

export const customerRepository = new CustomerRepository()
export default customerRepository
