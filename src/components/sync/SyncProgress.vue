<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'

const props = defineProps<{
  synced: number
  total: number
  isSyncing: boolean
  errors?: number
}>()

const progress = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.synced / props.total) * 100)
})

const remaining = computed(() => props.total - props.synced)

const statusLabel = computed(() => {
  if (!props.isSyncing && props.synced === 0) return 'Idle'
  if (props.isSyncing) return `Syncing... ${props.synced}/${props.total}`
  if (props.synced === props.total) return 'Complete'
  return `${props.synced}/${props.total} synced`
})
</script>

<template>
  <div class="sync-progress" v-if="total > 0 || isSyncing">
    <div class="progress-header">
      <span class="progress-label">{{ statusLabel }}</span>
      <div class="progress-tags">
        <Tag v-if="remaining > 0" :value="`${remaining} remaining`" severity="warn" />
        <Tag v-if="errors && errors > 0" :value="`${errors} errors`" severity="danger" />
        <Tag v-if="synced > 0 && synced === total" value="All synced" severity="success" />
      </div>
    </div>
    <ProgressBar :value="progress" :showValue="true" />
  </div>
</template>

<style scoped>
.sync-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.progress-tags {
  display: flex;
  gap: 0.375rem;
}
</style>
