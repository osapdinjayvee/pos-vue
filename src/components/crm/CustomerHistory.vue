<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataTable, { type DataTableRowClickEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useCustomers } from '@/composables/useCustomers'
import type { OrderStatus } from '@/types/order'

interface HistoryRow {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  total: number
  created_at: string
  item_count: number
}

const props = defineProps<{
  customerId: string
}>()

const emit = defineEmits<{
  'view-transaction': [orderId: string]
}>()

const { fetchCustomerHistory } = useCustomers()

const transactions = ref<HistoryRow[]>([])
const loading = ref(false)

function getStatusSeverity(status: OrderStatus): string {
  switch (status) {
    case 'completed':
      return 'success'
    case 'void':
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'warn'
    default:
      return 'secondary'
  }
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    void: 'Void'
  }
  return labels[status] || status
}

function formatCurrency(value: number): string {
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function onRowClick(event: DataTableRowClickEvent) {
  const row = event.data as HistoryRow
  emit('view-transaction', row.id)
}

async function loadHistory() {
  loading.value = true
  try {
    const rows = await fetchCustomerHistory(props.customerId)
    transactions.value = rows as HistoryRow[]
  } catch (e) {
    console.error('Failed to load customer history:', e)
    transactions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHistory()
})

watch(() => props.customerId, () => {
  loadHistory()
})

defineExpose({ loadHistory })
</script>

<template>
  <div class="customer-history">
    <DataTable
      :value="transactions"
      :loading="loading"
      dataKey="id"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20]"
      sortField="created_at"
      :sortOrder="-1"
      class="history-table"
      @row-click="onRowClick"
    >
      <Column field="created_at" header="Date" sortable>
        <template #body="{ data }">
          <span class="date-cell">{{ formatDate(data.created_at) }}</span>
        </template>
      </Column>

      <Column field="order_number" header="OR#" sortable>
        <template #body="{ data }">
          <span class="order-number-cell">{{ data.order_number }}</span>
        </template>
      </Column>

      <Column field="item_count" header="Items" sortable>
        <template #body="{ data }">
          <span class="items-cell">{{ data.item_count }}</span>
        </template>
      </Column>

      <Column field="total" header="Total" sortable>
        <template #body="{ data }">
          <span class="total-cell">{{ formatCurrency(data.total) }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="getStatusLabel(data.status)"
            :severity="getStatusSeverity(data.status)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-shopping-bag" />
          <p>No purchases yet</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.customer-history {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-table {
  font-size: 0.875rem;
}

.history-table :deep(.p-datatable-row-action) {
  cursor: pointer;
}

.history-table :deep(tr.p-datatable-row) {
  cursor: pointer;
}

.date-cell {
  color: var(--p-text-color);
}

.order-number-cell {
  font-weight: 600;
  color: var(--p-primary-color);
}

.items-cell {
  color: var(--p-text-color);
  text-align: center;
}

.total-cell {
  font-weight: 600;
  color: var(--p-text-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
</style>
