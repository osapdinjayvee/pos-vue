<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import type { Product } from '@/types'

interface BulkEntry {
  product: Product
  quantity: number
  unitCost: number | null
}

const props = defineProps<{
  visible: boolean
  products: Product[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'completed': [result: { success: number; failed: number }]
}>()

const isProcessing = ref(false)

// Form state
const entries = ref<BulkEntry[]>([])
const adjustmentType = ref<string>('receive')
const adjustmentReason = ref<string>('')
const notes = ref('')

// Search state
const searchQuery = ref('')
const filteredProducts = ref<Product[]>([])

const adjustmentTypeOptions = [
  { label: 'Receive Stock', value: 'receive', icon: 'pi pi-plus' },
  { label: 'Adjust Stock', value: 'adjustment', icon: 'pi pi-pencil' },
  { label: 'Return', value: 'return', icon: 'pi pi-replay' },
  { label: 'Damage/Loss', value: 'damage', icon: 'pi pi-exclamation-triangle' }
]

const reasonOptions = computed(() => {
  switch (adjustmentType.value) {
    case 'receive':
      return [
        { label: 'Supplier Delivery', value: 'Supplier Delivery' },
        { label: 'Purchase Order', value: 'Purchase Order' },
        { label: 'Initial Stock', value: 'Initial Stock' },
        { label: 'Transfer In', value: 'Transfer In' },
        { label: 'Other', value: 'Other' }
      ]
    case 'adjustment':
      return [
        { label: 'Inventory Count', value: 'Inventory Count' },
        { label: 'Correction', value: 'Correction' },
        { label: 'System Adjustment', value: 'System Adjustment' },
        { label: 'Other', value: 'Other' }
      ]
    case 'return':
      return [
        { label: 'Customer Return', value: 'Customer Return' },
        { label: 'Supplier Return', value: 'Supplier Return' },
        { label: 'Defective Return', value: 'Defective Return' },
        { label: 'Other', value: 'Other' }
      ]
    case 'damage':
      return [
        { label: 'Damaged Goods', value: 'Damaged Goods' },
        { label: 'Expired', value: 'Expired' },
        { label: 'Lost/Theft', value: 'Lost/Theft' },
        { label: 'Breakage', value: 'Breakage' },
        { label: 'Other', value: 'Other' }
      ]
    default:
      return []
  }
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const addedProductIds = computed(() => new Set(entries.value.map(e => e.product.id)))

const totalUnits = computed(() =>
  entries.value.reduce((sum, e) => sum + (e.quantity || 0), 0)
)

const hasValidEntries = computed(() =>
  entries.value.some(e => e.quantity > 0) && !!adjustmentReason.value
)

const entriesToProcess = computed(() =>
  entries.value.filter(e => e.quantity > 0)
)

const showCostColumn = computed(() => adjustmentType.value === 'receive')

// Reset on open
watch(() => props.visible, (visible) => {
  if (visible) {
    entries.value = []
    adjustmentType.value = 'receive'
    adjustmentReason.value = ''
    notes.value = ''
    searchQuery.value = ''
    filteredProducts.value = []
  }
})

// Reset reason when type changes
watch(adjustmentType, () => {
  adjustmentReason.value = ''
})

function searchProducts(event: { query: string }) {
  const query = event.query.toLowerCase().trim()
  if (!query) {
    filteredProducts.value = props.products
      .filter(p => !addedProductIds.value.has(p.id))
      .slice(0, 20)
    return
  }
  filteredProducts.value = props.products
    .filter(p =>
      !addedProductIds.value.has(p.id) && (
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
      )
    )
    .slice(0, 20)
}

function onProductSelect(event: { value: Product }) {
  const product = event.value
  if (!product || !product.id) return
  if (addedProductIds.value.has(product.id)) return

  entries.value.push({
    product,
    quantity: 1,
    unitCost: product.cost || null
  })
  // Clear search after adding
  searchQuery.value = ''
}

function removeEntry(index: number) {
  entries.value.splice(index, 1)
}

function addAllProducts() {
  const remaining = props.products.filter(p => !addedProductIds.value.has(p.id))
  for (const p of remaining) {
    entries.value.push({
      product: p,
      quantity: 1,
      unitCost: p.cost || null
    })
  }
}

function setAllQuantities(qty: number) {
  entries.value.forEach(e => { e.quantity = qty })
}

function close() {
  dialogVisible.value = false
}

function newStock(entry: BulkEntry): number {
  const q = entry.quantity || 0
  if (adjustmentType.value === 'damage') return entry.product.stock - Math.abs(q)
  if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') return entry.product.stock + Math.abs(q)
  return entry.product.stock + q
}

async function handleSubmit() {
  if (!hasValidEntries.value) return
  isProcessing.value = true

  const { variantRepository } = await import('@/repositories/variantRepository')
  const { inventoryService } = await import('@/services/inventoryService')
  const productRepo = await import('@/repositories/productRepository').then(m => m.default)

  let success = 0
  let failed = 0

  for (const entry of entriesToProcess.value) {
    try {
      // Get or create default variant
      let variant = await variantRepository.getDefaultVariant(entry.product.id)
      if (!variant) {
        variant = await variantRepository.createVariant({
          product_id: entry.product.id,
          name: 'Default',
          sku: entry.product.sku,
          barcode: entry.product.barcode || undefined,
          is_active: true,
          display_order: 0
        })
        if (variant && entry.product.stock > 0) {
          await inventoryService.receiveStock(variant.id, entry.product.stock, {
            reason: 'Initial stock sync'
          })
        }
      }
      if (!variant) { failed++; continue }

      const reason = adjustmentReason.value + (notes.value ? ` - ${notes.value}` : '')
      let result

      if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') {
        result = await inventoryService.receiveStock(variant.id, Math.abs(entry.quantity), {
          unitCost: entry.unitCost ?? undefined,
          reason: reason || adjustmentType.value
        })
      } else if (adjustmentType.value === 'damage') {
        result = await inventoryService.adjustStock(
          variant.id,
          -Math.abs(entry.quantity),
          reason || 'Damage/Loss'
        )
      } else {
        result = await inventoryService.adjustStock(
          variant.id,
          entry.quantity,
          reason || 'Stock adjustment'
        )
      }

      if (result.success) {
        // Update product stock
        let stockChange = entry.quantity
        if (adjustmentType.value === 'damage') stockChange = -Math.abs(entry.quantity)
        else if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') stockChange = Math.abs(entry.quantity)
        await productRepo.updateStock(entry.product.id, stockChange)
        success++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  isProcessing.value = false
  emit('completed', { success, failed })
  close()
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Bulk Stock Adjustment"
    :modal="true"
    :closable="!isProcessing"
    :closeOnEscape="!isProcessing"
    :draggable="false"
    position="center"
    :pt="{
      root: { class: 'bulk-adj-dialog-root' },
      content: { class: 'bulk-adj-dialog-content' }
    }"
  >
    <div class="bulk-adj-container">
      <!-- Type & Reason -->
      <div class="adj-config">
        <div class="config-row">
          <div class="config-field flex-1">
            <label>Adjustment Type</label>
            <Select
              v-model="adjustmentType"
              :options="adjustmentTypeOptions"
              optionLabel="label"
              optionValue="value"
              :disabled="isProcessing"
              class="w-full"
            >
              <template #value="{ value }">
                <div v-if="value" class="flex items-center gap-2">
                  <i :class="adjustmentTypeOptions.find(o => o.value === value)?.icon" class="text-sm"></i>
                  <span>{{ adjustmentTypeOptions.find(o => o.value === value)?.label }}</span>
                </div>
              </template>
              <template #option="{ option }">
                <div class="flex items-center gap-2">
                  <i :class="option.icon" class="text-sm"></i>
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </Select>
          </div>
          <div class="config-field flex-1">
            <label>Reason *</label>
            <Select
              v-model="adjustmentReason"
              :options="reasonOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select reason"
              :disabled="isProcessing"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Search to Add Products -->
      <div class="search-section">
        <label>Add Products</label>
        <div class="search-row">
          <AutoComplete
            v-model="searchQuery"
            :suggestions="filteredProducts"
            optionLabel="name"
            placeholder="Search by name, SKU, or barcode..."
            :disabled="isProcessing"
            class="flex-1"
            @complete="searchProducts"
            @item-select="onProductSelect"
            forceSelection
          >
            <template #option="{ option }">
              <div class="search-option">
                <span class="search-option-name">{{ option.name }}</span>
                <span class="search-option-meta">{{ option.sku }} · Stock: {{ option.stock }}</span>
              </div>
            </template>
            <template #empty>
              <div class="search-empty">No products found</div>
            </template>
          </AutoComplete>
          <Button
            label="Add All"
            icon="pi pi-plus-circle"
            size="small"
            severity="secondary"
            outlined
            :disabled="isProcessing || addedProductIds.size === products.length"
            @click="addAllProducts"
            v-tooltip.top="'Add all products'"
          />
        </div>
      </div>

      <!-- Quick Actions (only show when there are entries) -->
      <div v-if="entries.length > 0" class="quick-actions">
        <span class="quick-label">Quick set all:</span>
        <Button label="+1" size="small" severity="secondary" outlined @click="setAllQuantities(1)" :disabled="isProcessing" />
        <Button label="+5" size="small" severity="secondary" outlined @click="setAllQuantities(5)" :disabled="isProcessing" />
        <Button label="+10" size="small" severity="secondary" outlined @click="setAllQuantities(10)" :disabled="isProcessing" />
        <Button label="+50" size="small" severity="secondary" outlined @click="setAllQuantities(50)" :disabled="isProcessing" />
        <Button label="Clear" size="small" severity="secondary" text @click="setAllQuantities(0)" :disabled="isProcessing" />
      </div>

      <!-- Product List -->
      <div class="product-list">
        <div v-if="entries.length === 0" class="empty-list">
          <i class="pi pi-search"></i>
          <p>Search and add products above</p>
        </div>
        <div
          v-for="(entry, index) in entries"
          :key="entry.product.id"
          class="product-row"
          :class="{ 'has-quantity': entry.quantity > 0 }"
        >
          <div class="product-info">
            <div class="product-initials-box">
              <span>{{ entry.product.name.substring(0, 2).toUpperCase() }}</span>
            </div>
            <div class="product-details">
              <span class="product-name">{{ entry.product.name }}</span>
              <span class="product-meta">
                {{ entry.product.sku }} · Stock: {{ entry.product.stock }}
                <template v-if="entry.quantity > 0">
                  → <strong>{{ newStock(entry) }}</strong>
                </template>
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
                :inputStyle="{ width: '3rem', textAlign: 'center' }"
                :disabled="isProcessing"
                decrementButtonClass="p-button-secondary p-button-outlined p-button-sm"
                incrementButtonClass="p-button-secondary p-button-outlined p-button-sm"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
              />
            </div>
            <div v-if="showCostColumn" class="input-group">
              <label>Cost</label>
              <InputNumber
                v-model="entry.unitCost"
                mode="currency"
                currency="PHP"
                locale="en-PH"
                :min="0"
                :disabled="isProcessing"
                :inputStyle="{ width: '5rem' }"
                placeholder="0.00"
              />
            </div>
            <Button
              icon="pi pi-times"
              text
              rounded
              severity="danger"
              size="small"
              :disabled="isProcessing"
              @click="removeEntry(index)"
              v-tooltip.top="'Remove'"
              class="remove-btn"
            />
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="notes-field">
        <label>Notes (optional)</label>
        <Textarea
          v-model="notes"
          rows="2"
          :disabled="isProcessing"
          class="w-full"
          placeholder="Additional notes..."
        />
      </div>

      <!-- Summary -->
      <div class="summary" v-if="hasValidEntries">
        <span>
          <Tag :value="adjustmentTypeOptions.find(o => o.value === adjustmentType)?.label || ''" :severity="adjustmentType === 'damage' ? 'danger' : adjustmentType === 'receive' ? 'success' : 'warn'" class="mr-2" />
          <strong>{{ entriesToProcess.length }}</strong> product{{ entriesToProcess.length !== 1 ? 's' : '' }}
          · <strong>{{ totalUnits }}</strong> total units
          · {{ adjustmentReason }}
        </span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" severity="secondary" outlined :disabled="isProcessing" @click="close" />
        <Button
          label="Apply Adjustment"
          icon="pi pi-check"
          :loading="isProcessing"
          :disabled="!hasValidEntries"
          :severity="adjustmentType === 'damage' ? 'danger' : undefined"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.bulk-adj-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.adj-config {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.config-row {
  display: flex;
  gap: 0.75rem;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.config-field label,
.notes-field label,
.search-section label {
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.search-option {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.25rem 0;
}

.search-option-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.search-option-meta {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.search-empty {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--p-surface-100);
  border-radius: 8px;
  flex-wrap: wrap;
}

.quick-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 40vh;
  overflow-y: auto;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
  gap: 0.5rem;
}

.empty-list i {
  font-size: 1.5rem;
}

.empty-list p {
  margin: 0;
  font-size: 0.875rem;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 0.75rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
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
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
}

.product-initials-box {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--p-surface-500);
  border: 1px solid var(--p-surface-200);
}

.product-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  font-weight: 500;
  font-size: 0.875rem;
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
  align-items: center;
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

.remove-btn {
  margin-top: 0.75rem;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
}

.summary {
  padding: 0.625rem 1rem;
  background: var(--p-primary-100);
  border-radius: 8px;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--p-primary-700);
}

.summary strong {
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.w-full { width: 100%; }
.flex-1 { flex: 1; }
.mr-2 { margin-right: 0.5rem; }

@media (max-width: 576px) {
  :deep(.bulk-adj-dialog-root) {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.bulk-adj-dialog-root .p-dialog-content) {
    flex: 1;
    overflow-y: auto;
  }

  .config-row {
    flex-direction: column;
  }

  .search-row {
    flex-direction: column;
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

@media (min-width: 577px) {
  :deep(.bulk-adj-dialog-root) {
    width: 40rem;
    min-width: 36rem;
    max-width: 90vw;
  }
}
</style>