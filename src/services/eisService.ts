/**
 * EIS Service
 * Core service for building EIS payloads and enqueuing submissions
 */

import db from '@/db/database'
import { eisConfigRepository } from '@/repositories/eisConfigRepository'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import type { Transaction, TransactionItem } from '@/types/transaction'
import type { EISPayload, EISLineItem, EISSubmission } from '@/types/eis'

/**
 * Build an EIS payload from transaction data
 */
async function buildPayload(
  transaction: Transaction,
  items: TransactionItem[],
  transactionType: 'sale' | 'void' | 'refund' = 'sale'
): Promise<EISPayload> {
  const config = await eisConfigRepository.getConfig()

  // Get BIR settings — use EIS config values, fallback to business settings
  const tin = config?.tin || ''
  const branchCode = config?.branch_code || ''

  // Get terminal info for machine_id and ptu_number
  const orSeries = await db.getOne<{ machine_serial: string; ptu_number: string }>(
    `SELECT machine_serial, ptu_number FROM or_series WHERE is_active = 1 LIMIT 1`
  )

  const lineItems: EISLineItem[] = items.map((item) => ({
    description: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.line_total,
    vat_amount: item.vat_amount,
    tax_type: item.tax_type
  }))

  // Determine payment method from transaction payments
  const payment = await db.getOne<{ method: string }>(
    `SELECT method FROM payments WHERE transaction_id = ? LIMIT 1`,
    [transaction.id]
  )

  const netSales = transaction.total_amount - transaction.vat_amount

  return {
    tin,
    branch_code: branchCode,
    or_number: transaction.or_number,
    or_date: transaction.created_at,
    gross_sales: transaction.total_amount,
    vat_amount: transaction.vat_amount,
    vatable_sales: transaction.vatable_sales,
    vat_exempt_sales: transaction.vat_exempt_sales,
    zero_rated_sales: transaction.zero_rated_sales,
    net_sales: netSales,
    discount_amount: transaction.discount_total,
    items: lineItems,
    machine_id: orSeries?.machine_serial || '',
    ptu_number: orSeries?.ptu_number || '',
    payment_method: payment?.method || 'cash',
    transaction_type: transactionType
  }
}

/**
 * Enqueue a transaction for EIS submission
 */
async function enqueueTransaction(transactionId: string): Promise<EISSubmission | null> {
  const enabled = await eisConfigRepository.isEnabled()
  if (!enabled) return null

  // Check if already enqueued
  const existing = await eisSubmissionRepository.findByTransactionId(transactionId)
  if (existing) return existing

  // Get transaction and items
  const transaction = await db.getOne<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  )
  if (!transaction) {
    console.error(`[EISService] Transaction ${transactionId} not found`)
    return null
  }

  // Check EIS enable date boundary — don't submit historical transactions
  const config = await eisConfigRepository.getConfig()
  if (config && transaction.created_at < config.created_at) {
    return null
  }

  const items = await db.query<TransactionItem>(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [transactionId]
  )

  const payload = await buildPayload(transaction, items, 'sale')

  return await eisSubmissionRepository.create({
    transaction_id: transactionId,
    or_number: transaction.or_number,
    payload: JSON.stringify(payload),
    status: 'pending'
  })
}

/**
 * Enqueue a void transaction for EIS submission
 */
async function enqueueVoid(transactionId: string): Promise<EISSubmission | null> {
  const enabled = await eisConfigRepository.isEnabled()
  if (!enabled) return null

  const transaction = await db.getOne<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  )
  if (!transaction) return null

  const items = await db.query<TransactionItem>(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [transactionId]
  )

  const payload = await buildPayload(transaction, items, 'void')

  return await eisSubmissionRepository.create({
    transaction_id: transactionId,
    or_number: transaction.or_number,
    payload: JSON.stringify(payload),
    status: 'pending'
  })
}

/**
 * Enqueue a refund transaction for EIS submission
 */
async function enqueueRefund(transactionId: string): Promise<EISSubmission | null> {
  const enabled = await eisConfigRepository.isEnabled()
  if (!enabled) return null

  const transaction = await db.getOne<Transaction>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  )
  if (!transaction) return null

  const items = await db.query<TransactionItem>(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [transactionId]
  )

  const payload = await buildPayload(transaction, items, 'refund')

  return await eisSubmissionRepository.create({
    transaction_id: transactionId,
    or_number: transaction.or_number,
    payload: JSON.stringify(payload),
    status: 'pending'
  })
}

/**
 * Check if EIS is enabled
 */
async function isEnabled(): Promise<boolean> {
  return await eisConfigRepository.isEnabled()
}

/**
 * Get submission status for a transaction
 */
async function getSubmissionForTransaction(transactionId: string): Promise<EISSubmission | null> {
  return await eisSubmissionRepository.findByTransactionId(transactionId)
}

export const eisService = {
  buildPayload,
  enqueueTransaction,
  enqueueVoid,
  enqueueRefund,
  isEnabled,
  getSubmissionForTransaction
}

export default eisService
