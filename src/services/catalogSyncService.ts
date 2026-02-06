/**
 * Catalog Sync Service
 * Downloads product catalog updates from the cloud server to local database
 * Includes conflict detection and rule-based resolution for product updates
 */

import { httpClient } from '@/services/httpClient'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { conflictService } from '@/services/conflictService'
import db from '@/db/database'
import type { CatalogDownloadResponse } from '@/types/sync'

/**
 * Fetch updated products from server since last download
 */
async function fetchUpdatedCatalog(sinceTimestamp?: string): Promise<CatalogDownloadResponse | null> {
  try {
    const params = sinceTimestamp ? { since: sinceTimestamp } : {}
    const response = await httpClient.get<CatalogDownloadResponse>(
      '/sync/catalog',
      { params }
    )
    return response.data
  } catch (e) {
    console.error('[CatalogSync] Failed to fetch catalog:', e)
    return null
  }
}

/**
 * Apply product updates to local database (basic upsert without conflict detection)
 */
async function applyProductUpdates(products: Array<Record<string, unknown>>): Promise<number> {
  let updated = 0
  const now = db.getCurrentTimestamp()

  for (const product of products) {
    try {
      // Upsert: insert or update
      const existing = await db.getOne<{ id: string }>(
        'SELECT id FROM products WHERE id = ?',
        [product.id as string]
      )

      if (existing) {
        await db.execute(
          `UPDATE products SET
            name = ?, description = ?, price = ?, cost = ?, sku = ?, barcode = ?,
            category_id = ?, status = ?, tax_type = ?, image = ?,
            wholesale_price = ?, wholesale_min_qty = ?, auto_apply_wholesale = ?,
            updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [
            product.name, product.description, product.price, product.cost,
            product.sku, product.barcode, product.category_id, product.status,
            product.tax_type, product.image, product.wholesale_price,
            product.wholesale_min_qty, product.auto_apply_wholesale,
            now, now, product.id
          ]
        )
      } else {
        await db.execute(
          `INSERT INTO products (id, name, description, price, cost, sku, barcode, category_id,
            stock, low_stock_threshold, status, tax_type, image, wholesale_price,
            wholesale_min_qty, auto_apply_wholesale, created_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id, product.name, product.description, product.price, product.cost,
            product.sku, product.barcode, product.category_id,
            product.stock || 0, product.low_stock_threshold || 10,
            product.status || 'active', product.tax_type || 'vatable',
            product.image, product.wholesale_price,
            product.wholesale_min_qty || 1, product.auto_apply_wholesale || 0,
            now, now, now
          ]
        )
      }

      updated++
    } catch (e) {
      console.error(`[CatalogSync] Failed to apply product ${product.id}:`, e)
    }
  }

  return updated
}

/**
 * Apply product updates with conflict detection and rule-based resolution.
 * - New server products: upsert directly
 * - Existing products modified locally since last sync AND server version differs: resolve via rules
 * - Existing products not modified locally: apply server version directly
 *
 * Returns counts of updated, conflicted, and skipped products.
 */
