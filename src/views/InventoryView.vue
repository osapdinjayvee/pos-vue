<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import Toolbar from 'primevue/toolbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Paginator from 'primevue/paginator'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import StockMovementDialog from '@/components/inventory/StockMovementDialog.vue'
import { useProductStore } from '@/stores/product'
import { useInventory } from '@/composables/useInventory'
import { formatCurrency } from '@/utils/format'
import { exportToCsv } from '@/utils/exportCsv'
import type { Product } from '@/repositories/productRepository'
import type { ExportColumn } from '@/utils/exportCsv'

const router = useRouter()
const toast = useToast()
const productStore = useProductStore()
const { receiveStock } = useInventory()

// Filter state
type FilterTab = 'all' | 'low-stock' | 'out-of-stock' | 'expiring' | 'slow-moving' | 'fast-moving'

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Low Stock', value: 'low-stock' },
  { label: 'Out of Stock', value: 'out-of-stock' },
  { label: 'Expiring', value: 'expiring' },
  { label: 'Slow Moving', value: 'slow-moving' },
  { label: 'Fast Moving', value: 'fast-moving' }
]

const activeFilter = ref<FilterTab>('all')
const searchQuery = ref('')

// Table state
const selectedProducts = ref<Product[]>([])
const first = ref(0)
const rows = ref(10)

// Stock dialog state
const showStockDialog = ref(false)
const selectedProduct = ref<Product | null>(null)

onMounted(() => {
  productStore.fetchAll()
})

// Computed: filtered products based on active tab
const filteredProducts = computed(() => {
  let result = productStore.products

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query))
    )
  }

  // Apply tab filter
  switch (activeFilter.value) {
    case 'low-stock':
      return result.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold)
    case 'out-of-stock':
      return result.filter(p => p.stock === 0)
    case 'expiring': {
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      return result.filter(p => {
        if (!p.expiration_date) return false
        const expiry = new Date(p.expiration_date)
        return expiry <= thirtyDays && expiry >= new Date()
      })
    }
    case 'slow-moving':
      return result.filter(p => p.sold < 10)
    case 'fast-moving':
      return result.filter(p => p.sold >= 100)
    default:
      return result
  }
})

// Paginated products
const paginatedProducts = computed(() => {
  const start = first.value
  const end = start + rows.value
  return filteredProducts.value.slice(start, end)
})

// Get stock status for display
function getStockStatus(product: Product): { label: string; severity: 'danger' | 'warn' | 'success' } {
  if (product.stock === 0) {
    return { label: 'Out of Stock', severity: 'danger' }
  }
  if (product.stock <= product.low_stock_threshold) {
    return { label: 'Low Stock', severity: 'warn' }
  }
  if (product.expiration_date) {
    const expiry = new Date(product.expiration_date)
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    if (expiry <= thirtyDays && expiry >= new Date()) {
      return { label: 'Expiring', severity: 'warn' }
    }
  }
  return { label: 'In Stock', severity: 'success' }
}

// Pagination handler
function onPageChange(event: { first: number; rows: number }) {
  first.value = event.first
  rows.value = event.rows
}

// Reset pagination when filter changes
function onFilterChange() {
  first.value = 0
}

// Navigation
function viewProduct(product: Product) {
  router.push(`/products/${product.id}`)
}

// Stock dialog handlers
function openAddStock(product: Product) {
  selectedProduct.value = product
  showStockDialog.value = true
}

