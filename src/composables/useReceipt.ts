// useReceipt composable - Provides receipt functionality for POS
import { ref } from 'vue'
import { receiptService } from '@/services/receiptService'
import type { ReceiptData, BusinessInfo, TerminalInfo } from '@/types/receipt'

export function useReceipt() {
  const isGenerating = ref(false)
  const isPrinting = ref(false)
  const error = ref<string | null>(null)
  const lastReceiptData = ref<ReceiptData | null>(null)

  // Get business info
  function getBusinessInfo(): BusinessInfo {
    return receiptService.getBusinessInfo()
  }

  // Get terminal info
  function getTerminalInfo(): TerminalInfo {
    return receiptService.getTerminalInfo()
  }

  // Set business info
  function setBusinessInfo(info: BusinessInfo): void {
    receiptService.setBusinessInfo(info)
  }

  // Set terminal info
  function setTerminalInfo(info: TerminalInfo): void {
    receiptService.setTerminalInfo(info)
  }

  // Generate receipt data
  async function generateReceiptData(
    transactionId: string,
    cashierName: string
  ): Promise<ReceiptData | null> {
    isGenerating.value = true
    error.value = null

    try {
      const data = await receiptService.generateReceiptData(transactionId, {
        cashierName
      })
      lastReceiptData.value = data
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to generate receipt'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  // Generate receipt as text
  async function generateReceiptText(
    transactionId: string,
    cashierName: string
  ): Promise<string | null> {
    isGenerating.value = true
    error.value = null

    try {
      return await receiptService.generateReceiptPlainText(transactionId, {
        cashierName
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to generate receipt'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  // Generate receipt as HTML
  async function generateReceiptHTML(
    transactionId: string,
    cashierName: string
  ): Promise<string | null> {
    isGenerating.value = true
    error.value = null

    try {
      return await receiptService.generateReceiptHTML(transactionId, {
        cashierName
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to generate receipt'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  // Print receipt
  async function printReceipt(
    transactionId: string,
    cashierName: string
  ): Promise<{ success: boolean; error?: string }> {
    isPrinting.value = true
    error.value = null

    try {
      const result = await receiptService.printReceipt(transactionId, {
        cashierName
      })

      if (!result.success) {
        error.value = result.error || 'Print failed'
      }

      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to print receipt'
      return { success: false, error: error.value }
    } finally {
      isPrinting.value = false
    }
  }

  // Preview receipt
  async function previewReceipt(
    transactionId: string,
    cashierName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await receiptService.previewReceipt(transactionId, {
        cashierName
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to preview receipt'
      return { success: false, error: error.value }
    }
  }

  // Generate void receipt
  async function generateVoidReceipt(
    transactionId: string,
    voidReason: string,
    supervisorName: string,
    cashierName: string
  ): Promise<ReceiptData | null> {
    isGenerating.value = true
    error.value = null

    try {
      return await receiptService.generateVoidReceipt(
        transactionId,
        voidReason,
        supervisorName,
        { cashierName }
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to generate void receipt'
      return null
    } finally {
      isGenerating.value = false
    }
  }

  // Check OR series status
  async function checkORSeriesStatus(
    branchId: string,
    terminalId?: string
  ): Promise<{
    hasActiveSeries: boolean
    warning?: string
    remaining?: number
  }> {
    return await receiptService.checkORSeriesStatus(branchId, terminalId)
  }

  // Clear error
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    isGenerating,
    isPrinting,
    error,
    lastReceiptData,

    // Configuration
    getBusinessInfo,
    getTerminalInfo,
    setBusinessInfo,
    setTerminalInfo,

    // Actions
    generateReceiptData,
    generateReceiptText,
    generateReceiptHTML,
    printReceipt,
    previewReceipt,
    generateVoidReceipt,
    checkORSeriesStatus,
    clearError
  }
}

export default useReceipt
