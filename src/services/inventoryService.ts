// Inventory Service - handles stock movements, calculations, and alerts
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import { stockAlertRepository } from '@/repositories/stockAlertRepository'
import { variantRepository } from '@/repositories/variantRepository'
import { batchRepository } from '@/repositories/batchRepository'
import type {
  StockMovement,
  StockMovementInput,
  MovementType,
  StockAlert,
  ProductVariant,
  Batch,
  DisplayStockMovement,
  DisplayStockAlert
} from '@/types/inventory'
import {
  toDisplayStockMovement,
  toDisplayStockAlert,
  MovementTypeLabels
} from '@/types/inventory'
import {
  calculateStock,
  isLowStock,
  isOutOfStock,
  hasSufficientStock,
  getStockDeficit,
  validateMovementQuantity
} from '@/utils/stockCalculator'

export interface StockCheckResult {
  variantId: string
  currentStock: number
  requestedQuantity: number
  hasSufficient: boolean
  deficit: number
}

export interface MovementResult {
  success: boolean
  movement?: StockMovement
  newStock: number
  error?: string
  alert?: StockAlert
}

class InventoryService {
  private defaultUserId = 'system'
  private defaultTerminalId = 'WEB'
  private defaultBranchId = 'main'

  /**
   * Get current stock for a variant (calculated from movements)
   */
  async getStock(variantId: string): Promise<number> {
    return stockMovementRepository.calculateStock(variantId)
  }

  /**
   * Get stock for multiple variants
   */
  async getStockMultiple(variantIds: string[]): Promise<Record<string, number>> {
    const stocks: Record<string, number> = {}
    for (const id of variantIds) {
      stocks[id] = await this.getStock(id)
    }
    return stocks
  }

  /**
   * Check if sufficient stock exists for a sale
   */
  async checkStock(variantId: string, requestedQuantity: number): Promise<StockCheckResult> {
    const currentStock = await this.getStock(variantId)
    return {
      variantId,
      currentStock,
      requestedQuantity,
      hasSufficient: hasSufficientStock(currentStock, requestedQuantity),
      deficit: getStockDeficit(currentStock, requestedQuantity)
    }
  }

