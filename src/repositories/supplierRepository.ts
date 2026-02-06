import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { Supplier, SupplierInput } from '@/types/inventory'

export type { QueryOptions }

class SupplierRepository extends BaseRepository<Supplier> {
  protected tableName = 'suppliers'
  protected idPrefix = 'sup'

  async getAll(): Promise<Supplier[]> {
    return this.findAll({ orderBy: 'name', orderDir: 'ASC' })
  }

  async findActive(options?: QueryOptions): Promise<Supplier[]> {
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

    return await db.query<Supplier>(sql)
  }

  async search(query: string): Promise<Supplier[]> {
    const searchTerm = `%${query}%`
    return await db.query<Supplier>(
      `SELECT * FROM ${this.tableName}
       WHERE (name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)
       AND is_active = 1
       ORDER BY name ASC`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    )
  }

  async findByName(name: string): Promise<Supplier | null> {
    return await db.getOne<Supplier>(
      `SELECT * FROM ${this.tableName} WHERE name = ?`,
      [name]
    )
  }

  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE name = ?`
    const params: any[] = [name]

    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }

    const result = await db.getOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }

  async createSupplier(data: SupplierInput): Promise<Supplier> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, name, contact_person, phone, email, address, payment_terms, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.contact_person || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.payment_terms || null,
        data.notes || null,
        data.is_active !== false ? 1 : 0,
        now,
        now
      ]
    )

    return await this.findById(id) as Supplier
  }

  async updateSupplier(id: string, data: Partial<SupplierInput>): Promise<Supplier | null> {
    const now = db.getCurrentTimestamp()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.contact_person !== undefined) {
      updates.push('contact_person = ?')
      values.push(data.contact_person || null)
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?')
      values.push(data.phone || null)
    }
    if (data.email !== undefined) {
      updates.push('email = ?')
      values.push(data.email || null)
    }
    if (data.address !== undefined) {
      updates.push('address = ?')
      values.push(data.address || null)
    }
    if (data.payment_terms !== undefined) {
      updates.push('payment_terms = ?')
      values.push(data.payment_terms || null)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes || null)
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
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

  async getSupplierOptions(): Promise<{ label: string; value: string }[]> {
    const suppliers = await this.findActive({ orderBy: 'name', orderDir: 'ASC' })
    return suppliers.map(s => ({
      label: s.name,
      value: s.id
    }))
  }

  async getProductsBySupplier(supplierId: string): Promise<any[]> {
    return await db.query(
      `SELECT * FROM products WHERE supplier_id = ? AND status = 'active' ORDER BY name ASC`,
      [supplierId]
    )
  }

  async countActiveSuppliers(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1`
    )
    return result?.count || 0
  }
}

export const supplierRepository = new SupplierRepository()
export default supplierRepository
