import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { SystemConfig, SystemConfigInput } from '@/types/settings'

class SystemConfigRepository extends BaseRepository<SystemConfig> {
  protected tableName = 'system_config'
  protected idPrefix = 'scfg'

  async getConfig(): Promise<SystemConfig | null> {
    return await db.getOne<SystemConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async updateConfig(data: SystemConfigInput): Promise<SystemConfig | null> {
    const now = db.getCurrentTimestamp()
    const fields: string[] = []
    const values: any[] = []

    const boolFields = ['offline_mode_enabled', 'auto_sync_enabled', 'enable_notifications',
      'enable_sound_alerts', 'auto_backup_enabled', 'cloud_backup_enabled',
      'local_backup_enabled', 'encrypt_backup', 'sync_products', 'sync_orders',
      'sync_customers', 'sync_inventory'] as const
    const stringFields = ['backup_frequency', 'backup_time', 'local_backup_path',
      'sync_strategy', 'conflict_resolution'] as const
    const numFields = ['sync_interval', 'data_retention_years', 'low_stock_threshold',
      'keep_backup_days'] as const

    for (const key of stringFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]) }
    }
    for (const key of numFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]) }
    }
    for (const key of boolFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key] ? 1 : 0) }
    }

    if (fields.length === 0) return await this.getConfig()

    fields.push('updated_at = ?')
    values.push(now)

    await db.execute(
      `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = 'default'`,
      values
    )
    return await this.getConfig()
  }
}

export const systemConfigRepository = new SystemConfigRepository()
export default systemConfigRepository
