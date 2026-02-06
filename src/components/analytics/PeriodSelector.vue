<script setup lang="ts">
import { ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import type { AnalyticsPeriod } from '@/types/analytics'

const props = defineProps<{
  modelValue?: AnalyticsPeriod
}>()

const emit = defineEmits<{
  'update:modelValue': [period: AnalyticsPeriod]
  'change': [payload: { period: AnalyticsPeriod; dateFrom: string; dateTo: string }]
}>()

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'Custom', value: 'custom' }
]

const selectedPeriod = ref<AnalyticsPeriod>(props.modelValue || 'today')
const customRange = ref<Date[] | null>(null)

watch(() => props.modelValue, (val) => {
  if (val) selectedPeriod.value = val
})

watch(selectedPeriod, (period) => {
  emit('update:modelValue', period)
  if (period !== 'custom') {
    emitChange(period)
  }
})

watch(customRange, (range) => {
  if (range && range.length === 2 && range[0] && range[1]) {
    emitChange('custom', range[0], range[1])
  }
})

function emitChange(period: AnalyticsPeriod, from?: Date, to?: Date) {
  const now = new Date()
  let dateFrom: string
  let dateTo: string

  switch (period) {
    case 'today':
      dateFrom = dateTo = now.toISOString().split('T')[0]
      break
    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      dateFrom = start.toISOString().split('T')[0]
      dateTo = now.toISOString().split('T')[0]
      break
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFrom = start.toISOString().split('T')[0]
      dateTo = now.toISOString().split('T')[0]
      break
    }
    case 'quarter': {
      const qm = Math.floor(now.getMonth() / 3) * 3
      const start = new Date(now.getFullYear(), qm, 1)
      dateFrom = start.toISOString().split('T')[0]
      dateTo = now.toISOString().split('T')[0]
      break
    }
    case 'custom':
      dateFrom = from ? from.toISOString().split('T')[0] : now.toISOString().split('T')[0]
      dateTo = to ? to.toISOString().split('T')[0] : now.toISOString().split('T')[0]
      break
    default:
      dateFrom = dateTo = now.toISOString().split('T')[0]
  }

  emit('change', { period, dateFrom, dateTo })
}
</script>

<template>
  <div class="period-selector">
    <SelectButton
      v-model="selectedPeriod"
      :options="periodOptions"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
    />
    <DatePicker
      v-if="selectedPeriod === 'custom'"
      v-model="customRange"
      selectionMode="range"
      placeholder="Select date range"
      dateFormat="M dd, yy"
      showIcon
      class="custom-date-picker"
    />
  </div>
</template>

<style scoped>
.period-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.custom-date-picker {
  min-width: 240px;
}
</style>
