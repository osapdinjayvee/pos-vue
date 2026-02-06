<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { EISSubmission } from '@/types/eis'

defineProps<{
  submissions: EISSubmission[]
  loading?: boolean
}>()

const emit = defineEmits<{
  retry: [id: string]
  'view-detail': [submission: EISSubmission]
}>()

function statusSeverity(status: string) {
  switch (status) {
    case 'submitted': return 'success'
    case 'pending': return 'info'
    case 'failed': return 'warn'
    case 'rejected': return 'danger'
    default: return 'info'
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}

function parseGrossSales(payload: string): number {
  try {
    return JSON.parse(payload).gross_sales || 0
  } catch {
    return 0
  }
}

function parseVat(payload: string): number {
  try {
    return JSON.parse(payload).vat_amount || 0
  } catch {
    return 0
  }
}

function truncateError(error: string | null) {
  if (!error) return '-'
  try {
    const parsed = JSON.parse(error)
    return parsed.message || error
  } catch {
    return error
  }
}
</script>

<template>
  <DataTable
    :value="submissions"
    :loading="loading"
    :paginator="submissions.length > 20"
    :rows="20"
    :rowsPerPageOptions="[20, 50, 100]"
    stripedRows
    size="small"
    sortField="created_at"
    :sortOrder="-1"
  >
    <template #empty>No submissions found.</template>

    <Column field="or_number" header="OR Number" :sortable="true" style="width: 160px">
      <template #body="{ data }">
        <span class="or-number">{{ data.or_number }}</span>
      </template>
    </Column>

    <Column field="created_at" header="Date" :sortable="true" style="width: 160px">
      <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
    </Column>

    <Column header="Gross Sales" style="width: 120px">
      <template #body="{ data }">{{ formatCurrency(parseGrossSales(data.payload)) }}</template>
    </Column>

    <Column header="VAT" style="width: 100px">
      <template #body="{ data }">{{ formatCurrency(parseVat(data.payload)) }}</template>
    </Column>

    <Column field="status" header="Status" :sortable="true" style="width: 110px">
      <template #body="{ data }">
        <Tag :value="data.status" :severity="statusSeverity(data.status)" />
      </template>
    </Column>

    <Column field="bir_reference" header="BIR Reference" style="width: 140px">
      <template #body="{ data }">
        <span v-if="data.bir_reference" class="bir-ref" v-tooltip.bottom="data.bir_reference">
          {{ data.bir_reference.substring(0, 14) }}{{ data.bir_reference.length > 14 ? '...' : '' }}
        </span>
        <span v-else>-</span>
      </template>
    </Column>

    <Column field="attempts" header="Attempts" style="width: 80px" />

    <Column header="Error" style="min-width: 150px">
      <template #body="{ data }">
        <span v-tooltip.bottom="data.last_error" class="error-text">{{ truncateError(data.last_error) }}</span>
      </template>
    </Column>

    <Column header="Actions" style="width: 100px">
      <template #body="{ data }">
        <div class="action-btns">
          <Button
            v-if="data.status === 'failed'"
            icon="pi pi-refresh"
            severity="secondary"
            text
            rounded
            size="small"
            v-tooltip="'Retry'"
            @click="emit('retry', data.id)"
          />
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            size="small"
            v-tooltip="'Details'"
            @click="emit('view-detail', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
.or-number {
  font-family: monospace;
  font-size: 0.8125rem;
}

.bir-ref {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.error-text {
  font-size: 0.75rem;
  color: var(--p-red-500);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.action-btns {
  display: flex;
  gap: 0.25rem;
}
</style>
