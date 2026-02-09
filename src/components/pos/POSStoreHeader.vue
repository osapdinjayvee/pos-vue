<script setup lang="ts">
import { computed } from 'vue'
import { vatService } from '@/services/vatService'

const props = defineProps<{
  hasTransaction: boolean
  hasOpenShift?: boolean
  grandTotal: number
  subtotal: number
  discountTotal: number
  terminalId?: string
  cashierName?: string
}>()

function fmt(n: number): string {
  return vatService.formatCurrency(n)
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  const name = props.cashierName || 'Cashier'
  if (hour < 12) return `Good morning, ${name}!`
  if (hour < 18) return `Good afternoon, ${name}!`
  return `Good evening, ${name}!`
})
</script>

<template>
  <!-- Idle + shift open: greeting + stats -->
  <div v-if="!hasTransaction && hasOpenShift" class="shrink-0 header-idle">
    <div class="px-6 pt-6 pb-2 text-center">
      <h2 class="text-2xl font-extrabold text-white m-0 tracking-tight">{{ greeting }}</h2>
      <p class="text-sm text-white/50 mt-1.5 mb-0">Scan a product to begin</p>
    </div>

    <div class="pb-4"></div>
  </div>

  <!-- Idle + no shift: start prompt -->
  <div v-else-if="!hasTransaction" class="shrink-0 text-white" style="background-color: #78716c">
    <div class="px-5 py-6 text-center">
      <div class="inline-flex items-center gap-2.5 text-white/80">
        <i class="pi pi-exclamation-triangle text-lg"></i>
        <span class="text-base font-medium">Start a shift to begin</span>
      </div>
    </div>
  </div>

  <!-- Active: big total -->
  <div v-else class="shrink-0" style="background-color: var(--p-primary-color)">
    <div class="px-5 pt-5 pb-2 text-center">
      <div class="text-[11px] tracking-[0.15em] uppercase text-white/80 font-medium">Amount Due</div>
      <div class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mt-2 tabular-nums">
        {{ fmt(grandTotal) }}
      </div>
    </div>
    <div v-if="discountTotal > 0" class="pb-4 text-center">
      <span class="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-sm text-green-300">
        <i class="pi pi-tag text-xs"></i> -{{ fmt(discountTotal) }} discount
      </span>
    </div>
    <div v-else class="pb-4"></div>
  </div>
</template>

<style scoped>
.header-idle {
  background: linear-gradient(135deg, var(--p-primary-color) 0%, color-mix(in srgb, var(--p-primary-color) 80%, #000) 100%);
}

</style>
