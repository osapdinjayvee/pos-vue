import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { QueryOptions } from './baseRepository'
import type { StockAlert, StockAlertInput, AlertType } from '@/types/inventory'

export type { QueryOptions, AlertType }

class StockAlertRepository extends BaseRepository<StockAlert> {
  protected tableName = 'stock_alerts'
  protected idPrefix = 'alt'

  /** Stock-level alerts and expiry alerts are tracked independently per variant. */
  private static readonly STOCK_LEVEL_TYPES: AlertType[] = ['low_stock', 'out_of_stock']
  private static readonly EXPIRY_TYPES: AlertType[] = ['expiring_soon', 'expired']

  async findByVariantId(variantId: string): Promise<StockAlert | null> {
    return await db.getOne<StockAlert>(
      `SELECT * FROM ${this.tableName} WHERE variant_id = ?`,
      [variantId]
    )
  }

  async findByVariantAndType(variantId: string, alertType: AlertType): Promise<StockAlert | null> {
    return await db.getOne<StockAlert>(
      `SELECT * FROM ${this.tableName} WHERE variant_id = ? AND alert_type = ?`,
      [variantId, alertType]
    )
  }

  /**
   * Find a variant's alert within one family (stock-level or expiry), so a
   * low-stock update never inspects or destroys an expiry alert.
   */
  private async findByVariantInTypes(variantId: string, types: AlertType[]): Promise<StockAlert | null> {
    const placeholders = types.map(() => '?').join(', ')
    return await db.getOne<StockAlert>(
      `SELECT * FROM ${this.tableName} WHERE variant_id = ? AND alert_type IN (${placeholders})`,
      [variantId, ...types]
    )
  }

  private async removeByVariantInTypes(variantId: string, types: AlertType[]): Promise<boolean> {
    const placeholders = types.map(() => '?').join(', ')
    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE variant_id = ? AND alert_type IN (${placeholders})`,
      [variantId, ...types]
    )
    return result.changes > 0
  }

  /** Clear a variant's expiry alerts (used when nothing is expiring any more). */
  async removeExpiryAlerts(variantId: string): Promise<boolean> {
    return this.removeByVariantInTypes(variantId, StockAlertRepository.EXPIRY_TYPES)
  }

  /** Every expiry alert currently on record, regardless of acknowledgement. */
  async findExpiryAlerts(): Promise<StockAlert[]> {
    const types = StockAlertRepository.EXPIRY_TYPES
    const placeholders = types.map(() => '?').join(', ')
    return await db.query<StockAlert>(
      `SELECT * FROM ${this.tableName} WHERE alert_type IN (${placeholders})`,
      [...types]
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
    // Keyed on (variant, type) — matching only on variant_id used to convert a
    // variant's low-stock alert into an expiry alert and vice versa.
    const existing = await this.findByVariantAndType(data.variant_id, data.alert_type)

    if (existing) {
      // Update existing alert
      await db.execute(
        `UPDATE ${this.tableName}
         SET current_value = ?, threshold = ?, acknowledged = 0, acknowledged_by = NULL, acknowledged_at = NULL, updated_at = ?
         WHERE variant_id = ? AND alert_type = ?`,
        [data.current_value, data.threshold, now, data.variant_id, data.alert_type]
      )
      return await this.findByVariantAndType(data.variant_id, data.alert_type) as StockAlert
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

  /**
   * Reconcile the variant's stock-level alert.
   *
   * Only touches low_stock/out_of_stock rows. It previously operated on "the"
   * alert for the variant, so a healthy stock level deleted the variant's
   * expiry alert — the single biggest reason expiry warnings never appeared.
   */
  async updateStockLevel(variantId: string, currentValue: number, threshold: number): Promise<void> {
    const types = StockAlertRepository.STOCK_LEVEL_TYPES

    if (currentValue > threshold) {
      // Stock is healthy — clear stock-level alerts, leave expiry alerts alone.
      await this.removeByVariantInTypes(variantId, types)
      return
    }

    const alertType: AlertType = currentValue <= 0 ? 'out_of_stock' : 'low_stock'

    // Drop the opposite stock-level state so a variant never shows both.
    const stale = types.filter(t => t !== alertType)
    if (stale.length) {
      await this.removeByVariantInTypes(variantId, stale)
    }

    await this.createOrUpdate({
      variant_id: variantId,
      alert_type: alertType,
      current_value: currentValue,
      threshold
    })
  }

  async createExpiryAlert(
    variantId: string,
    daysUntilExpiry: number,
    warningDays: number = 7
  ): Promise<StockAlert> {
    const alertType: AlertType = daysUntilExpiry < 0 ? 'expired' : 'expiring_soon'

    // A batch that has tipped from "expiring soon" to "expired" should not leave
    // the softer alert behind.
    const stale = StockAlertRepository.EXPIRY_TYPES.filter(t => t !== alertType)
    if (stale.length) {
      await this.removeByVariantInTypes(variantId, stale)
    }

    return this.createOrUpdate({
      variant_id: variantId,
      alert_type: alertType,
      current_value: daysUntilExpiry,
      threshold: warningDays
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
