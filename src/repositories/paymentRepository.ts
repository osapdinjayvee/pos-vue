import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Payment, PaymentInput, PaymentMethodCode, PaymentStatus, PaymentMethod } from '@/types/order'
import type { Payment as TransactionPayment, PaymentInput as TransactionPaymentInput, PaymentMethod as TransactionPaymentMethod } from '@/types/payment'

class PaymentRepository extends BaseRepository<Payment> {
  protected tableName = 'payments'
  protected idPrefix = 'pay'

  /**
   * Find all payments for an order
   */
  async findByOrderId(orderId: string): Promise<Payment[]> {
    return await db.query<Payment>(
      `SELECT * FROM ${this.tableName} WHERE order_id = ? ORDER BY created_at ASC`,
      [orderId]
    )
  }

  /**
   * Find payments by method
   */
  async findByMethod(method: PaymentMethodCode, options?: QueryOptions): Promise<Payment[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE payment_method = ?`
    const params: any[] = [method]

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

    return await db.query<Payment>(sql, params)
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus, options?: QueryOptions): Promise<Payment[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE status = ?`
    const params: any[] = [status]

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

    return await db.query<Payment>(sql, params)
  }

  /**
   * Create multiple payments for an order
   */
  async createBatch(payments: PaymentInput[]): Promise<Payment[]> {
    const createdPayments: Payment[] = []

    for (const payment of payments) {
      const created = await this.create(payment as Omit<Payment, 'id' | 'created_at' | 'updated_at'>)
      createdPayments.push(created)
    }

    return createdPayments
  }

  /**
   * Calculate total payments for an order
   */
  async calculateOrderTotal(orderId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM ${this.tableName} WHERE order_id = ? AND status = 'completed'`,
      [orderId]
    )
    return result?.total || 0
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<Payment | null> {
    await db.execute(
      `UPDATE ${this.tableName} SET status = ? WHERE id = ?`,
      [status, id]
    )
    return await this.findById(id)
  }

  /**
   * Get payments by date range
   */
  async findByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<Payment[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE processed_at >= ? AND processed_at <= ?`
    const params: any[] = [startDate, endDate]

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY processed_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Payment>(sql, params)
  }

  /**
   * Get payment summary by method
   */
  async getSummaryByMethod(startDate?: string, endDate?: string): Promise<Array<{ method: PaymentMethodCode; total: number; count: number }>> {
    let sql = `
      SELECT payment_method as method, SUM(amount) as total, COUNT(*) as count
      FROM ${this.tableName}
      WHERE status = 'completed'
    `
    const params: any[] = []

    if (startDate) {
      sql += ' AND processed_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND processed_at <= ?'
      params.push(endDate)
    }

    sql += ' GROUP BY payment_method ORDER BY total DESC'

    return await db.query(sql, params)
  }

  /**
   * Get unsynced payments
   */
  async getUnsyncedPayments(): Promise<Payment[]> {
    return await db.query<Payment>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC`
    )
  }

  /**
   * Mark payment as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), id]
    )
  }

  // =====================
  // Payment Methods CRUD
  // =====================

  /**
   * Get all payment methods
   */
  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.query<PaymentMethod>(
      `SELECT * FROM payment_methods ORDER BY display_order ASC`
    )
  }

  /**
   * Get active payment methods
   */
  async getActivePaymentMethods(): Promise<PaymentMethod[]> {
    return await db.query<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY display_order ASC`
    )
  }

  /**
   * Get payment method by code
   */
  async getPaymentMethodByCode(code: PaymentMethodCode): Promise<PaymentMethod | null> {
    return await db.getOne<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE code = ?`,
      [code]
    )
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
    const now = db.getCurrentTimestamp()
    const fields = Object.keys(data)
    const values = Object.values(data)

    if (fields.length === 0) return null

    const setClause = fields.map(f => `${f} = ?`).join(', ')

    await db.execute(
      `UPDATE payment_methods SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    )

    return await db.getOne<PaymentMethod>(`SELECT * FROM payment_methods WHERE id = ?`, [id])
  }

  // =================================
  // Transaction Payment Methods (POS)
  // =================================

  /**
   * Find all payments for a transaction (POS)
   */
  async findByTransaction(transactionId: string): Promise<TransactionPayment[]> {
    return await db.query<TransactionPayment>(
      `SELECT * FROM ${this.tableName} WHERE transaction_id = ? ORDER BY created_at ASC`,
      [transactionId]
    )
  }

  /**
   * Create a transaction payment
   */
  async createTransactionPayment(data: TransactionPaymentInput): Promise<TransactionPayment> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, transaction_id, payment_method, amount, tendered, change_amount,
        reference_number, card_type, last_four_digits, approval_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        id,
        data.transaction_id,
        data.method,
        data.amount,
        data.tendered || data.amount,
        data.change_amount || 0,
        data.reference_number || null,
        data.card_type || null,
        data.last_four_digits || null,
        data.approval_code || null,
        now
      ]
    )

    return await this.findById(id) as unknown as TransactionPayment
  }

  /**
   * Create multiple transaction payments
   */
  async createTransactionPayments(payments: TransactionPaymentInput[]): Promise<TransactionPayment[]> {
    const createdPayments: TransactionPayment[] = []

    for (const payment of payments) {
      const created = await this.createTransactionPayment(payment)
      createdPayments.push(created)
    }

    return createdPayments
  }

  /**
   * Get total payments for a transaction
   */
  async getTransactionPaymentTotal(transactionId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    )
    return result?.total || 0
  }

  /**
   * Get daily payment summary for POS
   */
  async getDailyPaymentSummary(date: string): Promise<{
    cash: { count: number; total: number }
    card: { count: number; total: number }
    ewallet: { count: number; total: number }
    totalPayments: number
    totalAmount: number
  }> {
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const payments = await db.query<{ payment_method: string; amount: number }>(
      `SELECT p.payment_method, p.amount
       FROM ${this.tableName} p
       JOIN transactions t ON p.transaction_id = t.id
       WHERE p.created_at >= ? AND p.created_at <= ? AND t.status = 'completed'`,
      [startOfDay, endOfDay]
    )

    const summary = {
      cash: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      ewallet: { count: 0, total: 0 },
      totalPayments: 0,
      totalAmount: 0
    }

    for (const payment of payments) {
      summary.totalPayments++
      summary.totalAmount += payment.amount

      if (payment.payment_method === 'cash') {
        summary.cash.count++
        summary.cash.total += payment.amount
      } else if (payment.payment_method === 'card') {
        summary.card.count++
        summary.card.total += payment.amount
      } else {
        // gcash, maya, other_ewallet
        summary.ewallet.count++
        summary.ewallet.total += payment.amount
      }
    }

    return summary
  }

  /**
   * Delete payments by transaction ID
   */
  async deleteByTransaction(transactionId: string): Promise<void> {
    await db.execute(
      `DELETE FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    )
  }
}

export const paymentRepository = new PaymentRepository()
export default paymentRepository
