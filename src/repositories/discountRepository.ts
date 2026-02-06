import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Discount, DiscountInput, DiscountType, DiscountApplicableTo } from '@/types/order'
import type { Discount as TransactionDiscount, DiscountType as TransactionDiscountType } from '@/types/discount'

class DiscountRepository extends BaseRepository<Discount> {
  protected tableName = 'discounts'
  protected idPrefix = 'disc'

  /**
   * Find discount by code
   */
  async findByCode(code: string): Promise<Discount | null> {
    return await db.getOne<Discount>(
      `SELECT * FROM ${this.tableName} WHERE code = ?`,
      [code]
    )
  }

  /**
   * Find all active discounts
   */
  async findAllActive(options?: QueryOptions): Promise<Discount[]> {
    let sql = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= datetime('now'))
      AND (end_date IS NULL OR end_date >= datetime('now'))
      AND (usage_limit IS NULL OR usage_count < usage_limit)
    `

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

    return await db.query<Discount>(sql)
  }

  /**
   * Find discounts by type
   */
  async findByType(type: DiscountType, options?: QueryOptions): Promise<Discount[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE type = ?`
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

    return await db.query<Discount>(sql, params)
  }

  /**
   * Find applicable discounts for a product
   */
  async findForProduct(productId: string): Promise<Discount[]> {
    return await db.query<Discount>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= datetime('now'))
       AND (end_date IS NULL OR end_date >= datetime('now'))
       AND (usage_limit IS NULL OR usage_count < usage_limit)
       AND (applicable_to = 'all' OR (applicable_to = 'product' AND applicable_ids LIKE ?))
       ORDER BY value DESC`,
      [`%${productId}%`]
    )
  }

  /**
   * Find applicable discounts for a category
   */
  async findForCategory(categoryId: string): Promise<Discount[]> {
    return await db.query<Discount>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= datetime('now'))
       AND (end_date IS NULL OR end_date >= datetime('now'))
       AND (usage_limit IS NULL OR usage_count < usage_limit)
       AND (applicable_to = 'all' OR (applicable_to = 'category' AND applicable_ids LIKE ?))
       ORDER BY value DESC`,
      [`%${categoryId}%`]
    )
  }

  /**
   * Find applicable discounts for a customer type
   */
  async findForCustomerType(customerType: string): Promise<Discount[]> {
    return await db.query<Discount>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= datetime('now'))
       AND (end_date IS NULL OR end_date >= datetime('now'))
       AND (usage_limit IS NULL OR usage_count < usage_limit)
       AND (applicable_to = 'all' OR (applicable_to = 'customer_type' AND applicable_ids LIKE ?))
       ORDER BY value DESC`,
      [`%${customerType}%`]
    )
  }

  /**
   * Validate and get discount by code
   */
  async validateCode(code: string, purchaseAmount?: number): Promise<{ valid: boolean; discount?: Discount; reason?: string }> {
    const discount = await this.findByCode(code)

    if (!discount) {
      return { valid: false, reason: 'Invalid discount code' }
    }

    if (discount.is_active !== 1) {
      return { valid: false, reason: 'Discount is not active' }
    }

    const now = new Date()

    if (discount.start_date && new Date(discount.start_date) > now) {
      return { valid: false, reason: 'Discount is not yet valid' }
    }

    if (discount.end_date && new Date(discount.end_date) < now) {
      return { valid: false, reason: 'Discount has expired' }
    }

    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return { valid: false, reason: 'Discount usage limit reached' }
    }

    if (purchaseAmount !== undefined && discount.min_purchase > 0 && purchaseAmount < discount.min_purchase) {
      return { valid: false, reason: `Minimum purchase of ${discount.min_purchase} required` }
    }

    return { valid: true, discount }
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(id: string): Promise<void> {
    await db.execute(
      `UPDATE ${this.tableName} SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), id]
    )
  }

  /**
   * Calculate discount amount
   */
  calculateDiscountAmount(discount: Discount, subtotal: number): number {
    let discountAmount = 0

    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100)
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value
    }

    // Apply max discount cap if set
    if (discount.max_discount && discountAmount > discount.max_discount) {
      discountAmount = discount.max_discount
    }

    // Don't exceed the subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal
    }

    return discountAmount
  }

  /**
   * Deactivate discount
   */
  async deactivate(id: string): Promise<Discount | null> {
    return await this.update(id, { is_active: 0 } as Partial<Discount>)
  }

  /**
   * Reactivate discount
   */
  async reactivate(id: string): Promise<Discount | null> {
    return await this.update(id, { is_active: 1 } as Partial<Discount>)
  }

  /**
   * Search discounts by name or code
   */
  async search(query: string, options?: QueryOptions): Promise<Discount[]> {
    const searchTerm = `%${query}%`
    let sql = `SELECT * FROM ${this.tableName} WHERE name LIKE ? OR code LIKE ?`
    const params: any[] = [searchTerm, searchTerm]

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

    return await db.query<Discount>(sql, params)
  }

  // ===============================
  // Senior/PWD Discount Methods (POS)
  // ===============================

  /**
   * Get Senior Citizen discount
   */
  async getSeniorDiscount(): Promise<TransactionDiscount | null> {
    return await db.getOne<TransactionDiscount>(
      `SELECT * FROM ${this.tableName} WHERE type = 'senior_citizen' AND is_active = 1 LIMIT 1`
    )
  }

  /**
   * Get PWD discount
   */
  async getPWDDiscount(): Promise<TransactionDiscount | null> {
    return await db.getOne<TransactionDiscount>(
      `SELECT * FROM ${this.tableName} WHERE type = 'pwd' AND is_active = 1 LIMIT 1`
    )
  }

  /**
   * Get promo discounts for POS
   */
  async getPromoDiscounts(): Promise<TransactionDiscount[]> {
    return await db.query<TransactionDiscount>(
      `SELECT * FROM ${this.tableName}
       WHERE type IN ('percentage', 'fixed', 'promo')
       AND is_active = 1
       ORDER BY name ASC`
    )
  }

  /**
   * Find active discounts for POS
   */
  async findActiveForPOS(): Promise<TransactionDiscount[]> {
    const now = db.getCurrentTimestamp()
    return await db.query<TransactionDiscount>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)
       ORDER BY name ASC`,
      [now, now]
    )
  }

  /**
   * Check if discount is valid for POS
   */
  async isDiscountValidForPOS(id: string): Promise<boolean> {
    const discount = await this.findById(id)
    if (!discount || !discount.is_active) return false

    const now = new Date().toISOString()

    if (discount.start_date && discount.start_date > now) return false
    if (discount.end_date && discount.end_date < now) return false

    return true
  }
}

export const discountRepository = new DiscountRepository()
export default discountRepository
