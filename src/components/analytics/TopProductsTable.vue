<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'
import type { TopProductItem } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  products: TopProductItem[]
  loading?: boolean
}>()
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Top Products</h3>
    </div>

    <div v-if="loading" class="skeleton-container">
      <Skeleton height="2rem" class="mb-2" />
      <Skeleton height="1.5rem" v-for="i in 5" :key="i" class="mb-1" />
    </div>

    <DataTable
      v-else
      :value="products"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      stripedRows
      size="small"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    >
      <template #empty>
        <div class="empty-message">
          <i class="pi pi-box" style="font-size: 2rem; color: var(--app-surface-300);"></i>
          <p>No product data available</p>
        </div>
      </template>

      <Column field="rank" header="#" style="width: 60px" sortable>
        <template #body="{ data }">
          <span class="rank-badge">{{ data.rank }}</span>
        </template>
      </Column>

      <Column field="productName" header="Product Name" sortable>
        <template #body="{ data }">
          <span class="product-name-cell">{{ data.productName }}</span>
        </template>
      </Column>

      <Column field="categoryName" header="Category" sortable>
        <template #body="{ data }">
          <span class="text-muted">{{ data.categoryName }}</span>
        </template>
      </Column>

      <Column field="unitsSold" header="Units Sold" sortable style="text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell">{{ data.unitsSold.toLocaleString() }}</span>
        </template>
      </Column>

      <Column field="revenue" header="Revenue" sortable style="text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell">{{ formatCurrency(data.revenue) }}</span>
        </template>
      </Column>

      <Column field="profit" header="Profit" sortable style="text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell" :class="{ 'text-positive': data.profit > 0, 'text-negative': data.profit < 0 }">
            {{ formatCurrency(data.profit) }}
          </span>
        </template>
      </Column>

      <Column field="profitMargin" header="Margin %" sortable style="text-align: right; width: 100px;">
        <template #body="{ data }">
          <span class="numeric-cell" :class="{ 'text-positive': data.profitMargin > 0, 'text-negative': data.profitMargin < 0 }">
            {{ data.profitMargin.toFixed(1) }}%
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.skeleton-container {
  padding: 1rem 0;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--p-surface-500);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--app-surface-100);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--p-surface-600);
}

.product-name-cell {
  font-weight: 500;
  color: var(--p-surface-800);
}

.text-muted {
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.numeric-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.text-positive {
  color: #10b981;
}

.text-negative {
  color: #ef4444;
}
</style>
