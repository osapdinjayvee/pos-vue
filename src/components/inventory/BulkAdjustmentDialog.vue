<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import AmountInput from '@/components/common/AmountInput.vue'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
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
const validationError = ref<string | null>(null)

// Form state
const entries = ref<BulkEntry[]>([])
const adjustmentType = ref<string>('receive')
const adjustmentReason = ref<string>('')
const notes = ref('')

// Unit cost is mandatory for Supplier Delivery / Purchase Order receipts
const costRequired = computed(() =>
  adjustmentType.value === 'receive' &&
  (adjustmentReason.value === 'Supplier Delivery' || adjustmentReason.value === 'Purchase Order')
)

// Search state
const searchQuery = ref('')
const filteredProducts = ref<Product[]>([])
const selectedSupplierId = ref<string | null>(null)

// Supplier options derived from products
const supplierOptions = computed(() => {
  const map = new Map<string, string>()
  for (const p of props.products) {
    if (p.supplier_id && p.supplier_name) {
      map.set(p.supplier_id, p.supplier_name)
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ label: name, value: id }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const remainingBySupplier = computed(() => {
  if (!selectedSupplierId.value) return []
  return props.products.filter(
    p => p.supplier_id === selectedSupplierId.value && !addedProductIds.value.has(p.id)
  )
})

const selectedSupplierName = computed(() => {
  if (!selectedSupplierId.value) return ''
  return supplierOptions.value.find(s => s.value === selectedSupplierId.value)?.label || ''
})

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

const totalCost = computed(() =>
  entries.value.reduce((sum, e) => sum + (e.quantity || 0) * (e.unitCost || 0), 0)
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
    selectedSupplierId.value = null
    validationError.value = null
  }
})

// Clear the validation message once the user starts fixing the inputs
watch([adjustmentReason, entries], () => {
  if (validationError.value) validationError.value = null
}, { deep: true })

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
  searchQuery.value = ''
}

function removeEntry(index: number) {
  entries.value.splice(index, 1)
}

function addAllBySupplier() {
  if (!selectedSupplierId.value) return
  for (const p of remainingBySupplier.value) {
    entries.value.push({
      product: p,
      quantity: 1,
      unitCost: p.cost || null
    })
  }
}

