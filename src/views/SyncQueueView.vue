<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import PendingSyncList from '@/components/sync/PendingSyncList.vue'
import SyncProgress from '@/components/sync/SyncProgress.vue'
import BulkSyncProgressComponent from '@/components/sync/BulkSyncProgress.vue'
import SyncResumeIndicator from '@/components/sync/SyncResumeIndicator.vue'
import SyncStatus from '@/components/sync/SyncStatus.vue'
import InventoryReconciliationAlert from '@/components/sync/InventoryReconciliationAlert.vue'
import { useSyncStore } from '@/stores/sync'
import { useSync } from '@/composables/useSync'
import { useORNumber } from '@/composables/useORNumber'
import { syncService } from '@/services/syncService'
import { orAllocationService } from '@/services/orAllocationService'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import type { SyncQueue } from '@/types/sync'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const syncStore = useSyncStore()
const {
  triggerManualSync,
  triggerBulkSync,
  clearBulkProgress,
  isSyncing,
  isOnline,
  bulkProgress,
  isBulkSyncing,
  isResuming,
  lastSyncAt,
  inventoryDiscrepancies,
  showInventoryAlert,
  dismissInventoryAlert
} = useSync()

// OR Allocation state
const {
  activeSeries,
  activeSeriesStatus,
  isSeriesLow,
  isSeriesCritical,
  isSeriesExhausted,
  remainingCapacity,
  serverAllocation,
  refreshServerAllocation,
  loadActiveSeries
} = useORNumber()

const isRequestingORRange = ref(false)

const hasUnresolvedConflicts = computed(() => syncStore.unresolvedConflictCount > 0)
const hasClockDrift = syncService.significantClockDrift
const clockDriftSeconds = computed(() => Math.round(syncService.clockDriftMs.value / 1000))

function navigateToConflicts() {
  router.push('/conflicts')
}

const isLoading = ref(false)

const syncedCount = computed(() => syncStore.queueCounts.completed)
const totalCount = computed(() =>
  syncStore.queueCounts.pending + syncStore.queueCounts.syncing + syncStore.queueCounts.failed + syncStore.queueCounts.completed
)
const errorCount = computed(() => syncStore.queueCounts.failed)
const showBulkSyncButton = computed(() => syncStore.pendingCount > 50)
const showBulkProgress = computed(() => bulkProgress.value !== null)

// Resume indicator state
const resumePoint = computed(() => {
  if (!bulkProgress.value?.isResuming) return ''
  return bulkProgress.value.startedAt || ''
})

const resumeRemaining = computed(() => {
  if (!bulkProgress.value) return 0
  return bulkProgress.value.total - bulkProgress.value.processed
})

// OR Allocation computed properties
const orAllocationDisplay = computed(() => {
  if (serverAllocation.value) {
    return {
      prefix: serverAllocation.value.prefix,
      range: `${serverAllocation.value.start_number} - ${serverAllocation.value.end_number}`,
      current: serverAllocation.value.current_number,
      remaining: serverAllocation.value.remaining,
      usagePercent: serverAllocation.value.usagePercent
    }
  }
  if (activeSeries.value && activeSeriesStatus.value) {
    return {
      prefix: activeSeries.value.prefix,
      range: `${activeSeries.value.start_number} - ${activeSeries.value.end_number}`,
      current: activeSeries.value.current_number,
      remaining: activeSeriesStatus.value.remaining,
      usagePercent: activeSeriesStatus.value.usagePercentage
    }
  }
  return null
})

const orStatusSeverity = computed((): 'success' | 'warn' | 'danger' | 'secondary' => {
  if (!orAllocationDisplay.value) return 'secondary'
  if (isSeriesExhausted.value) return 'danger'
  if (isSeriesCritical.value || isSeriesLow.value) return 'warn'
  return 'success'
})

const orStatusLabel = computed(() => {
  if (!orAllocationDisplay.value) return 'No Allocation'
  if (isSeriesExhausted.value) return 'Exhausted'
  if (isSeriesCritical.value) return 'Critical'
  if (isSeriesLow.value) return 'Low'
  return 'Active'
})

const orProgressColor = computed(() => {
  if (!orAllocationDisplay.value) return undefined
  const usage = orAllocationDisplay.value.usagePercent
  if (usage >= 95) return '#ef4444'
  if (usage >= 80) return '#f59e0b'
  return '#22c55e'
})

