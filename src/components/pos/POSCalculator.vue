<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const display = ref('0')
const operator = ref<string | null>(null)
const firstOperand = ref<number | null>(null)
const waitingForSecond = ref(false)
const history = ref('')

watch(() => props.visible, (val) => {
  if (val) clearAll()
})

function inputDigit(d: string) {
  if (waitingForSecond.value) {
    display.value = d
    waitingForSecond.value = false
  } else {
    display.value = display.value === '0' ? d : display.value + d
  }
}

function inputDecimal() {
  if (waitingForSecond.value) {
    display.value = '0.'
    waitingForSecond.value = false
    return
  }
  if (!display.value.includes('.')) {
    display.value += '.'
  }
}

function handleOperator(op: string) {
  const current = parseFloat(display.value)

  if (firstOperand.value !== null && !waitingForSecond.value) {
    const result = calculate(firstOperand.value, current, operator.value!)
    display.value = formatResult(result)
    firstOperand.value = result
    history.value = `${formatResult(result)} ${op}`
  } else {
    firstOperand.value = current
    history.value = `${formatResult(current)} ${op}`
  }

  operator.value = op
  waitingForSecond.value = true
}

function calculate(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b !== 0 ? a / b : 0
    default: return b
  }
}

function handleEquals() {
  if (operator.value === null || firstOperand.value === null) return
  const current = parseFloat(display.value)
  const result = calculate(firstOperand.value, current, operator.value)
  history.value = `${formatResult(firstOperand.value)} ${operator.value} ${formatResult(current)} =`
  display.value = formatResult(result)
  firstOperand.value = null
  operator.value = null
  waitingForSecond.value = false
}

function handlePercent() {
  const current = parseFloat(display.value)
  if (firstOperand.value !== null && operator.value) {
    // Percent of first operand
    display.value = formatResult((firstOperand.value * current) / 100)
  } else {
    display.value = formatResult(current / 100)
  }
}

function toggleSign() {
  const current = parseFloat(display.value)
  display.value = formatResult(current * -1)
}

function clearAll() {
  display.value = '0'
  operator.value = null
  firstOperand.value = null
  waitingForSecond.value = false
  history.value = ''
}

function clearEntry() {
  display.value = '0'
}

function backspace() {
  if (display.value.length > 1) {
    display.value = display.value.slice(0, -1)
  } else {
    display.value = '0'
  }
}

function formatResult(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString()
  const s = parseFloat(n.toFixed(10)).toString()
  return s.length > 16 ? n.toExponential(6) : s
}

const formattedDisplay = computed(() => {
  const num = parseFloat(display.value)
  if (display.value.includes('.') && display.value.endsWith('.')) return display.value
  if (display.value.includes('.') && display.value.endsWith('0')) return display.value
  if (isNaN(num)) return '0'
  if (Math.abs(num) < 1e15 && !display.value.includes('e')) {
    return num.toLocaleString('en', { maximumFractionDigits: 10 })
  }
  return display.value
})

const buttons = [
  { label: 'C', action: 'clear', class: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300' },
  { label: 'CE', action: 'clear-entry', class: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300' },
  { label: '%', action: 'percent', class: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300' },
  { label: '/', action: 'op', op: '/', class: 'bg-amber-500 text-white hover:bg-amber-600' },

  { label: '7', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '8', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '9', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '*', display: '\u00D7', action: 'op', op: '*', class: 'bg-amber-500 text-white hover:bg-amber-600' },

  { label: '4', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '5', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '6', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '-', action: 'op', op: '-', class: 'bg-amber-500 text-white hover:bg-amber-600' },

  { label: '1', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '2', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '3', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '+', action: 'op', op: '+', class: 'bg-amber-500 text-white hover:bg-amber-600' },

  { label: '+/-', action: 'sign', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '0', action: 'digit', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '.', action: 'decimal', class: 'bg-white text-neutral-800 hover:bg-neutral-100' },
  { label: '=', action: 'equals', class: 'bg-[var(--p-primary-500)] text-white hover:bg-[var(--p-primary-600)]' },
]

function handleButton(btn: typeof buttons[0]) {
  switch (btn.action) {
    case 'digit': inputDigit(btn.label); break
    case 'decimal': inputDecimal(); break
    case 'op': handleOperator(btn.op!); break
    case 'equals': handleEquals(); break
    case 'clear': clearAll(); break
    case 'clear-entry': clearEntry(); break
    case 'percent': handlePercent(); break
    case 'sign': toggleSign(); break
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Calculator"
    :modal="true"
    :closable="true"
    :style="{ width: '340px' }"
    :pt="{ content: { style: 'padding: 0' } }"
  >
    <div class="p-4">
      <!-- Display -->
      <div class="bg-neutral-900 rounded-xl p-4 mb-4">
        <div class="text-right text-neutral-500 text-xs h-5 truncate">{{ history }}</div>
        <div class="text-right text-white text-3xl font-bold tabular-nums truncate mt-1">{{ formattedDisplay }}</div>
      </div>

      <!-- Button grid -->
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="(btn, i) in buttons"
          :key="i"
          :class="[btn.class, 'h-14 rounded-xl text-lg font-semibold border-none cursor-pointer transition-all active:scale-95']"
          @click="handleButton(btn)"
        >
          {{ btn.display || btn.label }}
        </button>
      </div>
    </div>
  </Dialog>
</template>
