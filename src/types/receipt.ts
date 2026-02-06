// Receipt-related TypeScript type definitions

import type { TaxType } from './transaction'
import type { PaymentMethod } from './payment'

// Receipt types
export type ReceiptType = 'sale' | 'void' | 'refund'

// OR Series entity (database record)
export interface ORSeries {
  id: string
  terminal_id: string
  branch_id: string
  prefix: string
  branch_code: string
  start_number: number
  end_number: number
  current_number: number
  ptu_number: string
  ptu_valid_until: string
  machine_serial: string
  min_number: string
  is_active: number
  created_at: string
  updated_at: string
}

// OR Series input
export interface ORSeriesInput {
  terminal_id: string
  branch_id: string
  prefix: string
  branch_code: string
  start_number: number
  end_number: number
  current_number?: number
  ptu_number: string
  ptu_valid_until: string
  machine_serial: string
  min_number: string
  is_active?: boolean
}

// Display-friendly OR Series
export interface DisplayORSeries {
  id: string
  terminalId: string
  branchId: string
  prefix: string
  branchCode: string
  startNumber: number
  endNumber: number
  currentNumber: number
  ptuNumber: string
  ptuValidUntil: string
  machineSerial: string
  minNumber: string
  isActive: boolean
  usedCount: number
  remainingCount: number
  usagePercentage: number
  isLow: boolean         // > 80% used
  isExhausted: boolean   // 100% used
}

// Receipt line item
export interface ReceiptLineItem {
  productName: string
  variantName: string
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
  taxType: TaxType
  taxTypeLabel: string
}

// Receipt payment line
export interface ReceiptPayment {
  method: PaymentMethod
  methodLabel: string
  amount: number
  referenceNumber?: string
  tendered?: number
  change?: number
}

// Receipt VAT breakdown
export interface ReceiptVATBreakdown {
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
}

// Receipt discount info
export interface ReceiptDiscount {
  type: string
  typeLabel: string
  amount: number
  idNumber?: string
  idName?: string
}

// Business information for receipt header
export interface BusinessInfo {
  name: string
  address: string
  tin: string
  branchCode: string
  branchName?: string
  phoneNumber?: string
  email?: string
}

// Terminal information for receipt
export interface TerminalInfo {
  terminalId: string
  machineSerial: string
  ptuNumber: string
  ptuValidUntil: string
  minNumber: string
}

// Complete receipt data
export interface ReceiptData {
  // Header
  receiptType: ReceiptType
  orNumber: string
  transactionDate: string
  transactionTime: string
  cashierName: string
  terminalId: string

  // Business info
  business: BusinessInfo
  terminal: TerminalInfo

  // Line items
  items: ReceiptLineItem[]

  // Totals
  subtotal: number
  discount?: ReceiptDiscount
  vatBreakdown: ReceiptVATBreakdown
  totalAmount: number

  // Payments
  payments: ReceiptPayment[]

  // Footer
  customerName?: string
  customerTin?: string
  remarks?: string

  // For void/refund
  originalOrNumber?: string
  voidReason?: string
  refundReason?: string
  supervisorName?: string
}

// Receipt print options
export interface ReceiptPrintOptions {
  copies?: number
  showPreview?: boolean
  printerId?: string
  paperWidth?: number
}

// Receipt format (for different printer types)
export type ReceiptFormat = 'thermal' | 'a4' | 'letter'

// Helper to convert OR series to display format
export function toDisplayORSeries(series: ORSeries): DisplayORSeries {
  const usedCount = series.current_number - series.start_number + 1
  const totalCount = series.end_number - series.start_number + 1
  const remainingCount = series.end_number - series.current_number
  const usagePercentage = (usedCount / totalCount) * 100

  return {
    id: series.id,
    terminalId: series.terminal_id,
    branchId: series.branch_id,
    prefix: series.prefix,
    branchCode: series.branch_code,
    startNumber: series.start_number,
    endNumber: series.end_number,
    currentNumber: series.current_number,
    ptuNumber: series.ptu_number,
    ptuValidUntil: series.ptu_valid_until,
    machineSerial: series.machine_serial,
    minNumber: series.min_number,
    isActive: series.is_active === 1,
    usedCount,
    remainingCount,
    usagePercentage,
    isLow: usagePercentage >= 80,
    isExhausted: remainingCount <= 0
  }
}

// Format OR number with prefix and padding
export function formatORNumber(prefix: string, branchCode: string, number: number): string {
  const paddedNumber = number.toString().padStart(8, '0')
  return `${prefix}-${branchCode}-${paddedNumber}`
}

// Parse OR number to get components
export function parseORNumber(orNumber: string): { prefix: string; branchCode: string; number: number } | null {
  const parts = orNumber.split('-')
  if (parts.length < 3) return null

  const prefix = parts[0] ?? ''
  const branchCode = parts[1] ?? ''
  const number = parseInt(parts.slice(2).join(''), 10)

  if (isNaN(number) || !prefix || !branchCode) return null

  return { prefix, branchCode, number }
}
