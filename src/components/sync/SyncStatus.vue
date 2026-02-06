<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import ProgressBar from 'primevue/progressbar'
import { useSyncStore } from '@/stores/sync'
import { useSync } from '@/composables/useSync'
import { useORNumber } from '@/composables/useORNumber'
import { syncService } from '@/services/syncService'
import { connectivityService } from '@/services/connectivityService'

const syncStore = useSyncStore()
const router = useRouter()
const { bulkProgress, isBulkSyncing, inventoryDiscrepancies, showInventoryAlert } = useSync()
const { isSeriesLow, isSeriesCritical, isSeriesExhausted } = useORNumber()

const isOnline = connectivityService.isOnline

const statusSeverity = computed(() => {
  if (!isOnline.value) return 'warn'
  if (syncStore.hasErrors) return 'danger'
  if (syncStore.isSyncing) return 'info'
  if (syncStore.hasPending) return 'warn'
  return 'success'
})

const statusIcon = computed(() => {
  if (!isOnline.value) return 'pi pi-wifi'
  if (syncStore.isSyncing) return 'pi pi-spin pi-sync'
  if (syncStore.hasErrors) return 'pi pi-exclamation-circle'
  if (syncStore.hasPending) return 'pi pi-cloud-upload'
  return 'pi pi-cloud'
})

const statusLabel = computed(() => {
  if (isBulkSyncing.value && bulkProgress.value) {
    const pct = bulkProgress.value.total > 0
      ? Math.round((bulkProgress.value.processed / bulkProgress.value.total) * 100)
      : 0
    return `${pct}%`
  }
  if (!isOnline.value) return 'Offline'
  if (syncStore.isSyncing) return 'Syncing...'
  if (syncStore.hasErrors) return `${syncStore.errorCount} error${syncStore.errorCount > 1 ? 's' : ''}`
  if (syncStore.hasPending) return `${syncStore.pendingCount} pending`
  return 'Synced'
})

const lastSyncLabel = computed(() => {
  if (!syncStore.lastSync) return 'Never synced'
  const date = new Date(syncStore.lastSync)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return date.toLocaleDateString()
})

const bulkProgressPercent = computed(() => {
  if (!bulkProgress.value || bulkProgress.value.total === 0) return 0
  return Math.round((bulkProgress.value.processed / bulkProgress.value.total) * 100)
})

const showORWarning = computed(() => isSeriesLow.value || isSeriesCritical.value || isSeriesExhausted.value)

const orTooltip = computed(() => {
  if (isSeriesExhausted.value) return 'OR range exhausted!'
  if (isSeriesCritical.value) return 'OR range critical'
  if (isSeriesLow.value) return 'OR range running low'
  return ''
})

const hasDiscrepancies = computed(() => showInventoryAlert.value && inventoryDiscrepancies.value.length > 0)

const hasClockDrift = syncService.significantClockDrift

// EIS badge
const eisPending = ref(0)
const eisFailed = ref(0)
const showEISBadge = computed(() => eisPending.value > 0 || eisFailed.value > 0)

onMounted(async () => {
  try {
    const { useEIS } = await import('@/composables/useEIS')
    const eis = useEIS()
    await eis.loadDashboard()
    if (eis.isEnabled.value) {
      eisPending.value = eis.statusCounts.value.pending
      eisFailed.value = eis.statusCounts.value.failed
    }
  } catch { /* EIS not available */ }
})

function navigateToQueue() {
  router.push('/sync-queue')
}

function navigateToEIS() {
  router.push('/eis-submissions')
}
</script>

<template>
  <div class="sync-status" @click="navigateToQueue" v-tooltip.bottom="lastSyncLabel">
    <div class="sync-indicators">
      <Tag
        :severity="statusSeverity"
        class="sync-tag"
      >
        <i :class="statusIcon"></i>
        <span class="sync-label">{{ statusLabel }}</span>
      </Tag>

      <!-- Bulk sync mini progress bar -->
      <ProgressBar
        v-if="isBulkSyncing"
        :value="bulkProgressPercent"
        :showValue="false"
        class="sync-mini-progress"
      />

      <!-- OR allocation warning -->
      <i
        v-if="showORWarning"
        class="pi pi-receipt or-warning-icon"
        :class="{ 'or-critical': isSeriesExhausted || isSeriesCritical }"
        v-tooltip.bottom="orTooltip"
      ></i>

      <!-- Inventory discrepancy badge -->
      <Badge
        v-if="hasDiscrepancies"
        :value="inventoryDiscrepancies.length"
        severity="warn"
        class="discrepancy-badge"
        v-tooltip.bottom="'Inventory discrepancies'"
      />

      <!-- Clock drift warning -->
      <i
        v-if="hasClockDrift"
        class="pi pi-clock clock-drift-icon"
        v-tooltip.bottom="'Clock drift detected'"
      ></i>

      <!-- EIS badge -->
      <Badge
        v-if="showEISBadge"
        :value="eisPending + eisFailed"
        :severity="eisFailed > 0 ? 'danger' : 'info'"
        class="eis-badge"
        v-tooltip.bottom="'EIS: ' + eisPending + ' pending, ' + eisFailed + ' failed'"
        @click.stop="navigateToEIS"
      />
    </div>
  </div>
</template>

<style scoped>
.sync-status {
  cursor: pointer;
}

.sync-indicators {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.sync-tag {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.sync-tag i {
  font-size: 0.875rem;
}

.sync-mini-progress {
  width: 3rem;
  height: 0.25rem;
}

.or-warning-icon {
  font-size: 0.875rem;
  color: var(--p-yellow-500);
}

.or-warning-icon.or-critical {
  color: var(--p-red-500);
  animation: pulse 1.5s infinite;
}

.discrepancy-badge {
  font-size: 0.625rem;
}

.clock-drift-icon {
  font-size: 0.875rem;
  color: var(--p-orange-500);
}

.eis-badge {
  font-size: 0.625rem;
  cursor: pointer;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .sync-label {
    display: none;
  }

  .sync-tag {
    padding: 0.375rem;
  }

  .sync-mini-progress {
    display: none;
  }
}
</style>
