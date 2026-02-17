<script setup lang="ts">
import { ref, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { toLocalDateStr } from '@/utils/dateHelpers'

const props = defineProps<{
  modelValue: { dateFrom: string; dateTo: string }
  showPeriodButtons?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { dateFrom: string; dateTo: string }]
  'apply': []
}>()

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

const selectedPeriod = ref('today')
const dateFrom = ref<Date | null>(props.modelValue.dateFrom ? new Date(props.modelValue.dateFrom) : new Date())
const dateTo = ref<Date | null>(props.modelValue.dateTo ? new Date(props.modelValue.dateTo) : new Date())

function applyPeriod() {
  const now = new Date()
  let start: Date
  let end: Date

  switch (selectedPeriod.value) {
    case 'today':
      start = now
      end = now
      break
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      start = new Date(now.getFullYear(), now.getMonth(), diff)
      end = new Date(start)
      end.setDate(end.getDate() + 6)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    default:
      start = dateFrom.value || now
      end = dateTo.value || now
  }

  dateFrom.value = start
  dateTo.value = end

  emit('update:modelValue', {
    dateFrom: toLocalDateStr(start),
    dateTo: toLocalDateStr(end)
  })
  emit('apply')
}

watch(selectedPeriod, () => {
  if (selectedPeriod.value !== 'custom') {
    applyPeriod()
  }
})

function handleApply() {
  applyPeriod()
}
</script>

<template>
  <div class="report-filters">
    <SelectButton
      v-if="showPeriodButtons"
      v-model="selectedPeriod"
      :options="periodOptions"
      optionLabel="label"
      optionValue="value"
    />

    <template v-if="!showPeriodButtons || selectedPeriod === 'custom'">
      <div class="date-range">
        <DatePicker
          v-model="dateFrom"
          dateFormat="yy-mm-dd"
          showIcon
          placeholder="From"
          :maxDate="new Date()"
        />
        <span class="date-separator">to</span>
        <DatePicker
          v-model="dateTo"
          dateFormat="yy-mm-dd"
          showIcon
          placeholder="To"
          :maxDate="new Date()"
        />
        <Button label="Apply" icon="pi pi-search" @click="handleApply" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.report-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-separator {
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

@media (max-width: 767.98px) {
  .date-range {
    flex-wrap: wrap;
  }
}
</style>
