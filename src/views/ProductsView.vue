<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import type { Product, ProductStatus } from '@/types'
import { products as initialProducts } from '@/data/mockData'
import ProductCard from '@/components/products/ProductCard.vue'
import ProductToolbar from '@/components/products/ProductToolbar.vue'

const router = useRouter()
const confirm = useConfirm()

const products = ref<Product[]>([...initialProducts])
const viewMode = ref<string>('grid')
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const selectedProducts = ref<Product[]>([])

const filteredProducts = computed(() => {
  let result = products.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  return result
})

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

const formatCurrency = (value: number) => {
  return '$' + value.toFixed(2)
}

const isSelected = (id: string) => {
  return selectedProducts.value.some(p => p.id === id)
}

const toggleSelect = (id: string) => {
  const index = selectedProducts.value.findIndex(p => p.id === id)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    const product = products.value.find(p => p.id === id)
    if (product) {
      selectedProducts.value.push(product)
    }
  }
}

const navigateToCreate = () => {
  router.push('/products/new')
}

const navigateToEdit = (product: Product) => {
  router.push(`/products/${product.id}/edit`)
}

const confirmDelete = (product: Product) => {
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
    accept: () => {
      products.value = products.value.filter(p => p.id !== product.id)
      selectedProducts.value = selectedProducts.value.filter(p => p.id !== product.id)
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
    accept: () => {
      const ids = selectedProducts.value.map(p => p.id)
      products.value = products.value.filter(p => !ids.includes(p.id))
      selectedProducts.value = []
    }
  })
}

const getDateString = () => {
  return new Date().toISOString().split('T')[0] as string
}

const bulkSetStatus = (status: ProductStatus) => {
  const ids = selectedProducts.value.map(p => p.id)
  const today = getDateString()
  products.value = products.value.map(p => {
    if (ids.includes(p.id)) {
      return { ...p, status, updatedAt: today }
    }
    return p
  })
  selectedProducts.value = []
}
</script>

<template>
  <div class="products-page">
    <ConfirmDialog />

    <ProductToolbar
      v-model:search="searchQuery"
      v-model:view="viewMode"
      v-model:category="selectedCategory"
      :selectedCount="selectedProducts.length"
      @add="navigateToCreate"
      @bulkDelete="confirmBulkDelete"
      @bulkActivate="bulkSetStatus('active')"
      @bulkDeactivate="bulkSetStatus('inactive')"
    />

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="products-grid">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        :selected="isSelected(product.id)"
        @select="toggleSelect"
        @edit="navigateToEdit(product)"
        @delete="confirmDelete(product)"
      />
    </div>

    <!-- Empty State for Grid -->
    <div v-if="viewMode === 'grid' && filteredProducts.length === 0" class="empty-state">
      <i class="pi pi-box"></i>
      <h3>No products found</h3>
      <p>Try adjusting your search or filter criteria</p>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="products-table">
      <DataTable
        :value="filteredProducts"
        v-model:selection="selectedProducts"
        dataKey="id"
        paginator
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        stripedRows
        removableSort
        sortMode="multiple"
        :globalFilterFields="['name', 'sku', 'category']"
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
                <span class="product-cell-category">{{ data.category }}</span>
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
            <span :class="{ 'text-red-500': data.stock === 0 }">
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
                @click="navigateToEdit(data)"
                v-tooltip.top="'Edit'"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                @click="confirmDelete(data)"
                v-tooltip.top="'Delete'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.products-page {
  display: flex;
  flex-direction: column;
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
  background: var(--p-surface-100);
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
  width: 100%;
  height: 100%;
  object-fit: cover;
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
</style>
