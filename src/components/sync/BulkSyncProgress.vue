<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Panel from 'primevue/panel'
import type { BulkSyncProgress } from '@/types/sync'

const props = defineProps<{
  progress: BulkSyncProgress
  isActive: boolean
}>()

const errorListRef = ref<HTMLElement | null>(null)

const percentage = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.processed / props.progress.total) * 100)
})

const estimatedTimeDisplay = computed(() => {
  const ms = props.progress.estimatedTimeRemaining
  if (ms <= 0) return 'Calculating...'
  if (ms < 1000) return 'Less than a second'
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
})

const lastErrors = computed(() => {
  return props.progress.errors.slice(-5)
})

const hasErrors = computed(() => props.progress.errors.length > 0)

const statusLabel = computed(() => {
  if (props.progress.isResuming) return 'Resuming sync...'
  if (!props.isActive && props.progress.processed === props.progress.total && props.progress.total > 0) return 'Bulk sync complete'
  if (props.isActive) return 'Bulk sync in progress...'
  return 'Bulk sync'
})

// Auto-scroll error list when new errors appear
watch(() => props.progress.errors.length, async () => {
  await nextTick()
  if (errorListRef.value) {
    errorListRef.value.scrollTop = errorListRef.value.scrollHeight
  }
})
</script>

<template>
  <div class="bulk-sync-progress">
    <div class="progress-header">
      <span class="progress-title">
        <i class="pi pi-sync" :class="{ 'pi-spin': isActive }" />
        {{ statusLabel }}
      </span>
      <div class="progress-counters">
        <Tag :value="`${progress.successful} synced`" severity="success" />
        <Tag v-if="progress.failed > 0" :value="`${progress.failed} failed`" severity="danger" />
      </div>
    </div>

    <ProgressBar :value="percentage" :showValue="true" />

    <div class="progress-details">
      <span class="detail-item">
        {{ progress.processed }} of {{ progress.total }} items synced
      </span>
      <span class="detail-separator">|</span>
      <span class="detail-item">
        Batch {{ progress.currentBatch }} of {{ progress.totalBatches }}
      </span>
      <span v-if="isActive" class="detail-separator">|</span>
      <span v-if="isActive" class="detail-item">
        <i class="pi pi-clock" />
        {{ estimatedTimeDisplay }} remaining
      </span>
    </div>

    <Panel
      v-if="hasErrors"
      header="Recent Errors"
      toggleable
      :collapsed="true"
      class="error-panel"
    >
      <div ref="errorListRef" class="error-list">
        <div
          v-for="(error, index) in lastErrors"
          :key="index"
          class="error-item"
        >
          <Tag :value="error.entity_type" severity="secondary" class="error-type-tag" />
          <span class="error-entity">{{ error.entity_id.substring(0, 16) }}...</span>
          <span class="error-message">{{ error.error }}</span>
          <Tag :value="`Attempt ${error.attempts}`" severity="warn" />
        </div>
      </div>
      <div v-if="progress.errors.length > 5" class="error-overflow">
        Showing last 5 of {{ progress.errors.length }} errors
      </div>
    </Panel>
  </div>
</template>

<style scoped>
.bulk-sync-progress {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--p-border-radius);
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-size: 0.925rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-counters {
  display: flex;
  gap: 0.375rem;
}

.progress-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.detail-separator {
  color: var(--app-surface-300);
}

.error-panel {
  margin-top: 0.25rem;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  padding: 0.375rem 0;
  border-bottom: 1px solid var(--app-surface-100);
}

.error-item:last-child {
  border-bottom: none;
}

.error-type-tag {
  flex-shrink: 0;
}

.error-entity {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.error-message {
  flex: 1;
  color: var(--p-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-overflow {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-align: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--app-surface-100);
  margin-top: 0.5rem;
}
</style>