// Watch for bulk sync completion to show toast
watch(
  () => bulkProgress.value,
  (progress, oldProgress) => {
    if (!progress || !oldProgress) return
    // Check if sync just completed (processed reached total)
    if (
      progress.processed >= progress.total &&
      progress.total > 0 &&
      oldProgress.processed < oldProgress.total
    ) {
      if (progress.failed === 0) {
        toast.add({
          severity: 'success',
          summary: 'Bulk Sync Complete',
          detail: `${progress.successful} items synced successfully`,
          life: 5000
        })
      } else {
        toast.add({
          severity: 'warn',
          summary: 'Bulk Sync Complete',
          detail: `${progress.successful} synced, ${progress.failed} failed`,
          life: 7000
        })
      }
      loadData()
      checkForConflicts()
    }
  },
  { deep: true }
)

onMounted(async () => {
  await loadData()
  await loadActiveSeries()
  await refreshServerAllocation()
})

async function loadData() {
  isLoading.value = true
  try {
    await syncStore.loadPendingItems()
    await syncStore.refreshStatus()
    await syncStore.loadUnresolvedConflicts()
  } finally {
    isLoading.value = false
  }
}

async function handleRetry(item: SyncQueue) {
  await syncStore.retryFailed([item.id])
  toast.add({ severity: 'info', summary: 'Item queued for retry', life: 3000 })
}

async function handleRetryAll() {
  const count = await syncStore.retryFailed()
  toast.add({ severity: 'info', summary: `${count} items queued for retry`, life: 3000 })
}

async function handleClearCompleted() {
  const count = await syncStore.clearCompleted()
  toast.add({ severity: 'success', summary: `${count} completed items cleared`, life: 3000 })
}

async function handleDelete(item: SyncQueue) {
  confirm.require({
    message: `Delete sync queue item for ${item.entity_type} ${item.entity_id.substring(0, 16)}...?`,
    header: 'Confirm Delete',
    icon: 'pi pi-trash',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await syncQueueRepository.delete(item.id)
      await loadData()
      toast.add({ severity: 'success', summary: 'Item deleted', life: 3000 })
    }
  })
}

async function handleManualSync() {
  const result = await triggerManualSync()
  if (result) {
    if (result.success) {
      toast.add({ severity: 'success', summary: `Synced ${result.synced} items`, life: 3000 })
    } else {
      toast.add({
        severity: 'warn',
        summary: `Synced ${result.synced}, failed ${result.failed}`,
        life: 5000
      })
    }
  } else {
    toast.add({ severity: 'info', summary: 'Sync skipped (offline or already syncing)', life: 3000 })
  }
  await loadData()
  await checkForConflicts()
}

async function handleBulkSync() {
  try {
    toast.add({ severity: 'info', summary: 'Bulk sync started...', life: 2000 })
    await triggerBulkSync()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Bulk sync failed',
      detail: e instanceof Error ? e.message : 'Unknown error',
      life: 5000
    })
  }
}

function handleDismissResume() {
  // Resume indicator dismissed — no action needed, bulk sync continues
}

/**
 * Check for unresolved conflicts after a sync cycle and show a toast warning
 */
async function checkForConflicts() {
  await syncStore.loadUnresolvedConflicts()
  const count = syncStore.unresolvedConflictCount
  if (count > 0) {
    toast.add({
      severity: 'warn',
      summary: 'Conflicts Detected',
      detail: `${count} conflict${count > 1 ? 's' : ''} detected during sync — review in Conflicts dashboard`,
      life: 8000
    })
  }
}

/**
 * Handle reviewing a product from the inventory reconciliation alert
 */
function handleInventoryReview(productId: string) {
  router.push(`/products/${productId}`)
}

/**
 * Handle dismissing the inventory reconciliation alert
 */
function handleInventoryDismiss() {
  dismissInventoryAlert()
}

/**
 * Request a new OR allocation range from the server
 */
async function handleRequestORRange() {
  if (isRequestingORRange.value) return

  const terminalId = 'terminal_001'
  isRequestingORRange.value = true

  try {
    await orAllocationService.checkAndRequestRange(terminalId)
    await refreshServerAllocation()
    await loadActiveSeries()
    toast.add({ severity: 'success', summary: 'OR range request sent', life: 3000 })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'OR Range Request Failed',
      detail: e instanceof Error ? e.message : 'Unknown error',
      life: 5000
    })
  } finally {
    isRequestingORRange.value = false
  }
}
</script>

