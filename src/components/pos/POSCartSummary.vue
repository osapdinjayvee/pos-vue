<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { vatService } from '@/services/vatService'

const cartStore = useCartStore()
const settingsStore = useSettingsStore()
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

const lineItemDiscountTotal = computed(() => {
  return cartStore.items.reduce((sum, item) => sum + (item.discountId ? (item.discount || 0) : 0), 0)
})

const formattedLineDiscounts = computed(() =>
  lineItemDiscountTotal.value > 0 ? vatService.formatCurrency(lineItemDiscountTotal.value) : null
)

const discountLabel = computed(() => {
  if (!discount.value) return ''
  if (discount.value.type === 'senior_citizen') return `Senior Citizen (${settingsStore.seniorDiscountPercent}%)`
  if (discount.value.type === 'pwd') return `PWD (${settingsStore.pwdDiscountPercent}%)`
  if (discount.value.percentage) return `${discount.value.percentage}% off`
  return 'Discount'
})

const vatLabel = computed(() => `VAT (${settingsStore.vatRatePercent}%)`)
</script>

<template>
  <div class="border-t border-neutral-100 bg-white shrink-0">
    <!-- Summary lines -->
    <div class="px-4 pt-3 pb-2 space-y-1.5">
      <!-- Subtotal -->
      <div class="flex justify-between text-sm text-neutral-500">
        <span>Subtotal</span>
        <span class="tabular-nums">{{ formattedSubtotal }}</span>
      </div>

      <!-- Line-item promo discounts -->
      <div v-if="formattedLineDiscounts" class="flex justify-between text-sm text-emerald-600 font-medium">
        <span>Item Discounts</span>
        <span class="tabular-nums">-{{ formattedLineDiscounts }}</span>
      </div>

      <!-- Discount -->
      <div v-if="formattedDiscount" class="flex justify-between text-sm text-emerald-600 font-medium">
        <span>{{ discountLabel }}</span>
        <span class="tabular-nums">-{{ formattedDiscount }}</span>
      </div>

      <!-- VAT breakdown -->
      <template v-if="totals.itemCount > 0">
        <div v-if="formattedVatableSales" class="flex justify-between text-xs text-neutral-400">
          <span>VATable Sales</span>
          <span class="tabular-nums">{{ formattedVatableSales }}</span>
        </div>
        <div v-if="formattedVatAmount" class="flex justify-between text-xs text-neutral-400">
          <span>{{ vatLabel }}</span>
          <span class="tabular-nums">{{ formattedVatAmount }}</span>
        </div>
        <div v-if="formattedVatExempt" class="flex justify-between text-xs text-neutral-400">
          <span>VAT-Exempt</span>
          <span class="tabular-nums">{{ formattedVatExempt }}</span>
        </div>
        <div v-if="formattedZeroRated" class="flex justify-between text-xs text-neutral-400">
          <span>Zero-Rated</span>
          <span class="tabular-nums">{{ formattedZeroRated }}</span>
        </div>
      </template>
    </div>

    <!-- Total Due bar — h-14 matches Void/Hold/Tender row on right column -->
    <div class="flex items-center justify-between px-4 h-14 bg-[var(--p-primary-500)]">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-white/80 uppercase tracking-wide">Total</span>
        <span v-if="totals.itemCount > 0" class="text-xs text-white/50 font-medium">({{ totals.itemCount }} item{{ totals.itemCount !== 1 ? 's' : '' }})</span>
      </div>
      <span class="text-2xl font-extrabold text-white tabular-nums tracking-tight">{{ formattedTotal }}</span>
    </div>
  </div>
</template>
