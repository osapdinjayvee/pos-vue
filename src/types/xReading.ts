/**
 * X-Reading Type Definitions
 * Types for shift snapshot reports
 */

// =====================
// X-Reading Entity
// =====================

export interface XReading {
  id: string
  x_counter: number
  terminal_id: string
  branch_id: string
  shift_id: string
  cashier_id: string
  gross_sales: number
  discount_total: number
  net_sales: number
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales: number
  zero_rated_sales: number
  transaction_count: number
  void_count: number
  void_amount: number
  beginning_or: string
  ending_or: string
  generated_at: string
  synced_at: string | null
}

export interface XReadingInput {
  terminal_id: string
  shift_id: string
  cashier_id: string
}

export interface DisplayXReading {
  id: string
  xCounter: number
  terminalId: string
  branchId: string
  shiftId: string
  cashierId: string
  cashierName: string
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  transactionCount: number
  voidCount: number
  voidAmount: number
  beginningOR: string
  endingOR: string
  generatedAt: string
  formattedDate: string
  formattedTime: string
  syncStatus: 'synced' | 'pending' | 'offline'
}

// =====================
// X-Counter Entity
// =====================

export interface XCounter {
  terminal_id: string
  current_value: number
  updated_at: string
}

// =====================
// X-Reading Calculation Result
// =====================

export interface XReadingCalculation {
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  transactionCount: number
  voidCount: number
  voidAmount: number
  beginningOR: string
  endingOR: string
}

// =====================
// Helper Functions
// =====================

export function toDisplayXReading(
  xReading: XReading,
  cashierName: string = ''
): DisplayXReading {
  const generatedDate = new Date(xReading.generated_at)

  return {
    id: xReading.id,
    xCounter: xReading.x_counter,
    terminalId: xReading.terminal_id,
    branchId: xReading.branch_id,
    shiftId: xReading.shift_id,
    cashierId: xReading.cashier_id,
    cashierName,
    grossSales: xReading.gross_sales,
    discountTotal: xReading.discount_total,
    netSales: xReading.net_sales,
    vatableSales: xReading.vatable_sales,
    vatAmount: xReading.vat_amount,
    vatExemptSales: xReading.vat_exempt_sales,
    zeroRatedSales: xReading.zero_rated_sales,
    transactionCount: xReading.transaction_count,
    voidCount: xReading.void_count,
    voidAmount: xReading.void_amount,
    beginningOR: xReading.beginning_or,
    endingOR: xReading.ending_or,
    generatedAt: xReading.generated_at,
    formattedDate: generatedDate.toLocaleDateString('en-PH', { dateStyle: 'medium' }),
    formattedTime: generatedDate.toLocaleTimeString('en-PH', { timeStyle: 'short' }),
    syncStatus: xReading.synced_at ? 'synced' : 'pending'
  }
}
