<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'

const emit = defineEmits<{
  'export': [format: 'csv' | 'pdf']
}>()

defineProps<{
  loading?: boolean
  disabled?: boolean
}>()

const formatOptions = [
  { label: 'CSV (Spreadsheet)', value: 'csv' },
  { label: 'PDF (Print)', value: 'pdf' }
]

const selectedFormat = ref<'csv' | 'pdf'>('csv')

function handleExport() {
  emit('export', selectedFormat.value)
}
</script>

<template>
  <div class="report-export">
    <Select
      v-model="selectedFormat"
      :options="formatOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Export format"
      :disabled="disabled"
      class="export-select"
    />
    <Button
      label="Export"
      icon="pi pi-download"
      severity="secondary"
      outlined
      :loading="loading"
      :disabled="disabled"
      @click="handleExport"
    />
  </div>
</template>

<style scoped>
.report-export {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.export-select {
  min-width: 180px;
}
</style>
