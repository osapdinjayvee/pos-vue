<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Paginator, { type PageState } from 'primevue/paginator'
import Drawer from 'primevue/drawer'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useProductStore } from '@/stores/product'
import { useCategoryStore } from '@/stores/category'
import type { Product, DisplayProduct, ProductStatus, ProductFilters } from '@/types'
import { toDisplayProduct } from '@/types'
import { formatCurrency } from '@/utils/format'
import ProductCard from '@/components/products/ProductCard.vue'
import ProductToolbar from '@/components/products/ProductToolbar.vue'
import BulkReceiveStockDialog from '@/components/inventory/BulkReceiveStockDialog.vue'

const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

// Stores
const productStore = useProductStore()
const categoryStore = useCategoryStore()

// Local state
const viewMode = ref<string>('grid')
const searchQuery = ref('')
const selectedProducts = ref<DisplayProduct[]>([])
const first = ref(0)
const rows = ref(10)

// Filter drawer state
const filterDrawerVisible = ref(false)

// Bulk receive dialog state
const showBulkReceiveDialog = ref(false)
const filters = ref<ProductFilters & {
  lowStock: boolean
  outOfStock: boolean
  nearExpiry: boolean
  lowProfit: boolean
  hasDiscount: boolean
  salesPeriod: string | null
  dateRange: Date[] | null
}>({
  category_id: undefined,
  status: undefined,
  lowStock: false,
  outOfStock: false,
  nearExpiry: false,
  lowProfit: false,
  hasDiscount: false,
  salesPeriod: null,
  dateRange: null,
  movement: undefined
})

// Initialize data
onMounted(async () => {
  await Promise.all([
    productStore.fetchAll(),
    categoryStore.fetchAll()
  ])
})

// Watch for store errors
watch(() => productStore.error, (error) => {
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 5000
    })
    productStore.clearError()
  }
})

// Computed
const categoryOptions = computed(() => [
  { label: 'All Categories', value: null },
  ...categoryStore.categoryOptions
])

const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Out of Stock', value: 'out-of-stock' }
]

const salesPeriodOptions = [
  { label: 'All Time', value: null },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' }
]

const movementOptions = [
  { label: 'All Products', value: null },
  { label: 'Fast Moving (100+ sold)', value: 'fast' },
  { label: 'Moderate (50-100 sold)', value: 'moderate' },
  { label: 'Slow Moving (10-50 sold)', value: 'slow' },
  { label: 'Very Slow (< 10 sold)', value: 'very-slow' },
  { label: 'No Sales', value: 'no-sales' }
]

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.value.category_id) count++
  if (filters.value.status) count++
  if (filters.value.lowStock) count++
  if (filters.value.outOfStock) count++
  if (filters.value.nearExpiry) count++
  if (filters.value.lowProfit) count++
  if (filters.value.hasDiscount) count++
  if (filters.value.salesPeriod) count++
  if (filters.value.dateRange && filters.value.dateRange.length === 2) count++
  if (filters.value.movement) count++
  return count
})

const filteredProducts = computed(() => {
  let result = productStore.products

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.category_name?.toLowerCase().includes(query))
    )
  }

  if (filters.value.category_id) {
    result = result.filter(p => p.category_id === filters.value.category_id)
  }

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }

  if (filters.value.lowStock) {
    result = result.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold)
  }

  if (filters.value.outOfStock) {
    result = result.filter(p => p.stock === 0)
  }

  if (filters.value.movement) {
    switch (filters.value.movement) {
      case 'fast':
        result = result.filter(p => p.sold >= 100)
        break
      case 'moderate':
        result = result.filter(p => p.sold >= 50 && p.sold < 100)
        break
      case 'slow':
        result = result.filter(p => p.sold >= 10 && p.sold < 50)
        break
      case 'very-slow':
        result = result.filter(p => p.sold > 0 && p.sold < 10)
        break
      case 'no-sales':
        result = result.filter(p => p.sold === 0)
        break
    }
  }

  if (filters.value.lowProfit) {
    result = result.filter(p => {
      if (!p.cost || p.cost === 0) return false
      const margin = ((p.price - p.cost) / p.price) * 100
      return margin < 20
    })
  }

  if (filters.value.hasDiscount) {
    result = result.filter(p => {
      if (!p.cost || p.cost === 0) return false
      return p.price > p.cost * 1.5
    })
  }

  if (filters.value.nearExpiry) {
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    result = result.filter(p => {
      if (!p.expiration_date) return false
      const expDate = new Date(p.expiration_date)
      return expDate <= thirtyDaysFromNow && expDate >= today
    })
  }

  return result
})

