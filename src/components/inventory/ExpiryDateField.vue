<script setup lang="ts">
/**
 * Expiry date capture for stock-receiving flows.
 *
 * Typing or scrolling to a date on an Android tablet is slow, and most goods
 * have a shelf life expressed in months, so the common cases are one tap. The
 * picker stays available for anything else.
 *
 * Emits a YYYY-MM-DD string (local), or null when no expiry applies.
 */
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import { toLocalDateStr, parseLocalDate, daysFromToday } from '@/utils/dateHelpers'

const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const QUICK_PICKS = [
  { label: '1 mo', months: 1 },
  { label: '3 mo', months: 3 },
  { label: '6 mo', months: 6 },
  { label: '1 yr', months: 12 }
]

const today = new Date()
today.setHours(0, 0, 0, 0)

const pickerValue = computed({
  get: () => (props.modelValue ? parseLocalDate(props.modelValue) : null),
  set: (date: Date | null) => emit('update:modelValue', date ? toLocalDateStr(date) : null)
})

/** Days remaining, for the inline confirmation of what was picked. */
const daysRemaining = computed(() =>
  props.modelValue ? daysFromToday(props.modelValue) : null
)

const summary = computed(() => {
  const days = daysRemaining.value
  if (days === null) return null
  if (days < 0) return { text: `Already expired ${Math.abs(days)} days ago`, tone: 'danger' }
  if (days === 0) return { text: 'Expires today', tone: 'danger' }
  if (days <= 7) return { text: `Expires in ${days} days — will alert immediately`, tone: 'danger' }
  if (days <= 30) return { text: `Expires in ${days} days`, tone: 'warn' }
  return { text: `Expires in ${days} days`, tone: 'ok' }
})

function isSelected(months: number): boolean {
  if (!props.modelValue) return false
  return props.modelValue === addMonths(months)
}

/**
 * Add whole months, clamping to the end of the target month so 31 Jan + 1 month
 * lands on 28/29 Feb rather than rolling into March.
 */
function addMonths(months: number): string {
  const base = new Date(today)
  const targetDay = base.getDate()
  base.setDate(1)
  base.setMonth(base.getMonth() + months)
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  base.setDate(Math.min(targetDay, lastDay))
  return toLocalDateStr(base)
}

function selectQuick(months: number) {
  const next = addMonths(months)
  // Tapping the active chip clears it, so a mis-tap is one tap to undo.
  emit('update:modelValue', props.modelValue === next ? null : next)
}

function clear() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="expiry-field">
    <label class="expiry-field__label">{{ label || 'Expiry Date (optional)' }}</label>

    <div class="expiry-field__quick">
      <button
        v-for="pick in QUICK_PICKS"
        :key="pick.months"
        type="button"
        class="quick-chip"
        :class="{ 'is-selected': isSelected(pick.months) }"
        :disabled="disabled"
        @click="selectQuick(pick.months)"
      >
        {{ pick.label }}
      </button>
      <button
        type="button"
        class="quick-chip quick-chip--clear"
        :disabled="disabled || !modelValue"
        @click="clear"
      >
        <i class="pi pi-times"></i>
        None
      </button>
    </div>

    <DatePicker
      v-model="pickerValue"
      dateFormat="yy-mm-dd"
      showIcon
      showButtonBar
      placeholder="Pick a date"
      class="w-full"
      :disabled="disabled"
      :minDate="today"
    />

    <small v-if="summary" class="expiry-field__summary" :class="`is-${summary.tone}`">
      <i class="pi pi-info-circle"></i>
      {{ summary.text }}
    </small>
    <small v-else class="expiry-field__hint">
      Set a date to get expiring and expired alerts for this stock.
    </small>
  </div>
</template>

<style scoped>
.expiry-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expiry-field__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.expiry-field__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

/* Sized for thumbs — these are the primary control on the tablet. */
.quick-chip {
  flex: 1 1 auto;
  min-width: 3.75rem;
  min-height: 2.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--app-surface-200);
  border-radius: 999px;
  background: var(--app-surface-0);
  color: var(--p-text-color);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.quick-chip:active {
  background: var(--app-surface-100);
}

.quick-chip.is-selected {
  border-color: var(--p-primary-color);
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

.quick-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-chip--clear {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: var(--p-text-muted-color);
}

.expiry-field__hint,
.expiry-field__summary {
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--p-text-muted-color);
}

.expiry-field__summary.is-danger {
  color: var(--p-red-500);
  font-weight: 500;
}

.expiry-field__summary.is-warn {
  color: var(--p-orange-500);
}

.w-full {
  width: 100%;
}
</style>
