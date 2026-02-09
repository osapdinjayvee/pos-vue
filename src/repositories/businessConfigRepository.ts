import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { BusinessConfig, BusinessConfigInput } from '@/types/settings'

class BusinessConfigRepository extends BaseRepository<BusinessConfig> {
  protected tableName = 'business_config'
  protected idPrefix = 'bcfg'

  async getConfig(): Promise<BusinessConfig | null> {
    return await db.getOne<BusinessConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async updateConfig(data: BusinessConfigInput): Promise<BusinessConfig | null> {
    const now = db.getCurrentTimestamp()
    const fields: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
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

export const businessConfigRepository = new BusinessConfigRepository()
export default businessConfigRepository
