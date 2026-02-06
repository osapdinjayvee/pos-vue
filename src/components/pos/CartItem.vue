<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { vatService } from '@/services/vatService'
import type { CartItem } from '@/types/transaction'

const props = defineProps<{
  item: CartItem
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'increment'): void
  (e: 'decrement'): void
  (e: 'remove'): void
  (e: 'update-quantity', quantity: number): void
}>()

const displayName = computed(() => {
  if (props.item.variantName) {
    return `${props.item.productName} - ${props.item.variantName}`
  }
  return props.item.productName
})

const formattedUnitPrice = computed(() =>
  vatService.formatCurrency(props.item.unitPrice)
)

const formattedLineTotal = computed(() =>
  vatService.formatCurrency(props.item.lineTotal)
)

const formattedDiscount = computed(() =>
  (props.item.discount ?? 0) > 0 ? vatService.formatCurrency(props.item.discount ?? 0) : null
)

const taxTypeLabel = computed(() =>
  vatService.getTaxTypeLabel(props.item.taxType)
)

const showTaxBadge = computed(() =>
  props.item.taxType !== 'vatable'
)

function handleQuantityChange(value: number | null) {
  if (value !== null && value > 0) {
    emit('update-quantity', value)
  }
}
</script>

<template>
  <div class="cart-item p-3 border-bottom-1 surface-border">
    <div class="flex justify-content-between align-items-start mb-2">
      <div class="flex-1">
        <div class="font-medium text-900">{{ displayName }}</div>
        <div class="text-sm text-500">
          {{ formattedUnitPrice }} each
          <span v-if="item.sku" class="ml-2">SKU: {{ item.sku }}</span>
        </div>
        <div v-if="showTaxBadge" class="mt-1">
          <span class="text-xs px-2 py-1 border-round bg-blue-100 text-blue-700">
            {{ taxTypeLabel }}
          </span>
        </div>
      </div>
      <div class="text-right">
        <div class="font-semibold text-900">{{ formattedLineTotal }}</div>
        <div v-if="formattedDiscount" class="text-sm text-red-500">
          -{{ formattedDiscount }}
        </div>
      </div>
    </div>

    <div v-if="editable" class="flex align-items-center gap-2">
      <Button
        icon="pi pi-minus"
        severity="secondary"
        text
        rounded
        size="small"
        @click="emit('decrement')"
        :disabled="item.quantity <= 1"
      />
      <InputNumber
        :modelValue="item.quantity"
        @update:modelValue="handleQuantityChange"
        :min="1"
        :max="9999"
        showButtons
        buttonLayout="horizontal"
        :inputStyle="{ width: '3rem', textAlign: 'center' }"
        class="quantity-input"
        size="small"
      />
      <Button
        icon="pi pi-plus"
        severity="secondary"
        text
        rounded
        size="small"
        @click="emit('increment')"
      />
      <Button
        icon="pi pi-trash"
        severity="danger"
        text
        rounded
        size="small"
        @click="emit('remove')"
        class="ml-auto"
      />
    </div>
    <div v-else class="text-sm text-600">
      Qty: {{ item.quantity }}
    </div>
  </div>
</template>

<style scoped>
.cart-item {
  transition: background-color 0.2s;
}

.cart-item:hover {
  background-color: var(--surface-hover);
}

.quantity-input :deep(.p-inputnumber-input) {
  width: 3rem;
  text-align: center;
}

.quantity-input :deep(.p-inputnumber-button) {
  display: none;
}
</style>
