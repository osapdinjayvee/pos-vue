<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import type { ExpiryItem } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  items: ExpiryItem[]
  loading?: boolean
}>()

function getExpirySeverity(days: number): 'danger' | 'warn' | 'info' | 'success' {
  if (days < 0) return 'danger'
  if (days < 7) return 'warn'
  if (days < 30) return 'info'
  return 'success'
}

function getExpiryLabel(days: number): string {
  if (days < 0) return `Expired (${Math.abs(days)}d ago)`
  if (days === 0) return 'Expires today'
  return `${days} day${days !== 1 ? 's' : ''}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Expiring Products</h3>
      <Tag v-if="!loading" :value="`${items.length} items`" severity="warn" />
    </div>

    <div v-if="loading" class="skeleton-container">
      <Skeleton height="2rem" class="mb-2" />
      <Skeleton height="1.5rem" v-for="i in 5" :key="i" class="mb-1" />
    </div>

    <DataTable
      v-else
      :value="items"
      :paginator="items.length > 10"
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      stripedRows
      size="small"
      sortField="daysUntilExpiry"
      :sortOrder="1"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    >
      <template #empty>
        <div class="empty-message">
          <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500);"></i>
          <p>No products expiring soon</p>
        </div>
      </template>

      <Column field="productName" header="Product" sortable>
        <template #body="{ data }">
          <span class="product-name-cell">{{ data.productName }}</span>
        </template>
      </Column>

      <Column field="batchNumber" header="Batch" sortable style="width: 120px;">
        <template #body="{ data }">
          <span class="text-muted">{{ data.batchNumber || '-' }}</span>
        </template>
      </Column>

      <Column field="expiryDate" header="Expiry Date" sortable style="width: 130px;">
        <template #body="{ data }">
          <span class="numeric-cell">{{ formatDate(data.expiryDate) }}</span>
        </template>
      </Column>

      <Column field="daysUntilExpiry" header="Days Until Expiry" sortable style="width: 150px; text-align: center;">
        <template #body="{ data }">
          <Tag
            :value="getExpiryLabel(data.daysUntilExpiry)"
            :severity="getExpirySeverity(data.daysUntilExpiry)"
          />
        </template>
      </Column>

      <Column field="quantity" header="Qty" sortable style="width: 80px; text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell">{{ data.quantity.toLocaleString() }}</span>
        </template>
      </Column>

      <Column field="estimatedWasteValue" header="Est. Waste Value" sortable style="width: 140px; text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell text-negative">{{ formatCurrency(data.estimatedWasteValue) }}</span>
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

.text-negative {
  color: #ef4444;
}
</style>
