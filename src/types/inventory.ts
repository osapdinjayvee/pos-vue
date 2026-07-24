// Inventory-related TypeScript type definitions

import { daysFromToday } from '@/utils/dateHelpers'

// Movement types
export type MovementType = 'receive' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'void' | 'void_restore'

// Alert types
export type AlertType = 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired'

// Tax types (duplicated here for inventory context)
export type TaxType = 'vatable' | 'vat-exempt' | 'zero-rated'

// Supplier entity
export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  notes: string | null
  is_active: number
  created_at: string
  updated_at: string
  synced_at: string | null
}

export interface SupplierInput {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  payment_terms?: string
  notes?: string
  is_active?: boolean
}

// Product Variant entity
export interface ProductVariant {
  id: string
  product_id: string
  sku: string | null
  barcode: string | null
  name: string
  attributes: string | null // JSON string
  price_override: number | null
  cost_override: number | null
  image_url: string | null
  is_active: number
  display_order: number
  created_at: string
  updated_at: string
  synced_at: string | null
}

export interface ProductVariantInput {
  product_id: string
  sku?: string
  barcode?: string
  name: string
  attributes?: Record<string, string>
  price_override?: number
  cost_override?: number
  image_url?: string
  is_active?: boolean
  display_order?: number
}

// Display-friendly variant with parsed attributes
export interface DisplayVariant {
  id: string
  productId: string
  sku: string
  barcode: string
  name: string
  attributes: Record<string, string>
  priceOverride: number | null
  costOverride: number | null
  imageUrl: string
  isActive: boolean
  displayOrder: number
  currentStock: number
  createdAt: string
  updatedAt: string
}

// Batch entity
export interface Batch {
  id: string
  variant_id: string
  batch_number: string
  expiry_date: string | null
  manufacture_date: string | null
  received_date: string
  supplier_id: string | null
  notes: string | null
  created_at: string
  synced_at: string | null
}

export interface BatchInput {
  variant_id: string
  batch_number: string
  // Nullable in the schema: `null` clears the value on update, `undefined`
  // leaves it untouched. Without the null the UI cannot remove an expiry date.
  expiry_date?: string | null
  manufacture_date?: string | null
  received_date: string
  supplier_id?: string | null
  notes?: string | null
}

// Display-friendly batch
export interface DisplayBatch {
  id: string
  variantId: string
  batchNumber: string
  expiryDate: string | null
  manufactureDate: string | null
  receivedDate: string
  supplierId: string | null
  supplierName: string | null
  notes: string
  currentQuantity: number
  isExpired: boolean
  daysUntilExpiry: number | null
  createdAt: string
}

// Stock Movement entity
export interface StockMovement {
  id: string
  variant_id: string
  batch_id: string | null
  quantity: number
  movement_type: MovementType
  reference_type: string | null
  reference_id: string | null
  unit_cost: number | null
  reason: string | null
  user_id: string
  terminal_id: string
  branch_id: string
  created_at: string
  synced_at: string | null
}

export interface StockMovementInput {
  variant_id: string
  batch_id?: string
  quantity: number
  movement_type: MovementType
  reference_type?: string
  reference_id?: string
  unit_cost?: number
  reason?: string
  user_id: string
  terminal_id: string
  branch_id: string
}

// Display-friendly stock movement
export interface DisplayStockMovement {
  id: string
  variantId: string
  variantName: string
  productName: string
  sku: string
  barcode: string
  batchId: string | null
  batchNumber: string | null
  quantity: number
  movementType: MovementType
  movementTypeLabel: string
  referenceType: string | null
  referenceId: string | null
  unitCost: number | null
  reason: string
  userId: string
  terminalId: string
  branchId: string
  createdAt: string
}

// Stock Alert entity
export interface StockAlert {
  id: string
  variant_id: string
  alert_type: AlertType
  current_value: number
  threshold: number
  acknowledged: number
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
  updated_at: string
}

