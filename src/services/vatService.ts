// VAT Service - Business logic for VAT calculations and BIR compliance
import {
  extractVAT,
  extractNetAmount,
  addVAT,
  calculateVAT,
  calculateItemVAT,
  calculateCartVAT,
  applySeniorPWDDiscount,
  round2,
  DEFAULT_VAT_RATE,
  formatCurrency,
  formatVATBreakdown
} from '@/utils/vatCalculator'
import { useSettingsStore } from '@/stores/settings'
import type { TaxType } from '@/types/transaction'
import type { ItemVATResult, CartVATBreakdown } from '@/utils/vatCalculator'

export interface VATCalculationItem {
  unitPrice: number
  quantity: number
  taxType: TaxType
  lineDiscount?: number
}

export interface SeniorPWDDiscountResult {
  originalTotal: number
  discountAmount: number
  discountPercentage: number
  newVATBreakdown: CartVATBreakdown
  affectedItems: number
}

class VATService {
  /**
   * Get current VAT rate from settings store (falls back to default)
   */
  get vatRate(): number {
    try {
      return useSettingsStore().vatRate
    } catch {
      return DEFAULT_VAT_RATE
    }
  }

  /**
   * Get current VAT rate as percentage from settings store
   */
  get vatRatePercent(): number {
    try {
      return useSettingsStore().vatRatePercent
    } catch {
      return 12
    }
  }

  /**
   * VAT multiplier for extraction
   */
  get vatMultiplier(): number {
    return this.vatRate / (1 + this.vatRate)
  }

  /**
   * VAT divisor
   */
  get vatDivisor(): number {
    return 1 + this.vatRate
  }

  /**
   * Get senior citizen discount rate from settings
   */
  get seniorDiscountRate(): number {
    try {
      return useSettingsStore().seniorDiscount
    } catch {
      return 0.20
    }
  }

  /**
   * Get PWD discount rate from settings
   */
  get pwdDiscountRate(): number {
    try {
      return useSettingsStore().pwdDiscount
    } catch {
      return 0.20
    }
  }

  /**
   * Extract VAT from inclusive price
   */
  extractVAT(inclusivePrice: number): number {
    return extractVAT(inclusivePrice, this.vatRate)
  }

  /**
   * Extract net amount from inclusive price
   */
  extractNetAmount(inclusivePrice: number): number {
    return extractNetAmount(inclusivePrice, this.vatRate)
  }

  /**
   * Add VAT to net amount
   */
  addVAT(netAmount: number): number {
    return addVAT(netAmount, this.vatRate)
  }

  /**
   * Calculate VAT from net amount
   */
  calculateVAT(netAmount: number): number {
    return calculateVAT(netAmount, this.vatRate)
  }

  /**
   * Round to 2 decimal places
   */
  round(value: number): number {
    return round2(value)
  }

  /**
   * Calculate VAT for a single line item
   */
  calculateItemVAT(
    unitPrice: number,
    quantity: number,
    taxType: TaxType,
    lineDiscount: number = 0
  ): ItemVATResult {
    return calculateItemVAT(unitPrice, quantity, taxType, lineDiscount, this.vatRate)
  }

  /**
   * Calculate VAT breakdown for cart items
   */
  calculateCartVAT(items: VATCalculationItem[]): CartVATBreakdown {
    return calculateCartVAT(items, this.vatRate)
  }

  /**
   * Apply Senior Citizen/PWD discount
   * Reads discount rate from settings based on discount type
   */
  applySeniorPWDDiscount(
    items: VATCalculationItem[],
    discountType: 'senior_citizen' | 'pwd' = 'senior_citizen'
  ): SeniorPWDDiscountResult {
    const discountRate = discountType === 'pwd' ? this.pwdDiscountRate : this.seniorDiscountRate
    const result = applySeniorPWDDiscount(items, discountRate)

    // Count affected items (VATable items only)
    const affectedItems = items.filter(item => item.taxType === 'vatable').length

    return {
      originalTotal: result.originalTotal,
      discountAmount: result.discountAmount,
      discountPercentage: discountRate * 100,
      newVATBreakdown: result.newVATBreakdown,
      affectedItems
    }
  }

  /**
   * Calculate percentage discount
   */
  calculatePercentageDiscount(
    items: VATCalculationItem[],
    percentage: number,
    applyToVATableOnly: boolean = false
  ): {
    originalTotal: number
    discountAmount: number
    finalTotal: number
  } {
    const cartVAT = this.calculateCartVAT(items)
    let discountBase = cartVAT.subtotal

    if (applyToVATableOnly) {
      // Only apply to VATable items
      discountBase = items
        .filter(item => item.taxType === 'vatable')
        .reduce((sum, item) => {
          const lineTotal = round2(item.unitPrice * item.quantity - (item.lineDiscount || 0))
          return sum + lineTotal
        }, 0)
    }

    const discountAmount = round2(discountBase * (percentage / 100))

    return {
      originalTotal: cartVAT.subtotal,
      discountAmount,
      finalTotal: round2(cartVAT.subtotal - discountAmount)
    }
  }

