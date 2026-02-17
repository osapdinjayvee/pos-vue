<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { CsvImportConfig } from '@/config/csvImportConfigs'
import type { ColumnMapping } from '@/services/csvImportService'
import csvImportService from '@/services/csvImportService'

const props = defineProps<{
  config: CsvImportConfig
  csvHeaders: string[]
  csvRows: Record<string, string>[]
}>()

const emit = defineEmits<{
  next: [mapping: ColumnMapping[]]
  back: []
}>()

const mapping = ref<ColumnMapping[]>([])

// Build select options from config fields
const fieldOptions = computed(() => {
  const options = props.config.fields.map(f => ({
    label: f.label + (f.required ? ' *' : ''),
    value: f.field
  }))
  return [{ label: '-- Skip this column --', value: null as string | null }, ...options]
})

// Preview data: first 3 rows
const previewRows = computed(() => props.csvRows.slice(0, 3))

// Check which required fields are mapped
const requiredFieldsMapped = computed(() => {
  const requiredFields = props.config.fields.filter(f => f.required)
  const mappedFields = new Set(mapping.value.map(m => m.entityField).filter(Boolean))
  return requiredFields.every(f => mappedFields.has(f.field))
})

const unmappedRequiredFields = computed(() => {
  const mappedFields = new Set(mapping.value.map(m => m.entityField).filter(Boolean))
  return props.config.fields
    .filter(f => f.required && !mappedFields.has(f.field))
    .map(f => f.label)
})

// Auto-map when headers become available (Stepper may mount before data arrives)
watch(() => props.csvHeaders, (headers) => {
  if (headers.length > 0) {
    mapping.value = csvImportService.autoMapColumns(headers, props.config)
  }
}, { immediate: true })

const updateMapping = (index: number, value: string | null) => {
  // If this field is already mapped elsewhere, clear the old mapping
  if (value) {
    mapping.value.forEach((m, i) => {
      if (i !== index && m.entityField === value) {
        m.entityField = null
      }
    })
  }
  mapping.value[index].entityField = value
}

const handleNext = () => {
  emit('next', mapping.value)
}
</script>

<template>
  <div class="mapping-step">
    <div class="step-header">
      <h3>Map Columns</h3>
      <p class="text-muted">Match your CSV columns to {{ config.entityLabel.toLowerCase() }} fields</p>
    </div>

    <div v-if="unmappedRequiredFields.length > 0" class="required-warning">
      <i class="pi pi-exclamation-triangle"></i>
      <span>Required fields not mapped: <strong>{{ unmappedRequiredFields.join(', ') }}</strong></span>
    </div>

    <div class="mapping-table">
      <DataTable :value="mapping" size="small" stripedRows>
        <Column header="CSV Column" style="width: 30%">
          <template #body="{ data }">
            <code>{{ data.csvHeader }}</code>
          </template>
        </Column>
        <Column header="Maps To" style="width: 35%">
          <template #body="{ data, index }">
            <Select
              :modelValue="data.entityField"
              @update:modelValue="updateMapping(index, $event)"
              :options="fieldOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select field..."
              class="w-full"
              size="small"
            />
          </template>
        </Column>
        <Column header="Sample Data" style="width: 35%">
          <template #body="{ data }">
            <div class="sample-data">
              <span
                v-for="(row, i) in previewRows"
                :key="i"
                class="sample-value"
              >
                {{ row[data.csvHeader] || '—' }}
              </span>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="mapping-summary">
      <Tag
        :severity="requiredFieldsMapped ? 'success' : 'warn'"
        :value="requiredFieldsMapped
          ? `All required fields mapped`
          : `${unmappedRequiredFields.length} required field(s) missing`"
      />
      <span class="text-muted">
        {{ mapping.filter(m => m.entityField).length }} of {{ mapping.length }} columns mapped
      </span>
    </div>

    <div class="step-actions">
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="emit('back')"
      />
      <Button
        label="Next: Preview"
        icon="pi pi-arrow-right"
        iconPos="right"
        :disabled="!requiredFieldsMapped"
        @click="handleNext"
      />
    </div>
  </div>
</template>

<style scoped>
.mapping-step {
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

.required-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--p-orange-50);
  border: 1px solid var(--p-orange-200);
  border-radius: 8px;
  color: var(--p-orange-700);
  font-size: 0.875rem;
}

.mapping-table {
  border-radius: 8px;
  overflow: hidden;
}

.sample-data {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sample-value {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.mapping-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mapping-summary .text-muted {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
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
