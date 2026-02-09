import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { TaxConfig, TaxConfigInput } from '@/types/settings'

class TaxConfigRepository extends BaseRepository<TaxConfig> {
  protected tableName = 'tax_config'
  protected idPrefix = 'tcfg'

  async getConfig(): Promise<TaxConfig | null> {
    return await db.getOne<TaxConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async updateConfig(data: TaxConfigInput): Promise<TaxConfig | null> {
    const now = db.getCurrentTimestamp()
    const fields: string[] = []
    const values: any[] = []

    if (data.vat_rate !== undefined) { fields.push('vat_rate = ?'); values.push(data.vat_rate) }
    if (data.default_tax_type !== undefined) { fields.push('default_tax_type = ?'); values.push(data.default_tax_type) }
    if (data.senior_citizen_discount !== undefined) { fields.push('senior_citizen_discount = ?'); values.push(data.senior_citizen_discount) }
    if (data.pwd_discount !== undefined) { fields.push('pwd_discount = ?'); values.push(data.pwd_discount) }
    if (data.show_vat_breakdown !== undefined) { fields.push('show_vat_breakdown = ?'); values.push(data.show_vat_breakdown ? 1 : 0) }
    if (data.include_vat_in_price !== undefined) { fields.push('include_vat_in_price = ?'); values.push(data.include_vat_in_price ? 1 : 0) }

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

export const taxConfigRepository = new TaxConfigRepository()
export default taxConfigRepository
