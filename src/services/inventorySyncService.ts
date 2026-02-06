/**
 * Inventory Sync Service
 * Syncs stock movements to the cloud and fetches branch inventory data
 * Includes inventory reconciliation to detect discrepancies after sync
 */

import { httpClient } from '@/services/httpClient'
import { syncService } from '@/services/syncService'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { SYNC_PRIORITIES } from '@/config/sync'
import db from '@/db/database'
import type { SyncQueue, InventorySyncResponse, BranchInventory } from '@/types/sync'

interface SyncEntityResult {
  id: string
  success: boolean
  error?: string
}

export interface InventoryDiscrepancy {
  product_id: string
  product_name: string
  local_qty: number
  server_qty: number
  difference: number
  is_negative: boolean
}

/**
 * Enqueue a stock movement for sync
 * Called when stock_movements are created (sales, adjustments, transfers, etc.)
 */
async function enqueueStockMovement(movementId: string): Promise<void> {
  const movement = await db.getOne(
    'SELECT * FROM stock_movements WHERE id = ?',
    [movementId]
  )

  if (!movement) {
    console.warn(`[InventorySync] Movement ${movementId} not found, skipping enqueue`)
    return
  }

  await syncService.enqueueItem({
    entity_type: 'stock_movement',
    entity_id: movementId,
    operation: 'create',
    payload: JSON.stringify(movement),
    priority: SYNC_PRIORITIES.stock_movement
  })
}

/**
 * Upload a batch of stock movements to the server
 */
