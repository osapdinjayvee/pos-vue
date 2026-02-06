import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { ProductVariant, ProductVariantInput } from '@/types/inventory'

export type { QueryOptions }

class VariantRepository extends BaseRepository<ProductVariant> {
  protected tableName = 'product_variants'
  protected idPrefix = 'var'

  async getAll(): Promise<ProductVariant[]> {
    return this.findAll({ orderBy: 'name', orderDir: 'ASC' })
  }

  async findByProductId(productId: string, options?: QueryOptions): Promise<ProductVariant[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE product_id = ?`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY display_order ASC, name ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<ProductVariant>(sql, [productId])
  }

  async findActiveByProductId(productId: string): Promise<ProductVariant[]> {
    return await db.query<ProductVariant>(
      `SELECT * FROM ${this.tableName}
       WHERE product_id = ? AND is_active = 1
       ORDER BY display_order ASC, name ASC`,
      [productId]
    )
  }

  async findByBarcode(barcode: string): Promise<ProductVariant | null> {
    if (!barcode) return null
    return await db.getOne<ProductVariant>(
      `SELECT * FROM ${this.tableName} WHERE barcode = ? AND is_active = 1`,
      [barcode]
    )
  }

  async findBySku(sku: string): Promise<ProductVariant | null> {
    if (!sku) return null
    return await db.getOne<ProductVariant>(
      `SELECT * FROM ${this.tableName} WHERE sku = ? AND is_active = 1`,
      [sku]
    )
  }

  async barcodeExists(barcode: string, excludeId?: string): Promise<boolean> {
    if (!barcode) return false

    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE barcode = ?`
    const params: any[] = [barcode]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  async skuExists(sku: string, excludeId?: string): Promise<boolean> {
    if (!sku) return false

    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE sku = ?`
    const params: any[] = [sku]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  async createVariant(data: ProductVariantInput): Promise<ProductVariant> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, product_id, sku, barcode, name, attributes, price_override, cost_override, image_url, is_active, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.product_id,
        data.sku || null,
        data.barcode || null,
        data.name,
        data.attributes ? JSON.stringify(data.attributes) : null,
        data.price_override ?? null,
        data.cost_override ?? null,
        data.image_url || null,
        data.is_active !== false ? 1 : 0,
        data.display_order ?? 0,
        now,
        now
      ]
    )

    return await this.findById(id) as ProductVariant
  }

  async updateVariant(id: string, data: Partial<ProductVariantInput>): Promise<ProductVariant | null> {
    const now = db.getCurrentTimestamp()
    const updates: string[] = []
    const values: any[] = []

    if (data.sku !== undefined) {
      updates.push('sku = ?')
      values.push(data.sku || null)
    }
    if (data.barcode !== undefined) {
      updates.push('barcode = ?')
      values.push(data.barcode || null)
    }
    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.attributes !== undefined) {
      updates.push('attributes = ?')
      values.push(data.attributes ? JSON.stringify(data.attributes) : null)
    }
    if (data.price_override !== undefined) {
      updates.push('price_override = ?')
      values.push(data.price_override)
    }
    if (data.cost_override !== undefined) {
      updates.push('cost_override = ?')
      values.push(data.cost_override)
    }
    if (data.image_url !== undefined) {
      updates.push('image_url = ?')
      values.push(data.image_url || null)
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }
    if (data.display_order !== undefined) {
      updates.push('display_order = ?')
      values.push(data.display_order)
    }

    if (updates.length === 0) {
      return await this.findById(id)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await db.execute(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    return await this.findById(id)
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await db.execute(
      `UPDATE ${this.tableName} SET is_active = 0, updated_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), id]
    )
    return result.changes > 0
  }

  async activate(id: string): Promise<boolean> {
    const result = await db.execute(
      `UPDATE ${this.tableName} SET is_active = 1, updated_at = ? WHERE id = ?`,
      [db.getCurrentTimestamp(), id]
    )
    return result.changes > 0
  }

  async deleteByProductId(productId: string): Promise<number> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE product_id = ?`,
      [productId]
    )
    return result.changes
  }

  async countByProductId(productId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE product_id = ? AND is_active = 1`,
      [productId]
    )
    return result?.count || 0
  }

  async findWithProductDetails(variantId: string): Promise<(ProductVariant & { product_name: string; base_price: number; cost_price: number }) | null> {
    return await db.getOne(
      `SELECT v.*, p.name as product_name, p.price as base_price, p.cost as cost_price
       FROM ${this.tableName} v
       JOIN products p ON v.product_id = p.id
       WHERE v.id = ?`,
      [variantId]
    )
  }

  async searchByBarcodeOrSku(query: string): Promise<ProductVariant[]> {
    const searchTerm = `%${query}%`
    return await db.query<ProductVariant>(
      `SELECT * FROM ${this.tableName}
       WHERE (barcode LIKE ? OR sku LIKE ?) AND is_active = 1
       ORDER BY sku ASC`,
      [searchTerm, searchTerm]
    )
  }

  async getDefaultVariant(productId: string): Promise<ProductVariant | null> {
    return await db.getOne<ProductVariant>(
      `SELECT * FROM ${this.tableName}
       WHERE product_id = ? AND is_active = 1
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1`,
      [productId]
    )
  }

  async bulkUpdateDisplayOrder(updates: { id: string; display_order: number }[]): Promise<void> {
    const now = db.getCurrentTimestamp()
    for (const update of updates) {
      await db.execute(
        `UPDATE ${this.tableName} SET display_order = ?, updated_at = ? WHERE id = ?`,
        [update.display_order, now, update.id]
      )
    }
  }
}

export const variantRepository = new VariantRepository()
export default variantRepository
