import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { PaymentConfig, PaymentConfigInput } from '@/types/settings'

class PaymentConfigRepository extends BaseRepository<PaymentConfig> {
  protected tableName = 'payment_config'
  protected idPrefix = 'pcfg'

  async getConfig(): Promise<PaymentConfig | null> {
    return await db.getOne<PaymentConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async updateConfig(data: PaymentConfigInput): Promise<PaymentConfig | null> {
    const now = db.getCurrentTimestamp()
    const fields: string[] = []
    const values: any[] = []

    const boolFields = ['cash_enabled', 'card_enabled', 'gcash_enabled', 'maya_enabled',
      'grab_pay_enabled', 'bank_transfer_enabled', 'check_enabled'] as const

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

export const paymentConfigRepository = new PaymentConfigRepository()
export default paymentConfigRepository
