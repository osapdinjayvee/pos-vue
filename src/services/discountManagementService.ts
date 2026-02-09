// Discount Management Service - Schedule logic, eligibility resolver, validation
import { discountRepository } from '@/repositories/discountRepository'
import type { PromoDiscount, PromoDiscountInput, DiscountScope, EligibleDiscount } from '@/types/discount'

class DiscountManagementService {
  // ==================
  // Admin CRUD
  // ==================

  async list(filters?: { search?: string; isActive?: boolean; autoApply?: boolean }): Promise<PromoDiscount[]> {
    return await discountRepository.findAllPromo(filters)
  }

  async getById(id: string): Promise<{ discount: PromoDiscount; scopes: DiscountScope[] } | null> {
    const discount = await discountRepository.findPromoById(id)
    if (!discount) return null
    const scopes = await discountRepository.getScopes(id)
    return { discount, scopes }
  }

  async create(input: PromoDiscountInput): Promise<PromoDiscount> {
    const validation = this.validate(input)
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }
    return await discountRepository.createPromo(input)
  }

  async update(id: string, input: PromoDiscountInput): Promise<PromoDiscount | null> {
    const validation = this.validate(input)
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }
    return await discountRepository.updatePromo(id, input)
  }

  async softDelete(id: string): Promise<void> {
    await discountRepository.softDelete(id)
  }

  async toggleActive(id: string): Promise<PromoDiscount | null> {
    const discount = await discountRepository.findPromoById(id)
    if (!discount) return null
    return await discountRepository.updatePromo(id, {
      is_active: discount.is_active !== 1
    } as any)
  }

  // ==================
  // POS Eligibility
  // ==================

  async getEligibleDiscounts(
    productId: string,
    categoryId: string | null,
    lineSubtotal: number
  ): Promise<EligibleDiscount[]> {
    // 1. Query candidates from DB
    const candidates = await discountRepository.findEligibleForProduct(productId, categoryId)

    const now = new Date()
    const eligible: EligibleDiscount[] = []

    for (const discount of candidates) {
      // 2. Check schedule (date range, time window, weekday)
      if (!this.isWithinSchedule(discount, now)) continue

      // 3. Check min purchase
      if (lineSubtotal < discount.min_purchase) continue

      // 4. Compute amount
      const computedAmount = this.computeDiscountAmount(discount, lineSubtotal)
      if (computedAmount <= 0) continue

      eligible.push({
        discount,
        computedAmount,
        isAutoApply: discount.auto_apply === 1
      })
    }

    // 5. Sort: highest amount first, percent beats fixed on tie, newer as final
    eligible.sort((a, b) => {
      if (b.computedAmount !== a.computedAmount) return b.computedAmount - a.computedAmount
      if (a.discount.type !== b.discount.type) {
        return a.discount.type === 'percentage' ? -1 : 1
      }
      return new Date(b.discount.created_at).getTime() - new Date(a.discount.created_at).getTime()
    })

    return eligible
  }

  // ==================
  // Schedule Helpers
  // ==================

  isWithinSchedule(discount: PromoDiscount, now: Date = new Date()): boolean {
    return this.isWithinDateRange(discount, now)
      && this.isWithinTimeWindow(discount, now)
      && this.isAllowedWeekday(discount, now)
  }

  isWithinDateRange(discount: PromoDiscount, now: Date): boolean {
    if (discount.start_date) {
      const start = new Date(discount.start_date)
      if (now < start) return false
    }
    if (discount.end_date) {
      const end = new Date(discount.end_date)
      // End date is inclusive (end of day)
      end.setHours(23, 59, 59, 999)
      if (now > end) return false
    }
    return true
  }

  isWithinTimeWindow(discount: PromoDiscount, now: Date): boolean {
    if (!discount.start_time && !discount.end_time) return true

    const hh = now.getHours().toString().padStart(2, '0')
    const mm = now.getMinutes().toString().padStart(2, '0')
    const current = `${hh}:${mm}`

    const startTime = discount.start_time || '00:00'
    const endTime = discount.end_time || '23:59'

    if (startTime <= endTime) {
      // Normal window: 09:00 - 17:00
      return current >= startTime && current <= endTime
    } else {
      // Midnight crossing: 22:00 - 02:00
      return current >= startTime || current <= endTime
    }
  }

  isAllowedWeekday(discount: PromoDiscount, now: Date): boolean {
    if (!discount.weekdays) return true
    try {
      const allowedDays: number[] = JSON.parse(discount.weekdays)
      if (!Array.isArray(allowedDays) || allowedDays.length === 0) return true
      return allowedDays.includes(now.getDay())
    } catch {
      return true
    }
  }

  // ==================
  // Computation
  // ==================

  computeDiscountAmount(discount: PromoDiscount, lineSubtotal: number): number {
    let amount = 0

    if (discount.type === 'percentage') {
      amount = lineSubtotal * (discount.value / 100)
    } else {
      amount = discount.value
    }

    // Apply max_discount cap
    if (discount.max_discount && amount > discount.max_discount) {
      amount = discount.max_discount
    }

    // Don't exceed line subtotal
    if (amount > lineSubtotal) {
      amount = lineSubtotal
    }

    return Math.round(amount * 100) / 100
  }

  // ==================
  // Validation
  // ==================

  validate(input: PromoDiscountInput): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!input.name?.trim()) {
      errors.push('Discount name is required')
    }

    if (!input.type) {
      errors.push('Discount type is required')
    }

    if (input.value === undefined || input.value <= 0) {
      errors.push('Discount value must be greater than 0')
    }

    if (input.type === 'percentage' && input.value > 100) {
      errors.push('Percentage discount cannot exceed 100%')
    }

    if (input.start_date && input.end_date) {
      if (new Date(input.start_date) > new Date(input.end_date)) {
        errors.push('Start date must be before end date')
      }
    }

    return { valid: errors.length === 0, errors }
  }
}

export const discountManagementService = new DiscountManagementService()
export default discountManagementService
