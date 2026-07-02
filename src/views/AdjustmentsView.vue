<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import AmountInput from '@/components/common/AmountInput.vue'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { useProductStore } from '@/stores/product'
import { useInventory } from '@/composables/useInventory'
import { formatCurrency } from '@/utils/format'
import type { DisplayStockMovement } from '@/types/inventory'
import BulkAdjustmentDialog from '@/components/inventory/BulkAdjustmentDialog.vue'

const toast = useToast()
const productStore = useProductStore()
const {
  getMovementHistory,
  receiveStock,
  adjustStock,
  isLoading: inventoryLoading
} = useInventory()

// State
const searchQuery = ref('')
const movements = ref<DisplayStockMovement[]>([])
const isLoadingHistory = ref(false)

// Create adjustment dialog
const showCreateDialog = ref(false)
const selectedProductId = ref<string | null>(null)
const adjustmentType = ref<string>('receive')
const adjustmentReason = ref<string>('')
const adjustmentQuantity = ref<number>(1)
const adjustmentCost = ref<number | null>(null)
const adjustmentNotes = ref('')

// Bulk adjustment dialog
const showBulkDialog = ref(false)

// Options
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

const productOptions = computed(() => {
  return productStore.products.map(p => ({
    label: `${p.name} (${p.sku})`,
    value: p.id,
    stock: p.stock
  }))
})

const selectedProduct = computed(() => {
  if (!selectedProductId.value) return null
  return productStore.products.find(p => p.id === selectedProductId.value)
})

const filteredMovements = computed(() => {
  if (!searchQuery.value) return movements.value
  const query = searchQuery.value.toLowerCase()
  return movements.value.filter(m =>
    m.productName?.toLowerCase().includes(query) ||
    m.variantName?.toLowerCase().includes(query) ||
    m.sku?.toLowerCase().includes(query) ||
    m.barcode?.toLowerCase().includes(query) ||
    m.reason?.toLowerCase().includes(query) ||
    m.movementTypeLabel?.toLowerCase().includes(query)
  )
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    productStore.fetchAll(),
    loadMovements()
  ])
})

// Methods
async function loadMovements() {
  isLoadingHistory.value = true
  try {
    movements.value = await getMovementHistory(undefined, { limit: 100 })
  } catch (e) {
    console.error('Error loading movements:', e)
  } finally {
    isLoadingHistory.value = false
  }
}

function openCreateDialog() {
  selectedProductId.value = null
  adjustmentType.value = 'receive'
  adjustmentReason.value = ''
  adjustmentQuantity.value = 1
  adjustmentCost.value = null
  adjustmentNotes.value = ''
  showCreateDialog.value = true
}

// Auto-fill cost from product's cost price (puhunan) when product is selected
watch(selectedProductId, (newId) => {
  if (newId) {
    const product = productStore.products.find(p => p.id === newId)
    if (product) {
      adjustmentCost.value = product.cost || null
    }
  } else {
    adjustmentCost.value = null
  }
})

function getMovementSeverity(type: string) {
  switch (type) {
    case 'receive':
    case 'return':
    case 'transfer_in':
      return 'success'
    case 'sale':
    case 'transfer_out':
      return 'info'
    case 'adjustment':
      return 'warn'
    case 'void':
    case 'damage':
      return 'danger'
    default:
      return 'secondary'
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleCreateAdjustment() {
  if (!selectedProductId.value || adjustmentQuantity.value === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Please select a product and enter a quantity',
      life: 3000
    })
    return
  }

  if (adjustmentType.value === 'receive' && !adjustmentCost.value) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Unit cost (puhunan) is required for receiving stock',
      life: 3000
    })
    return
  }

  // Get default variant for the product
  const { variantRepository } = await import('@/repositories/variantRepository')
  const { inventoryService } = await import('@/services/inventoryService')
  let variant = await variantRepository.getDefaultVariant(selectedProductId.value)

  // Auto-create default variant if none exists
  if (!variant) {
    const product = selectedProduct.value
    if (product) {
      variant = await variantRepository.createVariant({
        product_id: selectedProductId.value,
        name: 'Default',
        sku: product.sku,
        barcode: product.barcode || undefined,
        is_active: true,
        display_order: 0
      })

      // Sync existing product stock to the new variant
      if (variant && product.stock > 0) {
        await inventoryService.receiveStock(variant.id, product.stock, {
          reason: 'Initial stock sync'
        })
      }
    }
  }

  if (!variant) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not find or create variant for product',
      life: 5000
    })
    return
  }

  const reason = adjustmentReason.value + (adjustmentNotes.value ? ` - ${adjustmentNotes.value}` : '')
  let result

  try {
    if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') {
      result = await receiveStock(variant.id, Math.abs(adjustmentQuantity.value), {
        unitCost: adjustmentCost.value ?? undefined,
        reason: reason || adjustmentType.value
      })
    } else if (adjustmentType.value === 'damage') {
      // Damage reduces stock (negative adjustment)
      result = await adjustStock(
        variant.id,
        -Math.abs(adjustmentQuantity.value),
        reason || 'Damage/Loss'
      )
    } else {
      // Regular adjustment (can be positive or negative)
      result = await adjustStock(
        variant.id,
        adjustmentQuantity.value,
        reason || 'Stock adjustment'
      )
    }

    if (result.success) {
      // Also update product stock for display
      const productRepo = await import('@/repositories/productRepository').then(m => m.default)
      let stockChange = adjustmentQuantity.value
      if (adjustmentType.value === 'damage') {
        stockChange = -Math.abs(adjustmentQuantity.value)
      } else if (adjustmentType.value === 'receive' || adjustmentType.value === 'return') {
        stockChange = Math.abs(adjustmentQuantity.value)
      }
      await productRepo.updateStock(selectedProductId.value, stockChange)

      // Update product cost if receiving with a new unit cost
      if (adjustmentType.value === 'receive' && adjustmentCost.value) {
        await productRepo.update(selectedProductId.value, { cost: adjustmentCost.value })
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Adjustment saved successfully',
        life: 3000
      })
      showCreateDialog.value = false

      // Refresh data
      await Promise.all([
        productStore.fetchAll(),
        loadMovements()
      ])
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: result.error || 'Failed to save adjustment',
        life: 5000
      })
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to save adjustment',
      life: 5000
    })
  }
}

