<script setup lang="ts">
/**
 * ReportBuilder Component (T046)
 * Form for building custom reports with dimension/measure selection,
 * date range picker, and save functionality.
 */
import { ref, computed, onMounted, watch } from 'vue'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { customReportService } from '@/services/customReportService'
import type { ReportConfig, ReportDimension, ReportMeasure } from '@/types/analytics'
import { toLocalDateStr } from '@/utils/dateHelpers'

const props = defineProps<{
  config?: ReportConfig | null
}>()

const emit = defineEmits<{
  'generate': [config: ReportConfig]
  'save': [config: ReportConfig & { name: string }]
}>()

// Available options
const dimensions = ref<ReportDimension[]>([])
const measures = ref<ReportMeasure[]>([])

// Form state
const selectedDimensions = ref<string[]>([])
const selectedMeasures = ref<string[]>([])
const dateRange = ref<Date[]>([])
const reportName = ref('')
const showSaveInput = ref(false)

onMounted(() => {
  dimensions.value = customReportService.getAvailableDimensions()
  measures.value = customReportService.getAvailableMeasures()

  // Set default date range to last 30 days
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start, end]
})

// Watch for external config changes (e.g. loading a saved report)
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      selectedDimensions.value = [...newConfig.dimensions]
      selectedMeasures.value = [...newConfig.measures]
      if (newConfig.dateFrom && newConfig.dateTo) {
        dateRange.value = [new Date(newConfig.dateFrom), new Date(newConfig.dateTo)]
      }
    }
  },
  { immediate: true }
)

const canGenerate = computed(() => {
  return (
    selectedDimensions.value.length > 0 &&
    selectedMeasures.value.length > 0 &&
    dateRange.value.length === 2 &&
    dateRange.value[0] != null &&
    dateRange.value[1] != null
  )
})

const canSave = computed(() => {
  return canGenerate.value && reportName.value.trim().length > 0
})

function buildConfig(): ReportConfig {
  const dateFrom = dateRange.value[0]
    ? toLocalDateStr(dateRange.value[0])
    : ''
  const dateTo = dateRange.value[1]
    ? toLocalDateStr(dateRange.value[1])
    : ''

  return {
    dimensions: [...selectedDimensions.value],
    measures: [...selectedMeasures.value],
    dateFrom,
    dateTo
  }
}

function handleGenerate() {
  if (!canGenerate.value) return
  emit('generate', buildConfig())
}

function handleSave() {
  if (!canSave.value) return
  emit('save', {
    ...buildConfig(),
    name: reportName.value.trim()
  })
  reportName.value = ''
  showSaveInput.value = false
}

function toggleSaveInput() {
  showSaveInput.value = !showSaveInput.value
}
</script>

<template>
  <div class="report-builder">
    <div class="builder-section">
      <label class="builder-label">Group By (Dimensions)</label>
      <MultiSelect
        v-model="selectedDimensions"
        :options="dimensions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select dimensions..."
        display="chip"
        :maxSelectedLabels="4"
        class="w-full"
      >
        <template #option="{ option }">
          <div class="dimension-option">
            <span class="option-label">{{ option.label }}</span>
            <span class="option-desc">{{ option.description }}</span>
          </div>
        </template>
      </MultiSelect>
    </div>

    <div class="builder-section">
      <label class="builder-label">Measures</label>
      <MultiSelect
        v-model="selectedMeasures"
        :options="measures"
        optionLabel="label"
        optionValue="value"
        placeholder="Select measures..."
        display="chip"
        :maxSelectedLabels="4"
        class="w-full"
      >
        <template #option="{ option }">
          <div class="dimension-option">
            <span class="option-label">{{ option.label }}</span>
            <span class="option-desc">{{ option.description }}</span>
          </div>
        </template>
      </MultiSelect>
    </div>

    <div class="builder-section">
      <label class="builder-label">Date Range</label>
      <DatePicker
        v-model="dateRange"
        selectionMode="range"
        :manualInput="false"
        placeholder="Select date range"
        dateFormat="yy-mm-dd"
        showIcon
        class="w-full"
      />
    </div>

    <div class="builder-actions">
      <Button
        label="Generate Report"
        icon="pi pi-play"
        :disabled="!canGenerate"
        @click="handleGenerate"
      />

      <Button
        v-if="!showSaveInput"
        label="Save Report"
        icon="pi pi-save"
        severity="secondary"
        :disabled="!canGenerate"
        @click="toggleSaveInput"
      />

      <div v-if="showSaveInput" class="save-input-group">
        <InputText
          v-model="reportName"
          placeholder="Report name..."
          class="save-name-input"
          @keyup.enter="handleSave"
        />
        <Button
          icon="pi pi-check"
          :disabled="!canSave"
          @click="handleSave"
          size="small"
        />
        <Button
          icon="pi pi-times"
          severity="secondary"
          @click="toggleSaveInput"
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-builder {
  background: var(--p-surface-0);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--p-surface-200);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.builder-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.builder-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-surface-700);
}

.w-full {
  width: 100%;
}

.dimension-option {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label {
  font-weight: 500;
  color: var(--p-surface-800);
}

.option-desc {
  font-size: 0.75rem;
  color: var(--p-surface-500);
}

.builder-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-100);
}

.save-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-name-input {
  width: 200px;
}

@media (max-width: 768px) {
  .report-builder {
    padding: 1rem;
  }

  .builder-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .save-input-group {
    flex-wrap: wrap;
  }

  .save-name-input {
    width: 100%;
    flex: 1;
  }
}
</style>
