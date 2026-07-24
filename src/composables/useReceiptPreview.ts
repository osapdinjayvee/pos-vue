/**
 * Drives the in-app receipt preview dialog.
 *
 * Shared by the transaction list, transaction detail, and POS transaction
 * history so all three get identical behaviour on tablet and desktop.
 */

import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useTransactionStore } from '@/stores/transaction'

export function useReceiptPreview() {
  const toast = useToast()
  const transactionStore = useTransactionStore()

  const visible = ref(false)
  const text = ref<string | null>(null)
  const loading = ref(false)
  const transactionId = ref<string | null>(null)

  /**
   * Generate and show the receipt for a transaction.
   */
  async function open(txId: string): Promise<void> {
    transactionId.value = txId
    text.value = null
    loading.value = true
    visible.value = true

    try {
      const result = await transactionStore.previewReceipt(txId)
      if (result.success && result.text) {
        text.value = result.text
      } else {
        visible.value = false
        toast.add({
          severity: 'error',
          summary: 'Preview Failed',
          detail: result.error || 'Could not generate receipt.',
          life: 5000
        })
      }
    } catch (e) {
      visible.value = false
      toast.add({
        severity: 'error',
        summary: 'Preview Failed',
        detail: e instanceof Error ? e.message : 'An unexpected error occurred.',
        life: 5000
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Print a specific transaction's receipt, reporting the outcome via toast.
   * Closes the preview dialog on success if it happens to be open.
   */
  async function printFor(txId: string): Promise<boolean> {
    try {
      const result = await transactionStore.printReceipt(txId)
      if (result.success) {
        visible.value = false
        toast.add({
          severity: 'success',
          summary: 'Receipt Sent',
          detail: 'Receipt sent to printer.',
          life: 3000
        })
        return true
      }

      toast.add({
        severity: 'error',
        summary: 'Print Failed',
        detail: result.error || 'Could not print receipt.',
        life: 5000
      })
      return false
    } catch (e) {
      toast.add({
        severity: 'error',
        summary: 'Print Failed',
        detail: e instanceof Error ? e.message : 'An unexpected error occurred.',
        life: 5000
      })
      return false
    }
  }

  /**
   * Print the receipt currently being previewed.
   */
  async function print(): Promise<void> {
    if (!transactionId.value) return
    await printFor(transactionId.value)
  }

  function close(): void {
    visible.value = false
  }

  return { visible, text, loading, open, print, printFor, close }
}

export default useReceiptPreview
