import { tierRepository } from '@/repositories/tierRepository'
import { customerRepository } from '@/repositories/customerRepository'
import type { MembershipTier } from '@/types/tier'
import type { Customer } from '@/types/order'

class TierService {
  /**
   * Evaluate and potentially upgrade a customer's tier based on lifetime spend
   */
  async evaluateTier(customerId: string): Promise<{ changed: boolean; newTier: MembershipTier | null; previousTierId: string | null }> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) {
      return { changed: false, newTier: null, previousTierId: null }
    }

    const appropriateTier = await tierRepository.getForSpend(customer.lifetime_spend)
    if (!appropriateTier) {
      return { changed: false, newTier: null, previousTierId: customer.tier_id }
    }

    const previousTierId = customer.tier_id
    if (previousTierId !== appropriateTier.id) {
      await customerRepository.update(customerId, { tier_id: appropriateTier.id } as Partial<Customer>)
      return { changed: true, newTier: appropriateTier, previousTierId }
    }

    return { changed: false, newTier: appropriateTier, previousTierId }
  }

  /**
   * Get the current tier for a customer
   */
  async getTierForCustomer(customerId: string): Promise<MembershipTier | null> {
    const customer = await customerRepository.findById(customerId)
    if (!customer || !customer.tier_id) return null
    return await tierRepository.findById(customer.tier_id)
  }

  /**
   * Get tier benefits parsed from JSON
   */
  getTierBenefits(tier: MembershipTier): string[] {
    if (!tier.benefits) return []
    try {
      return JSON.parse(tier.benefits)
    } catch {
      return []
    }
  }

  /**
   * Apply tier discount to a subtotal
   */
  applyTierDiscount(subtotal: number, tier: MembershipTier): number {
    if (!tier || tier.discount_rate <= 0) return 0
    return Math.round(subtotal * tier.discount_rate * 100) / 100
  }

  /**
   * Get the next tier for a customer (for progress display)
   */
  async getNextTier(customerId: string): Promise<MembershipTier | null> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) return null
    return await tierRepository.getNextTier(customer.lifetime_spend)
  }

  /**
   * Batch evaluate all customers' tiers
   */
  async checkAllCustomerTiers(): Promise<{ upgraded: number; downgraded: number }> {
    const customers = await customerRepository.findAllActive()
    let upgraded = 0
    let downgraded = 0

    for (const customer of customers) {
      const result = await this.evaluateTier(customer.id)
      if (result.changed && result.newTier) {
        const previousTier = result.previousTierId
          ? await tierRepository.findById(result.previousTierId)
          : null
        if (previousTier && result.newTier.min_spend > previousTier.min_spend) {
          upgraded++
        } else {
          downgraded++
        }
      }
    }

    return { upgraded, downgraded }
  }

  /**
   * Get all available tiers
   */
  async getAllTiers(): Promise<MembershipTier[]> {
    return await tierRepository.findAllOrdered()
  }

  /**
   * Get active tiers only
   */
  async getActiveTiers(): Promise<MembershipTier[]> {
    return await tierRepository.findActive()
  }
}

export const tierService = new TierService()
export default tierService
