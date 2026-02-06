<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import type { ReorderSuggestion } from '@/types/analytics'

defineProps<{
  suggestions: ReorderSuggestion[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'create-stock-in': [suggestion: ReorderSuggestion]
}>()

function getStockSeverity(current: number, reorder: number): 'danger' | 'warn' | 'success' {
  if (current === 0) return 'danger'
  if (current <= reorder / 2) return 'danger'
  if (current <= reorder) return 'warn'
  return 'success'
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Reorder Suggestions</h3>
      <Tag v-if="!loading" :value="`${suggestions.length} items`" severity="info" />
    </div>

    <div v-if="loading" class="skeleton-container">
      <Skeleton height="2rem" class="mb-2" />
      <Skeleton height="1.5rem" v-for="i in 5" :key="i" class="mb-1" />
    </div>

    <DataTable
      v-else
      :value="suggestions"
      :paginator="suggestions.length > 10"
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      stripedRows
      size="small"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    >
      <template #empty>
        <div class="empty-message">
          <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500);"></i>
          <p>All products are well-stocked</p>
        </div>
      </template>

      <Column field="productName" header="Product" sortable>
        <template #body="{ data }">
          <span class="product-name-cell">{{ data.productName }}</span>
        </template>
      </Column>

      <Column field="currentStock" header="Current Stock" sortable style="width: 120px; text-align: right;">
        <template #body="{ data }">
          <Tag
            :value="data.currentStock.toString()"
            :severity="getStockSeverity(data.currentStock, data.reorderPoint)"
          />
        </template>
      </Column>

      <Column field="reorderPoint" header="Reorder Point" sortable style="width: 120px; text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell">{{ data.reorderPoint }}</span>
        </template>
      </Column>

      <Column field="suggestedQty" header="Suggested Qty" sortable style="width: 120px; text-align: right;">
        <template #body="{ data }">
          <span class="numeric-cell suggested-qty">{{ data.suggestedQty }}</span>
        </template>
      </Column>

      <Column field="supplierName" header="Supplier" sortable style="width: 150px;">
        <template #body="{ data }">
          <span class="text-muted">{{ data.supplierName || 'No supplier' }}</span>
        </template>
      </Column>

      <Column header="Action" style="width: 100px; text-align: center;">
        <template #body="{ data }">
          <Button
            label="Stock In"
            icon="pi pi-plus"
            size="small"
            severity="success"
            text
            @click="emit('create-stock-in', data)"
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

.suggested-qty {
  font-weight: 600;
  color: var(--p-primary-color);
}
</style>
