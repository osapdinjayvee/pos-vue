<script setup lang="ts">
import { vatService } from '@/services/vatService'

defineProps<{
  hasTransaction: boolean
  grandTotal: number
  subtotal: number
  discountTotal: number
  storeName?: string
  branchName?: string
  address?: string
  tin?: string
  accreditationNo?: string
  terminalId?: string
  businessDate?: string
}>()

function fmt(n: number): string {
  return vatService.formatCurrency(n)
}
</script>

<template>
  <!-- Idle: store info -->
  <div v-if="!hasTransaction" class="shrink-0 text-white" style="background-color: var(--p-primary-color)">
    <div class="px-5 pt-6 pb-5 text-center">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white m-0">{{ storeName || 'POS Terminal' }}</h1>
      <p v-if="address" class="text-sm text-white/70 mt-2 mb-0">{{ address }}</p>
    </div>

    <div class="mx-5 border-t border-white/15"></div>

    <div class="px-5 py-3 flex items-center justify-center gap-4 text-xs text-white/60">
      <span v-if="tin" class="flex items-center gap-1.5">
        <i class="pi pi-id-card text-[10px]"></i> {{ tin }}
      </span>
      <span v-if="accreditationNo" class="flex items-center gap-1.5">
        <i class="pi pi-verified text-[10px]"></i> {{ accreditationNo }}
      </span>
      <span v-if="terminalId" class="flex items-center gap-1.5">
        <i class="pi pi-desktop text-[10px]"></i> Terminal {{ terminalId }}
      </span>
    </div>

    <div class="mx-5 border-t border-white/15"></div>

    <div class="px-5 py-5 text-center">
      <div class="inline-flex items-center gap-2.5 text-white/80">
        <i class="pi pi-barcode text-lg"></i>
        <span class="text-base font-medium">Scan a product to begin</span>
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
