// Transaction Store - State management for POS transactions
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transactionService } from '@/services/transactionService'
import { receiptService } from '@/services/receiptService'
import { useCartStore } from './cart'
import { useAuthStore } from './auth'
import type { Transaction, TransactionItem } from '@/types/transaction'
import type { PaymentEntry } from '@/types/payment'
import type { TransactionDiscount } from '@/services/transactionService'

export interface TransactionState {
  isProcessing: boolean
  currentTransaction: Transaction | null
  currentTransactionItems: TransactionItem[]
  lastCompletedTransaction: Transaction | null
  lastORNumber: string | null
  lastWarning: string | null
  recentTransactions: Transaction[]
  error: string | null
}

export const useTransactionStore = defineStore('transaction', () => {
  // State
  const isProcessing = ref(false)
  const currentTransaction = ref<Transaction | null>(null)
  const currentTransactionItems = ref<TransactionItem[]>([])
  const lastCompletedTransaction = ref<Transaction | null>(null)
  const lastORNumber = ref<string | null>(null)
  const lastWarning = ref<string | null>(null)
  const recentTransactions = ref<Transaction[]>([])
  const error = ref<string | null>(null)

  // Terminal configuration — synced from auth store, overridable via setTerminalConfig
  const branchId = ref('branch_main')
  const terminalId = computed(() => {
    const authStore = useAuthStore()
    return authStore.terminalId || 'POS-001'
  })
  const userId = computed(() => {
    const authStore = useAuthStore()
    return authStore.currentUser?.id || 'user_001'
  })
  const shiftId = ref<string | null>(null)
  const cashierName = computed(() => {
    const authStore = useAuthStore()
    return authStore.currentUser?.firstName || 'Cashier'
  })

  // Getters
  const hasCurrentTransaction = computed(() => currentTransaction.value !== null)
  const hasError = computed(() => error.value !== null)
  const hasWarning = computed(() => lastWarning.value !== null)

  // Actions
  async function processTransaction(
    payments: PaymentEntry[]
  ): Promise<{ success: boolean; orNumber?: string; error?: string; warning?: string }> {
    const cartStore = useCartStore()

    if (cartStore.isEmpty) {
      return { success: false, error: 'Cart is empty' }
    }

    isProcessing.value = true
    error.value = null
    lastWarning.value = null

    try {
      const cartData = cartStore.getCartData()

      const result = await transactionService.createTransaction({
        branchId: branchId.value,
        terminalId: terminalId.value,
        userId: userId.value,
        shiftId: shiftId.value || undefined,
        customerId: cartData.customerId || undefined,
        items: cartData.items,
        payments,
        discount: cartData.discount || undefined,
        notes: cartData.notes || undefined
      })

      if (result.success && result.transaction) {
        currentTransaction.value = result.transaction
        currentTransactionItems.value = result.items || []
        lastCompletedTransaction.value = result.transaction
        lastORNumber.value = result.orNumber || null
        lastWarning.value = result.warning || null

        // Add to recent transactions
        recentTransactions.value.unshift(result.transaction)
        if (recentTransactions.value.length > 20) {
          recentTransactions.value = recentTransactions.value.slice(0, 20)
        }

        // Clear cart after successful transaction
        cartStore.clearCart()

        return {
          success: true,
          orNumber: result.orNumber,
          warning: result.warning
        }
      } else {
        error.value = result.error || 'Unknown error processing transaction'
        return { success: false, error: error.value }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, error: error.value }
    } finally {
      isProcessing.value = false
    }
  }

  async function voidTransaction(
    transactionId: string,
    reason: string,
    supervisorId: string
  ): Promise<{ success: boolean; error?: string }> {
    isProcessing.value = true
    error.value = null

    try {
      const result = await transactionService.voidTransaction(
        transactionId,
        reason,
        supervisorId
      )

      if (result.success) {
        // Update recent transactions
        const index = recentTransactions.value.findIndex(t => t.id === transactionId)
        const tx = recentTransactions.value[index]
        if (index >= 0 && tx) {
          tx.status = 'voided'
        }
      } else {
        error.value = result.error || 'Unknown error voiding transaction'
      }

      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, error: error.value }
    } finally {
      isProcessing.value = false
    }
  }

  async function loadTransactionDetails(transactionId: string): Promise<void> {
    const details = await transactionService.getTransactionDetails(transactionId)
    currentTransaction.value = details.transaction
    currentTransactionItems.value = details.items
  }

  async function searchTransactionByOR(orNumber: string): Promise<Transaction | null> {
    return await transactionService.getTransactionByORNumber(orNumber)
  }

  async function searchTransactions(query: string): Promise<Transaction[]> {
    return await transactionService.searchTransactions(query)
  }

  async function loadRecentTransactions(limit: number = 20): Promise<void> {
    const { toLocalTimestamp } = await import('@/utils/dateHelpers')
    const transactions = await transactionService.getTransactionsByDateRange(
      toLocalTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      toLocalTimestamp()
    )
    recentTransactions.value = transactions.slice(0, limit)
  }

  async function getDailySummary(date?: string): Promise<{
    totalTransactions: number
    totalAmount: number
    totalVAT: number
    voidedCount: number
    voidedAmount: number
  }> {
    const { toLocalDateStr } = await import('@/utils/dateHelpers')
    const targetDate = date || toLocalDateStr()
    return await transactionService.getDailySummary(targetDate)
  }

  async function printLastReceipt(): Promise<{ success: boolean; error?: string }> {
    if (!lastCompletedTransaction.value) {
      return { success: false, error: 'No completed transaction to print' }
    }

    return await receiptService.printReceipt(lastCompletedTransaction.value.id, {
      cashierName: cashierName.value
    })
  }

  async function printReceipt(transactionId: string): Promise<{ success: boolean; error?: string }> {
    return await receiptService.printReceipt(transactionId, {
      cashierName: cashierName.value
    })
  }

  async function previewReceipt(transactionId: string): Promise<{ success: boolean; error?: string }> {
    return await receiptService.previewReceipt(transactionId, {
      cashierName: cashierName.value
    })
  }

  function setTerminalConfig(config: {
    branchId?: string
    shiftId?: string | null
  }): void {
    if (config.branchId) branchId.value = config.branchId
    if (config.shiftId !== undefined) shiftId.value = config.shiftId
  }

  function startShift(id: string): void {
    shiftId.value = id
  }

  function endShift(): void {
    shiftId.value = null
  }

  function clearCurrentTransaction(): void {
    currentTransaction.value = null
    currentTransactionItems.value = []
  }

  function clearError(): void {
    error.value = null
  }

  function clearWarning(): void {
    lastWarning.value = null
  }

  return {
    // State
    isProcessing,
    currentTransaction,
    currentTransactionItems,
    lastCompletedTransaction,
    lastORNumber,
    lastWarning,
    recentTransactions,
    error,
    branchId,
    terminalId,
    userId,
    shiftId,
    cashierName,

    // Getters
    hasCurrentTransaction,
    hasError,
    hasWarning,

    // Actions
    processTransaction,
    voidTransaction,
    loadTransactionDetails,
    searchTransactionByOR,
    searchTransactions,
    loadRecentTransactions,
    getDailySummary,
    printLastReceipt,
    printReceipt,
    previewReceipt,
    setTerminalConfig,
    startShift,
    endShift,
    clearCurrentTransaction,
    clearError,
    clearWarning
  }
})
