/**
 * Conflict Service
 * Handles conflict detection and resolution during sync operations
 */

import { conflictLogRepository } from '@/repositories/conflictLogRepository'
import { CONFLICT_RESOLUTION_RULES } from '@/types/conflict'
import type { ConflictLog, ConflictLogInput, ConflictDetail, ConflictDifference, ConflictResolutionType } from '@/types/conflict'

interface ResolveByRulesResult {
  resolution: ConflictResolutionType
  resolvedData: Record<string, unknown>
  conflictId: string
}

/**
 * Detect if there is a conflict between local and server versions
 * Uses timestamp comparison for last-write-wins
 */
function detectConflict(
  localUpdatedAt: string,
  serverUpdatedAt: string,
  localSyncedAt: string | null
): boolean {
  // If local was never synced, no conflict (new data)
  if (!localSyncedAt) return false

  // If local was modified after last sync AND server has a newer version
  const localModified = new Date(localUpdatedAt) > new Date(localSyncedAt)
  const serverModified = new Date(serverUpdatedAt) > new Date(localSyncedAt)

  return localModified && serverModified
}

/**
 * Resolve a conflict using last-write-wins strategy
 * Server version wins by default
 */
function resolveWithLWW(
  localUpdatedAt: string,
  serverUpdatedAt: string
): 'local' | 'server' {
  return new Date(serverUpdatedAt) >= new Date(localUpdatedAt) ? 'server' : 'local'
}

/**
 * Log a conflict and its resolution
 */
async function logConflict(input: ConflictLogInput): Promise<ConflictLog> {
  return await conflictLogRepository.create(input)
}

/**
 * Get conflict details with parsed versions and differences
 */
function getConflictDetails(conflict: ConflictLog): ConflictDetail {
  const localData = JSON.parse(conflict.local_version) as Record<string, unknown>
  const serverData = JSON.parse(conflict.server_version) as Record<string, unknown>

  const differences: ConflictDifference[] = []

  // Find all differing fields
  const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)])
  for (const key of allKeys) {
    const localVal = localData[key]
    const serverVal = serverData[key]

    if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
      differences.push({
        field: key,
        localValue: localVal,
        serverValue: serverVal
      })
    }
  }

  return {
    conflict,
    localData,
    serverData,
    differences
  }
}

/**
 * Manually resolve a conflict
 */
async function resolveManually(
  conflictId: string,
  resolution: ConflictResolutionType,
  resolvedBy: string
): Promise<void> {
  await conflictLogRepository.resolve(conflictId, resolution, resolvedBy)
}

/**
 * Get conflict statistics
 */
async function getConflictStats() {
  return await conflictLogRepository.getStats()
}

/**
 * Resolve a conflict using entity-specific rules from CONFLICT_RESOLUTION_RULES
 * Falls back to last-write-wins for unconfigured entity types
 */
async function resolveByRules(
  entityType: string,
  localVersion: Record<string, unknown>,
  serverVersion: Record<string, unknown>,
  localTimestamp: string,
  serverTimestamp: string
): Promise<ResolveByRulesResult> {
  const rule = CONFLICT_RESOLUTION_RULES[entityType]
  let resolution: ConflictResolutionType
  let resolvedData: Record<string, unknown>

  if (!rule) {
    // No rule configured — fall back to LWW
    const lwwResult = resolveWithLWW(localTimestamp, serverTimestamp)
    resolution = lwwResult
    resolvedData = lwwResult === 'server' ? { ...serverVersion } : { ...localVersion }
  } else {
    switch (rule.strategy) {
      case 'server_wins':
        resolution = 'server'
        resolvedData = { ...serverVersion }
        break

      case 'local_wins':
        resolution = 'local'
        resolvedData = { ...localVersion }
        break

      case 'append_only':
        // For append-only entities (transactions), both versions are kept
        // Server version is authoritative for existing records
        resolution = 'server'
        resolvedData = { ...serverVersion }
        break

      case 'merge': {
        // Merge: take server version as base, overlay specific local fields
        resolvedData = { ...serverVersion }
        if (rule.mergeFields) {
          for (const field of rule.mergeFields) {
            if (localVersion[field] !== undefined && localVersion[field] !== null) {
              resolvedData[field] = localVersion[field]
            }
          }
        }
        resolution = 'merged'
        break
      }

      case 'sum_movements':
        // For inventory: sum the quantities from both versions
        resolvedData = { ...serverVersion }
        const localQty = (localVersion.quantity as number) || 0
        const serverQty = (serverVersion.quantity as number) || 0
        resolvedData.quantity = localQty + serverQty
        resolution = 'merged'
        break

      case 'manual':
        // Manual resolution required — log and return server as default pending review
        resolution = 'manual'
        resolvedData = { ...serverVersion }
        break

      default:
        resolution = resolveWithLWW(localTimestamp, serverTimestamp)
        resolvedData = resolution === 'server' ? { ...serverVersion } : { ...localVersion }
    }
  }

  // Log the conflict
  const conflict = await logConflict({
    entity_type: entityType,
    entity_id: (localVersion.id as string) || (serverVersion.id as string) || 'unknown',
    local_version: JSON.stringify(localVersion),
    server_version: JSON.stringify(serverVersion),
    resolution,
    resolved_by: resolution === 'manual' ? undefined : 'system'
  })

  return {
    resolution,
    resolvedData,
    conflictId: conflict.id
  }
}

export const conflictService = {
  detectConflict,
  resolveWithLWW,
  logConflict,
  getConflictDetails,
  resolveManually,
  getConflictStats,
  resolveByRules
}

export default conflictService
