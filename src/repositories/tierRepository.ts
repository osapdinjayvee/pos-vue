import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { MembershipTier } from '@/types/tier'

class TierRepository extends BaseRepository<MembershipTier> {
  protected tableName = 'membership_tiers'
  protected idPrefix = 'tier'

  /**
   * Find all tiers ordered by display_order
   */
  async findAllOrdered(): Promise<MembershipTier[]> {
    return await db.query<MembershipTier>(
      `SELECT * FROM ${this.tableName} ORDER BY display_order ASC`
    )
  }

  /**
   * Find all active tiers ordered by display_order
   */
  async findActive(): Promise<MembershipTier[]> {
    return await db.query<MembershipTier>(
      `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY display_order ASC`
    )
  }

  /**
   * Get the appropriate tier for a given lifetime spend
   * Returns the highest tier where min_spend <= amount
   */
  async getForSpend(lifetimeSpend: number): Promise<MembershipTier | null> {
    return await db.getOne<MembershipTier>(
      `SELECT * FROM ${this.tableName}
       WHERE min_spend <= ? AND is_active = 1
       ORDER BY min_spend DESC
       LIMIT 1`,
      [lifetimeSpend]
    )
  }

  /**
   * Get the next tier above a given spend amount
   */
  async getNextTier(currentSpend: number): Promise<MembershipTier | null> {
    return await db.getOne<MembershipTier>(
      `SELECT * FROM ${this.tableName}
       WHERE min_spend > ? AND is_active = 1
       ORDER BY min_spend ASC
       LIMIT 1`,
      [currentSpend]
    )
  }

  /**
   * Get the max display order (for new tier ordering)
   */
  async getMaxDisplayOrder(): Promise<number> {
    const result = await db.getOne<{ max_order: number }>(
      `SELECT COALESCE(MAX(display_order), 0) as max_order FROM ${this.tableName}`
    )
    return result?.max_order || 0
  }
}

export const tierRepository = new TierRepository()
export default tierRepository
