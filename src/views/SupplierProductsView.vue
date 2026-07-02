<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { supplierRepository } from '@/repositories/supplierRepository'
import { vatService } from '@/services/vatService'
import type { Supplier } from '@/types/inventory'
import type { Product } from '@/types'

const route = useRoute()
const router = useRouter()

const supplier = ref<Supplier | null>(null)
const products = ref<Product[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const supplierId = route.params.id as string

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value
  const q = searchQuery.value.trim().toLowerCase()
  return products.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.sku && p.sku.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.toLowerCase().includes(q))
  )
})

const totalStock = computed(() => products.value.reduce((s, p) => s + (p.stock || 0), 0))
const totalValue = computed(() => products.value.reduce((s, p) => s + (p.stock || 0) * (p.cost || 0), 0))

onMounted(async () => {
  try {
    const [sup, prods] = await Promise.all([
      supplierRepository.findById(supplierId),
      supplierRepository.getProductsBySupplier(supplierId)
    ])
    supplier.value = sup as Supplier
    products.value = prods
  } catch {
    supplier.value = null
    products.value = []
  } finally {
    isLoading.value = false
  }
})

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function stockSeverity(stock: number): 'success' | 'danger' | 'warn' {
  if (stock <= 0) return 'danger'
  if (stock <= 10) return 'warn'
  return 'success'
}

function goToProduct(product: Product) {
  router.push({ name: 'product-detail', params: { id: product.id } })
}
</script>

<template>
  <div class="supplier-products-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          @click="router.push({ name: 'suppliers' })"
          v-tooltip="'Back to Suppliers'"
        />
        <div>
          <h1 v-if="supplier">{{ supplier.name }}</h1>
          <h1 v-else-if="isLoading">Loading...</h1>
          <h1 v-else>Supplier Not Found</h1>
          <p class="text-muted">Products supplied</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search products..." />
        </IconField>
      </div>
    </div>

    <!-- Summary cards -->
    <div v-if="!isLoading && supplier" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <div class="stat-label">Total Products</div>
        <div class="stat-value">{{ products.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Stock</div>
        <div class="stat-value tabular-nums">{{ totalStock.toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Inventory Value</div>
        <div class="stat-value tabular-nums">{{ formatCurrency(totalValue) }}</div>
      </div>
    </div>

    <!-- Products table -->
    <div class="products-content">
      <DataTable
        :value="filteredProducts"
        :loading="isLoading"
        stripedRows
        :paginator="filteredProducts.length > 15"
        :rows="15"
        :rowsPerPageOptions="[15, 30, 50]"
        sortField="name"
        :sortOrder="1"
        rowHover
        class="cursor-pointer"
        @row-click="(e: any) => goToProduct(e.data)"
      >
        <template #empty>
          <div class="text-center py-12 text-neutral-400">
            <i class="pi pi-box text-4xl mb-3 block"></i>
            <p class="m-0 font-semibold text-base">No products found</p>
            <p class="m-0 text-sm mt-1">This supplier has no active products</p>
          </div>
        </template>

        <Column field="sku" header="SKU" sortable style="width: 130px">
          <template #body="{ data }">
            <span class="font-mono text-xs text-neutral-500">{{ data.sku || '—' }}</span>
          </template>
        </Column>

        <Column field="barcode" header="Barcode" sortable style="width: 140px">
          <template #body="{ data }">
            <span class="font-mono text-xs text-neutral-500">{{ data.barcode || '—' }}</span>
          </template>
        </Column>

        <Column field="name" header="Product Name" sortable>
          <template #body="{ data }">
            <div>
              <span class="font-semibold text-neutral-800">{{ data.name }}</span>
              <p v-if="data.description" class="text-xs text-neutral-400 m-0 mt-0.5 truncate max-w-xs">{{ data.description }}</p>
            </div>
          </template>
        </Column>

        <Column field="price" header="Price" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="tabular-nums font-semibold text-neutral-800">{{ formatCurrency(data.price) }}</span>
          </template>
        </Column>

        <Column field="cost" header="Cost" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="tabular-nums text-neutral-600">{{ formatCurrency(data.cost || 0) }}</span>
          </template>
        </Column>

        <Column field="stock" header="Stock" sortable style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="String(data.stock ?? 0)"
              :severity="stockSeverity(data.stock ?? 0)"
              class="tabular-nums"
            />
          </template>
        </Column>

        <Column header="" style="width: 60px">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              severity="secondary"
              size="small"
              @click.stop="goToProduct(data)"
              v-tooltip="'View Product'"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.supplier-products-view {
  padding: 1.5rem;
}

.products-content {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.5rem;
}

.stat-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.25rem 1.5rem;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

@media (max-width: 767.98px) {
  .supplier-products-view {
    padding: 1rem;
  }
  .products-content {
    padding: 1rem;
  }
}
</style>