async function uploadBatch(items: SyncQueue[]): Promise<SyncEntityResult[]> {
  const results: SyncEntityResult[] = []

  const payloads = items.map((item) => ({
    queue_id: item.id,
    entity_id: item.entity_id,
    data: JSON.parse(item.payload)
  }))

  try {
    const response = await httpClient.post<InventorySyncResponse>(
      '/sync/inventory',
      { movements: payloads }
    )

    if (response.data.success) {
      // All succeeded
      for (const item of items) {
        results.push({ id: item.id, success: true })
        // Mark stock movement as synced
        await db.execute(
          'UPDATE stock_movements SET synced_at = ? WHERE id = ?',
          [new Date().toISOString(), item.entity_id]
        )
      }
    } else {
      // Entire batch failed
      for (const item of items) {
        results.push({ id: item.id, success: false, error: 'Server rejected inventory sync' })
      }
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Upload failed'
    for (const item of items) {
      results.push({ id: item.id, success: false, error: errorMsg })
    }
  }

  return results
}

/**
 * Fetch branch inventory data from the server
 */
async function fetchBranchInventory(branchId: string): Promise<BranchInventory | null> {
  try {
    const response = await httpClient.get<BranchInventory>(
      `/sync/inventory/${branchId}`
    )
    return response.data
  } catch (e) {
    console.error(`[InventorySync] Failed to fetch branch ${branchId} inventory:`, e)
    return null
  }
}

/**
 * Fetch consolidated stock for all branches
 */
async function fetchConsolidatedStock(): Promise<BranchInventory[]> {
  try {
    const response = await httpClient.get<BranchInventory[]>(
      '/sync/inventory/consolidated'
    )
    return response.data
  } catch (e) {
    console.error('[InventorySync] Failed to fetch consolidated stock:', e)
    return []
  }
}

/**
 * Run a full inventory sync cycle
 */
async function syncInventory(): Promise<{
  success: boolean
  uploaded: number
  error?: string
}> {
  const startTime = Date.now()
  let uploaded = 0

  try {
    // Get pending stock movements
    const pending = await syncQueueRepository.getByEntityType('stock_movement')

    if (pending.length > 0) {
      const results = await uploadBatch(pending)
      uploaded = results.filter((r) => r.success).length

      // Update statuses
      for (const result of results) {
        if (result.success) {
          await syncQueueRepository.updateStatus(result.id, 'completed')
        } else {
          await syncQueueRepository.incrementAttempts(result.id, result.error || 'Unknown error')
        }
      }
    }

    // Log the sync
    const duration = Date.now() - startTime
    await syncLogRepository.create({
      entity_type: 'stock_movement',
      entity_id: 'bulk',
      operation: 'upload',
      direction: 'upload',
      result: 'success',
      duration_ms: duration
    })

    return { success: true, uploaded }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Inventory sync failed'
    return { success: false, uploaded, error: errorMsg }
  }
}

/**
 * Reconcile local inventory against server inventory for a branch.
 * Compares local product quantities with server quantities and flags discrepancies.
 */
async function reconcileInventory(branchId: string): Promise<InventoryDiscrepancy[]> {
  const discrepancies: InventoryDiscrepancy[] = []

  // Fetch server inventory for this branch
  const serverInventory = await fetchBranchInventory(branchId)
  if (!serverInventory) {
    console.warn('[InventorySync] Could not fetch server inventory for reconciliation')
    return discrepancies
  }

  // Build a map of server quantities by product_id
  const serverQtyMap = new Map<string, { qty: number; name: string }>()
  for (const item of serverInventory.items) {
    const existing = serverQtyMap.get(item.product_id)
    if (existing) {
      // Sum quantities across variants for the same product
      existing.qty += item.quantity
    } else {
      serverQtyMap.set(item.product_id, { qty: item.quantity, name: item.product_name })
    }
  }

  // Get local product quantities
  const localProducts = await db.query<{
    id: string
    name: string
    stock: number
  }>('SELECT id, name, stock FROM products WHERE status = ?', ['active'])

  for (const product of localProducts) {
    const serverEntry = serverQtyMap.get(product.id)
    const serverQty = serverEntry?.qty ?? 0
    const localQty = product.stock ?? 0

    if (localQty !== serverQty) {
      discrepancies.push({
        product_id: product.id,
        product_name: product.name,
        local_qty: localQty,
        server_qty: serverQty,
        difference: localQty - serverQty,
        is_negative: localQty < 0
      })
    }
  }

  // Also check for server-only products not in local DB
  for (const [productId, entry] of serverQtyMap) {
    const localProduct = localProducts.find((p) => p.id === productId)
    if (!localProduct) {
      discrepancies.push({
        product_id: productId,
        product_name: entry.name,
        local_qty: 0,
        server_qty: entry.qty,
        difference: -entry.qty,
        is_negative: false
      })
    }
  }

  if (discrepancies.length > 0) {
    console.warn(
      `[InventorySync] ${discrepancies.length} inventory discrepancies found for branch ${branchId}`
    )
  }

  return discrepancies
}

/**
 * Calculate net stock movement for a product within a date range.
 * Sums all stock_movements across all terminals for the given product.
 */
async function sumMovements(
  productId: string,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  // First, get the variant IDs for this product
  const variants = await db.query<{ id: string }>(
    'SELECT id FROM product_variants WHERE product_id = ?',
    [productId]
  )

  if (variants.length === 0) {
    // No variants — check if stock_movements reference the product directly via reference
    const result = await db.getOne<{ net: number }>(
      `SELECT COALESCE(SUM(
        CASE
          WHEN movement_type IN ('receive', 'transfer_in', 'return') THEN quantity
          WHEN movement_type IN ('sale', 'transfer_out', 'adjustment', 'void') THEN -quantity
          ELSE 0
        END
      ), 0) as net
      FROM stock_movements
      WHERE reference_id = ? AND created_at >= ? AND created_at <= ?`,
      [productId, dateFrom, dateTo]
    )
    return result?.net ?? 0
  }

  const variantIds = variants.map((v) => v.id)
  const placeholders = variantIds.map(() => '?').join(',')

  const result = await db.getOne<{ net: number }>(
    `SELECT COALESCE(SUM(
      CASE
        WHEN movement_type IN ('receive', 'transfer_in', 'return') THEN quantity
        WHEN movement_type IN ('sale', 'transfer_out', 'adjustment', 'void') THEN -quantity
        ELSE 0
      END
    ), 0) as net
    FROM stock_movements
    WHERE variant_id IN (${placeholders}) AND created_at >= ? AND created_at <= ?`,
    [...variantIds, dateFrom, dateTo]
  )

  return result?.net ?? 0
}

/**
 * Flag products where current stock is negative.
 * Returns a list of discrepancies for products with stock < 0.
 */
async function flagNegativeStock(): Promise<InventoryDiscrepancy[]> {
  const negativeProducts = await db.query<{
    id: string
    name: string
    stock: number
  }>('SELECT id, name, stock FROM products WHERE stock < 0 AND status = ?', ['active'])

  return negativeProducts.map((product) => ({
    product_id: product.id,
    product_name: product.name,
    local_qty: product.stock,
    server_qty: 0,
    difference: product.stock,
    is_negative: true
  }))
}

/**
 * Perform a full reconciliation after sync.
 * Uploads pending stock movements, then reconciles inventory with the server.
 * Returns any discrepancies found.
 */
async function reconcileAfterSync(): Promise<InventoryDiscrepancy[]> {
  const startTime = Date.now()

  try {
    // 1. Upload pending stock movements
    const pending = await syncQueueRepository.getByEntityType('stock_movement')
    if (pending.length > 0) {
      const results = await uploadBatch(pending)
      for (const result of results) {
        if (result.success) {
          await syncQueueRepository.updateStatus(result.id, 'completed')
        } else {
          await syncQueueRepository.incrementAttempts(result.id, result.error || 'Unknown error')
        }
      }
    }

    // 2. Determine the branch ID (from localStorage or default)
    const branchId = localStorage.getItem('branch_id') || 'branch-main'

    // 3. Reconcile inventory with server
    const discrepancies = await reconcileInventory(branchId)

    // 4. Also flag any negative stock
    const negativeStock = await flagNegativeStock()

    // Merge negative stock flags into discrepancies (avoid duplicates)
    for (const neg of negativeStock) {
      const existing = discrepancies.find((d) => d.product_id === neg.product_id)
      if (existing) {
        existing.is_negative = true
      } else {
        discrepancies.push(neg)
      }
    }

    // 5. Log the reconciliation
    const duration = Date.now() - startTime
    await syncLogRepository.create({
      entity_type: 'inventory_reconciliation',
      entity_id: branchId,
      operation: 'reconcile',
      direction: 'download',
      result: discrepancies.length > 0 ? 'conflict' : 'success',
      duration_ms: duration
    })

    return discrepancies
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Reconciliation failed'
    console.error('[InventorySync] Reconciliation error:', errorMsg)

    await syncLogRepository.create({
      entity_type: 'inventory_reconciliation',
      entity_id: 'unknown',
      operation: 'reconcile',
      direction: 'download',
      result: 'error',
      duration_ms: Date.now() - startTime
    })

    return []
  }
}

/**
 * Register the inventory sync handler with the orchestrator
 */
function register(): void {
  syncService.registerHandler('stock_movement', uploadBatch)
}

export const inventorySyncService = {
  enqueueStockMovement,
  uploadBatch,
  fetchBranchInventory,
  fetchConsolidatedStock,
  syncInventory,
  reconcileInventory,
  sumMovements,
  flagNegativeStock,
  reconcileAfterSync,
  register
}

export default inventorySyncService
