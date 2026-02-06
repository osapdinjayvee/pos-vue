<script setup lang="ts">
import { ref } from 'vue'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import type { EISSubmissionStatus } from '@/types/eis'

const emit = defineEmits<{
  'filter-change': [filters: { dateFrom: string | null; dateTo: string | null; status: string; search: string }]
  export: []
  'retry-all': []
}>()

const dateRange = ref<Date[] | null>(null)
const statusFilter = ref('all')
const search = ref('')

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Failed', value: 'failed' },
  { label: 'Rejected', value: 'rejected' }
]

function emitFilterChange() {
  const dateFrom = dateRange.value?.[0] ? dateRange.value[0].toISOString() : null
  const dateTo = dateRange.value?.[1] ? dateRange.value[1].toISOString() : null
  emit('filter-change', {
    dateFrom,
    dateTo,
    status: statusFilter.value,
    search: search.value
  })
}
</script>

<template>
  <div class="eis-filters">
    <div class="filter-row">
      <DatePicker
        v-model="dateRange"
        selectionMode="range"
        placeholder="Date range"
        dateFormat="yy-mm-dd"
        showIcon
        class="date-range-picker"
        @update:modelValue="emitFilterChange"
      />

      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        @update:modelValue="emitFilterChange"
      />

      <InputText
        v-model="search"
        placeholder="Search OR# or BIR ref..."
        class="search-input"
        @input="emitFilterChange"
      />
    </div>

    <div class="filter-actions">
      <Button label="Export CSV" icon="pi pi-download" severity="secondary" outlined size="small" @click="emit('export')" />
      <Button label="Retry All Failed" icon="pi pi-refresh" severity="warn" outlined size="small" @click="emit('retry-all')" />
    </div>
  </div>
</template>

<style scoped>
.eis-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.date-range-picker {
  width: 240px;
}

.search-input {
  width: 220px;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
