import db from '@/db/database'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { BaseRepository } from './baseRepository'
import type { QueryOptions as BaseQueryOptions } from './baseRepository'

export type QueryOptions = BaseQueryOptions

export type ProductStatus = 'active' | 'inactive' | 'out-of-stock' | 'archived'
export type TaxType = 'vatable' | 'vat_exempt' | 'zero_rated'

export interface Product {
  id: string
  name: string
  description?: string
  image?: string
  price: number
  cost: number
  sku: string
  barcode?: string
  category_id?: string
  supplier_id?: string | null
  stock: number
  low_stock_threshold: number
  status: ProductStatus
  tax_type: TaxType
  sold: number
  revenue: number
  expiration_date?: string | null
  // Wholesale pricing
  wholesale_price?: number | null
  wholesale_min_qty?: number
  auto_apply_wholesale?: number
  // Variant and batch tracking
  has_variants?: number
  track_batches?: number
  created_at?: string
  updated_at?: string
  // Joined fields
  category_name?: string
  supplier_name?: string
}

export interface ProductInput {
  name: string
  description?: string
  image?: string
  price: number
  cost?: number
  sku: string
  barcode?: string
  category_id?: string
  supplier_id?: string | null
  stock?: number
  low_stock_threshold?: number
  status?: ProductStatus
  tax_type?: TaxType
  expiration_date?: string | null
  // Wholesale pricing
  wholesale_price?: number | null
  wholesale_min_qty?: number
  auto_apply_wholesale?: boolean
  // Variant and batch tracking
  has_variants?: boolean
  track_batches?: boolean
}

export interface ProductFilters {
  search?: string
  category_id?: string
  status?: ProductStatus
  lowStock?: boolean
  outOfStock?: boolean
  nearExpiry?: boolean
  movement?: 'fast' | 'moderate' | 'slow' | 'very-slow' | 'no-sales'
}

class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'products'
  protected idPrefix = 'prod'

  async findAllWithCategory(options?: QueryOptions & { includeArchived?: boolean }): Promise<Product[]> {
    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `

    if (!options?.includeArchived) {
      sql += ` WHERE p.status != 'archived'`
    }

    if (options?.orderBy) {
      sql += ` ORDER BY p.${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY p.created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Product>(sql)
  }

  async findByIdWithCategory(id: string): Promise<Product | null> {
    return await db.getOne<Product>(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ?`,
      [id]
    )
  }

  async findBySku(sku: string): Promise<Product | null> {
    return await db.getOne<Product>(
      'SELECT * FROM products WHERE sku = ?',
      [sku]
    )
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return await db.getOne<Product>(
      'SELECT * FROM products WHERE barcode = ?',
      [barcode]
    )
  }

  async search(query: string): Promise<Product[]> {
    const searchTerm = `%${query}%`
    return await db.query<Product>(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status != 'archived'
         AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR c.name LIKE ?)
       ORDER BY p.name ASC`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    )
  }

  async findWithFilters(filters: ProductFilters, options?: QueryOptions): Promise<Product[]> {
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR c.name LIKE ?)'
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    if (filters.category_id) {
      sql += ' AND p.category_id = ?'
      params.push(filters.category_id)
    }

    if (filters.status) {
      sql += ' AND p.status = ?'
      params.push(filters.status)
    }

    if (filters.lowStock) {
      sql += ' AND p.stock > 0 AND p.stock <= p.low_stock_threshold'
    }

    if (filters.outOfStock) {
      sql += ' AND p.stock = 0'
    }

    if (filters.nearExpiry) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      sql += ' AND p.expiration_date IS NOT NULL AND p.expiration_date <= ? AND p.expiration_date >= date("now")'
      params.push(toLocalDateStr(thirtyDaysFromNow))
    }

    if (filters.movement) {
      switch (filters.movement) {
        case 'fast':
          sql += ' AND p.sold >= 100'
          break
        case 'moderate':
          sql += ' AND p.sold >= 50 AND p.sold < 100'
          break
        case 'slow':
          sql += ' AND p.sold >= 10 AND p.sold < 50'
          break
        case 'very-slow':
          sql += ' AND p.sold > 0 AND p.sold < 10'
          break
        case 'no-sales':
          sql += ' AND p.sold = 0'
          break
      }
    }

    if (options?.orderBy) {
      sql += ` ORDER BY p.${options.orderBy} ${options.orderDir || 'ASC'}`
    } else {
      sql += ' ORDER BY p.created_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<Product>(sql, params)
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return await db.query<Product>(
      'SELECT * FROM products WHERE category_id = ? ORDER BY name ASC',
      [categoryId]
    )
  }

  async findLowStock(): Promise<Product[]> {
    return await db.query<Product>(
      `SELECT p.*, s.name as supplier_name
       FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.stock > 0 AND p.stock <= p.low_stock_threshold
       ORDER BY p.stock ASC`
    )
  }

  async findOutOfStock(): Promise<Product[]> {
    return await db.query<Product>(
      'SELECT * FROM products WHERE stock = 0 ORDER BY name ASC'
    )
  }

  async updateStock(id: string, quantity: number): Promise<Product | null> {
    const product = await this.findById(id)
    if (!product) return null

    const newStock = product.stock + quantity
    const newStatus: ProductStatus = newStock <= 0 ? 'out-of-stock' : product.status === 'out-of-stock' ? 'active' : product.status

    await db.execute(
      'UPDATE products SET stock = ?, status = ?, updated_at = ? WHERE id = ?',
      [Math.max(0, newStock), newStatus, db.getCurrentTimestamp(), id]
    )

        return await this.findById(id)
  }

  async recordSale(id: string, quantity: number, amount: number): Promise<Product | null> {
    const product = await this.findById(id)
    if (!product) return null

    const newStock = Math.max(0, product.stock - quantity)
    const newSold = product.sold + quantity
    const newRevenue = product.revenue + amount
    const newStatus: ProductStatus = newStock <= 0 ? 'out-of-stock' : product.status

    await db.execute(
      `UPDATE products SET
        stock = ?,
        sold = ?,
        revenue = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
      [newStock, newSold, newRevenue, newStatus, db.getCurrentTimestamp(), id]
    )

        return await this.findById(id)
  }

  async recordReturn(id: string, quantity: number, amount: number): Promise<Product | null> {
    const product = await this.findById(id)
    if (!product) return null

    const newSold = Math.max(0, product.sold - quantity)
    const newRevenue = Math.max(0, product.revenue - amount)
    const newStatus: ProductStatus = product.stock > 0 && product.status === 'out-of-stock' ? 'active' : product.status

    await db.execute(
      `UPDATE products SET
        sold = ?,
        revenue = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
      [newSold, newRevenue, newStatus, db.getCurrentTimestamp(), id]
    )

    return await this.findById(id)
  }

  async bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void> {
    const placeholders = ids.map(() => '?').join(', ')
    await db.execute(
      `UPDATE products SET status = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [status, db.getCurrentTimestamp(), ...ids]
    )
      }

  async bulkDelete(ids: string[]): Promise<void> {
    const placeholders = ids.map(() => '?').join(', ')
    await db.execute(
      `DELETE FROM products WHERE id IN (${placeholders})`,
      ids
    )
      }

  async skuExists(sku: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM products WHERE sku = ?'
    const params: any[] = [sku]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  async barcodeExists(barcode: string, excludeId?: string): Promise<boolean> {
    if (!barcode) return false

    let sql = 'SELECT COUNT(*) as count FROM products WHERE barcode = ?'
    const params: any[] = [barcode]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}

export const productRepository = new ProductRepository()
export default productRepository
