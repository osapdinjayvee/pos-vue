/**
 * Customer Sync Service
 * Handles customer deduplication and sync conflict resolution
 */

import db from '@/db/database'
import { conflictService } from '@/services/conflictService'
import { syncLogRepository } from '@/repositories/syncLogRepository'

interface DeduplicationResult {
  mergedCount: number
  duplicateIds: string[]
}

interface SyncCustomersResult {
  updated: number
  newCustomers: number
  conflicts: number
}

interface CustomerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  type: string
  notes: string | null
  loyalty_points: number
  lifetime_spend: number
  tier_id: string | null
  is_active: number
  created_at: string
  updated_at: string
  synced_at: string | null
}

/**
 * Deduplicate customers by phone number.
 * Groups customers by normalized phone, picks a primary for each group,
 * reassigns orders and loyalty_points from duplicates to the primary,
 * logs the conflict, and marks duplicates as inactive.
 */
async function deduplicateCustomers(): Promise<DeduplicationResult> {
  const startTime = Date.now()
  let mergedCount = 0
  const duplicateIds: string[] = []

  // Fetch all customers
  const customers = await db.query<CustomerRow>('SELECT * FROM customers')

  // Group by normalized phone (lowercase, trimmed)
  const phoneGroups = new Map<string, CustomerRow[]>()

  for (const customer of customers) {
    if (!customer.phone) continue

    const normalizedPhone = customer.phone.toLowerCase().trim()
    if (!normalizedPhone) continue

    const group = phoneGroups.get(normalizedPhone)
    if (group) {
      group.push(customer)
    } else {
      phoneGroups.set(normalizedPhone, [customer])
    }
  }

  // Process groups with duplicates
  for (const [, group] of phoneGroups) {
    if (group.length <= 1) continue

    // Pick primary: prefer synced (has synced_at), otherwise earliest created_at
    const sorted = [...group].sort((a, b) => {
      // Synced customers first
      if (a.synced_at && !b.synced_at) return -1
      if (!a.synced_at && b.synced_at) return 1

      // Then by earliest created_at
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const primary = sorted[0]
    const duplicates = sorted.slice(1)

    for (const duplicate of duplicates) {
      const now = db.getCurrentTimestamp()

      try {
        // Reassign orders from duplicate to primary
        await db.execute(
          'UPDATE orders SET customer_id = ? WHERE customer_id = ?',
          [primary.id, duplicate.id]
        )

        // Reassign loyalty_points entries from duplicate to primary
        await db.execute(
          'UPDATE loyalty_points SET customer_id = ? WHERE customer_id = ?',
          [primary.id, duplicate.id]
        )

        // Log the conflict via conflictService
        await conflictService.logConflict({
          entity_type: 'customer',
          entity_id: duplicate.id,
          local_version: JSON.stringify(duplicate),
          server_version: JSON.stringify(primary),
          resolution: 'merged',
          resolved_by: 'system'
        })

        // Mark duplicate as inactive
        await db.execute(
          `UPDATE customers SET is_active = 0, notes = ?, updated_at = ? WHERE id = ?`,
          [`Merged into ${primary.id} during sync dedup`, now, duplicate.id]
        )

        duplicateIds.push(duplicate.id)
        mergedCount++
      } catch (e) {
        console.error(`[CustomerSync] Failed to merge duplicate ${duplicate.id} into ${primary.id}:`, e)
      }
    }
  }

  // Log the deduplication operation
  const duration = Date.now() - startTime
  if (mergedCount > 0) {
    await syncLogRepository.create({
      entity_type: 'customer',
      entity_id: 'dedup',
      operation: 'update',
      direction: 'download',
      result: 'success',
      duration_ms: duration
    })
  }

  console.log(`[CustomerSync] Deduplication complete: ${mergedCount} duplicates merged`)

  return { mergedCount, duplicateIds }
}

/**
 * Sync customers from server to local database.
 * For each server customer:
 * - If new, insert directly
 * - If existing and not modified locally since last sync, apply server version
 * - If existing and modified locally since last sync, resolve using conflict rules
 *   (customer strategy = merge: keep server demographics, combine local fields like phone)
 */
async function syncCustomersFromServer(
  serverCustomers: Array<Record<string, unknown>>
): Promise<SyncCustomersResult> {
  const startTime = Date.now()
  let updated = 0
  let newCustomers = 0
  let conflicts = 0
  const now = db.getCurrentTimestamp()

  for (const serverCustomer of serverCustomers) {
    try {
      const existing = await db.getOne<CustomerRow>(
        `SELECT id, name, email, phone, address, type, notes, loyalty_points,
          lifetime_spend, tier_id, is_active, created_at, updated_at, synced_at
         FROM customers WHERE id = ?`,
        [serverCustomer.id as string]
      )

      if (!existing) {
        // New customer from server -- insert directly
        await db.execute(
          `INSERT INTO customers (id, name, email, phone, address, type, notes,
            loyalty_points, lifetime_spend, tier_id, is_active, created_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            serverCustomer.id,
            serverCustomer.name,
            serverCustomer.email || null,
            serverCustomer.phone || null,
            serverCustomer.address || null,
            serverCustomer.type || 'regular',
            serverCustomer.notes || null,
            serverCustomer.loyalty_points || 0,
            serverCustomer.lifetime_spend || 0,
            serverCustomer.tier_id || null,
            serverCustomer.is_active ?? 1,
            now,
            now,
            now
          ]
        )
        newCustomers++
        continue
      }

      // Check for conflict: local modified since last sync AND server version differs
      const serverUpdatedAt = (serverCustomer.updated_at as string) || now
      const localUpdatedAt = existing.updated_at
      const localSyncedAt = existing.synced_at

      const hasConflict = conflictService.detectConflict(
        localUpdatedAt,
        serverUpdatedAt,
        localSyncedAt
      )

      if (hasConflict) {
        // Build local version record for conflict resolution
        const localVersion: Record<string, unknown> = {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          address: existing.address,
          type: existing.type,
          notes: existing.notes,
          loyalty_points: existing.loyalty_points,
          lifetime_spend: existing.lifetime_spend,
          tier_id: existing.tier_id,
          is_active: existing.is_active,
          updated_at: existing.updated_at
        }

        const serverVersion: Record<string, unknown> = {
          id: serverCustomer.id,
          name: serverCustomer.name,
          email: serverCustomer.email,
          phone: serverCustomer.phone,
          address: serverCustomer.address,
          type: serverCustomer.type,
          notes: serverCustomer.notes,
          loyalty_points: serverCustomer.loyalty_points,
          lifetime_spend: serverCustomer.lifetime_spend,
          tier_id: serverCustomer.tier_id,
          is_active: serverCustomer.is_active,
          updated_at: serverUpdatedAt
        }

        // Resolve using entity-specific rules (customer = merge, mergeFields: ['phone'])
        // This keeps server demographics as base, overlays local phone
        const result = await conflictService.resolveByRules(
          'customer',
          localVersion,
          serverVersion,
          localUpdatedAt,
          serverUpdatedAt
        )

        if (result.resolution === 'manual') {
          // Manual resolution needed -- do NOT apply update, leave for user review
          conflicts++
          console.log(`[CustomerSync] Conflict for customer ${serverCustomer.id} requires manual resolution (id: ${result.conflictId})`)
          continue
        }

        // Apply the resolved data
        // For merge strategy: server demographics as base with local merge fields overlaid
        // Also combine transaction history: keep the higher loyalty_points and lifetime_spend
        const resolved = result.resolvedData
        const mergedLoyaltyPoints = Math.max(
          (resolved.loyalty_points as number) || 0,
          existing.loyalty_points || 0
        )
        const mergedLifetimeSpend = Math.max(
          (resolved.lifetime_spend as number) || 0,
          existing.lifetime_spend || 0
        )

        await db.execute(
          `UPDATE customers SET
            name = ?, email = ?, phone = ?, address = ?, type = ?, notes = ?,
            loyalty_points = ?, lifetime_spend = ?, tier_id = ?, is_active = ?,
            updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [
            resolved.name,
            resolved.email,
            resolved.phone,
            resolved.address,
            resolved.type,
            resolved.notes,
            mergedLoyaltyPoints,
            mergedLifetimeSpend,
            resolved.tier_id,
            resolved.is_active,
            now,
            now,
            serverCustomer.id
          ]
        )

        conflicts++
        updated++
        console.log(`[CustomerSync] Conflict resolved for customer ${serverCustomer.id}: ${result.resolution}`)
      } else {
        // No conflict -- apply server version directly
        await db.execute(
          `UPDATE customers SET
            name = ?, email = ?, phone = ?, address = ?, type = ?, notes = ?,
            loyalty_points = ?, lifetime_spend = ?, tier_id = ?, is_active = ?,
            updated_at = ?, synced_at = ?
           WHERE id = ?`,
          [
            serverCustomer.name,
            serverCustomer.email,
            serverCustomer.phone,
            serverCustomer.address,
            serverCustomer.type,
            serverCustomer.notes,
            serverCustomer.loyalty_points,
            serverCustomer.lifetime_spend,
            serverCustomer.tier_id,
            serverCustomer.is_active,
            now,
            now,
            serverCustomer.id
          ]
        )
        updated++
      }
    } catch (e) {
      console.error(`[CustomerSync] Failed to sync customer ${serverCustomer.id}:`, e)
    }
  }

  // Log the sync operation
  const duration = Date.now() - startTime
  const hasConflicts = conflicts > 0
  await syncLogRepository.create({
    entity_type: 'customer',
    entity_id: 'bulk',
    operation: 'download',
    direction: 'download',
    result: hasConflicts ? 'conflict' : 'success',
    duration_ms: duration
  })

  console.log(
    `[CustomerSync] Customer sync complete: ${updated} updated, ` +
    `${newCustomers} new, ${conflicts} conflicts`
  )

  return { updated, newCustomers, conflicts }
}

export const customerSyncService = {
  deduplicateCustomers,
  syncCustomersFromServer
}

export default customerSyncService
