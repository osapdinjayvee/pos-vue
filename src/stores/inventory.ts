import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { inventoryService } from '@/services/inventoryService'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import type { StockMovement, DisplayStockMovement, DisplayStockAlert, MovementType } from '@/types/inventory'

export const useInventoryStore = defineStore('inventory', () => {
  // State
  const movements = ref<DisplayStockMovement[]>([])
  const alerts = ref<DisplayStockAlert[]>([])
  const stockCache = ref<Record<string, number>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Alert counts
  const alertCounts = ref<Record<string, number>>({
    low_stock: 0,
    out_of_stock: 0,
    expiring_soon: 0,
    expired: 0
  })

  // Getters
  const totalAlertCount = computed(() => {
    return Object.values(alertCounts.value).reduce((sum, count) => sum + count, 0)
  })

  const lowStockAlerts = computed(() => {
    return alerts.value.filter(a => a.alertType === 'low_stock' || a.alertType === 'out_of_stock')
  })

  const expiryAlerts = computed(() => {
    return alerts.value.filter(a => a.alertType === 'expiring_soon' || a.alertType === 'expired')
  })

  // Actions
  async function fetchStock(variantId: string): Promise<number> {
    try {
      const stock = await inventoryService.getStock(variantId)
      stockCache.value[variantId] = stock
      return stock
    } catch (e: any) {
      console.error('Error fetching stock:', e)
      return 0
    }
  }

  async function fetchStockMultiple(variantIds: string[]): Promise<void> {
    try {
      const stocks = await inventoryService.getStockMultiple(variantIds)
      Object.assign(stockCache.value, stocks)
    } catch (e: any) {
      console.error('Error fetching stocks:', e)
    }
  }

  function getCachedStock(variantId: string): number {
    return stockCache.value[variantId] ?? 0
  }

  async function fetchMovements(variantId: string, options?: { limit?: number; offset?: number }): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      movements.value = await inventoryService.getMovementHistory(variantId, options)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch movements'
      console.error('Error fetching movements:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAlerts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      // Generate expiring/expired batch alerts before reading them, otherwise
      // expiry alerts are never created and never surface on the dashboard.
      await inventoryService.checkBatchExpiry()
      alerts.value = await inventoryService.getActiveAlerts()
      alertCounts.value = await inventoryService.getAlertCounts()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch alerts'
      console.error('Error fetching alerts:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function receiveStock(
    variantId: string,
    quantity: number,
    options?: {
      batchId?: string
      unitCost?: number
      reason?: string
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ) {
    isLoading.value = true
    error.value = null
    try {
      const result = await inventoryService.receiveStock(variantId, quantity, options)
      if (result.success) {
        stockCache.value[variantId] = result.newStock
        await fetchAlerts() // Refresh alerts
      } else {
        error.value = result.error || 'Failed to receive stock'
      }
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to receive stock'
      return { success: false, newStock: 0, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

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
      if (result.success) {
        stockCache.value[variantId] = result.newStock
        await fetchAlerts() // Refresh alerts
      } else {
        error.value = result.error || 'Failed to record sale'
      }
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to record sale'
      return { success: false, newStock: 0, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

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
      if (result.success) {
        stockCache.value[variantId] = result.newStock
        await fetchAlerts() // Refresh alerts
      } else {
        error.value = result.error || 'Failed to adjust stock'
      }
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to adjust stock'
      return { success: false, newStock: 0, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const success = await inventoryService.acknowledgeAlert(alertId, userId)
      if (success) {
        await fetchAlerts() // Refresh alerts
      }
      return success
    } catch (e: any) {
      console.error('Error acknowledging alert:', e)
      return false
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCache() {
    stockCache.value = {}
    movements.value = []
  }

  return {
    // State
    movements,
    alerts,
    stockCache,
    isLoading,
    error,
    alertCounts,

    // Getters
    totalAlertCount,
    lowStockAlerts,
    expiryAlerts,

    // Actions
    fetchStock,
    fetchStockMultiple,
    getCachedStock,
    fetchMovements,
    fetchAlerts,
    receiveStock,
    recordSale,
    adjustStock,
    acknowledgeAlert,
    clearError,
    clearCache
  }
})