async function handleStockMovement(newStock: number) {
  if (selectedProduct.value) {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Stock updated to ${newStock} units`,
      life: 3000
    })
    await productStore.fetchAll()
  }
}

// Export functionality
function handleExport() {
  const columns: ExportColumn[] = [
    { field: 'name', header: 'Product Name' },
    { field: 'sku', header: 'SKU' },
    { field: 'barcode', header: 'Barcode' },
    { field: 'category_name', header: 'Category' },
    { field: 'price', header: 'Price', formatter: (v) => v?.toFixed(2) ?? '0.00' },
    { field: 'cost', header: 'Cost', formatter: (v) => v?.toFixed(2) ?? '0.00' },
    { field: 'stock', header: 'Stock' },
    {
      field: 'status',
      header: 'Status',
      formatter: (_, row) => getStockStatus(row).label
    }
  ]

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `inventory-${activeFilter.value}-${dateStr}`

  exportToCsv(filteredProducts.value, filename, columns)

  toast.add({
    severity: 'success',
    summary: 'Export Complete',
    detail: `Exported ${filteredProducts.value.length} products`,
    life: 3000
  })
}

// Go to adjustments page
function goToAdjustments() {
  router.push('/adjustments')
}

// Get stock class for styling
function getStockClass(product: Product): string {
  if (product.stock === 0) return 'stock-danger'
  if (product.stock <= product.low_stock_threshold) return 'stock-warning'
  return ''
}
</script>

<template>
  <div class="inventory-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Inventory</h1>
          <p class="text-muted">Manage stock levels and movements</p>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <Toolbar class="inventory-toolbar">
      <template #start>
        <SelectButton
          v-model="activeFilter"
          :options="filterTabs"
          optionLabel="label"
          optionValue="value"
          @change="onFilterChange"
          class="filter-tabs"
        />
      </template>

      <template #end>
        <div class="toolbar-end">
          <span class="p-input-icon-left search-wrapper">
            <i class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search products..."
              class="search-input"
            />
          </span>
          <Button
            label="Export"
            icon="pi pi-download"
            severity="secondary"
            outlined
            @click="handleExport"
            :disabled="filteredProducts.length === 0"
          />
          <Button
            label="Adjustments"
            icon="pi pi-sliders-h"
            severity="secondary"
            outlined
            @click="goToAdjustments"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Content -->
    <div class="inventory-content">
      <!-- Loading State -->
      <div v-if="productStore.isLoading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Loading products...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <h3>No products found</h3>
        <p v-if="searchQuery">Try adjusting your search or filters</p>
        <p v-else-if="activeFilter !== 'all'">No products match the "{{ filterTabs.find(t => t.value === activeFilter)?.label }}" filter</p>
        <p v-else>Add some products to get started</p>
      </div>

      <!-- Data Table -->
      <div v-else class="table-wrapper">
        <DataTable
          :value="paginatedProducts"
          v-model:selection="selectedProducts"
          dataKey="id"
          stripedRows
          removableSort
          sortMode="multiple"
          class="inventory-table"
        >
          <template #empty>
            <div class="empty-table">
              <i class="pi pi-inbox"></i>
              <p>No products found</p>
            </div>
          </template>

          <Column selectionMode="multiple" headerStyle="width: 3rem" />

          <Column header="Product" sortable sortField="name" style="min-width: 280px">
            <template #body="{ data }">
              <div class="product-cell">
                <div class="product-cell-image">
                  <span v-if="!data.image">{{ data.name.substring(0, 2).toUpperCase() }}</span>
                  <img v-else :src="data.image" :alt="data.name" />
                </div>
                <div class="product-cell-info">
                  <span class="product-cell-name">{{ data.name }}</span>
                  <span class="product-cell-category">{{ data.category_name || 'Uncategorized' }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="sku" header="SKU" sortable style="min-width: 100px" />

          <Column field="barcode" header="Barcode" sortable style="min-width: 130px">
            <template #body="{ data }">
              {{ data.barcode || '-' }}
            </template>
          </Column>

          <Column field="price" header="Price" sortable style="min-width: 100px">
            <template #body="{ data }">
              {{ formatCurrency(data.price) }}
            </template>
          </Column>

          <Column field="cost" header="Cost" sortable style="min-width: 100px">
            <template #body="{ data }">
              {{ formatCurrency(data.cost) }}
            </template>
          </Column>

          <Column field="stock" header="Stock" sortable style="min-width: 80px">
            <template #body="{ data }">
              <span :class="getStockClass(data)">
                {{ data.stock }}
              </span>
            </template>
          </Column>

          <Column header="Status" sortable sortField="stock" style="min-width: 120px">
            <template #body="{ data }">
              <Tag
                :value="getStockStatus(data).label"
                :severity="getStockStatus(data).severity"
              />
            </template>
          </Column>

          <Column header="Actions" style="min-width: 130px">
            <template #body="{ data }">
              <div class="table-actions">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  severity="secondary"
                  @click="viewProduct(data)"
                  v-tooltip.top="'View'"
                />
                <Button
                  icon="pi pi-plus"
                  text
                  rounded
                  severity="success"
                  @click="openAddStock(data)"
                  v-tooltip.top="'Add Stock'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Pagination -->
      <Paginator
        v-if="filteredProducts.length > 0 && !productStore.isLoading"
        :first="first"
        :rows="rows"
        :totalRecords="filteredProducts.length"
        :rowsPerPageOptions="[10, 25, 50]"
        @page="onPageChange"
        class="inventory-paginator"
      />
    </div>

    <!-- Stock Movement Dialog -->
    <StockMovementDialog
      v-if="selectedProduct"
      v-model:visible="showStockDialog"
      :variant-id="selectedProduct.id"
      :variant-name="selectedProduct.name"
      :product-name="selectedProduct.name"
      :current-stock="selectedProduct.stock"
      @movement-recorded="handleStockMovement"
    />
  </div>
</template>

<style scoped>
.inventory-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Toolbar */
.inventory-toolbar {
  margin-bottom: 1rem;
  border-radius: 12px;
  flex-shrink: 0;
}

.filter-tabs {
  flex-shrink: 0;
}

.toolbar-end {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
}

.search-wrapper i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--p-text-muted-color);
}

.search-input {
  padding-left: 2.25rem;
  width: 200px;
}

/* Content */
.inventory-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--p-text-muted-color);
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  flex: 1;
}

.empty-state i {
  font-size: 4rem;
  color: var(--p-surface-400);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0;
  color: var(--p-text-muted-color);
}

/* Table */
.table-wrapper {
  flex: 1;
  overflow: auto;
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
}

.inventory-table {
  min-width: 100%;
}

.empty-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-table i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* Product cell */
.product-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-cell-image {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--p-surface-500);
  font-size: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
}

.product-cell-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-cell-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-cell-name {
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-cell-category {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Stock colors */
.stock-danger {
  color: var(--p-red-500);
  font-weight: 600;
}

.stock-warning {
  color: var(--p-orange-500);
  font-weight: 600;
}

/* Actions */
.table-actions {
  display: flex;
  gap: 0.25rem;
}

/* Pagination */
.inventory-paginator {
  flex-shrink: 0;
  border-top: 1px solid var(--p-surface-200);
  background: var(--p-surface-0);
  border-radius: 0 0 12px 12px;
}

/* Responsive */
@media (max-width: 1024px) {
  .filter-tabs :deep(.p-selectbutton) {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .inventory-toolbar {
    border-radius: 8px;
  }

  .toolbar-end :deep(.p-button-label) {
    display: none;
  }

  .search-input {
    width: 150px;
  }

  .table-wrapper {
    border-radius: 8px;
  }

  .inventory-paginator {
    border-radius: 0 0 8px 8px;
  }
}

@media (max-width: 576px) {
  .filter-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .search-input {
    width: 120px;
  }
}
</style>
