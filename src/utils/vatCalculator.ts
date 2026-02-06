// VAT Calculator utility for Philippine BIR compliance
// VAT rate: 12% (current Philippine standard)
// Prices are VAT-inclusive

import type { TaxType } from '@/types/transaction'

// VAT rate constant (12%)
export const VAT_RATE = 0.12

// VAT multiplier for extracting VAT from inclusive price (12/112)
export const VAT_MULTIPLIER = VAT_RATE / (1 + VAT_RATE)

// Divisor for extracting net amount from inclusive price (1.12)
export const VAT_DIVISOR = 1 + VAT_RATE

/**
 * Extract VAT amount from a VAT-inclusive price
 * Formula: VAT = Price * (12/112)
 */
export function extractVAT(inclusivePrice: number): number {
  return round2(inclusivePrice * VAT_MULTIPLIER)
}

/**
 * Extract net amount (VATable sales) from a VAT-inclusive price
 * Formula: Net = Price / 1.12
 */
export function extractNetAmount(inclusivePrice: number): number {
  return round2(inclusivePrice / VAT_DIVISOR)
}

/**
 * Add VAT to a net amount
 * Formula: Inclusive = Net * 1.12
 */
export function addVAT(netAmount: number): number {
  return round2(netAmount * VAT_DIVISOR)
}

/**
 * Calculate VAT from net amount
 * Formula: VAT = Net * 0.12
 */
export function calculateVAT(netAmount: number): number {
  return round2(netAmount * VAT_RATE)
}

/**
 * Round to 2 decimal places (standard for currency)
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * VAT calculation result for a single item
 */
export interface ItemVATResult {
  grossAmount: number       // Original VAT-inclusive price * quantity
  netAmount: number         // VATable sales (excl. VAT) or full amount for exempt/zero-rated
  vatAmount: number         // VAT amount (0 for exempt/zero-rated)
  vatableSales: number      // Amount subject to VAT
  vatExemptSales: number    // VAT-exempt amount
  zeroRatedSales: number    // Zero-rated amount
}

/**
 * Calculate VAT breakdown for a single line item
 */
export function calculateItemVAT(
  unitPrice: number,
  quantity: number,
  taxType: TaxType,
  lineDiscount: number = 0
): ItemVATResult {
  const grossAmount = round2(unitPrice * quantity - lineDiscount)

  if (taxType === 'vatable') {
    // For VATable items, price is VAT-inclusive
    const netAmount = extractNetAmount(grossAmount)
    const vatAmount = extractVAT(grossAmount)

    return {
      grossAmount,
      netAmount: grossAmount,
      vatAmount,
      vatableSales: netAmount,
      vatExemptSales: 0,
      zeroRatedSales: 0
    }
  } else if (taxType === 'exempt') {
    // VAT-exempt items have no VAT
    return {
      grossAmount,
      netAmount: grossAmount,
      vatAmount: 0,
      vatableSales: 0,
      vatExemptSales: grossAmount,
      zeroRatedSales: 0
    }
  } else {
    // Zero-rated items have no VAT
    return {
      grossAmount,
      netAmount: grossAmount,
      vatAmount: 0,
      vatableSales: 0,
      vatExemptSales: 0,
      zeroRatedSales: grossAmount
    }
  }
}

/**
 * VAT breakdown for entire cart/transaction
 */
export interface CartVATBreakdown {
  subtotal: number          // Sum of all line totals (VAT-inclusive for VATable)
  vatableSales: number      // Net VATable sales (excl. VAT)
  vatAmount: number         // Total VAT
  vatExemptSales: number    // Total VAT-exempt sales
  zeroRatedSales: number    // Total zero-rated sales
  totalSales: number        // Grand total (subtotal after any adjustments)
}

/**
 * Calculate VAT breakdown for multiple items
 */
export function calculateCartVAT(
  items: Array<{
    unitPrice: number
    quantity: number
    taxType: TaxType
    lineDiscount?: number
  }>
): CartVATBreakdown {
  let subtotal = 0
  let vatableSales = 0
  let vatAmount = 0
  let vatExemptSales = 0
  let zeroRatedSales = 0

  for (const item of items) {
    const result = calculateItemVAT(
      item.unitPrice,
      item.quantity,
      item.taxType,
      item.lineDiscount || 0
    )

    subtotal += result.grossAmount
    vatableSales += result.vatableSales
    vatAmount += result.vatAmount
    vatExemptSales += result.vatExemptSales
    zeroRatedSales += result.zeroRatedSales
  }

  return {
    subtotal: round2(subtotal),
    vatableSales: round2(vatableSales),
    vatAmount: round2(vatAmount),
    vatExemptSales: round2(vatExemptSales),
    zeroRatedSales: round2(zeroRatedSales),
    totalSales: round2(subtotal)
  }
}

/**
 * Apply senior citizen/PWD discount
 * - 20% discount on applicable items
 * - Discounted items become VAT-exempt
 * - Only applies to VATable items (per BIR rules)
 */
export function applySeniorPWDDiscount(
  items: Array<{
    unitPrice: number
    quantity: number
    taxType: TaxType
    lineDiscount?: number
  }>,
  discountRate: number = 0.20
): {
  originalTotal: number
  discountAmount: number
  newVATBreakdown: CartVATBreakdown
} {
  // Calculate original totals
  const originalBreakdown = calculateCartVAT(items)
  const originalTotal = originalBreakdown.subtotal

  // SC/PWD discount applies to VATable items only
  // These items become VAT-exempt after discount
  let discountAmount = 0
  let newVatableSales = 0
  let newVatAmount = 0
  let newVatExemptSales = originalBreakdown.vatExemptSales
  const newZeroRatedSales = originalBreakdown.zeroRatedSales
  let newSubtotal = 0

  for (const item of items) {
    const lineTotal = round2(item.unitPrice * item.quantity - (item.lineDiscount || 0))

    if (item.taxType === 'vatable') {
      // Apply discount to VATable items
      const itemDiscount = round2(lineTotal * discountRate)
      discountAmount += itemDiscount

      // Discounted amount becomes VAT-exempt
      const discountedAmount = round2(lineTotal - itemDiscount)
      newVatExemptSales += discountedAmount
      newSubtotal += discountedAmount
    } else {
      // Non-VATable items not affected
      newSubtotal += lineTotal
      if (item.taxType === 'exempt') {
        // Already counted in newVatExemptSales initialization
      }
    }
  }

  return {
    originalTotal,
    discountAmount: round2(discountAmount),
    newVATBreakdown: {
      subtotal: round2(newSubtotal),
      vatableSales: round2(newVatableSales),
      vatAmount: round2(newVatAmount),
      vatExemptSales: round2(newVatExemptSales),
      zeroRatedSales: round2(newZeroRatedSales),
      totalSales: round2(newSubtotal)
    }
  }
}

/**
 * Format currency for display (Philippine Peso)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format VAT breakdown for receipt display
 */
export function formatVATBreakdown(breakdown: CartVATBreakdown): string[] {
  const lines: string[] = []

  if (breakdown.vatableSales > 0) {
    lines.push(`VATable Sales: ${formatCurrency(breakdown.vatableSales)}`)
    lines.push(`VAT (12%): ${formatCurrency(breakdown.vatAmount)}`)
  }

  if (breakdown.vatExemptSales > 0) {
    lines.push(`VAT-Exempt Sales: ${formatCurrency(breakdown.vatExemptSales)}`)
  }

  if (breakdown.zeroRatedSales > 0) {
    lines.push(`Zero-Rated Sales: ${formatCurrency(breakdown.zeroRatedSales)}`)
  }

  return lines
}
