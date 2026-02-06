import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { LoyaltyTransaction, LoyaltyTransactionInput, LoyaltyTransactionType } from '@/types/loyalty'

class LoyaltyTransactionRepository extends BaseRepository<LoyaltyTransaction> {
  protected tableName = 'loyalty_transactions'
  protected idPrefix = 'ltx'

  /**
   * Find loyalty transactions by customer
   */
  async findByCustomer(customerId: string, options?: QueryOptions): Promise<LoyaltyTransaction[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE customer_id = ?`
    const params: any[] = [customerId]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<LoyaltyTransaction>(sql, params)
  }

  /**
   * Find loyalty transactions by sale transaction ID
   */
  async findByTransaction(transactionId: string): Promise<LoyaltyTransaction[]> {
    return await db.query<LoyaltyTransaction>(
      `SELECT * FROM ${this.tableName} WHERE transaction_id = ? ORDER BY created_at DESC`,
      [transactionId]
    )
  }

  /**
   * Get points balance by summing all transactions for a customer
   */
  async getPointsBalance(customerId: string): Promise<number> {
    const result = await db.getOne<{ balance: number }>(
      `SELECT COALESCE(SUM(points), 0) as balance FROM ${this.tableName} WHERE customer_id = ?`,
      [customerId]
    )
    return result?.balance || 0
  }

  /**
   * Get expiring points (earn transactions older than given date)
   */
  async getExpiringPoints(customerId: string, beforeDate: string): Promise<LoyaltyTransaction[]> {
    return await db.query<LoyaltyTransaction>(
      `SELECT * FROM ${this.tableName}
       WHERE customer_id = ? AND type = 'earn' AND created_at < ?
       ORDER BY created_at ASC`,
      [customerId, beforeDate]
    )
  }

  /**
   * Get recent activity for a customer
   */
  async getRecentActivity(customerId: string, limit: number = 5): Promise<LoyaltyTransaction[]> {
    return await db.query<LoyaltyTransaction>(
      `SELECT * FROM ${this.tableName}
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [customerId, limit]
    )
  }

  /**
   * Count transactions by type for a customer
   */
  async countByType(customerId: string, type: LoyaltyTransactionType): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE customer_id = ? AND type = ?`,
      [customerId, type]
    )
    return result?.count || 0
  }

  /**
   * Get total points earned by customer
   */
  async getTotalEarned(customerId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(points), 0) as total FROM ${this.tableName}
       WHERE customer_id = ? AND type = 'earn'`,
      [customerId]
    )
    return result?.total || 0
  }

  /**
   * Get total points redeemed by customer
   */
  async getTotalRedeemed(customerId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(points)), 0) as total FROM ${this.tableName}
       WHERE customer_id = ? AND type = 'redeem'`,
      [customerId]
    )
    return result?.total || 0
  }
}

export const loyaltyTransactionRepository = new LoyaltyTransactionRepository()
export default loyaltyTransactionRepository
