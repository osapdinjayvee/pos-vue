<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import AmountInput from '@/components/common/AmountInput.vue'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import { useInventory } from '@/composables/useInventory'
import type { MovementType } from '@/types/inventory'

const props = defineProps<{
  visible: boolean
  variantId: string
  variantName: string
  productId: string
  productName: string
  currentStock: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'movement-recorded': [newStock: number]
}>()

const { receiveStock, adjustStock, isLoading, error, clearError } = useInventory()

const movementType = ref<'receive' | 'adjustment'>('receive')
const quantity = ref<number>(1)
const reason = ref('')
const unitCost = ref<number | null>(null)

const movementTypeOptions = [
  { label: 'Receive Stock', value: 'receive' },
  { label: 'Adjustment', value: 'adjustment' }
]

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isAdjustment = computed(() => movementType.value === 'adjustment')

const adjustmentLabel = computed(() => {
  if (!isAdjustment.value) return ''
  if (quantity.value > 0) return `Add ${quantity.value} units`
  if (quantity.value < 0) return `Remove ${Math.abs(quantity.value)} units`
  return 'No change'
})

const newStockPreview = computed(() => {
  if (isAdjustment.value) {
    return props.currentStock + quantity.value
  }
  return props.currentStock + Math.abs(quantity.value)
})

const canSubmit = computed(() => {
  if (quantity.value === 0) return false
  if (isAdjustment.value && !reason.value.trim()) return false
  if (isAdjustment.value && newStockPreview.value < 0) return false
  return true
})

watch(() => props.visible, (visible) => {
  if (visible) {
    // Reset form
    movementType.value = 'receive'
    quantity.value = 1
    reason.value = ''
    unitCost.value = null
    clearError()
  }
})

async function handleSubmit() {
  if (!canSubmit.value) return

  let result
  if (movementType.value === 'receive') {
    result = await receiveStock(props.variantId, Math.abs(quantity.value), {
      unitCost: unitCost.value ?? undefined,
      reason: reason.value || 'Stock received'
    })
  } else {
    result = await adjustStock(props.variantId, quantity.value, reason.value)
  }

  if (result.success) {
    // Persist the stock change to the products table
    try {
      const productRepo = await import('@/repositories/productRepository').then(m => m.default)
      let stockChange = quantity.value
      if (movementType.value === 'receive') {
        stockChange = Math.abs(quantity.value)
      }
      await productRepo.updateStock(props.productId, stockChange)
    } catch (e) {
      console.error('[StockMovementDialog] Failed to update product stock:', e)
    }

    emit('movement-recorded', result.newStock)
    dialogVisible.value = false
  }
}

function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="`Stock Movement - ${productName}`"
    :style="{ width: '450px' }"
    :modal="true"
    :closable="!isLoading"
  >
    <div class="movement-form">
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <div class="current-stock">
        <span class="label">Current Stock:</span>
        <span class="value">{{ currentStock }} units</span>
      </div>

      <div class="form-field">
        <label for="movementType">Movement Type</label>
        <Select
          id="movementType"
          v-model="movementType"
          :options="movementTypeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          :disabled="isLoading"
        />
      </div>

      <div class="form-field">
        <label for="quantity">
          {{ isAdjustment ? 'Adjustment Quantity (+ or -)' : 'Quantity to Receive' }}
        </label>
        <InputNumber
          id="quantity"
          v-model="quantity"
          :min="isAdjustment ? -currentStock : 1"
          showButtons
          :buttonLayout="isAdjustment ? 'horizontal' : 'stacked'"
          class="w-full"
          :disabled="isLoading"
        />
        <small v-if="isAdjustment" class="adjustment-hint">{{ adjustmentLabel }}</small>
      </div>

      <div v-if="movementType === 'receive'" class="form-field">
        <label for="unitCost">Unit Cost (optional)</label>
        <AmountInput
          id="unitCost"
          v-model="unitCost"
          allow-empty
          class="w-full"
          :disabled="isLoading"
        />
      </div>

      <div class="form-field">
        <label for="reason">{{ isAdjustment ? 'Reason (required)' : 'Notes (optional)' }}</label>
        <Textarea
          id="reason"
          v-model="reason"
          rows="2"
          class="w-full"
          :placeholder="isAdjustment ? 'Enter reason for adjustment...' : 'Optional notes...'"
          :disabled="isLoading"
        />
      </div>

      <div class="stock-preview">
        <span class="label">New Stock:</span>
        <span class="value" :class="{ negative: newStockPreview < 0 }">
          {{ newStockPreview }} units
        </span>
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="handleCancel"
        :disabled="isLoading"
      />
      <Button
        :label="isAdjustment ? 'Apply Adjustment' : 'Receive Stock'"
        :icon="isAdjustment ? 'pi pi-pencil' : 'pi pi-plus'"
        @click="handleSubmit"
        :loading="isLoading"
        :disabled="!canSubmit"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.movement-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.current-stock,
.stock-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--p-surface-100);
  border-radius: 8px;
}

.current-stock .label,
.stock-preview .label {
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.current-stock .value,
.stock-preview .value {
  font-weight: 600;
  color: var(--p-text-color);
}

.stock-preview .value.negative {
  color: var(--p-red-500);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.w-full {
  width: 100%;
}

.adjustment-hint {
  color: var(--p-text-muted-color);
  font-style: italic;
}
</style>
