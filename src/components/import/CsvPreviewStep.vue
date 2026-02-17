<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import type { CsvImportConfig } from '@/config/csvImportConfigs'
import type { ValidatedRow } from '@/services/csvImportService'

const props = defineProps<{
  config: CsvImportConfig
  validatedRows: ValidatedRow[]
  isValidating: boolean
}>()

const emit = defineEmits<{
  import: []
  back: []
}>()

const expandedRows = ref<any>({})

const summary = computed(() => {
  const rows = props.validatedRows
  return {
    total: rows.length,
    create: rows.filter(r => r.action === 'create').length,
    update: rows.filter(r => r.action === 'update').length,
    error: rows.filter(r => r.action === 'error').length,
    skip: rows.filter(r => r.action === 'skip').length
  }
})

const canImport = computed(() => {
  return summary.value.create > 0 || summary.value.update > 0
})

const actionSeverity = (action: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" => {
  switch (action) {
    case 'create': return 'success'
    case 'update': return 'info'
    case 'error': return 'danger'
    case 'skip': return 'secondary'
    default: return 'secondary'
  }
}

const actionLabel = (action: string): string => {
  switch (action) {
    case 'create': return 'Create'
    case 'update': return 'Update'
    case 'error': return 'Error'
    case 'skip': return 'Skip'
    default: return action
  }
}

// Get display columns — pick first 4 mapped fields
const displayFields = computed(() => {
  return props.config.fields.slice(0, 4)
})

const getRowFieldValue = (row: ValidatedRow, field: string): string => {
  return row.data[field] ?? row.rawData[field] ?? '—'
}
</script>

<template>
  <div class="preview-step">
    <div class="step-header">
      <h3>Preview Import</h3>
      <p class="text-muted">Review the data before importing</p>
    </div>

    <div v-if="isValidating" class="validating">
      <ProgressBar mode="indeterminate" style="height: 6px" />
      <p>Validating rows...</p>
    </div>

    <template v-else>
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-count">{{ summary.total }}</span>
          <span class="summary-label">Total Rows</span>
        </div>
        <div class="summary-item success">
          <span class="summary-count">{{ summary.create }}</span>
          <span class="summary-label">To Create</span>
        </div>
        <div v-if="summary.update > 0" class="summary-item info">
          <span class="summary-count">{{ summary.update }}</span>
          <span class="summary-label">To Update</span>
        </div>
        <div v-if="summary.error > 0" class="summary-item danger">
          <span class="summary-count">{{ summary.error }}</span>
          <span class="summary-label">Errors</span>
        </div>
        <div v-if="summary.skip > 0" class="summary-item secondary">
          <span class="summary-count">{{ summary.skip }}</span>
          <span class="summary-label">Skipped</span>
        </div>
      </div>

      <div class="preview-table">
        <DataTable
          :value="validatedRows"
          v-model:expandedRows="expandedRows"
          dataKey="rowIndex"
          size="small"
          stripedRows
          scrollable
          scrollHeight="300px"
          :paginator="validatedRows.length > 50"
          :rows="50"
        >
          <Column header="Row" style="width: 60px">
            <template #body="{ data }">
              {{ data.rowIndex + 1 }}
            </template>
          </Column>
          <Column header="Action" style="width: 90px">
            <template #body="{ data }">
              <Tag
                :value="actionLabel(data.action)"
                :severity="actionSeverity(data.action)"
              />
            </template>
          </Column>
          <Column
            v-for="field in displayFields"
            :key="field.field"
            :header="field.label"
          >
            <template #body="{ data }">
              <span :class="{ 'error-value': data.action === 'error' }">
                {{ getRowFieldValue(data, field.field) }}
              </span>
            </template>
          </Column>
          <Column header="Details" style="width: 60px">
            <template #body="{ data }">
              <Button
                v-if="data.errors.length > 0"
                icon="pi pi-exclamation-circle"
                severity="danger"
                text
                rounded
                size="small"
                v-tooltip="data.errors.join('; ')"
              />
            </template>
          </Column>

          <!-- Expanded row for error details -->
          <template #expansion="{ data }">
            <div class="row-errors" v-if="data.errors.length > 0">
              <ul>
                <li v-for="(error, i) in data.errors" :key="i">{{ error }}</li>
              </ul>
            </div>
          </template>
        </DataTable>
      </div>
    </template>

    <div class="step-actions">
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="emit('back')"
        :disabled="isValidating"
      />
      <Button
        label="Import Now"
        icon="pi pi-upload"
        :disabled="!canImport || isValidating"
        @click="emit('import')"
      />
    </div>
  </div>
</template>

<style scoped>
.preview-step {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.step-header h3 {
  margin: 0 0 0.25rem 0;
}

.step-header .text-muted {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin: 0;
}

.validating {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 2rem 0;
  text-align: center;
}

.validating p {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.summary-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  min-width: 80px;
}

.summary-item.success { background: var(--p-green-50); }
.summary-item.info { background: var(--p-blue-50); }
.summary-item.danger { background: var(--p-red-50); }
.summary-item.secondary { background: var(--p-surface-100); }

.summary-count {
  font-size: 1.25rem;
  font-weight: 700;
}

.summary-item.success .summary-count { color: var(--p-green-700); }
.summary-item.info .summary-count { color: var(--p-blue-700); }
.summary-item.danger .summary-count { color: var(--p-red-700); }

.summary-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.preview-table {
  border-radius: 8px;
  overflow: hidden;
}

.error-value {
  color: var(--p-red-500);
}

.row-errors {
  padding: 0.5rem 1rem;
  background: var(--p-red-50);
  border-radius: 4px;
}

.row-errors ul {
  margin: 0;
  padding-left: 1.25rem;
}

.row-errors li {
  font-size: 0.8125rem;
  color: var(--p-red-700);
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-200);
}

.text-muted {
  color: var(--p-text-muted-color);
}
</style>
