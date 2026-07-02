<script setup lang="ts">
import Tag from 'primevue/tag'
import type { ConflictStats } from '@/types/conflict'

defineProps<{
  stats: ConflictStats
}>()

const emit = defineEmits<{
  'filter': [filter: string]
}>()
</script>

<template>
  <div class="conflict-stats">
    <div class="stat-card" @click="emit('filter', 'all')">
      <div class="stat-value">{{ stats.total }}</div>
      <div class="stat-label">Total Conflicts</div>
      <Tag value="All" severity="secondary" />
    </div>

    <div class="stat-card" @click="emit('filter', 'unresolved')">
      <div class="stat-value">{{ stats.unresolved }}</div>
      <div class="stat-label">Unresolved</div>
      <Tag value="Pending" severity="danger" />
    </div>

    <div class="stat-card" @click="emit('filter', 'auto-resolved')">
      <div class="stat-value">{{ stats.resolvedByServer + stats.resolvedByLocal }}</div>
      <div class="stat-label">Auto-Resolved</div>
      <Tag value="Auto" severity="success" />
    </div>

    <div class="stat-card" @click="emit('filter', 'manual')">
      <div class="stat-value">{{ stats.resolvedManually }}</div>
      <div class="stat-label">Manual Resolutions</div>
      <Tag value="Manual" severity="info" />
    </div>
  </div>
</template>

<style scoped>
.conflict-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--app-surface-200);
  border-radius: var(--p-border-radius);
  background: var(--app-surface-0);
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--p-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--p-text-color);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}
</style>
