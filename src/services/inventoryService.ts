// Inventory Service - handles stock movements, calculations, and alerts
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import { stockAlertRepository } from '@/repositories/stockAlertRepository'
import { variantRepository } from '@/repositories/variantRepository'
import { batchRepository } from '@/repositories/batchRepository'
import { daysFromToday, toLocalDateStr } from '@/utils/dateHelpers'
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

/**
 * Options for receiving stock. Shared by the service, the inventory store, and
 * the useInventory composable so a new option only has to be declared once.
 */
export interface ReceiveStockOptions {
  batchId?: string
  /** YYYY-MM-DD. Ignored when an explicit batchId is supplied. */
  expiryDate?: string | null
  supplierId?: string | null
  unitCost?: number
  reason?: string
  userId?: string
  terminalId?: string
  branchId?: string
}

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
   *
   * Passing `expiryDate` attaches the incoming stock to a batch with that date,
   * reusing an existing one where possible. This is what makes expiry alerts
   * possible for goods entered through the normal receiving flows rather than
   * only through the product's Batches card.
   */
  async receiveStock(
    variantId: string,
    quantity: number,
    options?: ReceiveStockOptions
  ): Promise<MovementResult> {
    try {
      if (quantity <= 0) {
        return { success: false, newStock: 0, error: 'Quantity must be positive' }
      }

      let batchId = options?.batchId
      if (!batchId && options?.expiryDate) {
        batchId = await this.resolveBatchForExpiry(
          variantId,
          options.expiryDate,
          options.supplierId ?? null
        )
      }

      const movement = await stockMovementRepository.recordReceive(
        variantId,
        quantity,
        options?.userId || this.defaultUserId,
        options?.terminalId || this.defaultTerminalId,
        options?.branchId || this.defaultBranchId,
        {
          batchId,
          unitCost: options?.unitCost,
          reason: options?.reason
        }
      )

      const newStock = await this.getStock(variantId)
      await this.updateStockAlert(variantId)

      // Surface the new expiry immediately rather than waiting for the next
      // dashboard visit to reconcile alerts.
      if (batchId && !options?.batchId) {
        await this.checkBatchExpiry()
      }

      return { success: true, movement, newStock }
    } catch (error: any) {
      return { success: false, newStock: 0, error: error.message }
    }
  }

  /**
   * Find the variant's batch for a given expiry date, creating one if needed.
   *
   * Deliveries of the same product with the same expiry belong together, so we
   * reuse the batch instead of accumulating a near-duplicate per delivery.
   */
  private async resolveBatchForExpiry(
    variantId: string,
    expiryDate: string,
    supplierId: string | null
  ): Promise<string> {
    const existing = await batchRepository.findByVariantAndExpiry(variantId, expiryDate)
    if (existing) return existing.id

    const batch = await batchRepository.createBatch({
      variant_id: variantId,
      batch_number: this.generateBatchNumber(expiryDate),
      expiry_date: expiryDate,
      received_date: toLocalDateStr(),
      supplier_id: supplierId
    })

    return batch.id
  }

  /** Readable, collision-resistant batch label derived from the expiry date. */
  private generateBatchNumber(expiryDate: string): string {
    const compact = expiryDate.replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `EXP${compact}-${suffix}`
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
    let fallbackThreshold = 10
    try {
      const { useSettingsStore } = await import('@/stores/settings')
      fallbackThreshold = useSettingsStore().lowStockThreshold
    } catch { /* use default */ }
    const threshold = product?.low_stock_threshold || fallbackThreshold

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
   * Reconcile expiry alerts against the current batch data.
   *
   * A variant can hold several batches, so we alert on its worst one (already
   * expired beats expiring soon, and the nearest expiry wins within each).
   * Variants that no longer have an expiring batch — sold through, corrected,
   * or deleted — get their expiry alert cleared, otherwise stale warnings stay
   * on the dashboard forever.
   */
  async checkBatchExpiry(daysWarning: number = 7): Promise<void> {
    // Worst (lowest) days-remaining per variant. Expired batches report a
    // negative value, so a plain minimum gives expired precedence automatically.
    const worstByVariant = new Map<string, number>()

    const record = (variantId: string, days: number) => {
      const current = worstByVariant.get(variantId)
      if (current === undefined || days < current) {
        worstByVariant.set(variantId, days)
      }
    }

    for (const batch of await batchRepository.findExpired()) {
      // Clamp to -1: the alert only distinguishes expired from expiring.
      record(batch.variant_id, Math.min(-1, daysFromToday(batch.expiry_date!)))
    }

    for (const batch of await batchRepository.findExpiringSoon(daysWarning)) {
      record(batch.variant_id, daysFromToday(batch.expiry_date!))
    }

    for (const [variantId, days] of worstByVariant) {
      await stockAlertRepository.createExpiryAlert(variantId, days, daysWarning)
    }

    // Clear alerts for variants that are no longer affected.
    const staleAlerts = await stockAlertRepository.findExpiryAlerts()
    for (const alert of staleAlerts) {
      if (!worstByVariant.has(alert.variant_id)) {
        await stockAlertRepository.removeExpiryAlerts(alert.variant_id)
      }
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
