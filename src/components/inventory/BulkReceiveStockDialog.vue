<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import AmountInput from '@/components/common/AmountInput.vue'
import Textarea from 'primevue/textarea'
import { useInventory } from '@/composables/useInventory'
import type { DisplayProduct } from '@/types'

interface ProductStockEntry {
  product: DisplayProduct
  quantity: number
  unitCost: number | null
}

const props = defineProps<{
  visible: boolean
  products: DisplayProduct[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'stock-received': [result: { success: number; failed: number }]
}>()

const { bulkReceiveStock, isLoading } = useInventory()

// Form state - each product has its own quantity and cost
const productEntries = ref<ProductStockEntry[]>([])
const notes = ref('')

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const totalUnits = computed(() => {
  return productEntries.value.reduce((sum, entry) => sum + (entry.quantity || 0), 0)
})

const hasValidEntries = computed(() => {
  return productEntries.value.some(entry => entry.quantity > 0)
})

const productsToReceive = computed(() => {
  return productEntries.value.filter(entry => entry.quantity > 0)
})

// Reset form when dialog opens
watch(() => props.visible, (visible) => {
  if (visible) {
    // Initialize entries with default quantity of 0 and product's cost
    productEntries.value = props.products.map(product => ({
      product,
      quantity: 0,
      unitCost: product.cost || null
    }))
    notes.value = ''
  }
})

// Methods
const close = () => {
  dialogVisible.value = false
}

const setAllQuantities = (qty: number) => {
  productEntries.value.forEach(entry => {
    entry.quantity = qty
  })
}

const handleSubmit = async () => {
  if (!hasValidEntries.value) return

  // Process each product with its own quantity and cost
  let success = 0
  let failed = 0

  for (const entry of productsToReceive.value) {
    const result = await bulkReceiveStock(
      [entry.product.id],
      entry.quantity,
      {
        unitCost: entry.unitCost ?? undefined,
        reason: notes.value || 'Bulk stock receive'
      }
    )
    success += result.success
    failed += result.failed
  }

  emit('stock-received', { success, failed })
  close()
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Receive Stock"
    :modal="true"
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    :draggable="false"
    position="center"
    class="bulk-receive-dialog"
    :pt="{
      root: { class: 'bulk-receive-dialog-root' },
      content: { class: 'bulk-receive-dialog-content' }
    }"
  >
    <div class="bulk-receive-container">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <span class="quick-label">Quick set all:</span>
        <Button label="+1" size="small" severity="secondary" outlined @click="setAllQuantities(1)" />
        <Button label="+5" size="small" severity="secondary" outlined @click="setAllQuantities(5)" />
        <Button label="+10" size="small" severity="secondary" outlined @click="setAllQuantities(10)" />
        <Button label="Clear" size="small" severity="secondary" text @click="setAllQuantities(0)" />
      </div>

      <!-- Product List -->
      <div class="product-list">
        <div
          v-for="entry in productEntries"
          :key="entry.product.id"
          class="product-row"
          :class="{ 'has-quantity': entry.quantity > 0 }"
        >
          <div class="product-info">
            <div class="product-image">
              <img v-if="entry.product.image" :src="entry.product.image" :alt="entry.product.name" />
              <span v-else class="product-initials">
                {{ entry.product.name.substring(0, 2).toUpperCase() }}
              </span>
            </div>
            <div class="product-details">
              <span class="product-name">{{ entry.product.name }}</span>
              <span class="product-meta">
                {{ entry.product.sku }} · Stock: {{ entry.product.stock }}
              </span>
            </div>
          </div>
          <div class="product-inputs">
            <div class="input-group">
              <label>Qty</label>
              <InputNumber
                v-model="entry.quantity"
                :min="0"
                showButtons
                buttonLayout="horizontal"
                :inputStyle="{ width: '2.5rem', textAlign: 'center' }"
                :disabled="isLoading"
                decrementButtonClass="p-button-secondary p-button-outlined p-button-sm"
                incrementButtonClass="p-button-secondary p-button-outlined p-button-sm"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
              />
            </div>
            <div class="input-group">
              <label>Cost</label>
              <AmountInput
                v-model="entry.unitCost"
                allow-empty
                :min="0"
                :disabled="isLoading"
                :inputStyle="{ width: '5rem' }"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Field -->
      <div class="notes-field">
        <div class="form-field">
          <label for="notes">Notes (optional)</label>
          <Textarea
            id="notes"
            v-model="notes"
            rows="2"
            :disabled="isLoading"
            class="w-full"
            placeholder="Reason for stock receive..."
          />
        </div>
      </div>

      <!-- Summary -->
      <div class="summary" v-if="hasValidEntries">
        <span class="summary-text">
          Adding stock to <strong>{{ productsToReceive.length }}</strong>
          product{{ productsToReceive.length !== 1 ? 's' : '' }}
          (<strong>{{ totalUnits }}</strong> total units)
        </span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isLoading"
          @click="close"
        />
        <Button
          label="Receive Stock"
          icon="pi pi-plus"
          :loading="isLoading"
          :disabled="!hasValidEntries"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.bulk-receive-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--app-surface-100);
  border-radius: 8px;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 50vh;
  overflow-y: auto;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.product-row.has-quantity {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.product-image {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--app-surface-200);
}

.product-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-initials {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-500);
}

.product-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.product-inputs {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.625rem;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.notes-field {
  padding-top: 0.5rem;
  border-top: 1px solid var(--app-surface-200);
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

.summary {
  padding: 0.75rem 1rem;
  background: var(--p-primary-100);
  border-radius: 8px;
  text-align: center;
}

.summary-text {
  font-size: 0.875rem;
  color: var(--p-primary-700);
}

.summary-text strong {
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.w-full {
  width: 100%;
}

/* Mobile fullscreen */
@media (max-width: 576px) {
  :deep(.bulk-receive-dialog-root) {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.bulk-receive-dialog-root .p-dialog-content) {
    flex: 1;
    overflow-y: auto;
  }

  .product-list {
    max-height: none;
    flex: 1;
  }

  .bulk-receive-container {
    height: 100%;
  }

  .product-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .product-inputs {
    justify-content: space-between;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .p-button {
    width: 100%;
  }
}

/* Desktop sizing */
@media (min-width: 577px) {
  :deep(.bulk-receive-dialog-root) {
    width: 32rem;
    max-width: 90vw;
  }
}
</style>
