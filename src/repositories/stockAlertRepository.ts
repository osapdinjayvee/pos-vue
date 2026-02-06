import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { StockAlert, StockAlertInput, AlertType } from '@/types/inventory'

export type { QueryOptions, AlertType }

class StockAlertRepository extends BaseRepository<StockAlert> {
  protected tableName = 'stock_alerts'
  protected idPrefix = 'alt'

  async findByVariantId(variantId: string): Promise<StockAlert | null> {
    return await db.getOne<StockAlert>(
      `SELECT * FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
  }

  async findByType(alertType: AlertType, options?: QueryOptions): Promise<StockAlert[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE alert_type = ?`

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

    return await db.query<StockAlert>(sql, [alertType])
  }

  async findUnacknowledged(options?: QueryOptions): Promise<StockAlert[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE acknowledged = 0`

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

    return await db.query<StockAlert>(sql)
  }

  async findAcknowledged(options?: QueryOptions): Promise<StockAlert[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE acknowledged = 1`

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY acknowledged_at DESC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<StockAlert>(sql)
  }

  async createOrUpdate(data: StockAlertInput): Promise<StockAlert> {
    const now = db.getCurrentTimestamp()
    const existing = await this.findByVariantId(data.variant_id)

    if (existing) {
      // Update existing alert
      await db.execute(
        `UPDATE ${this.tableName}
         SET alert_type = ?, current_value = ?, threshold = ?, acknowledged = 0, acknowledged_by = NULL, acknowledged_at = NULL, updated_at = ?
         WHERE variant_id = ?`,
        [data.alert_type, data.current_value, data.threshold, now, data.variant_id]
      )
      return await this.findByVariantId(data.variant_id) as StockAlert
    } else {
      // Create new alert
      const id = db.generateId(this.idPrefix)

      await db.execute(
        `INSERT INTO ${this.tableName}
         (id, variant_id, alert_type, current_value, threshold, acknowledged, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [id, data.variant_id, data.alert_type, data.current_value, data.threshold, now, now]
      )

      return await this.findById(id) as StockAlert
    }
  }

  async acknowledge(id: string, userId: string): Promise<boolean> {
    const now = db.getCurrentTimestamp()
    const result = await db.execute(
      `UPDATE ${this.tableName}
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?, updated_at = ?
       WHERE id = ?`,
      [userId, now, now, id]
    )
    return result.changes > 0
  }

  async unacknowledge(id: string): Promise<boolean> {
    const now = db.getCurrentTimestamp()
    const result = await db.execute(
      `UPDATE ${this.tableName}
       SET acknowledged = 0, acknowledged_by = NULL, acknowledged_at = NULL, updated_at = ?
       WHERE id = ?`,
      [now, id]
    )
    return result.changes > 0
  }

  async removeByVariant(variantId: string): Promise<boolean> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
    return result.changes > 0
  }

  async updateStockLevel(variantId: string, currentValue: number, threshold: number): Promise<void> {
    const now = db.getCurrentTimestamp()
    const existing = await this.findByVariantId(variantId)

    if (currentValue <= 0) {
      // Out of stock
      if (existing) {
        await db.execute(
          `UPDATE ${this.tableName}
           SET alert_type = 'out_of_stock', current_value = ?, threshold = ?, updated_at = ?
           WHERE variant_id = ?`,
          [currentValue, threshold, now, variantId]
        )
      } else {
        await this.createOrUpdate({
          variant_id: variantId,
          alert_type: 'out_of_stock',
          current_value: currentValue,
          threshold
        })
      }
    } else if (currentValue <= threshold) {
      // Low stock
      if (existing) {
        await db.execute(
          `UPDATE ${this.tableName}
           SET alert_type = 'low_stock', current_value = ?, threshold = ?, updated_at = ?
           WHERE variant_id = ?`,
          [currentValue, threshold, now, variantId]
        )
      } else {
        await this.createOrUpdate({
          variant_id: variantId,
          alert_type: 'low_stock',
          current_value: currentValue,
          threshold
        })
      }
    } else {
      // Stock is healthy, remove any existing alert
      if (existing) {
        await this.removeByVariant(variantId)
      }
    }
  }

  async createExpiryAlert(variantId: string, daysUntilExpiry: number): Promise<StockAlert> {
    const alertType: AlertType = daysUntilExpiry < 0 ? 'expired' : 'expiring_soon'

    return this.createOrUpdate({
      variant_id: variantId,
      alert_type: alertType,
      current_value: daysUntilExpiry,
      threshold: 7 // Default expiry warning days
    })
  }

  async countUnacknowledged(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE acknowledged = 0`
    )
    return result?.count || 0
  }

  async countByType(): Promise<Record<AlertType, number>> {
    const types: AlertType[] = ['low_stock', 'out_of_stock', 'expiring_soon', 'expired']
    const counts: Record<string, number> = {}

    for (const type of types) {
      const result = await db.getOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE alert_type = ?`,
        [type]
      )
      counts[type] = result?.count || 0
    }

    return counts as Record<AlertType, number>
  }

  async findWithProductDetails(options?: QueryOptions): Promise<any[]> {
    let sql = `
      SELECT a.*, v.name as variant_name, v.sku, p.id as product_id, p.name as product_name
      FROM ${this.tableName} a
      JOIN product_variants v ON a.variant_id = v.id
      JOIN products p ON v.product_id = p.id
    `

    if (options?.orderBy) {
      sql += ` ORDER BY a.${options.orderBy} ${options.orderDir || 'DESC'}`
    } else {
      sql += ' ORDER BY a.alert_type ASC, a.current_value ASC'
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query(sql)
  }

  async findUnacknowledgedWithDetails(): Promise<any[]> {
    return await db.query(
      `SELECT a.*, v.name as variant_name, v.sku, p.id as product_id, p.name as product_name
       FROM ${this.tableName} a
       JOIN product_variants v ON a.variant_id = v.id
       JOIN products p ON v.product_id = p.id
       WHERE a.acknowledged = 0
       ORDER BY
         CASE a.alert_type
           WHEN 'out_of_stock' THEN 1
           WHEN 'expired' THEN 2
           WHEN 'low_stock' THEN 3
           WHEN 'expiring_soon' THEN 4
         END,
         a.current_value ASC`
    )
  }

  async bulkAcknowledge(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0

    const now = db.getCurrentTimestamp()
    const placeholders = ids.map(() => '?').join(',')

    const result = await db.execute(
      `UPDATE ${this.tableName}
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?, updated_at = ?
       WHERE id IN (${placeholders})`,
      [userId, now, now, ...ids]
    )

    return result.changes
  }

  async clearAllAcknowledged(): Promise<number> {
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE acknowledged = 1`
    )
    return result.changes
  }
}

export const stockAlertRepository = new StockAlertRepository()
export default stockAlertRepository
