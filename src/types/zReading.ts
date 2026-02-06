/**
 * Z-Reading Type Definitions
 * Types for end-of-day BIR-compliant reports
 */

// =====================
// Z-Reading Entity
// =====================

export interface ZReading {
  id: string
  z_counter: number
  terminal_id: string
  branch_id: string
  date: string
  beginning_or: string
  ending_or: string
  beginning_balance: number
  gross_sales: number
  discount_total: number
  net_sales: number
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales: number
  zero_rated_sales: number
  void_count: number
  void_amount: number
  refund_count: number
  refund_amount: number
  transaction_count: number
  sc_discount_count: number
  pwd_discount_count: number
  generated_by: string
  generated_at: string
  synced_at: string | null
}

export interface ZReadingInput {
  terminal_id: string
  supervisor_id: string
  force_duplicate?: boolean
}

export interface DisplayZReading {
  id: string
  zCounter: number
  terminalId: string
  branchId: string
  date: string
  formattedDate: string
  beginningOR: string
  endingOR: string
  beginningBalance: number
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  voidCount: number
  voidAmount: number
  refundCount: number
  refundAmount: number
  transactionCount: number
  scDiscountCount: number
  pwdDiscountCount: number
  generatedBy: string
  generatedByName: string
  generatedAt: string
  formattedGeneratedAt: string
  syncStatus: 'synced' | 'pending' | 'offline'
}

// =====================
// Z-Counter Entity
// =====================

export interface ZCounter {
  terminal_id: string
  current_value: number
  last_z_date: string | null
  updated_at: string
}

// =====================
// Z-Reading Calculation Result
// =====================

export interface ZReadingCalculation {
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  voidCount: number
  voidAmount: number
  refundCount: number
  refundAmount: number
  transactionCount: number
  scDiscountCount: number
  pwdDiscountCount: number
  beginningOR: string
  endingOR: string
  beginningBalance: number
}

// =====================
// Z-Reading Generation Result
// =====================

export interface ZReadingGenerationResult {
  success: boolean
  zReading?: DisplayZReading
  error?: string
  isDuplicate?: boolean
}

// =====================
// Helper Functions
// =====================

export function toDisplayZReading(
  zReading: ZReading,
  generatedByName: string = ''
): DisplayZReading {
  const date = new Date(zReading.date)
  const generatedAt = new Date(zReading.generated_at)

  return {
    id: zReading.id,
    zCounter: zReading.z_counter,
    terminalId: zReading.terminal_id,
    branchId: zReading.branch_id,
    date: zReading.date,
    formattedDate: date.toLocaleDateString('en-PH', { dateStyle: 'long' }),
    beginningOR: zReading.beginning_or,
    endingOR: zReading.ending_or,
    beginningBalance: zReading.beginning_balance,
    grossSales: zReading.gross_sales,
    discountTotal: zReading.discount_total,
    netSales: zReading.net_sales,
    vatableSales: zReading.vatable_sales,
    vatAmount: zReading.vat_amount,
    vatExemptSales: zReading.vat_exempt_sales,
    zeroRatedSales: zReading.zero_rated_sales,
    voidCount: zReading.void_count,
    voidAmount: zReading.void_amount,
    refundCount: zReading.refund_count,
    refundAmount: zReading.refund_amount,
    transactionCount: zReading.transaction_count,
    scDiscountCount: zReading.sc_discount_count,
    pwdDiscountCount: zReading.pwd_discount_count,
    generatedBy: zReading.generated_by,
    generatedByName,
    generatedAt: zReading.generated_at,
    formattedGeneratedAt: generatedAt.toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    syncStatus: zReading.synced_at ? 'synced' : 'pending'
  }
}

// =====================
// BIR Compliance Labels
// =====================

export const ZReadingLabels = {
  zCounter: 'Z-Counter',
  terminalId: 'Terminal ID',
  date: 'Business Date',
  beginningOR: 'Beginning OR No.',
  endingOR: 'Ending OR No.',
  grossSales: 'Gross Sales',
  discountTotal: 'Less: Discounts',
  netSales: 'Net Sales',
  vatableSales: 'VATable Sales',
  vatAmount: 'VAT Amount (12%)',
  vatExemptSales: 'VAT-Exempt Sales',
  zeroRatedSales: 'Zero-Rated Sales',
  voidCount: 'Void Count',
  voidAmount: 'Void Amount',
  refundCount: 'Refund Count',
  refundAmount: 'Refund Amount',
  transactionCount: 'Transaction Count',
  scDiscountCount: 'SC Discount Count',
  pwdDiscountCount: 'PWD Discount Count'
} as const