async function applyProductUpdatesWithConflictResolution(
  products: Array<Record<string, unknown>>
): Promise<{ updated: number; conflicts: number; newProducts: number }> {
  let updated = 0
  let conflicts = 0
  let newProducts = 0
  const now = db.getCurrentTimestamp()

  for (const product of products) {
    try {
      const existing = await db.getOne<{
        id: string
        name: string
        description: string | null
        price: number
        cost: number | null
        sku: string | null
        barcode: string | null
        category_id: string | null
        stock: number
        low_stock_threshold: number
        status: string
        tax_type: string
        image: string | null
        wholesale_price: number | null
        wholesale_min_qty: number | null
        auto_apply_wholesale: number
        updated_at: string
        synced_at: string | null
      }>(
        `SELECT id, name, description, price, cost, sku, barcode, category_id,
          stock, low_stock_threshold, status, tax_type, image,
          wholesale_price, wholesale_min_qty, auto_apply_wholesale,
          updated_at, synced_at
         FROM products WHERE id = ?`,
        [product.id as string]
      )

      if (!existing) {
        // New product from server — insert directly
        await db.execute(
          `INSERT INTO products (id, name, description, price, cost, sku, barcode, category_id,
            stock, low_stock_threshold, status, tax_type, image, wholesale_price,
            wholesale_min_qty, auto_apply_wholesale, created_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id, product.name, product.description, product.price, product.cost,
            product.sku, product.barcode, product.category_id,
            product.stock || 0, product.low_stock_threshold || 10,
            product.status || 'active', product.tax_type || 'vatable',
            product.image, product.wholesale_price,
            product.wholesale_min_qty || 1, product.auto_apply_wholesale || 0,
            now, now, now
          ]
        )
        newProducts++
        continue
      }

      // Check for conflict: local modified since last sync AND server version differs
      const serverUpdatedAt = (product.updated_at as string) || now
      const localUpdatedAt = existing.updated_at
      const localSyncedAt = existing.synced_at

      const hasConflict = conflictService.detectConflict(
        localUpdatedAt,
        serverUpdatedAt,
        localSyncedAt
      )

      if (hasConflict) {
        // Build local version record for conflict logging
        const localVersion: Record<string, unknown> = {
          id: existing.id,
          name: existing.name,
          description: existing.description,
          price: existing.price,
          cost: existing.cost,
          sku: existing.sku,
          barcode: existing.barcode,
          category_id: existing.category_id,
          status: existing.status,
          tax_type: existing.tax_type,
          image: existing.image,
          wholesale_price: existing.wholesale_price,
          wholesale_min_qty: existing.wholesale_min_qty,
          auto_apply_wholesale: existing.auto_apply_wholesale,
          updated_at: existing.updated_at
        }

        const serverVersion: Record<string, unknown> = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          sku: product.sku,
          barcode: product.barcode,
          category_id: product.category_id,
          status: product.status,
          tax_type: product.tax_type,
          image: product.image,
          wholesale_price: product.wholesale_price,
          wholesale_min_qty: product.wholesale_min_qty,
          auto_apply_wholesale: product.auto_apply_wholesale,
          updated_at: serverUpdatedAt
        }

        // Resolve using entity-specific rules (product = server_wins)
        const result = await conflictService.resolveByRules(
          'product',
          localVersion,
          serverVersion,
          localUpdatedAt,
          serverUpdatedAt
        )

        if (result.resolution === 'manual') {
          // Manual resolution needed — do NOT apply update, leave for user review
          conflicts++
          console.log(`[CatalogSync] Conflict for product ${product.id} requires manual resolution (id: ${result.conflictId})`)
          continue
        }

        // Apply the resolved data (for server_wins, this is the server version)
        const resolved = result.resolvedData
        await db.execute(
          `UPDATE products SET
            name = ?, description = ?, price = ?, cost = ?, sku = ?, barcode = ?,
            category_id = ?, status = ?, tax_type = ?, image = ?,
            wholesale_price = ?, wholesale_min_qty = ?, auto_apply_wholesale = ?,
            updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [
            resolved.name, resolved.description, resolved.price, resolved.cost,
            resolved.sku, resolved.barcode, resolved.category_id, resolved.status,
            resolved.tax_type, resolved.image, resolved.wholesale_price,
            resolved.wholesale_min_qty, resolved.auto_apply_wholesale,
            now, now, product.id
          ]
        )

        conflicts++
        updated++
        console.log(`[CatalogSync] Conflict resolved for product ${product.id}: ${result.resolution}`)
      } else {
        // No conflict — apply server version directly
        await db.execute(
          `UPDATE products SET
            name = ?, description = ?, price = ?, cost = ?, sku = ?, barcode = ?,
            category_id = ?, status = ?, tax_type = ?, image = ?,
            wholesale_price = ?, wholesale_min_qty = ?, auto_apply_wholesale = ?,
            updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [
            product.name, product.description, product.price, product.cost,
            product.sku, product.barcode, product.category_id, product.status,
            product.tax_type, product.image, product.wholesale_price,
            product.wholesale_min_qty, product.auto_apply_wholesale,
            now, now, product.id
          ]
        )
        updated++
      }
    } catch (e) {
      console.error(`[CatalogSync] Failed to apply product ${product.id}:`, e)
    }
  }

  return { updated, conflicts, newProducts }
}

/**
 * Apply category updates to local database
 */
async function applyCategoryUpdates(categories: Array<Record<string, unknown>>): Promise<number> {
  let updated = 0
  const now = db.getCurrentTimestamp()

  for (const category of categories) {
    try {
      const existing = await db.getOne<{ id: string }>(
        'SELECT id FROM categories WHERE id = ?',
        [category.id as string]
      )

      if (existing) {
        await db.execute(
          `UPDATE categories SET name = ?, description = ?, icon = ?, parent_id = ?,
            display_order = ?, is_active = ?, updated_at = ?
           WHERE id = ?`,
          [
            category.name, category.description, category.icon, category.parent_id,
            category.display_order, category.is_active, now, category.id
          ]
        )
      } else {
        await db.execute(
          `INSERT INTO categories (id, name, description, icon, parent_id, display_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id, category.name, category.description, category.icon,
            category.parent_id, category.display_order || 0, category.is_active ?? 1,
            now, now
          ]
        )
      }

      updated++
    } catch (e) {
      console.error(`[CatalogSync] Failed to apply category ${category.id}:`, e)
    }
  }

  return updated
}

/**
 * Handle product deletions from server
 * Marks products as discontinued rather than deleting (preserves sales history)
 */