export interface StockAlertInput {
  variant_id: string
  alert_type: AlertType
  current_value: number
  threshold: number
}

// Display-friendly stock alert
export interface DisplayStockAlert {
  id: string
  variantId: string
  variantName: string
  variantSku: string
  productId: string
  productName: string
  alertType: AlertType
  alertTypeLabel: string
  currentValue: number
  threshold: number
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  createdAt: string
  updatedAt: string
}

// Movement type labels for display
export const MovementTypeLabels: Record<MovementType, string> = {
  receive: 'Stock Received',
  sale: 'Sale',
  adjustment: 'Adjustment',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  return: 'Customer Return',
  void: 'Voided Transaction',
  void_restore: 'Void Stock Restore'
}

// Alert type labels for display
export const AlertTypeLabels: Record<AlertType, string> = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired'
}

// Helper functions for converting between DB and display formats
export function toDisplayVariant(variant: ProductVariant, currentStock: number = 0): DisplayVariant {
  return {
    id: variant.id,
    productId: variant.product_id,
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    name: variant.name,
    attributes: variant.attributes ? JSON.parse(variant.attributes) : {},
    priceOverride: variant.price_override,
    costOverride: variant.cost_override,
    imageUrl: variant.image_url || '',
    isActive: variant.is_active === 1,
    displayOrder: variant.display_order,
    currentStock,
    createdAt: variant.created_at,
    updatedAt: variant.updated_at
  }
}

export function toDisplayBatch(batch: Batch, currentQuantity: number = 0, supplierName: string | null = null): DisplayBatch {
  let daysUntilExpiry: number | null = null
  let isExpired = false

  if (batch.expiry_date) {
    // Via daysFromToday so the date column is read as local midnight — parsing
    // it with `new Date()` treats it as UTC and reports an extra day east of
    // Greenwich, which would mislabel a batch expiring today.
    daysUntilExpiry = daysFromToday(batch.expiry_date)
    isExpired = daysUntilExpiry < 0
  }

  return {
    id: batch.id,
    variantId: batch.variant_id,
    batchNumber: batch.batch_number,
    expiryDate: batch.expiry_date,
    manufactureDate: batch.manufacture_date,
    receivedDate: batch.received_date,
    supplierId: batch.supplier_id,
    supplierName,
    notes: batch.notes || '',
    currentQuantity,
    isExpired,
    daysUntilExpiry,
    createdAt: batch.created_at
  }
}

export function toDisplayStockMovement(
  movement: StockMovement & { sku?: string; barcode?: string; product_barcode?: string },
  variantName: string = '',
  productName: string = '',
  batchNumber: string | null = null
): DisplayStockMovement {
  return {
    id: movement.id,
    variantId: movement.variant_id,
    variantName,
    productName,
    sku: (movement as any).sku || '',
    barcode: (movement as any).barcode || (movement as any).product_barcode || '',
    batchId: movement.batch_id,
    batchNumber,
    quantity: movement.quantity,
    movementType: movement.movement_type,
    movementTypeLabel: MovementTypeLabels[movement.movement_type],
    referenceType: movement.reference_type,
    referenceId: movement.reference_id,
    unitCost: movement.unit_cost,
    reason: movement.reason || '',
    userId: movement.user_id,
    terminalId: movement.terminal_id,
    branchId: movement.branch_id,
    createdAt: movement.created_at
  }
}

export function toDisplayStockAlert(
  alert: StockAlert,
  variantName: string,
  variantSku: string,
  productId: string,
  productName: string
): DisplayStockAlert {
  return {
    id: alert.id,
    variantId: alert.variant_id,
    variantName,
    variantSku,
    productId,
    productName,
    alertType: alert.alert_type,
    alertTypeLabel: AlertTypeLabels[alert.alert_type],
    currentValue: alert.current_value,
    threshold: alert.threshold,
    acknowledged: alert.acknowledged === 1,
    acknowledgedBy: alert.acknowledged_by,
    acknowledgedAt: alert.acknowledged_at,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at
  }
}