const paginatedProducts = computed(() => {
  const start = first.value
  const end = start + rows.value
  return filteredProducts.value.slice(start, end)
})

// Methods
const viewProduct = (product: DisplayProduct) => {
  router.push(`/products/${product.id}`)
}

const onPageChange = (event: PageState) => {
  first.value = event.first
  rows.value = event.rows
}

const clearFilters = () => {
  filters.value = {
    category_id: undefined,
    status: undefined,
    lowStock: false,
    outOfStock: false,
    nearExpiry: false,
    lowProfit: false,
    hasDiscount: false,
    salesPeriod: null,
    dateRange: null,
    movement: undefined
  }
}

const getStatusSeverity = (status: ProductStatus) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warn'
    case 'out-of-stock':
      return 'danger'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: ProductStatus) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'out-of-stock':
      return 'Out of Stock'
    default:
      return status
  }
}

const isSelected = (id: string) => {
  return selectedProducts.value.some(p => p.id === id)
}

const toggleSelect = (id: string) => {
  const index = selectedProducts.value.findIndex(p => p.id === id)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    const product = productStore.products.find(p => p.id === id)
    if (product) {
      selectedProducts.value.push(toDisplayProduct(product))
    }
  }
}

const navigateToCreate = () => {
  router.push('/products/new')
}

const navigateToEdit = (product: DisplayProduct) => {
  router.push(`/products/${product.id}/edit`)
}

const confirmDelete = (product: DisplayProduct) => {
  confirm.require({
    message: `Are you sure you want to delete "${product.name}"?`,
    header: 'Delete Product',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger'
    },
    accept: async () => {
      const success = await productStore.remove(product.id)
      if (success) {
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Product deleted successfully',
          life: 3000
        })
        selectedProducts.value = selectedProducts.value.filter(p => p.id !== product.id)
      }
    }
  })
}

const confirmBulkDelete = () => {
  confirm.require({
    message: `Are you sure you want to delete ${selectedProducts.value.length} products?`,
    header: 'Delete Products',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Delete All',
      severity: 'danger'
    },
    accept: async () => {
      const ids = selectedProducts.value.map(p => p.id)
      const success = await productStore.bulkDelete(ids)
      if (success) {
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `${ids.length} products deleted successfully`,
          life: 3000
        })
        selectedProducts.value = []
      }
    }
  })
}

const bulkSetStatus = async (status: ProductStatus) => {
  const ids = selectedProducts.value.map(p => p.id)
  const success = await productStore.bulkUpdateStatus(ids, status)
  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: `${ids.length} products updated to ${status}`,
      life: 3000
    })
    selectedProducts.value = []
  }
}

const openBulkReceiveDialog = () => {
  showBulkReceiveDialog.value = true
}

const handleBulkStockReceived = async (result: { success: number; failed: number }) => {
  if (result.success > 0) {
    toast.add({
      severity: 'success',
      summary: 'Stock Received',
      detail: `Stock received for ${result.success} product${result.success !== 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
      life: 3000
    })
    // Refresh products to show updated stock
    await productStore.fetchAll()
    selectedProducts.value = []
  } else if (result.failed > 0) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to receive stock for ${result.failed} product${result.failed !== 1 ? 's' : ''}`,
      life: 5000
    })
  }
}
</script>