  /**
   * Calculate fixed amount discount
   */
  calculateFixedDiscount(
    items: VATCalculationItem[],
    fixedAmount: number
  ): {
    originalTotal: number
    discountAmount: number
    finalTotal: number
  } {
    const cartVAT = this.calculateCartVAT(items)
    // Discount cannot exceed total
    const discountAmount = Math.min(fixedAmount, cartVAT.subtotal)

    return {
      originalTotal: cartVAT.subtotal,
      discountAmount: round2(discountAmount),
      finalTotal: round2(cartVAT.subtotal - discountAmount)
    }
  }

  /**
   * Validate VAT calculation for BIR compliance
   */
  validateVATCalculation(breakdown: CartVATBreakdown): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // VAT amount should be rate% of VATable sales
    if (breakdown.vatableSales > 0) {
      const expectedVAT = round2(breakdown.vatableSales * this.vatRate)
      const tolerance = 0.02 // 2 centavos tolerance for rounding

      if (Math.abs(breakdown.vatAmount - expectedVAT) > tolerance) {
        errors.push(
          `VAT amount mismatch: expected ${expectedVAT}, got ${breakdown.vatAmount}`
        )
      }
    }

    // Total should equal sum of components
    const expectedTotal = round2(
      breakdown.vatableSales +
      breakdown.vatAmount +
      breakdown.vatExemptSales +
      breakdown.zeroRatedSales
    )

    if (Math.abs(breakdown.totalSales - expectedTotal) > 0.02) {
      errors.push(
        `Total mismatch: expected ${expectedTotal}, got ${breakdown.totalSales}`
      )
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format amount as Philippine Peso
   */
  formatCurrency(amount: number): string {
    return formatCurrency(amount)
  }

  /**
   * Format VAT breakdown for display
   */
  formatVATBreakdown(breakdown: CartVATBreakdown): string[] {
    return formatVATBreakdown(breakdown, this.vatRatePercent)
  }

  /**
   * Get tax type label
   */
  getTaxTypeLabel(taxType: TaxType): string {
    const labels: Record<TaxType, string> = {
      vatable: 'VATable',
      exempt: 'VAT-Exempt',
      zero_rated: 'Zero-Rated'
    }
    return labels[taxType] || taxType
  }

  /**
   * Determine if discount makes items VAT-exempt
   */
  isVATExemptDiscount(discountType: string): boolean {
    return discountType === 'senior_citizen' || discountType === 'pwd'
  }

  /**
   * Calculate effective price after SC/PWD discount
   * For VATable items, removes VAT first, then applies discount
   */
  calculateSCPWDEffectivePrice(
    inclusivePrice: number,
    taxType: TaxType,
    discountType: 'senior_citizen' | 'pwd' = 'senior_citizen'
  ): {
    originalPrice: number
    netPrice: number
    discountAmount: number
    finalPrice: number
  } {
    const discountRate = discountType === 'pwd' ? this.pwdDiscountRate : this.seniorDiscountRate

    if (taxType !== 'vatable') {
      const discountAmount = round2(inclusivePrice * discountRate)
      return {
        originalPrice: inclusivePrice,
        netPrice: inclusivePrice,
        discountAmount,
        finalPrice: round2(inclusivePrice - discountAmount)
      }
    }

    // VATable items: First remove VAT, then apply discount
    const netPrice = this.extractNetAmount(inclusivePrice)
    const discountAmount = round2(inclusivePrice * discountRate)
    const finalPrice = round2(inclusivePrice - discountAmount)

    return {
      originalPrice: inclusivePrice,
      netPrice,
      discountAmount,
      finalPrice
    }
  }

  /**
   * Generate VAT summary for receipt
   */
  generateVATSummary(breakdown: CartVATBreakdown): {
    lines: Array<{ label: string; amount: number; formatted: string }>
    hasVAT: boolean
    hasExempt: boolean
    hasZeroRated: boolean
  } {
    const lines: Array<{ label: string; amount: number; formatted: string }> = []

    const hasVAT = breakdown.vatableSales > 0
    const hasExempt = breakdown.vatExemptSales > 0
    const hasZeroRated = breakdown.zeroRatedSales > 0

    if (hasVAT) {
      lines.push({
        label: 'VATable Sales',
        amount: breakdown.vatableSales,
        formatted: this.formatCurrency(breakdown.vatableSales)
      })
      lines.push({
        label: `VAT (${this.vatRatePercent}%)`,
        amount: breakdown.vatAmount,
        formatted: this.formatCurrency(breakdown.vatAmount)
      })
    }

    if (hasExempt) {
      lines.push({
        label: 'VAT-Exempt Sales',
        amount: breakdown.vatExemptSales,
        formatted: this.formatCurrency(breakdown.vatExemptSales)
      })
    }

    if (hasZeroRated) {
      lines.push({
        label: 'Zero-Rated Sales',
        amount: breakdown.zeroRatedSales,
        formatted: this.formatCurrency(breakdown.zeroRatedSales)
      })
    }

    return {
      lines,
      hasVAT,
      hasExempt,
      hasZeroRated
    }
  }
}

export const vatService = new VATService()
export default vatService