<template>
  <Toast />
  <ConfirmDialog />

  <div class="sync-queue-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Sync Queue</h1>
        <SyncStatus />
      </div>
      <div class="header-actions">
        <Button
          v-if="showBulkSyncButton"
          label="Bulk Sync"
          icon="pi pi-bolt"
          severity="secondary"
          :loading="isBulkSyncing"
          :disabled="!isOnline.value || isBulkSyncing"
          @click="handleBulkSync"
        />
        <Button
          label="Sync Now"
          icon="pi pi-sync"
          :loading="isSyncing.value"
          :disabled="!isOnline.value || isBulkSyncing"
          @click="handleManualSync"
        />
      </div>
    </div>

    <!-- Resume indicator -->
    <SyncResumeIndicator
      v-if="isResuming"
      :resumePoint="resumePoint"
      :remaining="resumeRemaining"
      :lastSyncAt="lastSyncAt.value"
      @dismiss="handleDismissResume"
    />

    <!-- Bulk sync progress (replaces basic SyncProgress when active) -->
    <BulkSyncProgressComponent
      v-if="showBulkProgress"
      :progress="bulkProgress!"
      :isActive="isBulkSyncing"
    />

    <!-- Basic sync progress (shown when no bulk sync is active) -->
    <SyncProgress
      v-else
      :synced="syncedCount"
      :total="totalCount"
      :isSyncing="isSyncing.value"
      :errors="errorCount"
    />

    <Message v-if="hasUnresolvedConflicts" severity="warn" :closable="false">
      <div class="conflict-banner">
        <span>
          <i class="pi pi-exclamation-triangle"></i>
          {{ syncStore.unresolvedConflictCount }} unresolved conflict{{ syncStore.unresolvedConflictCount > 1 ? 's' : '' }} detected during sync.
        </span>
        <Button
          label="Review Conflicts"
          icon="pi pi-external-link"
          text
          size="small"
          @click="navigateToConflicts"
        />
      </div>
    </Message>

    <InventoryReconciliationAlert
      :discrepancies="inventoryDiscrepancies"
      :visible="showInventoryAlert"
      @dismiss="handleInventoryDismiss"
      @review="handleInventoryReview"
    />

    <!-- Clock drift warning -->
    <Message v-if="hasClockDrift" severity="warn" :closable="false">
      <div class="clock-drift-banner">
        <span>
          <i class="pi pi-clock"></i>
          Significant clock drift detected: {{ Math.abs(clockDriftSeconds) }}s (local is {{ clockDriftSeconds > 0 ? 'ahead' : 'behind' }}). Timestamps may be inaccurate.
        </span>
      </div>
    </Message>

    <!-- OR Allocation Card -->
    <Card>
      <template #title>
        <div class="or-card-header">
          <span><i class="pi pi-receipt mr-2"></i>OR Allocation</span>
          <Tag :severity="orStatusSeverity" :value="orStatusLabel" />
        </div>
      </template>
      <template #content>
        <div v-if="orAllocationDisplay" class="or-allocation-content">
          <div class="or-details">
            <div class="or-detail-row">
              <span class="or-label">Prefix:</span>
              <span class="or-value font-semibold">{{ orAllocationDisplay.prefix }}</span>
            </div>
            <div class="or-detail-row">
              <span class="or-label">Range:</span>
              <span class="or-value">{{ orAllocationDisplay.range }}</span>
            </div>
            <div class="or-detail-row">
              <span class="or-label">Current Number:</span>
              <span class="or-value font-semibold">{{ orAllocationDisplay.current }}</span>
            </div>
            <div class="or-detail-row">
              <span class="or-label">Remaining:</span>
              <span class="or-value font-semibold">{{ orAllocationDisplay.remaining }}</span>
            </div>
          </div>

          <div class="or-progress-section">
            <div class="or-progress-label">
              <span>Usage</span>
              <span>{{ orAllocationDisplay.usagePercent.toFixed(1) }}%</span>
            </div>
            <ProgressBar
              :value="orAllocationDisplay.usagePercent"
              :showValue="false"
              :dt="{ valueBg: orProgressColor }"
              style="height: 0.5rem"
            />
          </div>

          <div class="or-actions mt-3">
            <Button
              label="Request New Range"
              icon="pi pi-cloud-download"
              size="small"
              severity="secondary"
              :loading="isRequestingORRange"
              :disabled="!isOnline.value"
              @click="handleRequestORRange"
            />
          </div>
        </div>
        <div v-else class="text-500 text-center py-3">
          <i class="pi pi-info-circle mr-2"></i>
          No active OR allocation found
        </div>
      </template>
    </Card>

    <Card>
      <template #content>
        <PendingSyncList
          :items="syncStore.pendingItems"
          :loading="isLoading"
          @retry="handleRetry"
          @retry-all="handleRetryAll"
          @clear-completed="handleClearCompleted"
          @delete="handleDelete"
        />
      </template>
    </Card>
  </div>
</template>

<style scoped>
.sync-queue-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.conflict-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.75rem;
}

.conflict-banner span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.or-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.or-allocation-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.or-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.or-detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.or-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.or-value {
  font-size: 0.875rem;
}

.or-progress-section {
  margin-top: 0.5rem;
}

.or-progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}

.or-actions {
  display: flex;
  justify-content: flex-end;
}

.clock-drift-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clock-drift-banner span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
