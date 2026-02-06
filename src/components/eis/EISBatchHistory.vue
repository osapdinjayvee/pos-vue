<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { EISBatch } from '@/types/eis'

defineProps<{
  batches: EISBatch[]
  loading?: boolean
}>()

function statusSeverity(status: string) {
  switch (status) {
    case 'completed': return 'success'
    case 'partial': return 'warn'
    case 'processing': return 'info'
    default: return 'info'
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function duration(batch: EISBatch) {
  if (!batch.completed_at || !batch.submitted_at) return '-'
  const ms = new Date(batch.completed_at).getTime() - new Date(batch.submitted_at).getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <DataTable
    :value="batches"
    :loading="loading"
    :paginator="batches.length > 10"
    :rows="10"
    stripedRows
    size="small"
  >
    <template #empty>No batch history available.</template>

    <Column field="id" header="Batch" style="width: 120px">
      <template #body="{ data }">
        <span class="batch-id">{{ data.id.substring(0, 10) }}</span>
      </template>
    </Column>

    <Column field="submitted_at" header="Submitted" :sortable="true" style="width: 180px">
      <template #body="{ data }">{{ formatDate(data.submitted_at) }}</template>
    </Column>

    <Column field="item_count" header="Total" :sortable="true" style="width: 80px" />

    <Column field="success_count" header="Success" :sortable="true" style="width: 90px">
      <template #body="{ data }">
        <Tag v-if="data.success_count > 0" :value="String(data.success_count)" severity="success" />
        <span v-else>0</span>
      </template>
    </Column>

    <Column field="failed_count" header="Failed" :sortable="true" style="width: 90px">
      <template #body="{ data }">
        <Tag v-if="data.failed_count > 0" :value="String(data.failed_count)" severity="danger" />
        <span v-else>0</span>
      </template>
    </Column>

    <Column field="status" header="Status" :sortable="true" style="width: 110px">
      <template #body="{ data }">
        <Tag :value="data.status" :severity="statusSeverity(data.status)" />
      </template>
    </Column>

    <Column header="Duration" style="width: 90px">
      <template #body="{ data }">{{ duration(data) }}</template>
    </Column>
  </DataTable>
</template>

<style scoped>
.batch-id {
  font-family: monospace;
  font-size: 0.8125rem;
}
</style>
