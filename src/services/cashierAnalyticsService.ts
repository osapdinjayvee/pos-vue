/**
 * Cashier Analytics Service
 * Provides cashier performance metrics, void drill-down, and ranking.
 * Queries the orders table joined with users for name resolution.
 */

import db from '@/db/database'
import type { CashierMetrics, CashierVoidDetail } from '@/types/analytics'

class CashierAnalyticsService {
  /**
   * Get performance metrics for all cashiers within a date range.
   * Queries orders grouped by user_id, joined with users for name.
   */
  async getCashierMetrics(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<CashierMetrics[]> {
    const branchFilter = branchId ? 'AND o.branch_id = ?' : ''
    const params: any[] = [dateFrom, dateTo]
    if (branchId) params.push(branchId)

    // Main metrics: transaction count, total sales, void count, void amount
    const sql = `
      SELECT
        o.user_id,
        u.first_name || ' ' || u.last_name AS name,
        COUNT(o.id) AS total_transactions,
        SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) AS total_sales,
        SUM(CASE WHEN o.status = 'void' THEN 1 ELSE 0 END) AS void_count,
        SUM(CASE WHEN o.status = 'void' THEN o.total ELSE 0 END) AS void_amount
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= ? AND o.created_at <= ?
        ${branchFilter}
      GROUP BY o.user_id
    `

    const rows = await db.query<{
      user_id: string
      name: string | null
      total_transactions: number
      total_sales: number
      void_count: number
      void_amount: number
    }>(sql, params)

    // For each cashier, compute items per transaction from order_items
    const metrics: CashierMetrics[] = []

    for (const row of rows) {
      const itemParams: any[] = [row.user_id, dateFrom, dateTo]
      if (branchId) itemParams.push(branchId)

      const itemSql = `
        SELECT
          COALESCE(SUM(oi_count.item_count), 0) AS total_items,
          COUNT(o.id) AS completed_count
        FROM orders o
        LEFT JOIN (
          SELECT order_id, COUNT(*) AS item_count
          FROM order_items
          GROUP BY order_id
        ) oi_count ON o.id = oi_count.order_id
        WHERE o.user_id = ?
          AND o.created_at >= ? AND o.created_at <= ?
          AND o.status = 'completed'
          ${branchId ? 'AND o.branch_id = ?' : ''}
      `

      const itemRow = await db.getOne<{
        total_items: number
        completed_count: number
      }>(itemSql, itemParams)

      const totalTransactions = row.total_transactions || 0
      const completedCount = itemRow?.completed_count || 0
      const totalItems = itemRow?.total_items || 0
      const totalSales = row.total_sales || 0
      const voidCount = row.void_count || 0
      const voidAmount = row.void_amount || 0

      const avgTransaction = completedCount > 0 ? totalSales / completedCount : 0
      const itemsPerTransaction = completedCount > 0 ? totalItems / completedCount : 0
      const voidRate = totalTransactions > 0 ? (voidCount / totalTransactions) * 100 : 0

      metrics.push({
        userId: row.user_id,
        name: row.name || 'Unknown',
        transactionCount: totalTransactions,
        totalSales,
        avgTransaction,
        itemsPerTransaction: Math.round(itemsPerTransaction * 10) / 10,
        voidCount,
        voidRate: Math.round(voidRate * 100) / 100,
        voidAmount
      })
    }

    return metrics
  }

  /**
   * Get void transaction details for a specific cashier.
   */
  async getCashierVoidDetails(
    userId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<CashierVoidDetail[]> {
    const sql = `
      SELECT
        o.id AS transaction_id,
        o.created_at AS date,
        o.order_number AS or_number,
        o.total AS amount,
        o.notes AS reason,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      WHERE o.user_id = ?
        AND o.status = 'void'
        AND o.created_at >= ?
        AND o.created_at <= ?
      ORDER BY o.created_at DESC
    `

    const rows = await db.query<{
      transaction_id: string
      date: string
      or_number: string
      amount: number
      reason: string | null
      item_count: number
    }>(sql, [userId, dateFrom, dateTo])

    return rows.map(row => ({
      transactionId: row.transaction_id,
      date: row.date,
      orNumber: row.or_number || '',
      items: row.item_count || 0,
      amount: row.amount || 0,
      reason: row.reason || 'No reason specified'
    }))
  }

  /**
   * Get cashier metrics sorted by a given field (ranking).
   */
  async getCashierRanking(
    dateFrom: string,
    dateTo: string,
    sortBy: keyof CashierMetrics = 'totalSales',
    branchId?: string
  ): Promise<CashierMetrics[]> {
    const metrics = await this.getCashierMetrics(dateFrom, dateTo, branchId)

    return metrics.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return bVal - aVal // Descending
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal)
      }
      return 0
    })
  }
}

export const cashierAnalyticsService = new CashierAnalyticsService()
export default cashierAnalyticsService
