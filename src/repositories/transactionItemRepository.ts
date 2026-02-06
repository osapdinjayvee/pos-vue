// Transaction Item Repository - CRUD operations for transaction line items
import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { TransactionItem, TransactionItemInput } from '@/types/transaction'

class TransactionItemRepository extends BaseRepository<TransactionItem> {
  protected tableName = 'transaction_items'
  protected idPrefix = 'txi'

  async getAll(): Promise<TransactionItem[]> {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC' })
  }

  async findByTransaction(transactionId: string): Promise<TransactionItem[]> {
    return await db.query<TransactionItem>(
      `SELECT * FROM ${this.tableName} WHERE transaction_id = ? ORDER BY created_at ASC`,
      [transactionId]
    )
  }

  async findByProduct(productId: string): Promise<TransactionItem[]> {
    return await db.query<TransactionItem>(
      `SELECT * FROM ${this.tableName} WHERE product_id = ? ORDER BY created_at DESC`,
      [productId]
    )
  }

  async findByVariant(variantId: string): Promise<TransactionItem[]> {
    return await db.query<TransactionItem>(
      `SELECT * FROM ${this.tableName} WHERE variant_id = ? ORDER BY created_at DESC`,
      [variantId]
    )
  }

  async createItem(data: TransactionItemInput): Promise<TransactionItem> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, transaction_id, product_id, variant_id, product_name, variant_name,
        sku, barcode, quantity, unit_price, line_total, discount, tax_type,
        vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.transaction_id,
        data.product_id,
        data.variant_id || null,
        data.product_name,
        data.variant_name || null,
        data.sku || null,
        data.barcode || null,
        data.quantity,
        data.unit_price,
        data.line_total,
        data.discount || 0,
        data.tax_type,
        data.vatable_sales || 0,
        data.vat_amount || 0,
        data.vat_exempt_sales || 0,
        data.zero_rated_sales || 0,
        now
      ]
    )

    return await this.findById(id) as TransactionItem
  }

  async createItems(items: TransactionItemInput[]): Promise<TransactionItem[]> {
    const createdItems: TransactionItem[] = []

    for (const item of items) {
      const created = await this.createItem(item)
      createdItems.push(created)
    }

    return createdItems
  }

  async getTransactionItemsWithProducts(transactionId: string): Promise<Array<TransactionItem & {
    product_name: string
    variant_name?: string
  }>> {
    return await db.query<TransactionItem & { product_name: string; variant_name?: string }>(
      `SELECT ti.*, p.name as product_name, v.name as variant_name
       FROM ${this.tableName} ti
       LEFT JOIN products p ON ti.product_id = p.id
       LEFT JOIN product_variants v ON ti.variant_id = v.id
       WHERE ti.transaction_id = ?
       ORDER BY ti.created_at ASC`,
      [transactionId]
    )
  }

  async getProductSalesSummary(productId: string, startDate?: string, endDate?: string): Promise<{
    totalQuantity: number
    totalRevenue: number
    totalVAT: number
    transactionCount: number
  }> {
    let sql = `
      SELECT
        COALESCE(SUM(ti.quantity), 0) as totalQuantity,
        COALESCE(SUM(ti.line_total), 0) as totalRevenue,
        COALESCE(SUM(ti.vat_amount), 0) as totalVAT,
        COUNT(DISTINCT ti.transaction_id) as transactionCount
      FROM ${this.tableName} ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ti.product_id = ? AND t.status = 'completed'
    `
    const params: any[] = [productId]

    if (startDate && endDate) {
      sql += ' AND t.created_at >= ? AND t.created_at <= ?'
      params.push(startDate, endDate)
    }

    const result = await db.getOne<{
      totalQuantity: number
      totalRevenue: number
      totalVAT: number
      transactionCount: number
    }>(sql, params)

    return {
      totalQuantity: result?.totalQuantity || 0,
      totalRevenue: result?.totalRevenue || 0,
      totalVAT: result?.totalVAT || 0,
      transactionCount: result?.transactionCount || 0
    }
  }

  async getTopSellingProducts(limit: number = 10, startDate?: string, endDate?: string): Promise<Array<{
    productId: string
    productName: string
    totalQuantity: number
    totalRevenue: number
  }>> {
    let sql = `
      SELECT
        ti.product_id as productId,
        ti.product_name as productName,
        SUM(ti.quantity) as totalQuantity,
        SUM(ti.line_total) as totalRevenue
      FROM ${this.tableName} ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
    `
    const params: any[] = []

    if (startDate && endDate) {
      sql += ' AND t.created_at >= ? AND t.created_at <= ?'
      params.push(startDate, endDate)
    }

    sql += ` GROUP BY ti.product_id, ti.product_name
             ORDER BY totalQuantity DESC
             LIMIT ?`
    params.push(limit)

    return await db.query<{
      productId: string
      productName: string
      totalQuantity: number
      totalRevenue: number
    }>(sql, params)
  }

  async countByTransaction(transactionId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    )
    return result?.count || 0
  }

  async deleteByTransaction(transactionId: string): Promise<void> {
    await db.execute(
      `DELETE FROM ${this.tableName} WHERE transaction_id = ?`,
      [transactionId]
    )
  }
}

export const transactionItemRepository = new TransactionItemRepository()
export default transactionItemRepository
