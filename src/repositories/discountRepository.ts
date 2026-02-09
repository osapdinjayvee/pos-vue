import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { Discount, DiscountInput, DiscountType, DiscountApplicableTo } from '@/types/order'
import type { Discount as TransactionDiscount, DiscountType as TransactionDiscountType, PromoDiscount, PromoDiscountInput, DiscountScope } from '@/types/discount'

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

  // ===============================
  // Promotional Discount Management
  // ===============================

  /**
   * List promo discounts (excludes SC/PWD), with soft-delete filter
   */
  async findAllPromo(filters?: {
    search?: string
    isActive?: boolean
    autoApply?: boolean
  }): Promise<PromoDiscount[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL AND type IN ('percentage', 'fixed')`
    const params: any[] = []

    if (filters?.search) {
      sql += ` AND (name LIKE ? OR code LIKE ?)`
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    if (filters?.isActive !== undefined) {
      sql += ` AND is_active = ?`
      params.push(filters.isActive ? 1 : 0)
    }

    if (filters?.autoApply !== undefined) {
      sql += ` AND auto_apply = ?`
      params.push(filters.autoApply ? 1 : 0)
    }

    sql += ' ORDER BY created_at DESC'

    return await db.query<PromoDiscount>(sql, params)
  }

  /**
   * Find promo discount by ID (non-deleted)
   */
  async findPromoById(id: string): Promise<PromoDiscount | null> {
    return await db.getOne<PromoDiscount>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )
  }

  /**
   * Create promo discount with scopes
   */
  async createPromo(input: PromoDiscountInput): Promise<PromoDiscount> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, name, code, type, value, min_purchase, max_discount, auto_apply, is_active, start_date, end_date, start_time, end_time, weekdays, applicable_to, applicable_ids, usage_limit, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.code || null,
        input.type,
        input.value,
        input.min_purchase || 0,
        input.max_discount ?? null,
        input.auto_apply ? 1 : 0,
        input.is_active !== false ? 1 : 0,
        input.start_date || null,
        input.end_date || null,
        input.start_time || null,
        input.end_time || null,
        input.weekdays ? JSON.stringify(input.weekdays) : null,
        'all',
        null,
        null,
        0,
        now,
        now
      ]
    )

    // Create scopes
    await this.setScopes(id, input.productIds || [], input.categoryIds || [])

    return (await this.findPromoById(id))!
  }

  /**
   * Update promo discount with scopes
   */
  async updatePromo(id: string, input: Partial<PromoDiscountInput>): Promise<PromoDiscount | null> {
    const now = db.getCurrentTimestamp()
    const sets: string[] = []
    const params: any[] = []

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name) }
    if (input.code !== undefined) { sets.push('code = ?'); params.push(input.code || null) }
    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type) }
    if (input.value !== undefined) { sets.push('value = ?'); params.push(input.value) }
    if (input.min_purchase !== undefined) { sets.push('min_purchase = ?'); params.push(input.min_purchase) }
    if (input.max_discount !== undefined) { sets.push('max_discount = ?'); params.push(input.max_discount) }
    if (input.auto_apply !== undefined) { sets.push('auto_apply = ?'); params.push(input.auto_apply ? 1 : 0) }
    if (input.is_active !== undefined) { sets.push('is_active = ?'); params.push(input.is_active ? 1 : 0) }
    if (input.start_date !== undefined) { sets.push('start_date = ?'); params.push(input.start_date || null) }
    if (input.end_date !== undefined) { sets.push('end_date = ?'); params.push(input.end_date || null) }
    if (input.start_time !== undefined) { sets.push('start_time = ?'); params.push(input.start_time || null) }
    if (input.end_time !== undefined) { sets.push('end_time = ?'); params.push(input.end_time || null) }
    if (input.weekdays !== undefined) { sets.push('weekdays = ?'); params.push(input.weekdays ? JSON.stringify(input.weekdays) : null) }

    sets.push('updated_at = ?')
    params.push(now)
    params.push(id)

    if (sets.length > 1) {
      await db.execute(
        `UPDATE ${this.tableName} SET ${sets.join(', ')} WHERE id = ?`,
        params
      )
    }

    // Replace scopes if provided
    if (input.productIds !== undefined || input.categoryIds !== undefined) {
      await this.setScopes(id, input.productIds || [], input.categoryIds || [])
    }

    return await this.findPromoById(id)
  }

  /**
   * Soft delete a discount
   */
  async softDelete(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    )
  }

  /**
   * Get scopes for a discount
   */
  async getScopes(discountId: string): Promise<DiscountScope[]> {
    return await db.query<DiscountScope>(
      'SELECT * FROM discount_scopes WHERE discount_id = ?',
      [discountId]
    )
  }

  /**
   * Replace scopes for a discount
   */
  async setScopes(discountId: string, productIds: string[], categoryIds: string[]): Promise<void> {
    // Delete existing scopes
    await db.execute('DELETE FROM discount_scopes WHERE discount_id = ?', [discountId])

    const now = db.getCurrentTimestamp()

    // Insert product scopes
    for (const productId of productIds) {
      const scopeId = db.generateId('ds')
      await db.execute(
        'INSERT INTO discount_scopes (id, discount_id, product_id, created_at) VALUES (?, ?, ?, ?)',
        [scopeId, discountId, productId, now]
      )
    }

    // Insert category scopes
    for (const categoryId of categoryIds) {
      const scopeId = db.generateId('ds')
      await db.execute(
        'INSERT INTO discount_scopes (id, discount_id, category_id, created_at) VALUES (?, ?, ?, ?)',
        [scopeId, discountId, categoryId, now]
      )
    }
  }

  /**
   * Find eligible discounts for a given product/category
   * Returns raw rows; schedule filtering done in service layer
   */
  async findEligibleForProduct(productId: string, categoryId: string | null): Promise<PromoDiscount[]> {
    let sql = `
      SELECT DISTINCT d.* FROM ${this.tableName} d
      LEFT JOIN discount_scopes ds ON ds.discount_id = d.id
      WHERE d.is_active = 1
        AND d.deleted_at IS NULL
        AND d.type IN ('percentage', 'fixed')
        AND (
          ds.id IS NULL
          OR ds.product_id = ?
          ${categoryId ? 'OR ds.category_id = ?' : ''}
        )
      ORDER BY d.value DESC
    `

    const params: any[] = [productId]
    if (categoryId) params.push(categoryId)

    return await db.query<PromoDiscount>(sql, params)
  }
}

export const discountRepository = new DiscountRepository()
export default discountRepository
