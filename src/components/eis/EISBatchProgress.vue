<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import type { EISBatch } from '@/types/eis'

const props = defineProps<{
  batch: EISBatch | null
  isProcessing?: boolean
}>()

const progressPercent = computed(() => {
  if (!props.batch || props.batch.item_count === 0) return 0
  return Math.round(((props.batch.success_count + props.batch.failed_count) / props.batch.item_count) * 100)
})

const statusSeverity = computed(() => {
  if (!props.batch) return 'info'
  switch (props.batch.status) {
    case 'completed': return 'success'
    case 'partial': return 'warn'
    case 'processing': return 'info'
    default: return 'info'
  }
})
</script>

<template>
  <div v-if="batch" class="eis-batch-progress">
    <div class="batch-header">
      <Tag :value="batch.status" :severity="statusSeverity" />
      <span class="batch-count">{{ batch.item_count }} items</span>
    </div>
    <ProgressBar :value="progressPercent" class="mt-2" />
    <div class="batch-stats mt-2">
      <span class="stat success">{{ batch.success_count }} submitted</span>
      <span v-if="batch.failed_count > 0" class="stat failed">{{ batch.failed_count }} failed</span>
    </div>
  </div>
  <div v-else-if="isProcessing" class="eis-batch-progress">
    <ProgressBar mode="indeterminate" style="height: 6px" />
    <small class="mt-1">Processing batch...</small>
  </div>
</template>

<style scoped>
.eis-batch-progress {
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.batch-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.batch-count {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.batch-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
}

.stat.success { color: var(--p-green-500); }
.stat.failed { color: var(--p-red-500); }
</style>
