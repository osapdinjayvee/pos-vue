/**
 * useEIS Composable
 * Wraps EIS store and provides EIS functionality to Vue components
 */

import { computed, ref } from 'vue'
import { useEisStore } from '@/stores/eis'
import { eisService } from '@/services/eisService'
import { eisBatchService } from '@/services/eisBatchService'
import { connectivityService } from '@/services/connectivityService'
import type { EISSubmissionStatus } from '@/types/eis'

let autoProcessInterval: ReturnType<typeof setInterval> | null = null
let unsubOnline: (() => void) | null = null

export function useEIS() {
  const eisStore = useEisStore()
  const isTestingConnection = ref(false)

  // Expose store state as readonly
  const config = computed(() => eisStore.config)
  const isEnabled = computed(() => eisStore.isEnabled)
  const isConfigured = computed(() => eisStore.isConfigured)
  const pendingCount = computed(() => eisStore.pendingCount)
  const failedCount = computed(() => eisStore.failedCount)
  const statusCounts = computed(() => eisStore.statusCounts)
  const recentSubmissions = computed(() => eisStore.recentSubmissions)
  const recentBatches = computed(() => eisStore.recentBatches)
  const isProcessing = computed(() => eisStore.isProcessing)
  const lastProcessedAt = computed(() => eisStore.lastProcessedAt)
  const totalSubmissions = computed(() => eisStore.totalSubmissions)
  const hasFailures = computed(() => eisStore.hasFailures)
  const alertActive = computed(() => eisStore.alertActive)
  const alertMessage = computed(() => eisStore.alertMessage)

  /**
   * Load dashboard data — config, counts, recent submissions
   */
  async function loadDashboard(): Promise<void> {
    await eisStore.loadConfig()

    // Pre-populate from existing BIR settings if no config exists
    if (!eisStore.config) {
      try {
        const { default: db } = await import('@/db/database')
        // Try to read TIN and branch_code from business settings
        const settings = await db.getOne<{ tin: string; branch_code: string }>(
          `SELECT s1.value as tin, s2.value as branch_code
           FROM settings s1, settings s2
           WHERE s1.key = 'business_tin' AND s2.key = 'business_branch_code'`
        )
        if (settings?.tin) {
          eisStore.config = {
            id: '',
            tin: settings.tin,
            branch_code: settings.branch_code || '',
            api_key: '',
            api_secret: '',
            environment: 'test',
            endpoint_url: null,
            is_enabled: 0,
            batch_size: 100,
            submission_interval_mins: 5,
            max_retries: 5,
            api_version: 'v1',
            created_at: '',
            updated_at: ''
          } as any
        }
      } catch {
        // Settings table may not exist or have different schema
      }
    }

    await eisStore.loadCounts()
    await eisStore.loadRecentSubmissions()
    await eisStore.loadRecentBatches()
  }

  /**
   * Save EIS configuration
   */
  async function saveConfig(configData: Record<string, unknown>): Promise<void> {
    await eisStore.saveConfig(configData)
  }

  /**
   * Trigger batch processing
   */
  async function processBatch(): Promise<void> {
    await eisStore.processBatch()
  }

  /**
   * Retry all failed submissions
   */
  async function retryFailed(): Promise<number> {
    return await eisStore.retryFailed()
  }

  /**
   * Enqueue a transaction for EIS submission
   */
  async function enqueueTransaction(transactionId: string): Promise<void> {
    await eisService.enqueueTransaction(transactionId)
    await eisStore.loadCounts()
  }

  /**
   * Get submission status for a transaction
   */
  async function getSubmissionStatus(transactionId: string) {
    return await eisService.getSubmissionForTransaction(transactionId)
  }

  /**
   * Start automatic batch processing on interval
   */
  function startAutoProcess(intervalMs?: number): void {
    if (autoProcessInterval) return

    const config = eisStore.config
    const defaultInterval = (config?.submission_interval_mins || 5) * 60000
    const baseInterval = intervalMs || defaultInterval

    const scheduleNext = () => {
      const backoff = eisBatchService.getBackoffMultiplier()
      const effectiveInterval = baseInterval * backoff
      autoProcessInterval = setTimeout(async () => {
        if (connectivityService.isOnline.value && eisStore.isEnabled) {
          try {
            await eisStore.processBatch()
          } catch (e) {
            console.error('[useEIS] Auto batch processing failed:', e)
          }
        }
        scheduleNext()
      }, effectiveInterval)
    }

    scheduleNext()

    // Also process when connectivity restores
    unsubOnline = connectivityService.onOnline(async () => {
      if (eisStore.isEnabled) {
        try {
          await eisStore.processBatch()
          eisBatchService.resetBackoff()
        } catch (e) {
          console.error('[useEIS] Batch processing on reconnect failed:', e)
        }
      }
    })
  }

  /**
   * Stop automatic batch processing
   */
  function stopAutoProcess(): void {
    if (autoProcessInterval) {
      clearTimeout(autoProcessInterval)
      autoProcessInterval = null
    }
    if (unsubOnline) {
      unsubOnline()
      unsubOnline = null
    }
  }

  /**
   * Dismiss the alert
   */
  function dismissAlert(): void {
    eisStore.dismissAlert()
  }

  /**
   * Format EIS status for PrimeVue Tag display
   */
  function formatEISStatus(status: EISSubmissionStatus): { label: string; severity: 'info' | 'success' | 'warn' | 'danger' } {
    switch (status) {
      case 'pending':
        return { label: 'Pending', severity: 'info' }
      case 'submitted':
        return { label: 'Submitted', severity: 'success' }
      case 'failed':
        return { label: 'Failed', severity: 'warn' }
      case 'rejected':
        return { label: 'Rejected', severity: 'danger' }
      default:
        return { label: status, severity: 'info' }
    }
  }

  return {
    // State
    config,
    isEnabled,
    isConfigured,
    pendingCount,
    failedCount,
    statusCounts,
    recentSubmissions,
    recentBatches,
    isProcessing,
    lastProcessedAt,
    totalSubmissions,
    hasFailures,
    alertActive,
    alertMessage,
    isTestingConnection,

    // Actions
    loadDashboard,
    saveConfig,
    processBatch,
    retryFailed,
    enqueueTransaction,
    getSubmissionStatus,
    startAutoProcess,
    stopAutoProcess,
    dismissAlert,
    formatEISStatus
  }
}

export default useEIS
