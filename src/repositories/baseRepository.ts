import db from '@/db/database'

export interface BaseEntity {
  id: string
  created_at?: string
  updated_at?: string
}

export interface QueryOptions {
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string
  protected abstract idPrefix: string

  async findAll(options?: QueryOptions): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<T>(sql)
  }

  async findById(id: string): Promise<T | null> {
    return await db.getOne<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    )
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    // Filter out undefined values, keep null values
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    )

    const fields = Object.keys(filteredData)
    const values = Object.values(filteredData)

    const placeholders = fields.map(() => '?').join(', ')
    const fieldNames = ['id', ...fields, 'created_at', 'updated_at'].join(', ')
    const allPlaceholders = ['?', placeholders, '?', '?'].join(', ')

    await db.execute(
      `INSERT INTO ${this.tableName} (${fieldNames}) VALUES (${allPlaceholders})`,
      [id, ...values, now, now]
    )

    return await this.findById(id) as T
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const now = db.getCurrentTimestamp()

    // Remove id, created_at from update data and filter out undefined values
    const { id: _id, created_at: _createdAt, ...updateData } = data as any
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    )

    const fields = Object.keys(filteredData)
    const values = Object.values(filteredData)

    if (fields.length === 0) return await this.findById(id)

    const setClause = fields.map(f => `${f} = ?`).join(', ')

    await db.execute(
      `UPDATE ${this.tableName} SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    )

    return await this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    )

    return result.changes > 0
  }

  async count(where?: string, params?: any[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
    if (where) {
      sql += ` WHERE ${where}`
    }

    const result = await db.getOne<{ count: number }>(sql, params || [])
    return result?.count || 0
  }

  async exists(id: string): Promise<boolean> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`,
      [id]
    )
    return (result?.count || 0) > 0
  }
}