<template>
  <div class="products-page">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Products</h1>
          <p class="text-muted">Manage your product catalog</p>
        </div>
      </div>
    </div>

    <div class="products-toolbar-wrapper">
      <ProductToolbar
        v-model:search="searchQuery"
        v-model:view="viewMode"
        :selectedCount="selectedProducts.length"
        :activeFilterCount="activeFilterCount"
        @add="navigateToCreate"
        @bulkDelete="confirmBulkDelete"
        @bulkActivate="bulkSetStatus('active')"
        @bulkDeactivate="bulkSetStatus('inactive')"
        @bulkReceiveStock="openBulkReceiveDialog"
        @openFilters="filterDrawerVisible = true"
      />
    </div>

    <!-- Filter Drawer -->
    <Drawer
      v-model:visible="filterDrawerVisible"
      position="right"
      header="Filters"
      class="filter-drawer"
    >
      <div class="filter-content">
        <div class="filter-section">
          <label class="filter-label">Category</label>
          <Select
            v-model="filters.category_id"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Categories"
            class="w-full"
          />
        </div>

        <div class="filter-section">
          <label class="filter-label">Status</label>
          <Select
            v-model="filters.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Status"
            class="w-full"
          />
        </div>

        <div class="filter-section">
          <label class="filter-label">Stock</label>
          <div class="filter-checks">
            <div class="filter-check">
              <Checkbox v-model="filters.lowStock" :binary="true" inputId="lowStock" />
              <label for="lowStock">Low Stock (&lt; threshold)</label>
            </div>
            <div class="filter-check">
              <Checkbox v-model="filters.outOfStock" :binary="true" inputId="outOfStock" />
              <label for="outOfStock">Out of Stock</label>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <label class="filter-label">Expiration</label>
          <div class="filter-checks">
            <div class="filter-check">
              <Checkbox v-model="filters.nearExpiry" :binary="true" inputId="nearExpiry" />
              <label for="nearExpiry">Near Expiry (30 days)</label>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <label class="filter-label">Movement</label>
          <Select
            v-model="filters.movement"
            :options="movementOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Products"
            class="w-full"
          />
        </div>

        <div class="filter-section">
          <label class="filter-label">Sales Period</label>
          <Select
            v-model="filters.salesPeriod"
            :options="salesPeriodOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Time"
            class="w-full"
          />
        </div>

        <div v-if="filters.salesPeriod === 'custom'" class="filter-section">
          <label class="filter-label">Date Range</label>
          <DatePicker
            v-model="filters.dateRange"
            selectionMode="range"
            :manualInput="false"
            placeholder="Select date range"
            class="w-full"
            dateFormat="M dd, yy"
          />
        </div>

        <div class="filter-section">
          <label class="filter-label">Pricing</label>
          <div class="filter-checks">
            <div class="filter-check">
              <Checkbox v-model="filters.lowProfit" :binary="true" inputId="lowProfit" />
              <label for="lowProfit">Low Profit (&lt; 20%)</label>
            </div>
            <div class="filter-check">
              <Checkbox v-model="filters.hasDiscount" :binary="true" inputId="hasDiscount" />
              <label for="hasDiscount">High Margin (&gt; 50%)</label>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="filter-footer">
          <Button
            label="Clear All"
            severity="secondary"
            outlined
            @click="clearFilters"
          />
          <Button
            label="Apply"
            @click="filterDrawerVisible = false"
          />
        </div>
      </template>
    </Drawer>

    <div class="products-content">
      <!-- Loading State -->
      <div v-if="productStore.isLoading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Loading products...</p>
      </div>

      <div v-else class="products-scrollable">
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="products-grid">
          <ProductCard
            v-for="product in paginatedProducts"
            :key="product.id"
            :product="toDisplayProduct(product)"
            :selected="isSelected(product.id)"
            @select="toggleSelect"
            @view="viewProduct(toDisplayProduct(product))"
            @edit="navigateToEdit(toDisplayProduct(product))"
            @delete="confirmDelete(toDisplayProduct(product))"
          />
        </div>

        <!-- Empty State for Grid -->
        <div v-if="viewMode === 'grid' && filteredProducts.length === 0" class="empty-state">
          <i class="pi pi-box"></i>
          <h3>No products found</h3>
          <p>Try adjusting your search or filter criteria</p>
          <Button
            v-if="productStore.products.length === 0"
            label="Add First Product"
            icon="pi pi-plus"
            @click="navigateToCreate"
            class="mt-4"
          />
        </div>

        <!-- List View -->
        <div v-if="viewMode === 'list'" class="products-table">
          <DataTable
            :value="paginatedProducts"
            v-model:selection="selectedProducts"
            dataKey="id"
            stripedRows
            removableSort
            sortMode="multiple"
            :globalFilterFields="['name', 'sku', 'category_name']"
            @rowClick="(e: { data: DisplayProduct }) => viewProduct(e.data)"
            class="clickable-rows"
          >
            <template #empty>
              <div class="empty-table">
                <i class="pi pi-box"></i>
                <p>No products found</p>
              </div>
            </template>

            <Column selectionMode="multiple" headerStyle="width: 3rem" />

            <Column header="Product" sortable sortField="name" style="min-width: 300px">
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

            <Column field="sku" header="SKU" sortable style="min-width: 120px" />

            <Column field="price" header="Price" sortable style="min-width: 100px">
              <template #body="{ data }">
                {{ formatCurrency(data.price) }}
              </template>
            </Column>

            <Column field="stock" header="Stock" sortable style="min-width: 100px">
              <template #body="{ data }">
                <span :class="{ 'text-red-500': data.stock === 0, 'text-orange-500': data.stock > 0 && data.stock <= data.low_stock_threshold }">
                  {{ data.stock }}
                </span>
              </template>
            </Column>

            <Column field="status" header="Status" sortable style="min-width: 130px">
              <template #body="{ data }">
                <Tag
                  :value="getStatusLabel(data.status)"
                  :severity="getStatusSeverity(data.status)"
                />
              </template>
            </Column>

            <Column header="Actions" style="min-width: 120px">
              <template #body="{ data }">
                <div class="table-actions">
                  <Button
                    icon="pi pi-pencil"
                    text
                    rounded
                    severity="secondary"
                    @click.stop="navigateToEdit(data)"
                    v-tooltip.top="'Edit'"
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    severity="danger"
                    @click.stop="confirmDelete(data)"
                    v-tooltip.top="'Delete'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <!-- Pagination -->
      <Paginator
        v-if="filteredProducts.length > 0 && !productStore.isLoading"
        :first="first"
        :rows="rows"
        :totalRecords="filteredProducts.length"
        :rowsPerPageOptions="[10, 25, 50]"
        @page="onPageChange"
        class="products-paginator"
      />
    </div>

    <!-- Bulk Receive Stock Dialog -->
    <BulkReceiveStockDialog
      v-model:visible="showBulkReceiveDialog"
      :products="selectedProducts"
      @stock-received="handleBulkStockReceived"
    />
  </div>
</template>

<style scoped>
.products-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.products-toolbar-wrapper {
  flex-shrink: 0;
}

.products-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.products-scrollable {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 576px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) {
  .products-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.products-grid > * {
  min-width: 0;
}

.products-table {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  overflow: hidden;
}

.clickable-rows :deep(.p-datatable-row-selected) {
  background: var(--p-surface-50) !important;
}

.clickable-rows :deep(tr) {
  cursor: pointer;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
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

.product-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-cell-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--p-surface-500);
  font-size: 0.875rem;
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
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.table-actions {
  display: flex;
  gap: 0.25rem;
}

.text-red-500 {
  color: var(--p-red-500);
}

.text-orange-500 {
  color: var(--p-orange-500);
}

.products-paginator {
  flex-shrink: 0;
  margin-top: 1rem;
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
}

/* Filter Drawer */
.filter-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.filter-checks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-check label {
  font-size: 0.875rem;
  color: var(--p-text-color);
  cursor: pointer;
}

.filter-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.w-full {
  width: 100%;
}

.mt-4 {
  margin-top: 1rem;
}
</style>
