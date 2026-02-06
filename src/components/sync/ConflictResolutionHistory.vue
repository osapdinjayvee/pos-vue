<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import type { ConflictLog } from '@/types/conflict'

const props = defineProps<{
  conflicts: ConflictLog[]
  loading?: boolean
}>()

const dateRange = ref<Date[] | null>(null)

const filteredConflicts = computed(() => {
  // Only show resolved conflicts
  let result = props.conflicts.filter(c => c.resolved_at !== null)

  // Apply date range filter
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    const startDate = new Date(dateRange.value[0])
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateRange.value[1])
    endDate.setHours(23, 59, 59, 999)

    result = result.filter(c => {
      const resolvedDate = new Date(c.resolved_at!)
      return resolvedDate >= startDate && resolvedDate <= endDate
    })
  }

  return result
})

function resolutionSeverity(resolution: string): 'success' | 'info' | 'warn' | 'danger' | undefined {
  switch (resolution) {
    case 'server': return 'info'
    case 'local': return 'warn'
    case 'merged': return 'success'
    case 'manual': return 'danger'
    default: return undefined
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function getConflictSummary(conflict: ConflictLog): string {
  try {
    const localData = JSON.parse(conflict.local_version) as Record<string, unknown>
    const serverData = JSON.parse(conflict.server_version) as Record<string, unknown>
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)])
    let diffCount = 0
    for (const key of allKeys) {
      if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
        diffCount++
      }
    }
    return `${diffCount} field${diffCount !== 1 ? 's' : ''} differed`
  } catch {
    return 'Unable to parse conflict data'
  }
}

function getResolvedByLabel(conflict: ConflictLog): string {
  if (!conflict.resolved_by) return '-'
  if (conflict.resolved_by === 'system') return 'System'
  return conflict.resolved_by
}

function clearDateFilter() {
  dateRange.value = null
}
</script>

<template>
  <div class="conflict-history">
    <div class="history-filters">
      <div class="date-filter">
        <label class="filter-label">Date Range:</label>
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          :manualInput="false"
          placeholder="Filter by date range"
          showIcon
          showButtonBar
          dateFormat="mm/dd/yy"
          @clear-click="clearDateFilter"
        />
      </div>
    </div>

    <DataTable
      :value="filteredConflicts"
      :loading="loading"
      paginator
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50]"
      stripedRows
      size="small"
      sortField="resolved_at"
      :sortOrder="-1"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-history" style="font-size: 2rem; color: var(--p-surface-400)"></i>
          <p>No resolution history found</p>
        </div>
      </template>

      <Column field="resolved_at" header="Date" :sortable="true" style="width: 160px">
        <template #body="{ data }">
          {{ formatDate(data.resolved_at) }}
        </template>
      </Column>

      <Column field="entity_type" header="Entity Type" :sortable="true" style="width: 120px">
        <template #body="{ data }">
          <span class="entity-type">{{ data.entity_type }}</span>
        </template>
      </Column>

      <Column field="entity_id" header="Entity ID" style="width: 180px">
        <template #body="{ data }">
          <code>{{ data.entity_id.substring(0, 16) }}...</code>
        </template>
      </Column>

      <Column field="resolution" header="Resolution" :sortable="true" style="width: 120px">
        <template #body="{ data }">
          <Tag :value="data.resolution" :severity="resolutionSeverity(data.resolution)" />
        </template>
      </Column>

      <Column header="Resolved By" style="width: 120px">
        <template #body="{ data }">
          <span :class="{ 'system-label': data.resolved_by === 'system' }">
            {{ getResolvedByLabel(data) }}
          </span>
        </template>
      </Column>

      <Column header="Summary" style="min-width: 160px">
        <template #body="{ data }">
          {{ getConflictSummary(data) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.conflict-history {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
}

.entity-type {
  text-transform: capitalize;
}

.system-label {
  font-style: italic;
  color: var(--p-text-muted-color);
}
</style>
