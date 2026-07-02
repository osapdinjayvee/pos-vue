<script setup lang="ts">
/**
 * SavedReportsList Component (T048)
 * Panel listing saved custom reports with load and delete actions.
 */
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { savedReportRepository } from '@/repositories/savedReportRepository'
import type { SavedReport } from '@/types/analytics'

const emit = defineEmits<{
  'load': [config: string]
  'delete': [id: string]
}>()

const confirm = useConfirm()
const savedReports = ref<SavedReport[]>([])
const loading = ref(false)

onMounted(async () => {
  await fetchReports()
})

async function fetchReports() {
  loading.value = true
  try {
    savedReports.value = await savedReportRepository.findAll()
  } catch (err) {
    console.error('[SavedReportsList] Failed to fetch saved reports:', err)
  } finally {
    loading.value = false
  }
}

function handleLoad(report: SavedReport) {
  emit('load', report.config)
}

function handleDelete(report: SavedReport) {
  confirm.require({
    message: `Are you sure you want to delete "${report.name}"?`,
    header: 'Delete Saved Report',
    icon: 'pi pi-trash',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: () => {
      emit('delete', report.id)
    }
  })
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

defineExpose({ fetchReports })
</script>

<template>
  <div class="saved-reports-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <i class="pi pi-bookmark"></i>
        Saved Reports
      </h3>
      <span v-if="savedReports.length" class="report-count">{{ savedReports.length }}</span>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading...</span>
    </div>

    <div v-else-if="savedReports.length === 0" class="empty-state">
      <i class="pi pi-bookmark" style="font-size: 1.5rem; color: var(--app-surface-300);"></i>
      <p>No saved reports yet. Build a report and save it for quick access.</p>
    </div>

    <ul v-else class="reports-list">
      <li v-for="report in savedReports" :key="report.id" class="report-item">
        <div class="report-info">
          <span class="report-name">{{ report.name }}</span>
          <span class="report-meta">
            <span class="report-type">{{ report.type }}</span>
            <span class="report-date">{{ formatDate(report.updated_at) }}</span>
          </span>
        </div>
        <div class="report-actions">
          <Button
            icon="pi pi-play"
            size="small"
            text
            rounded
            v-tooltip.top="'Load report'"
            @click="handleLoad(report)"
          />
          <Button
            icon="pi pi-trash"
            size="small"
            text
            rounded
            severity="danger"
            v-tooltip.top="'Delete report'"
            @click="handleDelete(report)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.saved-reports-panel {
  background: var(--app-surface-0);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--app-surface-200);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-surface-800);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-title i {
  color: var(--p-primary-color);
}

.report-count {
  background: var(--p-primary-color);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  text-align: center;
}

.empty-state p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-surface-500);
  max-width: 260px;
}

.reports-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.report-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: var(--app-surface-50);
  transition: background 0.15s ease;
}

.report-item:hover {
  background: var(--app-surface-100);
}

.report-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.report-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--p-surface-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}

.report-type {
  text-transform: capitalize;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}
</style>
