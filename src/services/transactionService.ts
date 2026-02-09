// Transaction Service - Business logic for sales transactions
import { transactionRepository } from '@/repositories/transactionRepository'
import { transactionItemRepository } from '@/repositories/transactionItemRepository'
import { paymentRepository } from '@/repositories/paymentRepository'
import { orSeriesRepository } from '@/repositories/orSeriesRepository'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import { calculateCartVAT } from '@/utils/vatCalculator'
import { vatService } from '@/services/vatService'
import type {
  Transaction,
  TransactionInput,
  TransactionItem,
  TransactionItemInput,
  CartItem,
  CartTotals,
  TaxType
} from '@/types/transaction'
import type { PaymentInput, PaymentEntry } from '@/types/payment'
import type { DiscountType } from '@/types/discount'
import { transactionSyncService } from '@/services/transactionSyncService'
import { loyaltyService } from '@/services/loyaltyService'
import { loyaltyTransactionRepository } from '@/repositories/loyaltyTransactionRepository'
import { customerService } from '@/services/customerService'

// Discount data for transaction creation (compatible with CartDiscount)
export interface TransactionDiscount {
  type: DiscountType | 'percentage' | 'fixed_amount'
  amount: number
  percentage?: number
  code?: string
  idNumber?: string
  idName?: string
}

export interface CreateTransactionData {
  branchId: string
  terminalId: string
  userId: string
  shiftId?: string
  customerId?: string
  items: CartItem[]
  payments: PaymentEntry[]
  discount?: TransactionDiscount
  notes?: string
}

export interface TransactionResult {
  success: boolean
  transaction?: Transaction
  items?: TransactionItem[]
  orNumber?: string
  error?: string
  warning?: string
}

class TransactionService {
  /**
   * Create a complete transaction with items and payments
   */
  async createTransaction(data: CreateTransactionData): Promise<TransactionResult> {
    try {
      // 1. Get next OR number
      const orResult = await orSeriesRepository.getNextORNumber(data.branchId, data.terminalId)
      if (!orResult) {
        return {
          success: false,
          error: 'No active OR series found. Please configure an OR series for this branch/terminal.'
        }
      }

      // 2. Calculate totals with VAT breakdown
      const cartItems = data.items.map(item => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxType: item.taxType,
        lineDiscount: item.discount || 0
      }))

      let totals = calculateCartVAT(cartItems)
      let discountTotal = 0
      let discountType: string | undefined
      let discountIdNumber: string | undefined
      let discountIdName: string | undefined

      // 3. Apply discount if any
      if (data.discount) {
        discountType = data.discount.type
        discountIdNumber = data.discount.idNumber
        discountIdName = data.discount.idName

        if (data.discount.type === 'senior_citizen' || data.discount.type === 'pwd') {
          // SC/PWD discount: rate from settings, becomes VAT-exempt
          const discountResult = vatService.applySeniorPWDDiscount(cartItems, data.discount.type)
          discountTotal = discountResult.discountAmount
          totals = discountResult.newVATBreakdown
        } else {
          // Regular discount
          discountTotal = data.discount.amount
        }
      }

      const totalAmount = totals.subtotal - discountTotal

      // 4. Validate payment total
      const paymentTotal = data.payments.reduce((sum, p) => sum + p.amount, 0)
      if (paymentTotal < totalAmount) {
        return {
          success: false,
          error: `Payment insufficient. Required: ${totalAmount}, Received: ${paymentTotal}`
        }
      }

      // 5. Create transaction record
      const transactionInput: TransactionInput = {
        or_number: orResult.orNumber,
        shift_id: data.shiftId,
        user_id: data.userId,
        terminal_id: data.terminalId,
        branch_id: data.branchId,
        customer_id: data.customerId,
        subtotal: totals.subtotal,
        discount_total: discountTotal,
        vatable_sales: totals.vatableSales,
        vat_amount: totals.vatAmount,
        vat_exempt_sales: totals.vatExemptSales,
        zero_rated_sales: totals.zeroRatedSales,
        total_amount: totalAmount,
        discount_type: discountType,
        discount_id_number: discountIdNumber,
        discount_id_name: discountIdName,
        status: 'completed',
        notes: data.notes
      }

      const transaction = await transactionRepository.createTransaction(transactionInput)

