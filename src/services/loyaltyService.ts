import { loyaltyTransactionRepository } from '@/repositories/loyaltyTransactionRepository'
import { loyaltyConfigRepository } from '@/repositories/loyaltyConfigRepository'
import { customerRepository } from '@/repositories/customerRepository'
import { tierRepository } from '@/repositories/tierRepository'
import type { LoyaltyConfig, LoyaltyTransaction } from '@/types/loyalty'

class LoyaltyService {
  /**
   * Earn points on a purchase
   */
  async earnPoints(
    customerId: string,
    transactionId: string,
    amount: number
  ): Promise<LoyaltyTransaction | null> {
    const config = await loyaltyConfigRepository.getConfig()
    if (!config || !config.is_active) return null

    // Get customer's current tier for multiplier
    const customer = await customerRepository.findById(customerId)
    if (!customer) return null

    let multiplier = 1
    if (customer.tier_id) {
      const tier = await tierRepository.findById(customer.tier_id)
      if (tier) {
        multiplier = tier.points_multiplier
      }
    }

    const points = this.calculateEarning(amount, config.earn_rate, multiplier)
    if (points <= 0) return null

    const currentBalance = customer.loyalty_points
    const newBalance = currentBalance + points

    // Create loyalty transaction
    const lt = await loyaltyTransactionRepository.create({
      customer_id: customerId,
      type: 'earn',
      points: points,
      balance_after: newBalance,
      transaction_id: transactionId,
      reason: `Purchase earning (${multiplier}x multiplier)`
    } as any)

    // Update customer points
    await customerRepository.addLoyaltyPoints(customerId, points)

    return lt
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(
    customerId: string,
    points: number,
    transactionId?: string
  ): Promise<{ success: boolean; phpValue: number; loyaltyTransactionId?: string; error?: string }> {
    const config = await loyaltyConfigRepository.getConfig()
    if (!config || !config.is_active) {
      return { success: false, phpValue: 0, error: 'Loyalty program is not active' }
    }

    const validation = await this.validateRedemption(customerId, points)
    if (!validation.valid) {
      return { success: false, phpValue: 0, error: validation.error }
    }

    const customer = await customerRepository.findById(customerId)
    if (!customer) {
      return { success: false, phpValue: 0, error: 'Customer not found' }
    }

    const phpValue = points * config.redeem_rate
    const newBalance = customer.loyalty_points - points

    // Create redeem transaction
    const lt = await loyaltyTransactionRepository.create({
      customer_id: customerId,
      type: 'redeem',
      points: -points,
      balance_after: newBalance,
      transaction_id: transactionId || null,
      reason: `Redeemed ${points} points for ₱${phpValue.toFixed(2)} discount`
    } as any)

    // Deduct points from customer
    await customerRepository.deductLoyaltyPoints(customerId, points)

    return {
      success: true,
      phpValue,
      loyaltyTransactionId: lt.id
    }
  }

  /**
   * Adjust points (for void/refund)
   */
  async adjustPoints(
    customerId: string,
    points: number,
    reason: string,
    transactionId?: string
  ): Promise<LoyaltyTransaction | null> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) return null

    const newBalance = Math.max(0, customer.loyalty_points + points)

    const lt = await loyaltyTransactionRepository.create({
      customer_id: customerId,
      type: 'adjustment',
      points: points,
      balance_after: newBalance,
      transaction_id: transactionId || null,
      reason: reason
    } as any)

    if (points > 0) {
      await customerRepository.addLoyaltyPoints(customerId, points)
    } else {
      await customerRepository.deductLoyaltyPoints(customerId, Math.abs(points))
    }

    return lt
  }

  /**
   * Calculate points earned from a purchase amount
   */
  calculateEarning(amount: number, earnRate: number, multiplier: number = 1): number {
    return Math.floor(amount * earnRate * multiplier)
  }

  /**
   * Calculate PHP value of points
   */
  calculateRedemptionValue(points: number, redeemRate: number): number {
    return points * redeemRate
  }

  /**
   * Validate a redemption request
   */
  async validateRedemption(
    customerId: string,
    points: number
  ): Promise<{ valid: boolean; error?: string; maxRedeemable?: number; phpValue?: number }> {
    const config = await loyaltyConfigRepository.getConfig()
    if (!config || !config.is_active) {
      return { valid: false, error: 'Loyalty program is not active' }
    }

    const customer = await customerRepository.findById(customerId)
    if (!customer) {
      return { valid: false, error: 'Customer not found' }
    }

    if (points < config.min_redemption) {
      return {
        valid: false,
        error: `Minimum redemption is ${config.min_redemption} points`,
        maxRedeemable: customer.loyalty_points
      }
    }

    if (points > customer.loyalty_points) {
      return {
        valid: false,
        error: `Insufficient points. Available: ${customer.loyalty_points}`,
        maxRedeemable: customer.loyalty_points
      }
    }

    return {
      valid: true,
      maxRedeemable: customer.loyalty_points,
      phpValue: points * config.redeem_rate
    }
  }

  /**
   * Get the earn loyalty transaction for a given sale transaction
   */
  async getTransactionLoyalty(transactionId: string): Promise<LoyaltyTransaction | null> {
    const transactions = await loyaltyTransactionRepository.findByTransaction(transactionId)
    // Return the earn transaction (the one with positive points)
    return transactions.find(t => t.type === 'earn') || null
  }

  /**
   * Get customer points history
   */
  async getCustomerPointsHistory(
    customerId: string,
    limit?: number
  ): Promise<LoyaltyTransaction[]> {
    return await loyaltyTransactionRepository.findByCustomer(customerId, { limit })
  }

  /**
   * Expire old points based on config
   */
  async expireOldPoints(customerId: string): Promise<number> {
    const config = await loyaltyConfigRepository.getConfig()
    if (!config || config.expiry_days <= 0) return 0

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() - config.expiry_days)
    const expiryDateStr = expiryDate.toISOString()

    const expiringTransactions = await loyaltyTransactionRepository.getExpiringPoints(
      customerId,
      expiryDateStr
    )

    let totalExpired = 0
    for (const lt of expiringTransactions) {
      if (lt.points > 0) {
        totalExpired += lt.points
      }
    }

    if (totalExpired > 0) {
      const customer = await customerRepository.findById(customerId)
      if (customer) {
        const pointsToExpire = Math.min(totalExpired, customer.loyalty_points)
        if (pointsToExpire > 0) {
          await this.adjustPoints(
            customerId,
            -pointsToExpire,
            `Points expired (older than ${config.expiry_days} days)`
          )
          return pointsToExpire
        }
      }
    }

    return 0
  }

  /**
   * Get the current loyalty config
   */
  async getConfig(): Promise<LoyaltyConfig | null> {
    return await loyaltyConfigRepository.getConfig()
  }
}

export const loyaltyService = new LoyaltyService()
export default loyaltyService
