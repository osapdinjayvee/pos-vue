<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { EligibleDiscount } from '@/types/discount'

const props = defineProps<{
  visible: boolean
  productName: string
  eligibleDiscounts: EligibleDiscount[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'select': [discount: EligibleDiscount | null]
}>()

const selectedIndex = ref(0)

// Reset selection when dialog opens
watch(() => props.visible, (val) => {
  if (val) {
    selectedIndex.value = props.eligibleDiscounts.length > 0 ? 0 : -1
  }
})

const hasDiscounts = computed(() => props.eligibleDiscounts.length > 0)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}

function handleApply() {
  if (selectedIndex.value >= 0 && selectedIndex.value < props.eligibleDiscounts.length) {
    emit('select', props.eligibleDiscounts[selectedIndex.value] ?? null)
  } else {
    emit('select', null)
  }
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Apply Discount"
    :modal="true"
    :style="{ width: '450px' }"
    :closable="true"
  >
    <!-- Product name -->
    <div class="mb-4">
      <p class="text-sm text-neutral-500 m-0">Discounting:</p>
      <p class="text-base font-semibold text-neutral-800 m-0 mt-1">{{ productName }}</p>
    </div>

    <!-- No eligible discounts -->
    <div v-if="!hasDiscounts" class="text-center py-6">
      <i class="pi pi-info-circle text-3xl text-neutral-300 mb-3 block"></i>
      <p class="text-sm text-neutral-400 m-0">No eligible discounts for this item.</p>
    </div>

    <!-- Discount options -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(eligible, index) in eligibleDiscounts"
        :key="eligible.discount.id"
        class="border rounded-xl p-3 cursor-pointer transition-all"
        :class="selectedIndex === index
          ? 'border-[var(--p-primary-400)] bg-[var(--p-primary-50)] shadow-sm'
          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'"
        @click="selectedIndex = index"
      >
        <div class="flex items-center gap-3">
          <!-- Radio indicator -->
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
            :class="selectedIndex === index
              ? 'border-[var(--p-primary-500)]'
              : 'border-neutral-300'"
          >
            <div
              v-if="selectedIndex === index"
              class="w-2.5 h-2.5 rounded-full bg-[var(--p-primary-500)]"
            ></div>
          </div>

          <!-- Discount info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-neutral-800 truncate">{{ eligible.discount.name }}</span>
              <Tag
                :value="eligible.discount.type === 'percentage' ? '%' : 'Fixed'"
                :severity="eligible.discount.type === 'percentage' ? 'info' : 'secondary'"
                class="text-[10px]"
              />
              <Tag
                v-if="eligible.isAutoApply"
                value="Auto"
                severity="success"
                class="text-[10px]"
              />
            </div>
            <p class="text-xs text-neutral-400 m-0 mt-0.5">
              {{ eligible.discount.type === 'percentage'
                ? `${eligible.discount.value}% off`
                : `${formatCurrency(eligible.discount.value)} off` }}
            </p>
          </div>

          <!-- Savings amount -->
          <div class="text-right shrink-0">
            <span class="text-sm font-bold text-emerald-600 tabular-nums">-{{ formatCurrency(eligible.computedAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- No Discount option -->
      <div
        class="border rounded-xl p-3 cursor-pointer transition-all"
        :class="selectedIndex === -1
          ? 'border-[var(--p-primary-400)] bg-[var(--p-primary-50)] shadow-sm'
          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'"
        @click="selectedIndex = -1"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
            :class="selectedIndex === -1
              ? 'border-[var(--p-primary-500)]'
              : 'border-neutral-300'"
          >
            <div
              v-if="selectedIndex === -1"
              class="w-2.5 h-2.5 rounded-full bg-[var(--p-primary-500)]"
            ></div>
          </div>
          <span class="text-sm text-neutral-500">No Discount</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="handleCancel" />
        <Button label="Apply" icon="pi pi-check" @click="handleApply" :disabled="!hasDiscounts && selectedIndex !== -1" />
      </div>
    </template>
  </Dialog>
</template>
