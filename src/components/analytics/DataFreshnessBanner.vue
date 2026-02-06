<script setup lang="ts">
defineProps<{
  lastUpdated: string
  isStale: boolean
  isRefreshing?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <div v-if="isStale && !isRefreshing" class="freshness-banner">
    <i class="pi pi-info-circle" />
    <span>Data as of {{ lastUpdated }}</span>
    <button class="refresh-link" @click="emit('refresh')">Refresh</button>
  </div>
  <div v-else-if="isRefreshing" class="freshness-banner refreshing">
    <i class="pi pi-spin pi-spinner" />
    <span>Refreshing data...</span>
  </div>
</template>

<style scoped>
.freshness-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--p-orange-50);
  color: var(--p-orange-700);
  border-radius: 8px;
  font-size: 0.875rem;
}

.freshness-banner.refreshing {
  background: var(--p-blue-50);
  color: var(--p-blue-700);
}

.refresh-link {
  background: none;
  border: none;
  color: var(--p-primary-color);
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  font-size: 0.875rem;
  padding: 0;
}
</style>
