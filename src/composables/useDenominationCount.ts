/**
 * Denomination Count Composable
 * Manages denomination entry state for opening/closing cash counts
 */

import { ref, computed } from 'vue'
import { PHP_DENOMINATIONS } from '@/types/cashDrawer'
import type { DenominationCountInput, DisplayDenominationCount } from '@/types/cashDrawer'

export function useDenominationCount() {
  // Create reactive quantities for each denomination
  const quantities = ref<Record<number, number>>(
    Object.fromEntries(PHP_DENOMINATIONS.map(d => [d.value, 0]))
  )

  // Computed denominations with subtotals
  const denominations = computed<DisplayDenominationCount[]>(() =>
    PHP_DENOMINATIONS.map(d => ({
      denomination: d.value,
      label: d.label,
      type: d.type,
      quantity: quantities.value[d.value] || 0,
      subtotal: (quantities.value[d.value] || 0) * d.value
    }))
  )

  // Bills only
  const bills = computed(() => denominations.value.filter(d => d.type === 'bill'))

  // Coins only
  const coins = computed(() => denominations.value.filter(d => d.type === 'coin'))

  // Grand total
  const total = computed(() =>
    denominations.value.reduce((sum, d) => sum + d.subtotal, 0)
  )

  // Set quantity for a specific denomination
  function setQuantity(denomination: number, quantity: number) {
    quantities.value[denomination] = Math.max(0, Math.floor(quantity))
  }

  // Reset all quantities to zero
  function reset() {
    for (const key of Object.keys(quantities.value)) {
      quantities.value[Number(key)] = 0
    }
  }

  // Get denominations as input array (for saving to DB)
  function getDenominations(): DenominationCountInput[] {
    return PHP_DENOMINATIONS.map(d => ({
      denomination: d.value,
      quantity: quantities.value[d.value] || 0,
      subtotal: (quantities.value[d.value] || 0) * d.value
    })).filter(d => d.quantity > 0)
  }

  // Populate from existing denomination counts
  function setFromExisting(counts: Array<{ denomination: number; quantity: number }>) {
    reset()
    for (const count of counts) {
      if (quantities.value[count.denomination] !== undefined) {
        quantities.value[count.denomination] = count.quantity
      }
    }
  }

  return {
    quantities,
    denominations,
    bills,
    coins,
    total,
    setQuantity,
    reset,
    getDenominations,
    setFromExisting
  }
}
