import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { LoyaltyConfig, LoyaltyConfigInput } from '@/types/loyalty'

class LoyaltyConfigRepository extends BaseRepository<LoyaltyConfig> {
  protected tableName = 'loyalty_config'
  protected idPrefix = 'lcfg'

  /**
   * Get the default/active loyalty config
   */
  async getConfig(): Promise<LoyaltyConfig | null> {
    return await db.getOne<LoyaltyConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  /**
   * Update the loyalty config
   */
  async updateConfig(data: LoyaltyConfigInput): Promise<LoyaltyConfig | null> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName}
       SET earn_rate = ?, redeem_rate = ?, expiry_days = ?, min_redemption = ?, is_active = ?, updated_at = ?
       WHERE id = 'default'`,
      [
        data.earn_rate,
        data.redeem_rate,
        data.expiry_days ?? 365,
        data.min_redemption ?? 100,
        data.is_active === false ? 0 : 1,
        now
      ]
    )
    return await this.getConfig()
  }

  /**
   * Check if loyalty program is active
   */
  async isActive(): Promise<boolean> {
    const config = await this.getConfig()
    return config?.is_active === 1
  }
}

export const loyaltyConfigRepository = new LoyaltyConfigRepository()
export default loyaltyConfigRepository
