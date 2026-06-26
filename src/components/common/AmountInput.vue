<script setup lang="ts">
import { nextTick } from 'vue'
import InputNumber from 'primevue/inputnumber'

/**
 * AmountInput
 *
 * A money/amount field built on PrimeVue InputNumber. It standardises the
 * decimal behaviour used across the POS and fixes two UX issues:
 *  1. Selecting all on focus so typing replaces the value instead of requiring
 *     a backspace first (the "0.00" no longer has to be deleted manually).
 *  2. Restoring the "0.00" template when the field is cleared, instead of
 *     leaving a blank box (unless `allowEmpty` is set for optional fields).
 *
 * No currency symbol is shown — the field displays plain decimals (e.g. 0.00).
 * Extra attributes (id, class, :min, :max, :disabled, placeholder, inputClass,
 * autofocus, ...) are forwarded to the underlying InputNumber.
 */

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    /** When true, clearing the field leaves it empty instead of resetting to 0. */
    allowEmpty?: boolean
  }>(),
  {
    modelValue: null,
    allowEmpty: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

function inputEl(event: unknown): HTMLInputElement | undefined {
  const evt = event as { originalEvent?: Event; target?: EventTarget } | Event
  return ((evt as { originalEvent?: Event }).originalEvent?.target ??
    (evt as Event).target) as HTMLInputElement | undefined
}

function onFocus(event: unknown) {
  const target = inputEl(event)
  if (target?.select) {
    // rAF lets the dialog open / soft keyboard settle before selecting.
    requestAnimationFrame(() => target.select())
  }
}

function onBlur(event: unknown) {
  if (props.allowEmpty) return
  const raw = inputEl(event)?.value
  if (raw === '' || raw === null || raw === undefined) {
    // Defer so our 0 lands AFTER InputNumber commits its own (null) update on
    // blur — otherwise its null overwrites our reset and the box stays empty.
    nextTick(() => emit('update:modelValue', 0))
  }
}
</script>

<template>
  <InputNumber
    :model-value="modelValue"
    mode="decimal"
    locale="en-PH"
    :min-fraction-digits="2"
    :max-fraction-digits="2"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>