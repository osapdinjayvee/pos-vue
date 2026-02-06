import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { eisConfigRepository } from '@/repositories/eisConfigRepository'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import { eisBatchRepository } from '@/repositories/eisBatchRepository'
import { eisBatchService } from '@/services/eisBatchService'
import type { EISConfig, EISSubmission, EISBatch, EISStatusCounts } from '@/types/eis'

export const useEisStore = defineStore('eis', () => {
  // State
  const config = ref<EISConfig | null>(null)
  const pendingCount = ref(0)
  const submittedCount = ref(0)
  const failedCount = ref(0)
  const rejectedCount = ref(0)
  const recentSubmissions = ref<EISSubmission[]>([])
  const recentBatches = ref<EISBatch[]>([])
  const isProcessing = ref(false)
  const lastProcessedAt = ref<string | null>(null)
  const error = ref<string | null>(null)
  const alertActive = ref(false)
  const alertMessage = ref('')

  // Computed
  const isEnabled = computed(() => config.value?.is_enabled === 1)
  const isConfigured = computed(() => config.value !== null)
  const totalSubmissions = computed(() => pendingCount.value + submittedCount.value + failedCount.value + rejectedCount.value)
  const hasFailures = computed(() => failedCount.value > 0 || rejectedCount.value > 0)
  const statusCounts = computed<EISStatusCounts>(() => ({
    pending: pendingCount.value,
    submitted: submittedCount.value,
    failed: failedCount.value,
    rejected: rejectedCount.value
  }))

  // Actions
  async function loadConfig() {
    try {
      config.value = await eisConfigRepository.getConfig()
    } catch (e) {
      console.error('[EIS Store] Failed to load config:', e)
    }
  }

  async function saveConfig(configData: Partial<EISConfig>) {
    try {
      config.value = await eisConfigRepository.saveConfig(configData)
      error.value = null
    } catch (e) {
      error.value = 'Failed to save EIS configuration'
      throw e
    }
  }

  async function loadCounts() {
    try {
      const counts = await eisSubmissionRepository.countByStatus()
      pendingCount.value = counts.pending
      submittedCount.value = counts.submitted
      failedCount.value = counts.failed
      rejectedCount.value = counts.rejected
    } catch (e) {
      console.error('[EIS Store] Failed to load counts:', e)
    }
  }

  async function loadRecentSubmissions(limit: number = 50) {
    try {
      recentSubmissions.value = await eisSubmissionRepository.getByStatus('pending', limit)
      const submitted = await eisSubmissionRepository.getByStatus('submitted', limit)
      const failed = await eisSubmissionRepository.getRecentFailed(limit)
      recentSubmissions.value = [...recentSubmissions.value, ...submitted, ...failed]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
    } catch (e) {
      console.error('[EIS Store] Failed to load recent submissions:', e)
    }
  }

  async function loadRecentBatches(limit: number = 20) {
    try {
      recentBatches.value = await eisBatchRepository.getRecent(limit)
    } catch (e) {
      console.error('[EIS Store] Failed to load recent batches:', e)
    }
  }

  async function processBatch() {
    if (isProcessing.value) return
    isProcessing.value = true
    error.value = null

    try {
      const result = await eisBatchService.processPendingBatch()
      lastProcessedAt.value = new Date().toISOString()

      if (result.alertActive) {
        alertActive.value = true
        alertMessage.value = result.alertMessage
      }

      await loadCounts()
    } catch (e) {
      error.value = 'Batch processing failed'
      console.error('[EIS Store] Batch processing failed:', e)
    } finally {
      isProcessing.value = false
    }
  }

  async function retryFailed() {
    try {
      const count = await eisSubmissionRepository.resetFailedToPending()
      await loadCounts()
      return count
    } catch (e) {
      console.error('[EIS Store] Failed to retry:', e)
      return 0
    }
  }

  function clearError() {
    error.value = null
  }

  function dismissAlert() {
    alertActive.value = false
    alertMessage.value = ''
  }

  return {
    // State
    config,
    pendingCount,
    submittedCount,
    failedCount,
    rejectedCount,
    recentSubmissions,
    recentBatches,
    isProcessing,
    lastProcessedAt,
    error,
    alertActive,
    alertMessage,

    // Computed
    isEnabled,
    isConfigured,
    totalSubmissions,
    hasFailures,
    statusCounts,

    // Actions
    loadConfig,
    saveConfig,
    loadCounts,
    loadRecentSubmissions,
    loadRecentBatches,
    processBatch,
    retryFailed,
    clearError,
    dismissAlert
  }
})