      // 6. Create transaction items
      const itemInputs: TransactionItemInput[] = data.items.map(item => {
        const itemVAT = calculateCartVAT([{
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          taxType: item.taxType,
          lineDiscount: item.discount || 0
        }])

        return {
          transaction_id: transaction.id,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.productName,
          variant_name: item.variantName,
          sku: item.sku,
          barcode: item.barcode,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          discount: item.discount || 0,
          discount_name: item.discountName || null,
          discount_id: item.discountId || null,
          tax_type: item.taxType,
          vatable_sales: itemVAT.vatableSales,
          vat_amount: itemVAT.vatAmount,
          vat_exempt_sales: itemVAT.vatExemptSales,
          zero_rated_sales: itemVAT.zeroRatedSales
        }
      })

      const items = await transactionItemRepository.createItems(itemInputs)

      // 7. Create payments
      const paymentInputs: PaymentInput[] = data.payments.map(p => ({
        transaction_id: transaction.id,
        method: p.method,
        amount: p.amount,
        tendered: p.tendered,
        change_amount: p.changeAmount,
        reference_number: p.referenceNumber,
        card_type: p.cardType,
        card_last_four: p.cardLastFour
      }))

      await paymentRepository.createTransactionPayments(paymentInputs)

      // 7b. Process loyalty points redemption if points payment is included
      const pointsPayment = data.payments.find(p => p.method === 'points')
      if (pointsPayment && data.customerId) {
        try {
          // Parse points from reference (format: "500 pts")
          const ptsMatch = pointsPayment.referenceNumber?.match(/^(\d+)\s*pts?$/i)
          const redeemedPoints = ptsMatch ? parseInt(ptsMatch[1], 10) : 0
          if (redeemedPoints > 0) {
            await loyaltyService.redeemPoints(data.customerId, redeemedPoints, transaction.id)
          }
        } catch (e) {
          console.error('[TransactionService] Loyalty points redemption failed:', e)
        }
      }

      // 8. Create stock movements (deduct inventory)
      for (const item of data.items) {
        // Only create stock movement if variantId is provided
        if (item.variantId) {
          await stockMovementRepository.recordSale(
            item.variantId,
            item.quantity,
            data.userId,
            data.terminalId,
            data.branchId,
            {
              referenceId: transaction.id,
              unitCost: item.unitPrice
            }
          )
        }
      }

      // 9. Loyalty points earning (non-blocking - don't fail transaction if loyalty fails)
      if (data.customerId && totalAmount > 0) {
        try {
          await loyaltyService.earnPoints(data.customerId, transaction.id, totalAmount)
          await customerService.updateLifetimeSpend(data.customerId, totalAmount)
        } catch (e) {
          console.error('[TransactionService] Loyalty points earning failed:', e)
        }
      }

      // 10. Enqueue for cloud sync (non-blocking)
      transactionSyncService.enqueueTransaction(transaction.id, 'create').catch((e) =>
        console.error('[TransactionService] Sync enqueue failed:', e)
      )

      // 11. Trigger analytics aggregation for today (non-blocking, idempotent)
      import('@/services/analyticsAggregationService').then(({ analyticsAggregationService }) => {
        const today = new Date().toISOString().split('T')[0]
        analyticsAggregationService.aggregateAll(today).catch((e) =>
          console.error('[TransactionService] Analytics aggregation failed:', e)
        )
      }).catch(() => { /* module not available yet */ })

      // 12. Enqueue for EIS submission (non-blocking)
      import('@/services/eisService').then(({ eisService }) => {
        eisService.enqueueTransaction(transaction.id).catch((e) =>
          console.error('[TransactionService] EIS enqueue failed:', e)
        )
      }).catch(() => { /* module not available yet */ })

