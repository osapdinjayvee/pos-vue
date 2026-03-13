import { BaseRepository } from './baseRepository'
import db from '@/db/database'
import type { EISConfig } from '@/types/eis'

class EISConfigRepository extends BaseRepository<EISConfig> {
  protected tableName = 'eis_config'
  protected idPrefix = 'eisc'

  async getConfig(): Promise<EISConfig | null> {
    return await db.getOne<EISConfig>(`SELECT * FROM ${this.tableName} LIMIT 1`)
  }

  async saveConfig(config: Partial<EISConfig>): Promise<EISConfig> {
    const existing = await this.getConfig()
    if (existing) {
      return (await this.update(existing.id, config)) as EISConfig
    }
    return await this.create(config as Omit<EISConfig, 'id' | 'created_at' | 'updated_at'>)
  }

  async updateField(field: keyof EISConfig, value: unknown): Promise<void> {
    const existing = await this.getConfig()
    if (!existing) return
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET ${field} = ?, updated_at = ? WHERE id = ?`,
      [value, now, existing.id]
    )
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig()
    return config?.is_enabled === 1
  }

  async getEnvironment(): Promise<'test' | 'production'> {
    const config = await this.getConfig()
    return config?.environment || 'test'
  }
}

export const eisConfigRepository = new EISConfigRepository()
export default eisConfigRepository