function clearAll() {
  entries.value = []
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
  // Validate with explicit error notifications (R39)
  if (entriesToProcess.value.length === 0) {
    validationError.value = 'Add at least one product with a quantity greater than 0.'
    return
  }
  if (!adjustmentReason.value) {
    validationError.value = 'Please select a reason for this adjustment.'
    return
  }
  if (costRequired.value && entriesToProcess.value.some(e => !e.unitCost || e.unitCost <= 0)) {
    validationError.value = `Unit cost is required for ${adjustmentReason.value}. Enter a cost for every product.`
    return
  }
  validationError.value = null
  isProcessing.value = true

  const { variantRepository } = await import('@/repositories/variantRepository')
  const { inventoryService } = await import('@/services/inventoryService')
  const productRepo = await import('@/repositories/productRepository').then(m => m.default)

  let success = 0
  let failed = 0

  for (const entry of entriesToProcess.value) {
    try {
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
        let stockChange = entry.quantity
        if (adjustmentType.value === 'damage') stockChange = -Math.abs(entry.quantity)
        else if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') stockChange = Math.abs(entry.quantity)
        await productRepo.updateStock(entry.product.id, stockChange)

        // Update product cost when receiving
        if (adjustmentType.value === 'receive' && entry.unitCost) {
          await productRepo.update(entry.product.id, { cost: entry.unitCost })
        }
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
      <Message v-if="validationError" severity="error" :closable="false" icon="pi pi-exclamation-circle">
        {{ validationError }}
      </Message>

      <!-- Section 1: Type & Reason -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-cog"></i>
          <span>Configuration</span>
        </div>
        <div class="config-row">
          <div class="config-field flex-1">
            <label>Type</label>
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

      <!-- Section 2: Add Products -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-box"></i>
          <span>Products</span>
          <span v-if="entries.length > 0" class="entry-count">{{ entries.length }} added</span>
        </div>

        <!-- Supplier batch add -->
        <div class="supplier-row">
          <Select
            v-model="selectedSupplierId"
            :options="supplierOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by supplier..."
            :disabled="isProcessing || supplierOptions.length === 0"
            filter
            filterPlaceholder="Search supplier..."
            class="flex-1"
            showClear
          />
          <Button
            label="Add All by Supplier"
            icon="pi pi-plus-circle"
            size="small"
            :disabled="isProcessing || !selectedSupplierId || remainingBySupplier.length === 0"
            @click="addAllBySupplier"
          />
        </div>
        <small v-if="selectedSupplierId && remainingBySupplier.length > 0" class="supplier-hint">
          {{ remainingBySupplier.length }} product{{ remainingBySupplier.length !== 1 ? 's' : '' }} from {{ selectedSupplierName }}
        </small>
        <small v-else-if="selectedSupplierId && remainingBySupplier.length === 0" class="supplier-hint">
          All products from {{ selectedSupplierName }} already added
        </small>

        <!-- Individual search -->
        <div class="search-row">
          <AutoComplete
            v-model="searchQuery"
            :suggestions="filteredProducts"
            optionLabel="name"
            placeholder="Or search individual product..."
            :disabled="isProcessing"
            class="flex-1"
            @complete="searchProducts"
            @item-select="onProductSelect"
            forceSelection
          >
            <template #option="{ option }">
              <div class="search-option">
                <div class="search-option-left">
                  <span class="search-option-name">{{ option.name }}</span>
                  <span class="search-option-meta">{{ option.sku }}{{ option.supplier_name ? ` · ${option.supplier_name}` : '' }}</span>
                </div>
                <Tag :value="`Stock: ${option.stock}`" severity="secondary" class="search-option-tag" />
              </div>
            </template>
            <template #empty>
              <div class="search-empty">No products found</div>
            </template>
          </AutoComplete>
        </div>
      </div>

      <!-- Section 3: Product List -->
      <div class="section product-section">
        <div v-if="entries.length > 0" class="list-toolbar">
          <div class="quick-actions">
            <span class="quick-label">Set all qty:</span>
            <Button label="1" size="small" severity="secondary" text @click="setAllQuantities(1)" :disabled="isProcessing" />
            <Button label="5" size="small" severity="secondary" text @click="setAllQuantities(5)" :disabled="isProcessing" />
            <Button label="10" size="small" severity="secondary" text @click="setAllQuantities(10)" :disabled="isProcessing" />
            <Button label="50" size="small" severity="secondary" text @click="setAllQuantities(50)" :disabled="isProcessing" />
          </div>
          <Button
            label="Clear All"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            :disabled="isProcessing"
            @click="clearAll"
          />
        </div>

        <div class="product-list">
          <div v-if="entries.length === 0" class="empty-list">
            <i class="pi pi-inbox"></i>
            <p>Select a supplier and click "Add All" to start</p>
            <p class="empty-hint">or search for individual products above</p>
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
                  {{ entry.product.sku }}
                  <template v-if="entry.product.supplier_name"> · {{ entry.product.supplier_name }}</template>
                  · Stock: {{ entry.product.stock }}
                  <template v-if="entry.quantity > 0">
                    <i class="pi pi-arrow-right" style="font-size: 0.625rem; margin: 0 0.25rem"></i>
                    <strong>{{ newStock(entry) }}</strong>
                  </template>
                </span>
              </div>
            </div>
            <div class="product-inputs">
              <div class="input-group">
                <label>QTY</label>
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
                <label>COST{{ costRequired ? ' *' : '' }}</label>
                <AmountInput
                  v-model="entry.unitCost"
                  allow-empty
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
      </div>

      <!-- Notes -->
      <div class="section notes-section">
        <label>Notes (optional)</label>
        <Textarea
          v-model="notes"
          rows="2"
          :disabled="isProcessing"
          class="w-full"
          placeholder="Additional notes..."
        />
      </div>

      <!-- Summary Bar -->
      <div class="summary" v-if="entries.length > 0">
        <div class="summary-items">
          <div class="summary-item">
            <span class="summary-label">Products</span>
            <span class="summary-value">{{ entriesToProcess.length }}</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-item">
            <span class="summary-label">Total Units</span>
            <span class="summary-value">{{ totalUnits }}</span>
          </div>
          <template v-if="showCostColumn && totalCost > 0">
            <div class="summary-divider"></div>
            <div class="summary-item">
              <span class="summary-label">Total Cost</span>
              <span class="summary-value summary-cost">{{ totalCost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" severity="secondary" outlined :disabled="isProcessing" @click="close" />
        <Button
          label="Apply Adjustment"
          icon="pi pi-check"
          :loading="isProcessing"
          :disabled="isProcessing"
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
  gap: 1.25rem;
}

/* Sections */
.section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--p-text-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.section-header i {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.entry-count {
  margin-left: auto;
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--p-primary-color);
  text-transform: none;
  letter-spacing: normal;
  background: var(--p-primary-50);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

/* Config */
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
.notes-section label {
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Supplier row */
.supplier-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.supplier-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  padding-left: 0.125rem;
}

/* Search */
.search-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.search-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
  width: 100%;
}

.search-option-left {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.search-option-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.search-option-meta {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.search-option-tag {
  flex-shrink: 0;
}

.search-empty {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* List toolbar */
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.quick-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-right: 0.25rem;
  white-space: nowrap;
}

/* Product list */
.product-section {
  gap: 0.5rem;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 35vh;
  overflow-y: auto;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1rem;
  color: var(--p-text-muted-color);
  gap: 0.25rem;
}

.empty-list i {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.empty-list p {
  margin: 0;
  font-size: 0.875rem;
}

.empty-hint {
  font-size: 0.75rem !important;
  opacity: 0.7;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.product-row.has-quantity {
  border-color: var(--p-primary-200);
  background: var(--p-primary-50);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.product-initials-box {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.625rem;
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
  font-size: 0.8125rem;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
}

.product-inputs {
  display: flex;
  gap: 0.625rem;
  flex-shrink: 0;
  align-items: center;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.input-group label {
  font-size: 0.5625rem;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.remove-btn {
  margin-top: 0.625rem;
}

/* Notes */
.notes-section {
  gap: 0.375rem;
}

/* Summary */
.summary {
  padding: 0.75rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
}

.summary-items {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.summary-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  font-weight: 500;
  letter-spacing: 0.03em;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.summary-cost {
  color: var(--p-primary-color);
}

.summary-divider {
  width: 1px;
  height: 2rem;
  background: var(--p-surface-300);
}

/* Footer */
.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Utilities */
.w-full { width: 100%; }
.flex-1 { flex: 1; }

/* Mobile */
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

  .supplier-row {
    flex-direction: column;
  }

  .product-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .product-inputs {
    justify-content: space-between;
  }

  .summary-items {
    gap: 0.75rem;
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
    width: 42rem;
    min-width: 36rem;
    max-width: 90vw;
  }
}
</style>
