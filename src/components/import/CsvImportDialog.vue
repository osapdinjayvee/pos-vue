<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Stepper from 'primevue/stepper'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import CsvUploadStep from './CsvUploadStep.vue'
import CsvMappingStep from './CsvMappingStep.vue'
import CsvPreviewStep from './CsvPreviewStep.vue'
import CsvResultsStep from './CsvResultsStep.vue'
import type { CsvImportConfig } from '@/config/csvImportConfigs'
import type { ColumnMapping, ImportMode, ValidatedRow, ImportResult } from '@/services/csvImportService'
import csvImportService from '@/services/csvImportService'

const props = defineProps<{
  config: CsvImportConfig
}>()

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  importComplete: [result: ImportResult]
}>()

// State
const activeStep = ref('1')
const csvHeaders = ref<string[]>([])
const csvRows = ref<Record<string, string>[]>([])
const importMode = ref<ImportMode>('create')
const columnMapping = ref<ColumnMapping[]>([])
const validatedRows = ref<ValidatedRow[]>([])
const isValidating = ref(false)
const isImporting = ref(false)
const importResult = ref<ImportResult | null>(null)

// Store activateCallback for programmatic navigation
let currentActivateCallback: ((value: string) => void) | null = null

// Reset state when dialog opens
watch(visible, (val) => {
  if (val) {
    resetState()
  }
})

function resetState() {
  activeStep.value = '1'
  csvHeaders.value = []
  csvRows.value = []
  importMode.value = 'create'
  columnMapping.value = []
  validatedRows.value = []
  isValidating.value = false
  isImporting.value = false
  importResult.value = null
}

// Step 1 → 2: Upload complete
function onUploadNext(data: { headers: string[]; rows: Record<string, string>[]; mode: ImportMode }, activateCallback: (value: string) => void) {
  csvHeaders.value = data.headers
  csvRows.value = data.rows
  importMode.value = data.mode
  activateCallback('2')
}

// Step 2 → 3: Mapping complete, run validation
async function onMappingNext(mapping: ColumnMapping[], activateCallback: (value: string) => void) {
  columnMapping.value = mapping
  activateCallback('3')
  isValidating.value = true

  try {
    validatedRows.value = await csvImportService.validateRows(
      csvRows.value,
      mapping,
      props.config,
      importMode.value
    )
  } catch (e: any) {
    console.error('Validation error:', e)
  } finally {
    isValidating.value = false
  }
}

// Step 3 → 4: Execute import
async function onImport(activateCallback: (value: string) => void) {
  isImporting.value = true
  currentActivateCallback = activateCallback

  try {
    const result = await csvImportService.executeImport(
      validatedRows.value,
      props.config
    )
    importResult.value = result
    activateCallback('4')
    emit('importComplete', result)
  } catch (e: any) {
    console.error('Import error:', e)
  } finally {
    isImporting.value = false
  }
}

function handleClose() {
  visible.value = false
}

function handleImportAnother() {
  resetState()
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="`Import ${config.entityLabel}`"
    :style="{ width: '800px', maxWidth: '95vw' }"
    :modal="true"
    :closable="!isImporting"
    :closeOnEscape="!isImporting"
    :dismissableMask="false"
  >
    <Stepper v-model:value="activeStep" linear>
      <StepList>
        <Step value="1">Upload</Step>
        <Step value="2">Map Columns</Step>
        <Step value="3">Preview</Step>
        <Step value="4">Results</Step>
      </StepList>
      <StepPanels>
        <StepPanel v-slot="{ activateCallback }" value="1">
          <CsvUploadStep
            :config="config"
            @next="(data) => onUploadNext(data, activateCallback)"
          />
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="2">
          <CsvMappingStep
            :config="config"
            :csvHeaders="csvHeaders"
            :csvRows="csvRows"
            @next="(mapping) => onMappingNext(mapping, activateCallback)"
            @back="activateCallback('1')"
          />
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="3">
          <CsvPreviewStep
            :config="config"
            :validatedRows="validatedRows"
            :isValidating="isValidating"
            @import="() => onImport(activateCallback)"
            @back="activateCallback('2')"
          />
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="4">
          <CsvResultsStep
            v-if="importResult"
            :result="importResult"
            :entityLabel="config.entityLabel"
            @close="handleClose"
            @importAnother="handleImportAnother"
          />
        </StepPanel>
      </StepPanels>
    </Stepper>
  </Dialog>
</template>
