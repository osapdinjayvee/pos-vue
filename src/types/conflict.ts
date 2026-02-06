/**
 * Conflict Type Definitions
 * Types for conflict detection, resolution, and logging
 */

// =====================
// Conflict Resolution
// =====================

export type ConflictResolutionType = 'local' | 'server' | 'merged' | 'manual'

export interface ConflictLog {
  id: string
  entity_type: string
  entity_id: string
  local_version: string
  server_version: string
  resolution: ConflictResolutionType
  resolved_by: string | null
  created_at: string
  resolved_at: string | null
}

export interface ConflictLogInput {
  entity_type: string
  entity_id: string
  local_version: string
  server_version: string
  resolution: ConflictResolutionType
  resolved_by?: string
}

// =====================
// Conflict Detail
// =====================

export interface ConflictDetail {
  conflict: ConflictLog
  localData: Record<string, unknown>
  serverData: Record<string, unknown>
  differences: ConflictDifference[]
}

export interface ConflictDifference {
  field: string
  localValue: unknown
  serverValue: unknown
}

// =====================
// Conflict Stats
// =====================

export interface ConflictStats {
  total: number
  unresolved: number
  resolvedByLocal: number
  resolvedByServer: number
  resolvedManually: number
}

// =====================
// Conflict Resolution Rules
// =====================

export type ConflictStrategy = 'server_wins' | 'local_wins' | 'merge' | 'manual' | 'append_only' | 'sum_movements'

export interface ConflictResolutionRule {
  entityType: string
  strategy: ConflictStrategy
  mergeFields?: string[]
}

export const CONFLICT_RESOLUTION_RULES: Record<string, ConflictResolutionRule> = {
  transaction: { entityType: 'transaction', strategy: 'append_only' },
  product: { entityType: 'product', strategy: 'server_wins' },
  price: { entityType: 'price', strategy: 'server_wins' },
  user: { entityType: 'user', strategy: 'server_wins' },
  customer: { entityType: 'customer', strategy: 'merge', mergeFields: ['phone'] },
  inventory: { entityType: 'inventory', strategy: 'sum_movements' }
}
