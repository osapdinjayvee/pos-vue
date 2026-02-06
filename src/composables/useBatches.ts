// useBatches composable - Batch management utilities
import { ref, computed } from 'vue'
import { batchRepository } from '@/repositories/batchRepository'
import { inventoryService } from '@/services/inventoryService'
import type { Batch, BatchInput, DisplayBatch } from '@/types/inventory'
import { toDisplayBatch } from '@/types/inventory'

export function useBatches(variantId: string) {
  const batches = ref<DisplayBatch[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Total stock across all batches
  const totalStock = computed(() => {
    return batches.value.reduce((sum, b) => sum + b.currentQuantity, 0)
  })

  // Expired batches
  const expiredBatches = computed(() => {
    return batches.value.filter(b => b.isExpired)
  })

  // Expiring soon batches (within 7 days)
  const expiringSoonBatches = computed(() => {
    return batches.value.filter(b =>
      !b.isExpired &&
      b.daysUntilExpiry !== null &&
      b.daysUntilExpiry <= 7
    )
  })

  // Active batches (not expired)
  const activeBatches = computed(() => {
    return batches.value.filter(b => !b.isExpired)
  })

  // Fetch batches for the variant
  async function fetchBatches() {
    isLoading.value = true
    error.value = null
    try {
      const dbBatches = await batchRepository.findWithSupplierDetails(variantId)
      batches.value = dbBatches.map((b: any) => toDisplayBatch(
        b,
        b.current_quantity || 0,
        b.supplier_name || null
      ))
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch batches'
      console.error('Error fetching batches:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Create a new batch
  async function createBatch(data: Omit<BatchInput, 'variant_id'> & { initial_quantity?: number }): Promise<DisplayBatch | null> {
    isLoading.value = true
    error.value = null
    try {
      // Check for duplicate batch number
      if (await batchRepository.batchNumberExists(data.batch_number, variantId)) {
        error.value = 'Batch number already exists for this variant'
        return null
      }

      const batch = await batchRepository.createBatch({
        ...data,
        variant_id: variantId
      })

      // If initial quantity provided, record stock receive for this batch
      if (data.initial_quantity && data.initial_quantity > 0) {
        await inventoryService.receiveStock(variantId, data.initial_quantity, {
          batchId: batch.id,
          reason: `Initial stock for batch ${data.batch_number}`
        })
      }

      await fetchBatches() // Refresh list
      return batches.value.find(b => b.id === batch.id) || null
    } catch (e: any) {
      error.value = e.message || 'Failed to create batch'
      console.error('Error creating batch:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update a batch
  async function updateBatch(id: string, data: Partial<BatchInput>): Promise<DisplayBatch | null> {
    isLoading.value = true
    error.value = null
    try {
      // Check for duplicate batch number if changed
      if (data.batch_number) {
        if (await batchRepository.batchNumberExists(data.batch_number, variantId, id)) {
          error.value = 'Batch number already exists for this variant'
          return null
        }
      }

      const updated = await batchRepository.updateBatch(id, data)
      if (updated) {
        await fetchBatches() // Refresh list
        return batches.value.find(b => b.id === id) || null
      }
      return null
    } catch (e: any) {
      error.value = e.message || 'Failed to update batch'
      console.error('Error updating batch:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete a batch (only if no stock)
  async function deleteBatch(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const batch = batches.value.find(b => b.id === id)
      if (batch && batch.currentQuantity > 0) {
        error.value = 'Cannot delete batch with remaining stock'
        return false
      }

      const success = await batchRepository.delete(id)
      if (success) {
        await fetchBatches() // Refresh list
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to delete batch'
      console.error('Error deleting batch:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Add stock to a batch
  async function addStockToBatch(batchId: string, quantity: number, options?: { unitCost?: number; reason?: string }) {
    return inventoryService.receiveStock(variantId, quantity, {
      batchId,
      unitCost: options?.unitCost,
      reason: options?.reason
    })
  }

  // Get batch for sale (FIFO - oldest non-expired)
  async function getBatchForSale(): Promise<DisplayBatch | null> {
    const oldest = await batchRepository.getOldestBatchWithStock(variantId)
    if (!oldest) return null
    return toDisplayBatch(oldest, oldest.current_quantity, null)
  }

  // Check if selling from expired batch
  function isExpiredBatch(batchId: string): boolean {
    const batch = batches.value.find(b => b.id === batchId)
    return batch?.isExpired || false
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    batches,
    isLoading,
    error,

    // Computed
    totalStock,
    expiredBatches,
    expiringSoonBatches,
    activeBatches,

    // Actions
    fetchBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    addStockToBatch,
    getBatchForSale,
    isExpiredBatch,
    clearError
  }
}

export default useBatches
