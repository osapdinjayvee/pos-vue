<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import type { Product } from '@/repositories/productRepository'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  products: Product[]
  loading?: boolean
  selectedIds?: string[]
}>()

const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  view: [product: Product]
  edit: [product: Product]
  delete: [product: Product]
  'add-stock': [product: Product]
}>()

const searchQuery = ref('')

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return props.products

  const query = searchQuery.value.toLowerCase()
  return props.products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.sku.toLowerCase().includes(query) ||
    (p.barcode && p.barcode.toLowerCase().includes(query))
  )
})

const selectedProducts = computed({
  get: () => props.products.filter(p => props.selectedIds?.includes(p.id)),
  set: (selected) => emit('update:selectedIds', selected.map(p => p.id))
})

function getStatusSeverity(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'warn'
    case 'out-of-stock': return 'danger'
    default: return 'info'
  }
}

function getStockSeverity(stock: number, threshold: number) {
  if (stock === 0) return 'danger'
  if (stock <= threshold) return 'warn'
  return 'success'
}
</script>

<template>
  <div class="product-list">
    <div class="list-toolbar">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search products..."
          class="search-input"
        />
      </IconField>
    </div>

    <DataTable
      v-model:selection="selectedProducts"
      :value="filteredProducts"
      :loading="loading"
      dataKey="id"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      class="product-table"
    >
      <Column selectionMode="multiple" headerStyle="width: 3rem" />

      <Column field="name" header="Product" sortable>
        <template #body="{ data }">
          <div class="product-cell">
            <div v-if="data.image" class="product-image">
              <img :src="data.image" :alt="data.name" />
            </div>
            <div v-else class="product-placeholder">
              {{ data.name.substring(0, 2).toUpperCase() }}
            </div>
            <div class="product-info">
              <span class="product-name">{{ data.name }}</span>
              <span class="product-sku">{{ data.sku }}</span>
            </div>
          </div>
        </template>
      </Column>

      <Column field="category_name" header="Category" sortable>
        <template #body="{ data }">
          <span class="category-badge">{{ data.category_name || 'Uncategorized' }}</span>
        </template>
      </Column>

      <Column field="price" header="Price" sortable>
        <template #body="{ data }">
          <span class="price-cell">{{ formatCurrency(data.price) }}</span>
        </template>
      </Column>

      <Column field="stock" header="Stock" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.stock.toString()"
            :severity="getStockSeverity(data.stock, data.low_stock_threshold)"
          />
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.status"
            :severity="getStatusSeverity(data.status)"
          />
        </template>
      </Column>

      <Column header="Actions" headerStyle="width: 10rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-eye"
              text
              rounded
              severity="secondary"
              size="small"
              @click="emit('view', data)"
              v-tooltip="'View'"
            />
            <Button
              icon="pi pi-plus"
              text
              rounded
              severity="success"
              size="small"
              @click="emit('add-stock', data)"
              v-tooltip="'Add Stock'"
            />
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              size="small"
              @click="emit('edit', data)"
              v-tooltip="'Edit'"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              size="small"
              @click="emit('delete', data)"
              v-tooltip="'Delete'"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No products found</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.product-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-toolbar {
  display: flex;
  justify-content: flex-end;
}

.search-input {
  width: 300px;
}

.product-table {
  font-size: 0.875rem;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-image,
.product-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-placeholder {
  background: var(--p-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.product-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.product-sku {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.category-badge {
  font-size: 0.8125rem;
  color: var(--p-primary-color);
}

.price-cell {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
}
</style>
