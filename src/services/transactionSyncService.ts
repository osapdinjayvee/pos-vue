/**
 * Transaction Sync Service
 * Handles uploading completed transactions to the cloud server
 */

import { httpClient } from '@/services/httpClient'
import { syncService } from '@/services/syncService'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import db from '@/db/database'
import { SYNC_PRIORITIES } from '@/config/sync'
import type { SyncQueue, SyncUploadResponse } from '@/types/sync'
import type { Order } from '@/types/order'

interface TransactionPayload {
  order: Record<string, unknown>
  items: Record<string, unknown>[]
  payments: Record<string, unknown>[]
}

interface SyncEntityResult {
  id: string
  success: boolean
  error?: string
}

/**
 * Serialize a transaction (order + items + payments) into a sync payload
 */
async function serializeTransaction(orderId: string): Promise<TransactionPayload | null> {
  const order = await db.getOne<Order>(
    'SELECT * FROM orders WHERE id = ?',
    [orderId]
  )

  if (!order) return null

  const items = await db.query(
    'SELECT * FROM order_items WHERE order_id = ?',
    [orderId]
  )

  const payments = await db.query(
    'SELECT * FROM payments WHERE order_id = ?',
    [orderId]
  )

  return { order: order as unknown as Record<string, unknown>, items, payments }
}

/**
 * Enqueue a completed transaction for sync
 * Called after a transaction is created or voided
 */
async function enqueueTransaction(orderId: string, operation: 'create' | 'update' = 'create'): Promise<void> {
  const payload = await serializeTransaction(orderId)
  if (!payload) {
    console.warn(`[TransactionSync] Order ${orderId} not found, skipping enqueue`)
    return
  }

  await syncService.enqueueItem({
    entity_type: 'transaction',
    entity_id: orderId,
    operation,
    payload: JSON.stringify(payload),
    priority: SYNC_PRIORITIES.transaction
  })
}

/**
 * Enqueue a void operation for sync
 */
async function enqueueVoid(orderId: string): Promise<void> {
  const order = await db.getOne<Order>(
    'SELECT * FROM orders WHERE id = ?',
    [orderId]
  )

  if (!order) return

  await syncService.enqueueItem({
    entity_type: 'void',
    entity_id: orderId,
    operation: 'update',
    payload: JSON.stringify({
      order_id: orderId,
      status: order.status,
      updated_at: order.updated_at
    }),
    priority: SYNC_PRIORITIES.void
  })
}

/**
 * Enqueue a refund operation for sync
 */
async function enqueueRefund(orderId: string): Promise<void> {
  const payload = await serializeTransaction(orderId)
  if (!payload) return

  await syncService.enqueueItem({
    entity_type: 'refund',
    entity_id: orderId,
    operation: 'create',
    payload: JSON.stringify(payload),
    priority: SYNC_PRIORITIES.refund
  })
}

/**
 * Upload a batch of transactions to the server
 * This is the handler registered with the sync orchestrator
 */
async function uploadBatch(items: SyncQueue[]): Promise<SyncEntityResult[]> {
  const results: SyncEntityResult[] = []

  // Prepare payloads
  const payloads = items.map((item) => ({
    queue_id: item.id,
    entity_id: item.entity_id,
    entity_type: item.entity_type,
    operation: item.operation,
    data: JSON.parse(item.payload)
  }))

  try {
    const response = await httpClient.post<SyncUploadResponse>(
      '/sync/transactions',
      { transactions: payloads }
    )

    const syncedIds = new Set(response.data.synced_ids || [])
    const failedMap = new Map(
      (response.data.failed_ids || []).map((f) => [f.id, f.error])
    )

    for (const item of items) {
      if (syncedIds.has(item.entity_id)) {
        results.push({ id: item.id, success: true })
        // Mark the order as synced
        await markTransactionSynced(item.entity_id)
        // Enqueue synced transaction for EIS submission (non-blocking)
        import('@/services/eisService').then(({ eisService }) => {
          eisService.enqueueTransaction(item.entity_id).catch(() => { /* EIS enqueue failed silently */ })
        }).catch(() => { /* EIS module not available */ })
      } else if (failedMap.has(item.entity_id)) {
        results.push({
          id: item.id,
          success: false,
          error: `server_rejected: ${failedMap.get(item.entity_id)}`
        })
      } else {
        // Not mentioned in response - treat as synced (idempotent)
        results.push({ id: item.id, success: true })
        await markTransactionSynced(item.entity_id)
      }
    }
  } catch (e) {
    // Entire batch failed - mark all as failed
    const errorMsg = e instanceof Error ? e.message : 'Upload failed'
    for (const item of items) {
      results.push({ id: item.id, success: false, error: errorMsg })
    }
  }

  return results
}

/**
 * Mark a transaction as synced in the local database
 */
async function markTransactionSynced(orderId: string): Promise<void> {
  const now = new Date().toISOString()
  await db.execute(
    'UPDATE orders SET synced_at = ? WHERE id = ?',
    [now, orderId]
  )
}

/**
 * Register the transaction sync handler with the orchestrator
 */
function register(): void {
  syncService.registerHandler('transaction', uploadBatch)
  syncService.registerHandler('void', uploadBatch)
  syncService.registerHandler('refund', uploadBatch)
}

export const transactionSyncService = {
  serializeTransaction,
  enqueueTransaction,
  enqueueVoid,
  enqueueRefund,
  uploadBatch,
  markTransactionSynced,
  register
}

export default transactionSyncService