      return {
        success: true,
        transaction,
        items,
        orNumber: orResult.orNumber,
        warning: orResult.warning
      }
    } catch (error) {
      console.error('Transaction creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating transaction'
      }
    }
  }

  /**
   * Get transaction with items and payments
   */
  async getTransactionDetails(transactionId: string): Promise<{
    transaction: Transaction | null
    items: TransactionItem[]
    payments: any[]
  }> {
    const transaction = await transactionRepository.findById(transactionId)
    if (!transaction) {
      return { transaction: null, items: [], payments: [] }
    }

    const items = await transactionItemRepository.findByTransaction(transactionId)
    const payments = await paymentRepository.findByTransaction(transactionId)

    return { transaction, items, payments }
  }

  /**
   * Void a transaction
   */
  async voidTransaction(
    transactionId: string,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transaction = await transactionRepository.findById(transactionId)
      if (!transaction) {
        return { success: false, error: 'Transaction not found' }
      }

      if (transaction.status === 'voided') {
        return { success: false, error: 'Transaction is already voided' }
      }

      // Update transaction status
      await transactionRepository.updateStatus(transactionId, 'voided')

      // Restore stock for all items
      const items = await transactionItemRepository.findByTransaction(transactionId)
      for (const item of items) {
        // Only restore stock if variantId is provided
        if (item.variant_id) {
          await stockMovementRepository.recordVoid(
            item.variant_id,
            item.quantity,
            supervisorId, // Use supervisor's ID for void action
            transaction.terminal_id,
            transaction.branch_id,
            transactionId
          )
        }
      }

      // Reverse loyalty points if customer was attached
      if (transaction.customer_id) {
        try {
          // Reverse earned points
          const loyaltyTx = await loyaltyService.getTransactionLoyalty(transactionId)
          if (loyaltyTx) {
            await loyaltyService.adjustPoints(
              transaction.customer_id,
              -loyaltyTx.points,
              `Void: OR#${transaction.or_number}`,
              transactionId
            )
            await customerService.deductLifetimeSpend(transaction.customer_id, transaction.total_amount)
          }

          // Restore redeemed points (redeem transactions have negative points)
          const allLoyaltyTxs = await loyaltyTransactionRepository.findByTransaction(transactionId)
          const redeemTx = allLoyaltyTxs.find(t => t.type === 'redeem')
          if (redeemTx) {
            // redeemTx.points is negative, so negate to restore
            await loyaltyService.adjustPoints(
              transaction.customer_id,
              -redeemTx.points,
              `Void refund: OR#${transaction.or_number}`,
              transactionId
            )
          }
        } catch (e) {
          console.error('[TransactionService] Loyalty points reversal failed:', e)
        }
      }

      // Enqueue void for cloud sync (non-blocking)
      transactionSyncService.enqueueVoid(transactionId).catch((e) =>
        console.error('[TransactionService] Void sync enqueue failed:', e)
      )

      // Enqueue void for EIS submission (non-blocking)
      import('@/services/eisService').then(({ eisService }) => {
        eisService.enqueueVoid(transactionId).catch((e) =>
          console.error('[TransactionService] EIS void enqueue failed:', e)
        )
      }).catch(() => { /* module not available yet */ })

      return { success: true }
    } catch (error) {
      console.error('Void transaction failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error voiding transaction'
      }
    }
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return await transactionRepository.findByDateRange(startDate, endDate)
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(date: string): Promise<{
    totalTransactions: number
    totalAmount: number
    totalVAT: number
    voidedCount: number
    voidedAmount: number
  }> {
    return await transactionRepository.getDailySummary(date)
  }

  /**
   * Get unsynced transactions for offline sync
   */
  async getUnsyncedTransactions(): Promise<Transaction[]> {
    return await transactionRepository.findUnsynced()
  }

  /**
   * Mark transactions as synced
   */
  async markTransactionsSynced(ids: string[]): Promise<void> {
    await transactionRepository.markMultipleSynced(ids)
  }

  /**
   * Calculate cart totals (for preview before transaction)
   */
  calculateCartTotals(
    items: CartItem[],
    discount?: TransactionDiscount
  ): CartTotals {
    const cartItems = items.map(item => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxType: item.taxType,
      lineDiscount: item.discount || 0
    }))

    let vatBreakdown = calculateCartVAT(cartItems)
    let discountAmount = 0

    if (discount) {
      if (discount.type === 'senior_citizen' || discount.type === 'pwd') {
        const discountResult = vatService.applySeniorPWDDiscount(cartItems, discount.type)
        discountAmount = discountResult.discountAmount
        vatBreakdown = discountResult.newVATBreakdown
      } else {
        discountAmount = discount.amount
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const grandTotal = vatBreakdown.subtotal - discountAmount

    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discountTotal: discountAmount,
      vatableSales: vatBreakdown.vatableSales,
      vatAmount: vatBreakdown.vatAmount,
      vatExemptSales: vatBreakdown.vatExemptSales,
      zeroRatedSales: vatBreakdown.zeroRatedSales,
      grandTotal
    }
  }

  /**
   * Search transactions
   */
  async searchTransactions(query: string): Promise<Transaction[]> {
    return await transactionRepository.search(query)
  }

  /**
   * Get transaction by OR number
   */
  async getTransactionByORNumber(orNumber: string): Promise<Transaction | null> {
    return await transactionRepository.findByORNumber(orNumber)
  }
}

export const transactionService = new TransactionService()
export default transactionService
