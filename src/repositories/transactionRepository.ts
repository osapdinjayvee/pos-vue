// Transaction Repository - CRUD operations for sales transactions
import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { Transaction, TransactionInput, TransactionStatus } from '@/types/transaction'

export type { QueryOptions }

class TransactionRepository extends BaseRepository<Transaction> {
  protected tableName = 'transactions'
  protected idPrefix = 'tx'

  async getAll(): Promise<Transaction[]> {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC' })
  }

  async findByORNumber(orNumber: string): Promise<Transaction | null> {
    return await db.getOne<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE or_number = ?`,
      [orNumber]
    )
  }

  async findByShift(shiftId: string): Promise<Transaction[]> {
    return await db.query<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE shift_id = ? ORDER BY created_at DESC`,
      [shiftId]
    )
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return await db.query<Transaction>(
      `SELECT * FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`,
      [startDate, endDate]
    )
  }

  async findByUser(userId: string, options?: QueryOptions): Promise<Transaction[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`

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

    return await db.query<Transaction>(sql, [userId])
  }

  async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return await db.query<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`,
      [status]
    )
  }

  async findUnsynced(): Promise<Transaction[]> {
    return await db.query<Transaction>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC`
    )
  }

  async createTransaction(data: TransactionInput): Promise<Transaction> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, or_number, shift_id, user_id, terminal_id, branch_id, customer_id,
        subtotal, discount_total, vatable_sales, vat_amount, vat_exempt_sales,
        zero_rated_sales, total_amount, discount_type, discount_id_number,
        discount_id_name, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.or_number,
        data.shift_id || null,
        data.user_id,
        data.terminal_id,
        data.branch_id,
        data.customer_id || null,
        data.subtotal,
        data.discount_total || 0,
        data.vatable_sales,
        data.vat_amount,
        data.vat_exempt_sales || 0,
        data.zero_rated_sales || 0,
        data.total_amount,
        data.discount_type || null,
        data.discount_id_number || null,
        data.discount_id_name || null,
        data.status || 'completed',
        data.notes || null,
        now,
        now
      ]
    )

    return await this.findById(id) as Transaction
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<Transaction | null> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now, id]
    )

    return await this.findById(id)
  }

  async markSynced(id: string): Promise<boolean> {
    const now = db.getCurrentTimestamp()
    const result = await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    )
    return result.changes > 0
  }

  async markMultipleSynced(ids: string[]): Promise<void> {
    const now = db.getCurrentTimestamp()
    const placeholders = ids.map(() => '?').join(', ')
    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [now, now, ...ids]
    )
  }

  async getDailySummary(date: string): Promise<{
    totalTransactions: number
    totalAmount: number
    totalVAT: number
    voidedCount: number
    voidedAmount: number
  }> {
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const completed = await db.getOne<{ count: number; total: number; vat: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total,
              COALESCE(SUM(vat_amount), 0) as vat
       FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ? AND status = 'completed'`,
      [startOfDay, endOfDay]
    )

    const voided = await db.getOne<{ count: number; total: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ? AND status = 'voided'`,
      [startOfDay, endOfDay]
    )

    return {
      totalTransactions: completed?.count || 0,
      totalAmount: completed?.total || 0,
      totalVAT: completed?.vat || 0,
      voidedCount: voided?.count || 0,
      voidedAmount: voided?.total || 0
    }
  }

  async search(query: string): Promise<Transaction[]> {
    const searchTerm = `%${query}%`
    return await db.query<Transaction>(
      `SELECT * FROM ${this.tableName}
       WHERE or_number LIKE ? OR discount_id_number LIKE ? OR discount_id_name LIKE ?
       ORDER BY created_at DESC`,
      [searchTerm, searchTerm, searchTerm]
    )
  }

  async countByStatus(status: TransactionStatus): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = ?`,
      [status]
    )
    return result?.count || 0
  }

  async getTotalRevenue(startDate?: string, endDate?: string): Promise<number> {
    let sql = `SELECT COALESCE(SUM(total_amount), 0) as total FROM ${this.tableName} WHERE status = 'completed'`
    const params: any[] = []

    if (startDate && endDate) {
      sql += ' AND created_at >= ? AND created_at <= ?'
      params.push(startDate, endDate)
    }

    const result = await db.getOne<{ total: number }>(sql, params)
    return result?.total || 0
  }
}

export const transactionRepository = new TransactionRepository()
export default transactionRepository
