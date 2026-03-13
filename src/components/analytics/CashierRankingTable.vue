<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { CashierMetrics } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  cashiers: CashierMetrics[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'select': [cashier: CashierMetrics]
}>()

function getVoidRateSeverity(rate: number): 'success' | 'warn' | 'danger' {
  if (rate < 2) return 'success'
  if (rate <= 5) return 'warn'
  return 'danger'
}

function onRowSelect(event: { data: CashierMetrics }) {
  emit('select', event.data)
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Cashier Rankings</h3>
    </div>
    <DataTable
      :value="cashiers"
      :loading="loading"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 20]"
      selectionMode="single"
      dataKey="userId"
      @row-select="onRowSelect"
      stripedRows
      removableSort
      :sortField="'totalSales'"
      :sortOrder="-1"
      tableStyle="width: 100%"
    >
      <Column header="#" style="width: 3rem;">
        <template #body="{ index }">
          <span class="rank-badge">{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="name" header="Cashier Name" sortable>
        <template #body="{ data }">
          <div class="cashier-name">
            <i class="pi pi-user" style="color: var(--p-primary-color); font-size: 0.875rem;" />
            <span>{{ data.name }}</span>
          </div>
        </template>
      </Column>

      <Column field="transactionCount" header="Transactions" sortable style="text-align: right;">
        <template #body="{ data }">
          {{ data.transactionCount.toLocaleString() }}
        </template>
      </Column>

      <Column field="totalSales" header="Total Sales" sortable style="text-align: right;">
        <template #body="{ data }">
          <span class="font-semibold">{{ formatCurrency(data.totalSales) }}</span>
        </template>
      </Column>

      <Column field="avgTransaction" header="Avg Transaction" sortable style="text-align: right;">
        <template #body="{ data }">
          {{ formatCurrency(data.avgTransaction) }}
        </template>
      </Column>

      <Column field="itemsPerTransaction" header="Items/Txn" sortable style="text-align: right;">
        <template #body="{ data }">
          {{ data.itemsPerTransaction.toFixed(1) }}
        </template>
      </Column>

      <Column field="voidRate" header="Void Rate" sortable style="text-align: center;">
        <template #body="{ data }">
          <Tag
            :value="`${data.voidRate.toFixed(1)}%`"
            :severity="getVoidRateSeverity(data.voidRate)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="empty-message">
          <i class="pi pi-users" style="font-size: 2rem; color: var(--p-surface-400);" />
          <p>No cashier data found for the selected period.</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--p-surface-100);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--p-text-color);
}

.cashier-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.font-semibold {
  font-weight: 600;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-message p {
  margin: 0;
}
</style>
