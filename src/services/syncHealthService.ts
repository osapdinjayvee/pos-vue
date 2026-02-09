/**
 * Sync Health Service
 * Monitors terminal sync health with heartbeat, queue depth tracking, and status evaluation
 */

import { syncHealthRepository } from '@/repositories/syncHealthRepository'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { connectivityService } from '@/services/connectivityService'
import { httpClient } from '@/services/httpClient'
import type { SyncHealth, SyncHealthStatus, SyncHealthThresholds } from '@/types/sync'

const DEFAULT_THRESHOLDS: SyncHealthThresholds = {
  syncOverdueMins: 240,
  queueDepthWarning: 100,
  queueDepthCritical: 500,
  errorCountWarning: 5
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let serverReachable = true

/**
 * Update sync health for a terminal
 */
async function updateHealth(terminalId: string, branchId: string): Promise<void> {
  const counts = await syncQueueRepository.countByStatus()
  const queueDepth = counts.pending + counts.failed

  const existing = await syncHealthRepository.findByTerminal(terminalId)
  const now = new Date().toISOString()

  const health: SyncHealth = {
    terminal_id: terminalId,
    branch_id: branchId,
    last_heartbeat: existing?.last_heartbeat || now,
    last_upload: existing?.last_upload || null,
    last_download: existing?.last_download || null,
    queue_depth: queueDepth,
    error_count: counts.failed,
    status: 'unknown',
    updated_at: now
  }

  health.status = evaluateStatus(health)
  await syncHealthRepository.upsert(health)
}

/**
 * Send a heartbeat for a terminal
 */
async function sendHeartbeat(terminalId: string): Promise<void> {
  await syncHealthRepository.updateHeartbeat(terminalId)

  if (connectivityService.isOnline.value && serverReachable) {
    try {
      await httpClient.post('/sync/health/heartbeat', {
        terminal_id: terminalId,
        timestamp: new Date().toISOString()
      })
    } catch {
      serverReachable = false
      console.warn('[SyncHealth] Server unreachable — heartbeat paused until connectivity changes')
    }
  }
}

/**
 * Evaluate health status based on thresholds
 */
function evaluateStatus(
  health: SyncHealth,
  thresholds: SyncHealthThresholds = DEFAULT_THRESHOLDS
): SyncHealthStatus {
  // Critical checks
  if (health.queue_depth >= thresholds.queueDepthCritical) return 'critical'
  if (health.error_count >= thresholds.errorCountWarning * 2) return 'critical'

  // Check heartbeat staleness
  if (health.last_heartbeat) {
    const heartbeatAge = Date.now() - new Date(health.last_heartbeat).getTime()
    const heartbeatMins = heartbeatAge / 60000
    if (heartbeatMins > thresholds.syncOverdueMins * 2) return 'critical'
    if (heartbeatMins > thresholds.syncOverdueMins) return 'warning'
  }

  // Warning checks
  if (health.queue_depth >= thresholds.queueDepthWarning) return 'warning'
  if (health.error_count >= thresholds.errorCountWarning) return 'warning'

  // If we have a recent heartbeat and low queue, we're healthy
  if (health.last_heartbeat) {
    const heartbeatAge = Date.now() - new Date(health.last_heartbeat).getTime()
    const heartbeatMins = heartbeatAge / 60000
    if (heartbeatMins <= thresholds.syncOverdueMins && health.queue_depth < thresholds.queueDepthWarning) {
      return 'healthy'
    }
  }

  return 'unknown'
}

/**
 * Start the heartbeat loop - sends heartbeat every intervalMs (default 5 min)
 */
function startHeartbeatLoop(terminalId: string, intervalMs: number = 300000): void {
  stopHeartbeatLoop()
  serverReachable = true

  // Re-enable server calls when connectivity is restored
  connectivityService.onOnline(() => {
    serverReachable = true
  })

  // Send initial heartbeat
  sendHeartbeat(terminalId).catch(() => {
    // Already handled inside sendHeartbeat
  })

  heartbeatTimer = setInterval(() => {
    sendHeartbeat(terminalId).catch(() => {
      // Already handled inside sendHeartbeat
    })
  }, intervalMs)

  console.log(`[SyncHealth] Heartbeat loop started (interval: ${intervalMs}ms)`)
}

/**
 * Stop the heartbeat loop
 */
function stopHeartbeatLoop(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
    console.log('[SyncHealth] Heartbeat loop stopped')
  }
}

/**
 * Get all terminal statuses with evaluated health
 */
async function getTerminalStatuses(): Promise<SyncHealth[]> {
  const all = await syncHealthRepository.findAll()
  return all.map((h) => ({
    ...h,
    status: evaluateStatus(h)
  }))
}

/**
 * Get terminals that need attention (warning or critical)
 */
async function getAlerts(): Promise<SyncHealth[]> {
  const all = await getTerminalStatuses()
  return all.filter((h) => h.status === 'warning' || h.status === 'critical')
}

export const syncHealthService = {
  updateHealth,
  sendHeartbeat,
  evaluateStatus,
  startHeartbeatLoop,
  stopHeartbeatLoop,
  getTerminalStatuses,
  getAlerts
}

export default syncHealthService
