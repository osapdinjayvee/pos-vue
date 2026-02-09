// Payment-related TypeScript type definitions

// Payment methods
export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'other_ewallet' | 'points' | 'grab_pay' | 'bank_transfer' | 'check'

// Refund methods (includes store_credit)
export type RefundMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'store_credit'

// Card types
export type CardType = 'visa' | 'mastercard' | 'amex' | 'jcb' | 'unionpay' | 'other'

// Payment entity (database record)
export interface Payment {
  id: string
  transaction_id: string
  method: PaymentMethod
  amount: number
  tendered: number | null
  change_amount: number | null
  reference_number: string | null
  card_last_four: string | null
  card_type: string | null
  created_at: string
}

// Payment input for creating new payments
export interface PaymentInput {
  transaction_id: string
  method: PaymentMethod
  amount: number
  tendered?: number
  change_amount?: number
  reference_number?: string
  card_last_four?: string
  card_type?: string
  last_four_digits?: string
  approval_code?: string
}

// Display-friendly payment
export interface DisplayPayment {
  id: string
  transactionId: string
  method: PaymentMethod
  methodLabel: string
  amount: number
  tendered: number | null
  changeAmount: number | null
  referenceNumber: string | null
  cardLastFour: string | null
  cardType: string | null
  createdAt: string
}

// Payment entry during checkout (before saving)
export interface PaymentEntry {
  method: PaymentMethod
  amount: number
  tendered?: number
  changeAmount?: number
  referenceNumber?: string
  cardLastFour?: string
  cardType?: CardType | string
}

// Payment summary for checkout
export interface PaymentSummary {
  totalDue: number
  totalPaid: number
  totalChange: number
  remainingBalance: number
  isFullyPaid: boolean
  payments: PaymentEntry[]
}

// Cash payment details
export interface CashPaymentDetails {
  tendered: number
  change: number
}

// Card payment details
export interface CardPaymentDetails {
  cardType: CardType | string
  lastFourDigits: string
  referenceNumber?: string
}

// E-wallet payment details
export interface EWalletPaymentDetails {
  provider: 'gcash' | 'maya' | 'other_ewallet'
  referenceNumber: string
}

// Payment method labels
export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  other_ewallet: 'E-Wallet',
  points: 'Loyalty Points',
  grab_pay: 'GrabPay',
  bank_transfer: 'Bank Transfer',
  check: 'Check'
}

// Refund method labels
export const RefundMethodLabels: Record<RefundMethod, string> = {
  cash: 'Cash',
  card: 'Card Refund',
  gcash: 'GCash',
  maya: 'Maya',
  store_credit: 'Store Credit'
}

// Card type labels
export const CardTypeLabels: Record<CardType, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  other: 'Other'
}

// Helper to convert DB payment to display format
export function toDisplayPayment(payment: Payment): DisplayPayment {
  return {
    id: payment.id,
    transactionId: payment.transaction_id,
    method: payment.method,
    methodLabel: PaymentMethodLabels[payment.method],
    amount: payment.amount,
    tendered: payment.tendered,
    changeAmount: payment.change_amount,
    referenceNumber: payment.reference_number,
    cardLastFour: payment.card_last_four,
    cardType: payment.card_type,
    createdAt: payment.created_at
  }
}

// Calculate change for cash payment
export function calculateChange(tendered: number, amount: number): number {
  return Math.max(0, tendered - amount)
}

// Validate payment amount
export function validatePaymentAmount(amount: number, remaining: number): boolean {
  return amount > 0 && amount <= remaining
}

// Check if payments cover total
export function isFullyPaid(payments: PaymentEntry[], totalDue: number): boolean {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  return totalPaid >= totalDue
}
