<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { useEIS } from '@/composables/useEIS'

const { isEnabled, statusCounts, lastProcessedAt, loadDashboard } = useEIS()
const loaded = ref(false)

onMounted(async () => {
  await loadDashboard()
  loaded.value = true
})

function formatTime(dateStr: string | null) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleTimeString()
}
</script>

<template>
  <Card v-if="loaded && isEnabled" class="eis-dashboard-widget">
    <template #title>
      <div class="widget-title">
        <i class="pi pi-cloud-upload"></i>
        <span>EIS Status</span>
      </div>
    </template>
    <template #content>
      <div class="eis-stats">
        <div class="stat-row">
          <Tag :value="`${statusCounts.pending} pending`" severity="info" />
          <Tag :value="`${statusCounts.submitted} submitted`" severity="success" />
          <Tag v-if="statusCounts.failed > 0" :value="`${statusCounts.failed} failed`" severity="warn" />
          <Tag v-if="statusCounts.rejected > 0" :value="`${statusCounts.rejected} rejected`" severity="danger" />
        </div>
        <div class="last-processed">
          Last processed: {{ formatTime(lastProcessedAt) }}
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.eis-dashboard-widget {
  min-width: 200px;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.eis-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.last-processed {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}
</style>
