// Stock calculation utilities
// Stock levels are ALWAYS derived from movement history, never directly edited

import type { StockMovement, MovementType } from '@/types/inventory'

/**
 * Calculate current stock from a list of movements
 * Stock is always derived from movement history
 */
export function calculateStock(movements: StockMovement[]): number {
  return movements.reduce((total, movement) => total + movement.quantity, 0)
}

/**
 * Calculate stock for a specific variant from movements
 */
export function calculateVariantStock(movements: StockMovement[], variantId: string): number {
  return movements
    .filter(m => m.variant_id === variantId)
    .reduce((total, movement) => total + movement.quantity, 0)
}

/**
 * Calculate stock for a specific batch from movements
 */
export function calculateBatchStock(movements: StockMovement[], batchId: string): number {
  return movements
    .filter(m => m.batch_id === batchId)
    .reduce((total, movement) => total + movement.quantity, 0)
}

/**
 * Check if there's sufficient stock for a sale
 */
export function hasSufficientStock(currentStock: number, requestedQuantity: number): boolean {
  return currentStock >= requestedQuantity
}

/**
 * Get stock deficit (how much we're short by)
 */
export function getStockDeficit(currentStock: number, requestedQuantity: number): number {
  const deficit = requestedQuantity - currentStock
  return deficit > 0 ? deficit : 0
}

/**
 * Check if stock is below the low stock threshold
 */
export function isLowStock(currentStock: number, threshold: number): boolean {
  return currentStock > 0 && currentStock <= threshold
}

/**
 * Check if stock is zero (out of stock)
 */
export function isOutOfStock(currentStock: number): boolean {
  return currentStock <= 0
}

/**
 * Determine alert type based on stock level and threshold
 */
export function determineAlertType(currentStock: number, threshold: number): 'low_stock' | 'out_of_stock' | null {
  if (isOutOfStock(currentStock)) {
    return 'out_of_stock'
  }
  if (isLowStock(currentStock, threshold)) {
    return 'low_stock'
  }
  return null
}

/**
 * Calculate the average cost based on stock movements
 * Uses weighted average cost (WAC) method
 */
export function calculateWeightedAverageCost(movements: StockMovement[]): number {
  let totalValue = 0
  let totalQuantity = 0

  // Only consider 'receive' movements for cost calculation
  const receiveMovements = movements.filter(m => m.movement_type === 'receive' && m.unit_cost !== null)

  for (const movement of receiveMovements) {
    if (movement.unit_cost !== null && movement.quantity > 0) {
      totalValue += movement.unit_cost * movement.quantity
      totalQuantity += movement.quantity
    }
  }

  if (totalQuantity === 0) return 0
  return totalValue / totalQuantity
}

/**
 * Calculate total stock value based on current stock and average cost
 */
export function calculateStockValue(currentStock: number, averageCost: number): number {
  return currentStock * averageCost
}

/**
 * Group movements by type and calculate totals
 */
export function summarizeMovements(movements: StockMovement[]): Record<MovementType, { count: number; totalQuantity: number }> {
  const summary: Record<string, { count: number; totalQuantity: number }> = {}

  const types: MovementType[] = ['receive', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'void']

  for (const type of types) {
    summary[type] = { count: 0, totalQuantity: 0 }
  }

  for (const movement of movements) {
    const entry = summary[movement.movement_type]
    if (entry) {
      entry.count++
      entry.totalQuantity += movement.quantity
    }
  }

  return summary as Record<MovementType, { count: number; totalQuantity: number }>
}

/**
 * Calculate stock at a specific point in time
 */
export function calculateStockAtDate(movements: StockMovement[], asOfDate: Date): number {
  return movements
    .filter(m => new Date(m.created_at) <= asOfDate)
    .reduce((total, movement) => total + movement.quantity, 0)
}

/**
 * Get movements within a date range
 */
export function getMovementsInRange(movements: StockMovement[], startDate: Date, endDate: Date): StockMovement[] {
  return movements.filter(m => {
    const movementDate = new Date(m.created_at)
    return movementDate >= startDate && movementDate <= endDate
  })
}

/**
 * Calculate stock turnover (how many times stock was sold and replaced)
 * Higher turnover generally indicates good sales
 */
export function calculateStockTurnover(
  movements: StockMovement[],
  averageStock: number
): number {
  if (averageStock === 0) return 0

  const totalSold = movements
    .filter(m => m.movement_type === 'sale')
    .reduce((total, m) => total + Math.abs(m.quantity), 0)

  return totalSold / averageStock
}

/**
 * Calculate days of stock remaining based on average daily sales
 */
export function calculateDaysOfStock(
  currentStock: number,
  movements: StockMovement[],
  daysToAnalyze: number = 30
): number | null {
  if (currentStock <= 0) return 0

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze)

  const recentSales = movements.filter(m => {
    return m.movement_type === 'sale' && new Date(m.created_at) >= cutoffDate
  })

  const totalSold = recentSales.reduce((total, m) => total + Math.abs(m.quantity), 0)
  const avgDailySales = totalSold / daysToAnalyze

  if (avgDailySales === 0) return null // Can't calculate, no sales

  return Math.round(currentStock / avgDailySales)
}

/**
 * Validate a stock movement quantity
 * Returns error message if invalid, null if valid
 */
export function validateMovementQuantity(
  movementType: MovementType,
  quantity: number,
  currentStock: number,
  allowNegativeStock: boolean = false
): string | null {
  if (quantity === 0) {
    return 'Quantity cannot be zero'
  }

  // These movement types should have positive quantities (adding stock)
  const inboundTypes: MovementType[] = ['receive', 'transfer_in', 'return', 'void']

  // These movement types should have negative quantities (removing stock)
  const outboundTypes: MovementType[] = ['sale', 'transfer_out']

  // Adjustments can be positive or negative
  if (movementType === 'adjustment') {
    // Check if this would result in negative stock
    if (!allowNegativeStock && currentStock + quantity < 0) {
      return `Adjustment would result in negative stock (${currentStock + quantity})`
    }
    return null
  }

  if (inboundTypes.includes(movementType)) {
    if (quantity < 0) {
      return `${movementType} movements should have positive quantities`
    }
    return null
  }

  if (outboundTypes.includes(movementType)) {
    // For outbound, quantity should be negative
    if (quantity > 0) {
      return `${movementType} movements should have negative quantities`
    }
    // Check if sufficient stock
    if (!allowNegativeStock && currentStock + quantity < 0) {
      return `Insufficient stock. Available: ${currentStock}, Requested: ${Math.abs(quantity)}`
    }
    return null
  }

  return null
}

/**
 * Calculate reorder quantity based on reorder point and current stock
 */
export function calculateReorderQuantity(
  currentStock: number,
  reorderPoint: number,
  reorderQuantity: number
): number {
  if (currentStock >= reorderPoint) {
    return 0 // No reorder needed
  }
  return reorderQuantity
}
