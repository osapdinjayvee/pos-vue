<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import RadioButton from 'primevue/radiobutton'
import Message from 'primevue/message'
import type { CsvImportConfig } from '@/config/csvImportConfigs'
import type { ImportMode } from '@/services/csvImportService'
import { readFileAsText, parseCsv, downloadCsvTemplate } from '@/utils/csvParser'

const props = defineProps<{
  config: CsvImportConfig
}>()

const emit = defineEmits<{
  next: [data: { headers: string[]; rows: Record<string, string>[]; mode: ImportMode }]
}>()

const importMode = ref<ImportMode>('create')
const selectedFile = ref<File | null>(null)
const fileError = ref('')
const isProcessing = ref(false)

const onFileSelect = (event: FileUploadSelectEvent) => {
  fileError.value = ''
  const file = event.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.csv')) {
    fileError.value = 'Please select a CSV file'
    selectedFile.value = null
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    fileError.value = 'File size must be less than 10MB'
    selectedFile.value = null
    return
  }

  selectedFile.value = file
}

const handleDownloadTemplate = () => {
  downloadCsvTemplate(props.config.fields, props.config.templateFilename)
}

const handleNext = async () => {
  if (!selectedFile.value) {
    fileError.value = 'Please select a CSV file'
    return
  }

  isProcessing.value = true
  fileError.value = ''

  try {
    const content = await readFileAsText(selectedFile.value)
    const result = parseCsv(content)

    if (result.headers.length === 0) {
      fileError.value = 'CSV file appears to be empty or has no headers'
      return
    }

    if (result.rows.length === 0) {
      fileError.value = 'CSV file has no data rows'
      return
    }

    emit('next', {
      headers: result.headers,
      rows: result.rows,
      mode: importMode.value
    })
  } catch (e: any) {
    fileError.value = e.message || 'Failed to parse CSV file'
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="upload-step">
    <div class="step-header">
      <h3>Upload CSV File</h3>
      <p class="text-muted">Import {{ config.entityLabel.toLowerCase() }} from a CSV file</p>
    </div>

    <div class="upload-section">
      <FileUpload
        mode="basic"
        accept=".csv"
        :maxFileSize="10485760"
        chooseLabel="Choose CSV File"
        chooseIcon="pi pi-file"
        :auto="false"
        :customUpload="true"
        @select="onFileSelect"
        class="csv-upload"
      />

      <div v-if="selectedFile" class="file-info">
        <i class="pi pi-file"></i>
        <span>{{ selectedFile.name }}</span>
        <span class="text-muted">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
      </div>

      <Message v-if="fileError" severity="error" :closable="false" class="mt-3">
        {{ fileError }}
      </Message>
    </div>

    <div class="mode-section">
      <h4>Import Mode</h4>
      <div class="mode-options">
        <div class="mode-option" @click="importMode = 'create'">
          <RadioButton v-model="importMode" value="create" inputId="mode-create" />
          <label for="mode-create">
            <strong>Create Only</strong>
            <span class="text-muted">Only create new records. Skip if already exists.</span>
          </label>
        </div>
        <div class="mode-option" @click="importMode = 'create_update'">
          <RadioButton v-model="importMode" value="create_update" inputId="mode-update" />
          <label for="mode-update">
            <strong>Create & Update</strong>
            <span class="text-muted">
              Create new records and update existing ones matched by
              {{ config.matchField === 'sku' ? 'SKU' : 'name' }}.
            </span>
          </label>
        </div>
      </div>
    </div>

    <div class="template-section">
      <Button
        label="Download Template"
        icon="pi pi-download"
        severity="secondary"
        outlined
        size="small"
        @click="handleDownloadTemplate"
      />
      <span class="text-muted">Download a CSV template with the correct column headers</span>
    </div>

    <div class="step-actions">
      <div></div>
      <Button
        label="Next: Map Columns"
        icon="pi pi-arrow-right"
        iconPos="right"
        :disabled="!selectedFile || isProcessing"
        :loading="isProcessing"
        @click="handleNext"
      />
    </div>
  </div>
</template>

<style scoped>
.upload-step {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-header h3 {
  margin: 0 0 0.25rem 0;
}

.step-header .text-muted {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin: 0;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  font-size: 0.875rem;
}

.mode-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.mode-option:hover {
  border-color: var(--p-primary-color);
}

.mode-option label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.mode-option label .text-muted {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.template-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.template-section .text-muted {
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