  /**
   * Receive stock (add inventory)
   */
  async receiveStock(
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
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      const movement = await stockMovementRepository.recordReceive(
        variantId,
        quantity,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        {
          batchId: options?.batchId,
          unitCost: options?.unitCost,
          reason: options?.reason
        }
      )

      const newStock = await this.getStock(variantId)
      await this.updateStockAlert(variantId)

      return { success: true, movement, newStock }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Record a sale (reduce inventory)
   */
  async recordSale(
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
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      // Check stock availability
      const currentStock = await this.getStock(variantId)
      if (!options?.allowNegative && currentStock < quantity) {
        return {
          success: false,
          newStock: currentStock,
          error: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`
        }
      }

      const movement = await stockMovementRepository.recordSale(
        variantId,
        quantity,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        {
          batchId: options?.batchId,
          referenceId: options?.referenceId,
          unitCost: options?.unitCost
        }
      )

      const newStock = await this.getStock(variantId)
      const alert = await this.updateStockAlert(variantId)

      return { success: true, movement, newStock, alert: alert || undefined }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Make a stock adjustment
   */
  async adjustStock(
    variantId: string,
    quantity: number, // Can be positive or negative
    reason: string,
    options?: {
      batchId?: string
      userId?: string
      terminalId?: string
      branchId?: string
      allowNegative?: boolean
    }
  ): Promise<MovementResult> {
    try {
      if (quantity === 0) {
        return { success: false, newStock: 0, error: 'Quantity cannot be zero' }
      }

      // Check if adjustment would result in negative stock
      const currentStock = await this.getStock(variantId)
      if (!options?.allowNegative && currentStock + quantity < 0) {
        return {
          success: false,
          newStock: currentStock,
          error: `Adjustment would result in negative stock (${currentStock + quantity})`
        }
      }

      const movement = await stockMovementRepository.recordAdjustment(
        variantId,
        quantity,
        reason,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        options?.batchId
      )

      const newStock = await this.getStock(variantId)
      const alert = await this.updateStockAlert(variantId)

      return { success: true, movement, newStock, alert: alert || undefined }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Record a customer return
   */
  async recordReturn(
    variantId: string,
    quantity: number,
    options?: {
      reason?: string
      referenceId?: string
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      const movement = await stockMovementRepository.recordReturn(
        variantId,
        quantity,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        options?.reason,
        options?.referenceId
      )

      const newStock = await this.getStock(variantId)
      await this.updateStockAlert(variantId)

      return { success: true, movement, newStock }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Void a transaction (restore stock)
   */
  async voidTransaction(
    variantId: string,
    quantity: number,
    referenceId: string,
    options?: {
      userId?: string
      terminalId?: string
      branchId?: string
    }
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      const movement = await stockMovementRepository.recordVoid(
        variantId,
        quantity,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        referenceId
      )

      const newStock = await this.getStock(variantId)
      await this.updateStockAlert(variantId)

      return { success: true, movement, newStock }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Get movement history for a variant
   */
  async getMovementHistory(
    variantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DisplayStockMovement[]> {
    const movements = await stockMovementRepository.findWithDetails(variantId, options)

    return movements.map(m => toDisplayStockMovement(
      m,
      m.variant_name,
      m.product_name,
      m.batch_number
    ))
  }

  /**
   * Get all recent movements across all variants
   */
  async getAllRecentMovements(limit: number = 50): Promise<DisplayStockMovement[]> {
    const movements = await stockMovementRepository.getAllWithDetails(limit)

    return movements.map(m => toDisplayStockMovement(
      m,
      m.variant_name,
      m.product_name,
      m.batch_number
    ))
  }

  /**
   * Transfer stock between variants
   */
  async transferStock(
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
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      if (fromVariantId === toVariantId) {
        return { success: false, newStock: 0, error: 'Cannot transfer to the same variant' }
      }

      // Check source stock availability
      const sourceStock = await this.getStock(fromVariantId)
      if (sourceStock < quantity) {
        return {
          success: false,
          newStock: sourceStock,
          error: `Insufficient stock. Available: ${sourceStock}, Requested: ${quantity}`
        }
      }

      const reference = options?.reference || `TRF-${Date.now()}`
      const userId = options?.userId || this.defaultUserId
      const terminalId = options?.terminalId || this.defaultTerminalId
      const branchId = options?.branchId || this.defaultBranchId

      // Record transfer out from source
      await stockMovementRepository.recordTransferOut(
        fromVariantId,
        quantity,
        userId,
        terminalId,
        branchId,
        reference,
        options?.notes
      )

      // Record transfer in to destination
      await stockMovementRepository.recordTransferIn(
        toVariantId,
        quantity,
        userId,
        terminalId,
        branchId,
        reference,
        options?.notes
      )

      // Update alerts for both variants
      await this.updateStockAlert(fromVariantId)
      await this.updateStockAlert(toVariantId)

      const newStock = await this.getStock(toVariantId)
      return { success: true, newStock }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Get stock for a specific variant (alias for getStock)
   */
  async getVariantStock(variantId: string): Promise<number> {
    return this.getStock(variantId)
  }

  /**
   * Update stock alert for a variant
   */
  async updateStockAlert(variantId: string): Promise<StockAlert | null> {
    const variant = await variantRepository.findWithProductDetails(variantId)
    if (!variant) return null

    const currentStock = await this.getStock(variantId)
    // Get threshold from product - need to fetch it separately
    const product = await import('@/repositories/productRepository').then(m => m.default.findById(variant.product_id))
    const threshold = product?.low_stock_threshold || 10

    await stockAlertRepository.updateStockLevel(variantId, currentStock, threshold)

    return stockAlertRepository.findByVariantId(variantId)
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(): Promise<DisplayStockAlert[]> {
    const alerts = await stockAlertRepository.findUnacknowledgedWithDetails()

    return alerts.map(a => toDisplayStockAlert(
      a,
      a.variant_name,
      a.sku,
      a.product_id,
      a.product_name
    ))
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    return stockAlertRepository.acknowledge(alertId, userId)
  }

  /**
   * Get alert counts by type
   */
  async getAlertCounts(): Promise<Record<string, number>> {
    return stockAlertRepository.countByType()
  }

  /**
   * Check batch expiry and create alerts
   */
  async checkBatchExpiry(daysWarning: number = 7): Promise<void> {
    const expiringBatches = await batchRepository.findExpiringSoon(daysWarning)

    for (const batch of expiringBatches) {
      const expiryDate = new Date(batch.expiry_date!)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      await stockAlertRepository.createExpiryAlert(batch.variant_id, daysUntilExpiry)
    }

    // Check for already expired batches
    const expiredBatches = await batchRepository.findExpired()

    for (const batch of expiredBatches) {
      await stockAlertRepository.createExpiryAlert(batch.variant_id, -1)
    }
  }

  /**
   * Get stock value for a variant
   */
  async getStockValue(variantId: string): Promise<{ quantity: number; averageCost: number; totalValue: number }> {
    const movements = await stockMovementRepository.findByVariantId(variantId)
    const quantity = calculateStock(movements)

    // Calculate weighted average cost from receive movements
    let totalCost = 0
    let totalReceived = 0

    for (const m of movements) {
      if (m.movement_type === 'receive' && m.unit_cost !== null) {
        totalCost += m.unit_cost * m.quantity
        totalReceived += m.quantity
      }
    }

    const averageCost = totalReceived > 0 ? totalCost / totalReceived : 0
    const totalValue = quantity * averageCost

    return { quantity, averageCost, totalValue }
  }

  /**
   * Bulk receive stock for multiple products
   * Gets the default variant for each product and receives stock to it
   * Auto-creates a default variant if one doesn't exist
   */
  async bulkReceiveStock(
    productIds: string[],
    quantity: number,
    options?: { unitCost?: number; reason?: string }
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const productId of productIds) {
      try {
        let variant = await variantRepository.getDefaultVariant(productId)

        // Auto-create default variant if none exists
        if (!variant) {
          const productRepo = await import('@/repositories/productRepository').then(m => m.default)
          const product = await productRepo.findById(productId)
          if (product) {
            variant = await variantRepository.createVariant({
              product_id: productId,
              name: 'Default',
              sku: product.sku,
              barcode: product.barcode || undefined,
              is_active: true,
              display_order: 0
            })

            // Sync existing product stock to the new variant
            if (variant && product.stock > 0) {
              await this.receiveStock(variant.id, product.stock, {
                reason: 'Initial stock sync'
              })
            }
          }
        }

        if (variant) {
          const result = await this.receiveStock(variant.id, quantity, {
            unitCost: options?.unitCost,
            reason: options?.reason
          })
          if (result.success) {
            // Also update the product's stock field for display
            const productRepo = await import('@/repositories/productRepository').then(m => m.default)
            await productRepo.updateStock(productId, quantity)
            success++
          } else {
            failed++
          }
        } else {
          failed++
        }
      } catch (e) {
        console.error('Error receiving stock for product:', productId, e)
        failed++
      }
    }

    return { success, failed }
  }

  /**
   * Bulk update alerts for all variants
   */
  async refreshAllAlerts(): Promise<number> {
    const variants = await variantRepository.findAll()
    let updatedCount = 0

    for (const variant of variants) {
      const alert = await this.updateStockAlert(variant.id)
      if (alert) updatedCount++
    }

    return updatedCount
  }

  /**
   * Get low stock products with details
   */
  async getLowStockProducts(): Promise<any[]> {
    return stockAlertRepository.findUnacknowledgedWithDetails()
  }

  /**
   * Get movement summary for a variant
   */
  async getMovementSummary(variantId: string) {
    return stockMovementRepository.getMovementSummary(variantId)
  }

  /**
   * Set default context for movements
   */
  setDefaultContext(userId: string, terminalId: string, branchId: string): void {
    this.defaultUserId = userId
    this.defaultTerminalId = terminalId
    this.defaultBranchId = branchId
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
