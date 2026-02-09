/**
 * Sync Type Definitions
 * Types for cloud sync queue, logs, status, and branch data
 */

// =====================
// Sync Queue
// =====================

export type SyncEntityType = 'transaction' | 'void' | 'refund' | 'stock_movement' | 'terms_acceptance' | 'activation'
export type SyncOperation = 'create' | 'update'
export type SyncQueueStatus = 'pending' | 'syncing' | 'failed' | 'completed'
export type SyncDirection = 'upload' | 'download'
export type SyncResultType = 'success' | 'conflict' | 'error'

export interface SyncQueue {
  id: string
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  payload: string
  priority: number
  created_at: string
  attempts: number
  last_attempt: string | null
  last_error: string | null
  status: SyncQueueStatus
}

export interface SyncQueueInput {
  entity_type: SyncEntityType
  entity_id: string
  operation: SyncOperation
  payload: string
  priority?: number
}

// =====================
// Sync Log
// =====================

export interface SyncLog {
  id: string
  entity_type: string
  entity_id: string
  operation: string
  direction: SyncDirection
  result: SyncResultType
  duration_ms: number
  synced_at: string
}

export interface SyncLogInput {
  entity_type: string
  entity_id: string
  operation: string
  direction: SyncDirection
  result: SyncResultType
  duration_ms: number
}

// =====================
// Sync Status
// =====================

export type SyncStatusState = 'idle' | 'syncing' | 'error'

export interface SyncStatus {
  terminal_id: string
  last_sync: string | null
  last_download: string | null
  pending_count: number
  error_count: number
  status: SyncStatusState
}

// =====================
// Sync Configuration
// =====================

export interface SyncConfig {
  apiBaseUrl: string
  syncInterval: number
  batchSize: number
  maxRetries: number
  initialRetryDelay: number
  maxRetryDelay: number
  backoffMultiplier: number
  requestTimeout: number
}

// =====================
// Sync Result
// =====================

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: SyncError[]
  duration_ms: number
}

export interface SyncError {
  entity_id: string
  entity_type: string
  error: string
  attempts: number
}

export interface SyncBatchResult {
  uploaded: number
  downloaded: number
  conflicts: number
  errors: number
}

// =====================
// Branch Types
// =====================

export interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  timezone: string
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BranchSummary {
  branch_id: string
  branch_name: string
  branch_code: string
  today_sales: number
  today_transactions: number
  today_average_ticket: number
  last_sync: string | null
  is_online: boolean
  pending_sync_count: number
}

export interface BranchComparison {
  branches: BranchSummary[]
  period_start: string
  period_end: string
  totals: {
    total_sales: number
    total_transactions: number
    average_ticket: number
  }
}

// =====================
// Branch Inventory
// =====================

export interface BranchInventory {
  branch_id: string
  branch_name: string
  items: BranchStockItem[]
  last_updated: string
}

export interface BranchStockItem {
  variant_id: string
  product_id: string
  product_name: string
  sku: string
  branch_id: string
  branch_name: string
  quantity: number
  last_movement_at: string
}

export interface ConsolidatedStock {
  variant_id: string
  product_id: string
  product_name: string
  sku: string
  total_quantity: number
  branches: Array<{
    branch_id: string
    branch_name: string
    quantity: number
  }>
}

// =====================
// API Response Types
// =====================

export interface SyncUploadResponse {
  success: boolean
  synced_ids: string[]
  failed_ids: Array<{ id: string; error: string }>
}

export interface CatalogDownloadResponse {
  products: Array<Record<string, unknown>>
  categories: Array<Record<string, unknown>>
  deleted_product_ids: string[]
  server_timestamp: string
}

export interface InventorySyncResponse {
  success: boolean
  synced_movements: number
  branch_inventory?: BranchInventory
}

// =====================
// Bulk Sync Progress
// =====================

export interface BulkSyncProgress {
  total: number
  processed: number
  successful: number
  failed: number
  currentBatch: number
  totalBatches: number
  estimatedTimeRemaining: number
  errors: SyncError[]
  startedAt: string
  isResuming: boolean
}

// =====================
// Sync Health
// =====================

export type SyncHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface SyncHealth {
  terminal_id: string
  branch_id: string
  last_heartbeat: string | null
  last_upload: string | null
  last_download: string | null
  queue_depth: number
  error_count: number
  status: SyncHealthStatus
  updated_at: string
}

export interface SyncHealthThresholds {
  syncOverdueMins: number
  queueDepthWarning: number
  queueDepthCritical: number
  errorCountWarning: number
}

export const DEFAULT_HEALTH_THRESHOLDS: SyncHealthThresholds = {
  syncOverdueMins: 240,
  queueDepthWarning: 100,
  queueDepthCritical: 500,
  errorCountWarning: 5
}

// =====================
// OR Allocation
// =====================

export type ORAllocationStatus = 'active' | 'exhausted'

export interface ORAllocation {
  id: string
  terminal_id: string
  branch_id: string
  prefix: string
  start_number: number
  end_number: number
  current_number: number
  allocated_at: string
  exhausted_at: string | null
  status: ORAllocationStatus
}

export interface ORAllocationRequest {
  terminal_id: string
  branch_id: string
  prefix: string
}

export interface ORAllocationResponse {
  success: boolean
  allocation?: ORAllocation
  error?: string
}
