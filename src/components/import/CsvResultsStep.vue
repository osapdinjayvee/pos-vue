<script setup lang="ts">
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { ImportResult } from '@/services/csvImportService'

const props = defineProps<{
  result: ImportResult
  entityLabel: string
}>()

const emit = defineEmits<{
  close: []
  importAnother: []
}>()

const totalProcessed = props.result.created + props.result.updated + props.result.skipped + props.result.errors
const successCount = props.result.created + props.result.updated
</script>

<template>
  <div class="results-step">
    <div class="step-header">
      <div class="result-icon" :class="result.errors > 0 ? 'partial' : 'success'">
        <i :class="result.errors > 0 ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle'"></i>
      </div>
      <h3>{{ result.errors > 0 ? 'Import Completed with Errors' : 'Import Successful' }}</h3>
      <p class="text-muted">
        {{ successCount }} of {{ totalProcessed }} {{ entityLabel.toLowerCase() }} imported successfully
      </p>
    </div>

    <div class="result-cards">
      <div class="result-card success" v-if="result.created > 0">
        <i class="pi pi-plus-circle"></i>
        <span class="count">{{ result.created }}</span>
        <span class="label">Created</span>
      </div>
      <div class="result-card info" v-if="result.updated > 0">
        <i class="pi pi-pencil"></i>
        <span class="count">{{ result.updated }}</span>
        <span class="label">Updated</span>
      </div>
      <div class="result-card secondary" v-if="result.skipped > 0">
        <i class="pi pi-minus-circle"></i>
        <span class="count">{{ result.skipped }}</span>
        <span class="label">Skipped</span>
      </div>
      <div class="result-card danger" v-if="result.errors > 0">
        <i class="pi pi-times-circle"></i>
        <span class="count">{{ result.errors }}</span>
        <span class="label">Failed</span>
      </div>
    </div>

    <div v-if="result.errorDetails.length > 0" class="error-details">
      <h4>Error Details</h4>
      <DataTable :value="result.errorDetails" size="small" stripedRows scrollable scrollHeight="200px">
        <Column header="Row" style="width: 80px">
          <template #body="{ data }">
            {{ data.rowIndex + 1 }}
          </template>
        </Column>
        <Column header="Errors">
          <template #body="{ data }">
            <div class="error-list">
              <Tag
                v-for="(error, i) in data.errors"
                :key="i"
                :value="error"
                severity="danger"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="step-actions">
      <Button
        label="Import Another File"
        icon="pi pi-upload"
        severity="secondary"
        outlined
        @click="emit('importAnother')"
      />
      <Button
        label="Done"
        icon="pi pi-check"
        @click="emit('close')"
      />
    </div>
  </div>
</template>

<style scoped>
.results-step {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.result-icon.success {
  background: var(--p-green-50);
  color: var(--p-green-600);
}

.result-icon.partial {
  background: var(--p-orange-50);
  color: var(--p-orange-600);
}

.step-header h3 {
  margin: 0;
}

.step-header .text-muted {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin: 0;
}

.result-cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  min-width: 100px;
}

.result-card i { font-size: 1.25rem; }

.result-card .count {
  font-size: 1.5rem;
  font-weight: 700;
}

.result-card .label {
  font-size: 0.8125rem;
}

.result-card.success {
  background: var(--p-green-50);
  color: var(--p-green-700);
}

.result-card.info {
  background: var(--p-blue-50);
  color: var(--p-blue-700);
}

.result-card.secondary {
  background: var(--app-surface-100);
  color: var(--p-text-muted-color);
}

.result-card.danger {
  background: var(--p-red-50);
  color: var(--p-red-700);
}

.error-details h4 {
  margin: 0 0 0.5rem 0;
}

.error-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--app-surface-200);
}

.text-muted {
  color: var(--p-text-muted-color);
}
</style>
