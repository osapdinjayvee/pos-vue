<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import type { SlowMoverItem } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  products: SlowMoverItem[]
  loading?: boolean
}>()

function getDaysSeverity(days: number): 'danger' | 'warn' | 'info' {
  if (days > 60) return 'danger'
  if (days > 30) return 'warn'
  return 'info'
}

function formatLastSold(date: string | null): string {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Slow-Moving Products</h3>
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
      sortField="daysSinceLastSale"
      :sortOrder="-1"
    >
      <template #empty>
        <div class="empty-message">
          <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-400);"></i>
          <p>No slow-moving products detected</p>
        </div>
      </template>

      <Column field="productName" header="Product" sortable>
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

      <Column field="lastSoldDate" header="Last Sold" sortable>
        <template #body="{ data }">
          <span class="text-muted">{{ formatLastSold(data.lastSoldDate) }}</span>
        </template>
      </Column>

      <Column field="daysSinceLastSale" header="Days Since Sale" sortable style="text-align: center; width: 140px;">
        <template #body="{ data }">
          <Tag
            :value="data.daysSinceLastSale >= 999 ? 'Never' : `${data.daysSinceLastSale}d`"
            :severity="getDaysSeverity(data.daysSinceLastSale)"
          />
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
</style>