async function handleProductDeletions(deletedIds: string[]): Promise<number> {
  let handled = 0
  const now = db.getCurrentTimestamp()

  for (const id of deletedIds) {
    try {
      await db.execute(
        `UPDATE products SET status = 'discontinued', updated_at = ? WHERE id = ?`,
        [now, id]
      )
      handled++
    } catch (e) {
      console.error(`[CatalogSync] Failed to mark product ${id} as discontinued:`, e)
    }
  }

  return handled
}

/**
 * Run a full catalog sync (basic, without conflict resolution)
 */
async function syncCatalog(): Promise<{
  success: boolean
  productsUpdated: number
  categoriesUpdated: number
  productsDiscontinued: number
  error?: string
}> {
  const startTime = Date.now()

  // Get last download timestamp
  const status = await db.getOne<{ last_download: string | null }>(
    `SELECT last_download FROM sync_status WHERE terminal_id = 'POS-001'`
  )

  const catalog = await fetchUpdatedCatalog(status?.last_download || undefined)

  if (!catalog) {
    return {
      success: false,
      productsUpdated: 0,
      categoriesUpdated: 0,
      productsDiscontinued: 0,
      error: 'Failed to fetch catalog from server'
    }
  }

  const productsUpdated = await applyProductUpdates(catalog.products || [])
  const categoriesUpdated = await applyCategoryUpdates(catalog.categories || [])
  const productsDiscontinued = await handleProductDeletions(catalog.deleted_product_ids || [])

  // Update last_download timestamp
  const downloadTimestamp = catalog.server_timestamp || new Date().toISOString()
  await db.execute(
    `UPDATE sync_status SET last_download = ? WHERE terminal_id = 'POS-001'`,
    [downloadTimestamp]
  )

  // Log the sync
  const duration = Date.now() - startTime
  await syncLogRepository.create({
    entity_type: 'catalog',
    entity_id: 'bulk',
    operation: 'download',
    direction: 'download',
    result: 'success',
    duration_ms: duration
  })

  return {
    success: true,
    productsUpdated,
    categoriesUpdated,
    productsDiscontinued
  }
}

/**
 * Run a full catalog sync with conflict detection and rule-based resolution.
 * This is the preferred sync method that:
 * - Detects conflicts when local products were modified since last sync
 * - Uses CONFLICT_RESOLUTION_RULES (server_wins for products) to resolve automatically
 * - Logs all conflicts for audit trail
 * - Marks deleted products as discontinued (preserves transaction data)
 * - Inserts new server products directly
 */
async function syncCatalogWithConflictResolution(): Promise<{
  success: boolean
  productsUpdated: number
  productsNew: number
  productsConflicted: number
  categoriesUpdated: number
  productsDiscontinued: number
  error?: string
}> {
  const startTime = Date.now()

  // Get last download timestamp
  const status = await db.getOne<{ last_download: string | null }>(
    `SELECT last_download FROM sync_status WHERE terminal_id = 'POS-001'`
  )

  const catalog = await fetchUpdatedCatalog(status?.last_download || undefined)

  if (!catalog) {
    return {
      success: false,
      productsUpdated: 0,
      productsNew: 0,
      productsConflicted: 0,
      categoriesUpdated: 0,
      productsDiscontinued: 0,
      error: 'Failed to fetch catalog from server'
    }
  }

  // Apply product updates with conflict detection
  const productResult = await applyProductUpdatesWithConflictResolution(catalog.products || [])
  const categoriesUpdated = await applyCategoryUpdates(catalog.categories || [])
  const productsDiscontinued = await handleProductDeletions(catalog.deleted_product_ids || [])

  // Update last_download timestamp
  const downloadTimestamp = catalog.server_timestamp || new Date().toISOString()
  await db.execute(
    `UPDATE sync_status SET last_download = ? WHERE terminal_id = 'POS-001'`,
    [downloadTimestamp]
  )

  // Log the sync with conflict info
  const duration = Date.now() - startTime
  const hasConflicts = productResult.conflicts > 0
  await syncLogRepository.create({
    entity_type: 'catalog',
    entity_id: 'bulk',
    operation: 'download',
    direction: 'download',
    result: hasConflicts ? 'conflict' : 'success',
    duration_ms: duration
  })

  console.log(
    `[CatalogSync] Catalog sync complete: ${productResult.updated} updated, ` +
    `${productResult.newProducts} new, ${productResult.conflicts} conflicts, ` +
    `${categoriesUpdated} categories, ${productsDiscontinued} discontinued`
  )

  return {
    success: true,
    productsUpdated: productResult.updated,
    productsNew: productResult.newProducts,
    productsConflicted: productResult.conflicts,
    categoriesUpdated,
    productsDiscontinued
  }
}

export const catalogSyncService = {
  fetchUpdatedCatalog,
  applyProductUpdates,
  applyProductUpdatesWithConflictResolution,
  applyCategoryUpdates,
  handleProductDeletions,
  syncCatalog,
  syncCatalogWithConflictResolution
}

export default catalogSyncService