async function handleBulkCompleted(result: { success: number; failed: number }) {
  if (result.success > 0) {
    toast.add({
      severity: 'success',
      summary: 'Bulk Adjustment Complete',
      detail: `${result.success} product${result.success !== 1 ? 's' : ''} adjusted successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      life: 4000
    })
    await Promise.all([
      productStore.fetchAll(),
      loadMovements()
    ])
  }
  if (result.failed > 0 && result.success === 0) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `All ${result.failed} adjustments failed`,
      life: 5000
    })
  }
}
</script>

<template>
  <div class="adjustments-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Stock Adjustments</h1>
          <p class="text-muted">Receive, adjust, and track all stock changes</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Search by name, SKU, barcode..."
            class="search-input"
          />
        </IconField>
        <Button
          label="Bulk Adjustment"
          icon="pi pi-list"
          severity="secondary"
          outlined
          @click="showBulkDialog = true"
        />
        <Button
          label="Create Adjustment"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Adjustments History Table -->
    <div class="table-container flex-table">
      <DataTable
        :value="filteredMovements"
        :loading="isLoadingHistory"
        stripedRows
        scrollable
        scrollHeight="flex"
        paginator
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        sortField="createdAt"
        :sortOrder="-1"
        class="adjustments-table"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-history"></i>
            <h3>No adjustments yet</h3>
            <p>Create your first stock adjustment to get started</p>
            <Button
              label="Create Adjustment"
              icon="pi pi-plus"
              @click="openCreateDialog"
              class="mt-3"
            />
          </div>
        </template>

        <Column field="createdAt" header="Date" sortable style="min-width: 160px">
          <template #body="{ data }">
            <span class="date-cell">{{ formatDate(data.createdAt) }}</span>
          </template>
        </Column>

        <Column header="Product" sortable sortField="productName" style="min-width: 200px">
          <template #body="{ data }">
            <div class="product-cell">
              <span class="product-name">{{ data.productName || 'Unknown' }}</span>
              <span class="variant-name" v-if="data.variantName && data.variantName !== 'Default'">
                {{ data.variantName }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="movementTypeLabel" header="Type" sortable style="min-width: 120px">
          <template #body="{ data }">
            <Tag
              :value="data.movementTypeLabel"
              :severity="getMovementSeverity(data.movementType)"
            />
          </template>
        </Column>

        <Column field="quantity" header="Quantity" sortable style="min-width: 100px">
          <template #body="{ data }">
            <span :class="{
              'text-success': data.quantity > 0,
              'text-danger': data.quantity < 0
            }">
              {{ data.quantity > 0 ? '+' : '' }}{{ data.quantity }}
            </span>
          </template>
        </Column>

        <Column field="reason" header="Reason" style="min-width: 200px">
          <template #body="{ data }">
            <span class="reason-cell">{{ data.reason || '-' }}</span>
          </template>
        </Column>

        <Column field="unitCost" header="Unit Cost" style="min-width: 100px">
          <template #body="{ data }">
            {{ data.unitCost ? formatCurrency(data.unitCost) : '-' }}
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Bulk Adjustment Dialog -->
    <BulkAdjustmentDialog
      v-model:visible="showBulkDialog"
      :products="productStore.products"
      @completed="handleBulkCompleted"
    />

    <!-- Create Adjustment Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create Adjustment"
      :modal="true"
      :draggable="false"
      :style="{ width: '28rem' }"
      class="create-adjustment-dialog"
      :pt="{
        root: { class: 'create-adjustment-dialog-root' }
      }"
    >
      <div class="adjustment-form">
        <div class="form-field">
          <label for="product">Product *</label>
          <Select
            id="product"
            v-model="selectedProductId"
            :options="productOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a product"
            filter
            filterPlaceholder="Search products..."
            :disabled="inventoryLoading"
            class="w-full"
          >
            <template #option="{ option }">
              <div class="product-option">
                <span>{{ option.label }}</span>
                <Tag :value="`Stock: ${option.stock}`" severity="secondary" />
              </div>
            </template>
          </Select>
        </div>

        <div class="form-field" v-if="selectedProduct">
          <div class="current-stock-info">
            Current Stock: <strong>{{ selectedProduct.stock }}</strong>
          </div>
        </div>

        <div class="form-field">
          <label for="type">Adjustment Type *</label>
          <Select
            id="type"
            v-model="adjustmentType"
            :options="adjustmentTypeOptions"
            optionLabel="label"
            optionValue="value"
            :disabled="inventoryLoading"
            class="w-full"
          >
            <template #value="{ value }">
              <div class="type-value" v-if="value">
                <i :class="adjustmentTypeOptions.find(o => o.value === value)?.icon"></i>
                <span>{{ adjustmentTypeOptions.find(o => o.value === value)?.label }}</span>
              </div>
            </template>
            <template #option="{ option }">
              <div class="type-option">
                <i :class="option.icon"></i>
                <span>{{ option.label }}</span>
              </div>
            </template>
          </Select>
        </div>

        <div class="form-field">
          <label for="reason">Reason *</label>
          <Select
            id="reason"
            v-model="adjustmentReason"
            :options="reasonOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a reason"
            :disabled="inventoryLoading"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label for="quantity">
            {{ adjustmentType === 'damage' ? 'Quantity to Remove' : 'Quantity' }} *
          </label>
          <InputNumber
            id="quantity"
            v-model="adjustmentQuantity"
            :min="adjustmentType === 'adjustment' ? undefined : 1"
            showButtons
            :disabled="inventoryLoading"
            class="w-full"
          />
          <small v-if="adjustmentType === 'adjustment'" class="hint">
            Use negative numbers to reduce stock
          </small>
        </div>

        <div class="form-field" v-if="adjustmentType === 'receive'">
          <label for="cost">Unit Cost / Puhunan *</label>
          <AmountInput
            id="cost"
            v-model="adjustmentCost"
            :min="0"
            :disabled="inventoryLoading"
            class="w-full"
          />
          <small class="hint">Base cost price per unit</small>
        </div>

        <div class="form-field">
          <label for="notes">Notes (optional)</label>
          <Textarea
            id="notes"
            v-model="adjustmentNotes"
            rows="2"
            :disabled="inventoryLoading"
            class="w-full"
            placeholder="Additional notes..."
          />
        </div>

        <div class="preview" v-if="selectedProduct && adjustmentQuantity !== 0">
          <template v-if="adjustmentType === 'damage'">
            New stock: <strong>{{ selectedProduct.stock - Math.abs(adjustmentQuantity) }}</strong>
          </template>
          <template v-else-if="adjustmentType === 'receive' || adjustmentType === 'return'">
            New stock: <strong>{{ selectedProduct.stock + Math.abs(adjustmentQuantity) }}</strong>
          </template>
          <template v-else>
            New stock: <strong>{{ selectedProduct.stock + adjustmentQuantity }}</strong>
          </template>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="inventoryLoading"
          @click="showCreateDialog = false"
        />
        <Button
          label="Save Adjustment"
          icon="pi pi-check"
          :loading="inventoryLoading"
          :disabled="!selectedProductId || adjustmentQuantity === 0 || !adjustmentReason || (adjustmentType === 'receive' && !adjustmentCost)"
          @click="handleCreateAdjustment"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.adjustments-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.adjustments-toolbar {
  margin-bottom: 1rem;
  border-radius: 12px;
  flex-shrink: 0;
}

.toolbar-start {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  min-width: 250px;
}

.toolbar-end {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.adjustments-table {
  height: 100%;
}

.date-cell {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.product-cell {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.variant-name {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.reason-cell {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.text-success {
  color: var(--p-green-500);
  font-weight: 600;
}

.text-danger {
  color: var(--p-red-500);
  font-weight: 600;
}

.mt-3 {
  margin-top: 1rem;
}

/* Create Dialog */
.adjustment-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.current-stock-info {
  padding: 0.5rem 0.75rem;
  background: var(--app-surface-100);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.current-stock-info strong {
  color: var(--p-text-color);
}

.hint {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.preview {
  padding: 0.75rem 1rem;
  background: var(--p-primary-100);
  border-radius: 8px;
  text-align: center;
  font-size: 0.875rem;
  color: var(--p-primary-700);
}

.preview strong {
  font-weight: 600;
}

.product-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.type-value,
.type-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-option i,
.type-value i {
  font-size: 0.875rem;
  width: 1rem;
}

.w-full {
  width: 100%;
}

/* Mobile */
@media (max-width: 576px) {
  :deep(.create-adjustment-dialog-root) {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.create-adjustment-dialog-root .p-dialog-content) {
    flex: 1;
    overflow-y: auto;
  }

  .adjustments-toolbar {
    border-radius: 8px;
  }

  .search-input {
    min-width: 150px;
  }

  .toolbar-end :deep(.p-button-label) {
    display: none;
  }
}
</style>
