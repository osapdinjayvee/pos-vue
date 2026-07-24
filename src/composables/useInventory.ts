// useInventory composable - Inventory management utilities
import { ref, computed } from 'vue'
import { inventoryService, type ReceiveStockOptions } from '@/services/inventoryService'
import type { DisplayStockMovement, DisplayStockAlert, MovementType } from '@/types/inventory'

export function useInventory() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get current stock for a variant
  async function getStock(variantId: string): Promise<number> {
    return inventoryService.getStock(variantId)
  }

  // Get stock for multiple variants
  async function getStockMultiple(variantIds: string[]): Promise<Record<string, number>> {
    return inventoryService.getStockMultiple(variantIds)
  }

  // Check if sufficient stock exists
  async function checkStock(variantId: string, quantity: number) {
    return inventoryService.checkStock(variantId, quantity)
  }

  // Receive stock (add inventory)
  async function receiveStock(
    variantId: string,
    quantity: number,
    options?: ReceiveStockOptions
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.receiveStock(variantId, quantity, options)
      if (!result.success) {
        error.value = result.error || 'Failed to receive stock'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Record a sale
  async function recordSale(
    variantId: string,
    quantity: number,
    options?: {
      batchId?: string
      referenceId?: string
      unitCost?: number
      userId?: string
      terminalId?: string
      branchId?: string
      allowNegative?: boolean
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.recordSale(variantId, quantity, options)
      if (!result.success) {
        error.value = result.error || 'Failed to record sale'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Adjust stock
  async function adjustStock(
    variantId: string,
    quantity: number,
    reason: string,
    options?: {
      batchId?: string
      userId?: string
      terminalId?: string
      branchId?: string
      allowNegative?: boolean
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.adjustStock(variantId, quantity, reason, options)
      if (!result.success) {
        error.value = result.error || 'Failed to adjust stock'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Record a return
  async function recordReturn(
    variantId: string,
    quantity: number,
    options?: {
      reason?: string
      referenceId?: string
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.recordReturn(variantId, quantity, options)
      if (!result.success) {
        error.value = result.error || 'Failed to record return'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Void a transaction
  async function voidTransaction(
    variantId: string,
    quantity: number,
    referenceId: string,
    options?: {
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.voidTransaction(variantId, quantity, referenceId, options)
      if (!result.success) {
        error.value = result.error || 'Failed to void transaction'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Bulk receive stock for multiple products
  async function bulkReceiveStock(
    productIds: string[],
    quantity: number,
    options?: { unitCost?: number; reason?: string }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.bulkReceiveStock(productIds, quantity, options)
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Get movement history
  async function getMovementHistory(
    variantId?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DisplayStockMovement[]> {
    if (variantId) {
      return inventoryService.getMovementHistory(variantId, options)
    }
    // If no variantId, get all recent movements
    return inventoryService.getAllRecentMovements(options?.limit || 50)
  }

  // Transfer stock between variants
  async function transferStock(
    fromVariantId: string,
    toVariantId: string,
    quantity: number,
    options?: {
      reference?: string
      notes?: string
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.transferStock(
        fromVariantId,
        toVariantId,
        quantity,
        options
      )
      if (!result.success) {
        error.value = result.error || 'Failed to transfer stock'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  // Get active alerts
  async function getActiveAlerts(): Promise<DisplayStockAlert[]> {
    return inventoryService.getActiveAlerts()
  }

  // Acknowledge an alert
  async function acknowledgeAlert(alertId: string, userId: string) {
    return inventoryService.acknowledgeAlert(alertId, userId)
  }

  // Get alert counts
  async function getAlertCounts() {
    return inventoryService.getAlertCounts()
  }

  // Get stock value
  async function getStockValue(variantId: string) {
    return inventoryService.getStockValue(variantId)
  }

  // Get movement summary
  async function getMovementSummary(variantId: string) {
    return inventoryService.getMovementSummary(variantId)
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    isLoading,
    error,

    // Stock operations
    getStock,
    getStockMultiple,
    checkStock,
    receiveStock,
    bulkReceiveStock,
    recordSale,
    adjustStock,
    recordReturn,
    voidTransaction,
    transferStock,

    // History and reporting
    getMovementHistory,
    getStockValue,
    getMovementSummary,

    // Alerts
    getActiveAlerts,
    acknowledgeAlert,
    getAlertCounts,

    // Utilities
    clearError
  }
}

export default useInventory
