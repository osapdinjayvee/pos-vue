<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'
import { vatService } from '@/services/vatService'

const cartStore = useCartStore()
const { totals, hasDiscount, discount } = storeToRefs(cartStore)

const formattedSubtotal = computed(() => vatService.formatCurrency(totals.value.subtotal))
const formattedDiscount = computed(() =>
  totals.value.discountTotal > 0 ? vatService.formatCurrency(totals.value.discountTotal) : null
)
const formattedVatableSales = computed(() =>
  totals.value.vatableSales > 0 ? vatService.formatCurrency(totals.value.vatableSales) : null
)
const formattedVatAmount = computed(() =>
  totals.value.vatAmount > 0 ? vatService.formatCurrency(totals.value.vatAmount) : null
)
const formattedVatExempt = computed(() =>
  totals.value.vatExemptSales > 0 ? vatService.formatCurrency(totals.value.vatExemptSales) : null
)
const formattedZeroRated = computed(() =>
  totals.value.zeroRatedSales > 0 ? vatService.formatCurrency(totals.value.zeroRatedSales) : null
)
const formattedTotal = computed(() => vatService.formatCurrency(totals.value.grandTotal))

const discountLabel = computed(() => {
  if (!discount.value) return ''
  if (discount.value.type === 'senior_citizen') return 'Senior Citizen (20%)'
  if (discount.value.type === 'pwd') return 'PWD (20%)'
  if (discount.value.percentage) return `${discount.value.percentage}% off`
  return 'Discount'
})
</script>

<template>
  <div class="p-3 sm:p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
    <!-- Discount -->
    <div v-if="formattedDiscount" class="flex justify-between text-sm text-green-600">
      <span>{{ discountLabel }}</span>
      <span>-{{ formattedDiscount }}</span>
    </div>

    <!-- Subtotal -->
    <div class="flex justify-between text-sm font-bold text-neutral-700">
      <span>Subtotal</span>
      <span>{{ formattedSubtotal }}</span>
    </div>

    <!-- VAT breakdown -->
    <div v-if="totals.itemCount > 0" class="bg-neutral-100 rounded-lg p-2 mt-2 text-sm text-neutral-500 space-y-0.5">
      <div v-if="formattedVatableSales" class="flex justify-between">
        <span>VATable Sales</span>
        <span>{{ formattedVatableSales }}</span>
      </div>
      <div v-if="formattedVatAmount" class="flex justify-between">
        <span>VAT (12%)</span>
        <span>{{ formattedVatAmount }}</span>
      </div>
      <div v-if="formattedVatExempt" class="flex justify-between">
        <span>VAT-Exempt</span>
        <span>{{ formattedVatExempt }}</span>
      </div>
      <div v-if="formattedZeroRated" class="flex justify-between">
        <span>Zero-Rated</span>
        <span>{{ formattedZeroRated }}</span>
      </div>
    </div>

    <!-- Divider -->
    <hr class="my-2 border-neutral-200" />

    <!-- Items count -->
    <div class="flex justify-between text-sm text-neutral-500">
      <span>Items</span>
      <span>{{ totals.itemCount }}</span>
    </div>

    <!-- TOTAL DUE -->
    <div class="flex justify-between items-baseline mt-1">
      <span class="text-base sm:text-lg font-bold text-neutral-900">Total Due</span>
      <span class="text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary tabular-nums">{{ formattedTotal }}</span>
    </div>
  </div>
</template>
