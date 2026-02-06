<script setup lang="ts">
import { watch } from 'vue'
import { useDenominationCount } from '@/composables/useDenominationCount'
import type { DenominationCountInput } from '@/types/cashDrawer'

interface Props {
  readonly?: boolean
  initialCounts?: DenominationCountInput[]
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  initialCounts: undefined
})

const emit = defineEmits<{
  'update:denominations': [denominations: DenominationCountInput[]]
}>()

const {
  quantities,
  bills,
  coins,
  total,
  setQuantity,
  reset: resetCounts,
  getDenominations,
  setFromExisting
} = useDenominationCount()

if (props.initialCounts) {
  setFromExisting(props.initialCounts)
}

watch(
  quantities,
  () => {
    emit('update:denominations', getDenominations())
  },
  { deep: true }
)

function handleInput(denomination: number, event: Event) {
  const input = event.target as HTMLInputElement
  const val = parseInt(input.value, 10)
  setQuantity(denomination, isNaN(val) ? 0 : val)
}

function selectAll(event: FocusEvent) {
  const input = event.target as HTMLInputElement
  input.select()
}

const reset = () => { resetCounts() }
defineExpose({ reset })

const formatSubtotal = (amount: number): string =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="denom-entry">
    <!-- Bills -->
    <div class="denom-section">
      <div class="section-header">
        <i class="pi pi-wallet"></i>
        <span>Bills</span>
      </div>
      <div class="denom-list">
        <div
          v-for="bill in bills"
          :key="bill.denomination"
          class="denom-row"
          :class="{ active: bill.quantity > 0 }"
        >
          <span class="denom-label">{{ bill.label }}</span>
          <input
            type="number"
            class="qty-input"
            :value="bill.quantity"
            :disabled="readonly"
            min="0"
            inputmode="numeric"
            placeholder="0"
            @input="handleInput(bill.denomination, $event)"
            @focus="selectAll"
          />
          <span class="subtotal" :class="{ 'has-amount': bill.subtotal > 0 }">
            {{ formatSubtotal(bill.subtotal) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Coins -->
    <div class="denom-section">
      <div class="section-header">
        <i class="pi pi-circle"></i>
        <span>Coins</span>
      </div>
      <div class="denom-list">
        <div
          v-for="coin in coins"
          :key="coin.denomination"
          class="denom-row"
          :class="{ active: coin.quantity > 0 }"
        >
          <span class="denom-label">{{ coin.label }}</span>
          <input
            type="number"
            class="qty-input"
            :value="coin.quantity"
            :disabled="readonly"
            min="0"
            inputmode="numeric"
            placeholder="0"
            @input="handleInput(coin.denomination, $event)"
            @focus="selectAll"
          />
          <span class="subtotal" :class="{ 'has-amount': coin.subtotal > 0 }">
            {{ formatSubtotal(coin.subtotal) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.denom-entry {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.denom-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-color-secondary);
  padding: 0 0.25rem;
}

.section-header i {
  font-size: 0.8125rem;
}

.denom-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.denom-row {
  display: grid;
  grid-template-columns: 5rem 5rem 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1.5px solid transparent;
  transition: background-color 0.15s, border-color 0.15s;
}

.denom-row.active {
  background: color-mix(in srgb, var(--primary-color) 5%, transparent);
  border-color: var(--primary-200);
}

.denom-label {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-color);
}

.qty-input {
  width: 100%;
  height: 2.5rem;
  border: 1.5px solid var(--surface-300);
  border-radius: 0.5rem;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-color);
  background: var(--surface-0);
  outline: none;
  -moz-appearance: textfield;
  appearance: textfield;
  padding: 0 0.5rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.qty-input:disabled {
  opacity: 0.5;
  cursor: default;
}

.subtotal {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-align: right;
  transition: color 0.15s;
}

.subtotal.has-amount {
  color: var(--primary-700);
}

/* Tablet: 2-col */
@media (min-width: 600px) and (max-width: 959px) {
  .denom-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.375rem;
  }
}

/* Mobile */
@media (max-width: 599px) {
  .denom-row {
    grid-template-columns: 4rem 4.5rem 1fr;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
  }

  .denom-label {
    font-size: 0.8125rem;
  }

  .qty-input {
    height: 2.25rem;
    font-size: 1rem;
  }

  .subtotal {
    font-size: 0.8125rem;
  }
}

/* Dark mode */
:root.p-dark .denom-row.active {
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border-color: var(--primary-700);
}

:root.p-dark .qty-input {
  background: var(--surface-700);
  border-color: var(--surface-600);
  color: var(--text-color);
}

:root.p-dark .qty-input:focus {
  border-color: var(--primary-400);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 25%, transparent);
}

:root.p-dark .subtotal.has-amount {
  color: var(--primary-300);
}
</style>
