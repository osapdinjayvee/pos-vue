import { customerRepository } from '@/repositories/customerRepository'
import { tierRepository } from '@/repositories/tierRepository'
import { loyaltyTransactionRepository } from '@/repositories/loyaltyTransactionRepository'
import { tierService } from '@/services/tierService'
import type { Customer, CustomerInput } from '@/types/order'
import type { MembershipTier } from '@/types/tier'
import type { LoyaltyTransaction } from '@/types/loyalty'

export interface CustomerProfile {
  customer: Customer
  tier: MembershipTier | null
  nextTier: MembershipTier | null
  stats: {
    totalOrders: number
    totalSpent: number
    avgTicket: number
    lastVisit: string | null
  }
  recentPoints: LoyaltyTransaction[]
}

class CustomerService {
  /**
   * Register a new customer with default tier assignment
   */
  async registerCustomer(data: CustomerInput): Promise<Customer> {
    const customer = await customerRepository.create({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      country: data.country || 'PH',
      tax_id: data.tax_id || null,
      customer_type: data.customer_type || 'retail',
      credit_limit: data.credit_limit || 0,
      current_balance: 0,
      loyalty_points: 0,
      tier_id: 'tier-bronze',
      lifetime_spend: 0,
      notes: data.notes || null,
      is_active: 1,
      synced_at: null
    } as any)

    return customer
  }

  /**
   * Get a comprehensive customer profile
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) return null

    // Get tier info
    let tier: MembershipTier | null = null
    if (customer.tier_id) {
      tier = await tierRepository.findById(customer.tier_id)
    }
    const nextTier = await tierService.getNextTier(customerId)

    // Get order stats (now includes avgTicket and lastVisit)
    const orderStats = await customerRepository.getOrderStats(customerId)

    // Get recent points activity
    const recentPoints = await loyaltyTransactionRepository.getRecentActivity(customerId, 5)

    return {
      customer,
      tier,
      nextTier,
      stats: {
        totalOrders: orderStats.totalOrders,
        totalSpent: orderStats.totalSpent,
        avgTicket: orderStats.avgTicket,
        lastVisit: orderStats.lastVisit
      },
      recentPoints
    }
  }

  /**
   * Update customer's lifetime spend and trigger tier evaluation
   */
  async updateLifetimeSpend(customerId: string, amount: number): Promise<void> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) return

    const newSpend = (customer.lifetime_spend || 0) + amount
    await customerRepository.update(customerId, {
      lifetime_spend: newSpend
    } as Partial<Customer>)

    // Evaluate tier
    await tierService.evaluateTier(customerId)
  }

  /**
   * Deduct from lifetime spend (for voids/refunds)
   */
  async deductLifetimeSpend(customerId: string, amount: number): Promise<void> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) return

    const newSpend = Math.max(0, (customer.lifetime_spend || 0) - amount)
    await customerRepository.update(customerId, {
      lifetime_spend: newSpend
    } as Partial<Customer>)
  }

  /**
   * Archive a customer (soft-deactivate).
   *
   * Blocked while the customer owes money: archiving would drop them out of
   * active views and lose sight of an unsettled utang. Settle the balance first.
   */
  async archiveCustomer(customerId: string): Promise<Customer> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) {
      throw new Error('Customer not found')
    }

    if ((customer.current_balance ?? 0) > 0) {
      throw new Error(
        'This customer has an outstanding balance. Settle it before archiving.'
      )
    }

    const updated = await customerRepository.setActive(customerId, false)
    if (!updated) {
      throw new Error('Failed to archive customer')
    }
    return updated
  }

  /**
   * Reactivate an archived customer.
   */
  async reactivateCustomer(customerId: string): Promise<Customer> {
    const updated = await customerRepository.setActive(customerId, true)
    if (!updated) {
      throw new Error('Failed to reactivate customer')
    }
    return updated
  }
}

export const customerService = new CustomerService()
export default customerService
