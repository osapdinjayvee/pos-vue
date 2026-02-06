<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { customerRepository } from '@/repositories/customerRepository'

interface TopCustomerRow {
  id: string
  name: string
  tier_id: string | null
  customer_type: string
  order_count: number
  total_spent: number
  avg_ticket: number
  last_visit: string | null
}

interface Props {
  dateRange?: { start: string; end: string }
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10
})

const customers = ref<TopCustomerRow[]>([])
const loading = ref(false)

function formatCurrency(value: number): string {
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }

  return date.toISOString().slice(0, 10)
}

function getTierSeverity(tierId: string | null): string {
  if (!tierId) return 'secondary'

  const lower = tierId.toLowerCase()
  if (lower.includes('platinum')) return 'success'
  if (lower.includes('gold')) return 'warn'
  if (lower.includes('silver')) return 'info'
  return 'secondary'
}

function getTierLabel(tierId: string | null): string {
  if (!tierId) return 'No Tier'
  // Capitalize the tier id as a display label
  return tierId.charAt(0).toUpperCase() + tierId.slice(1)
}

async function loadData() {
  loading.value = true
  try {
    const rows = await customerRepository.getTopBySpend(props.limit, props.dateRange)
    customers.value = rows as TopCustomerRow[]
  } catch (e) {
    console.error('Failed to load top customers:', e)
    customers.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(
  () => [props.dateRange, props.limit],
  () => {
    loadData()
  },
  { deep: true }
)
</script>

<template>
  <div class="top-customers-wrapper">
    <DataTable
      :value="customers"
      :loading="loading"
      dataKey="id"
      stripedRows
      sortField="total_spent"
      :sortOrder="-1"
      class="top-customers-table"
    >
      <Column header="#" style="width: 3rem">
        <template #body="{ index }">
          <span class="rank-cell">{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <span class="name-cell">{{ data.name }}</span>
        </template>
      </Column>

      <Column field="tier_id" header="Tier" sortable>
        <template #body="{ data }">
          <Tag
            :value="getTierLabel(data.tier_id)"
            :severity="getTierSeverity(data.tier_id)"
            rounded
          />
        </template>
      </Column>

      <Column field="total_spent" header="Total Spent" sortable>
        <template #body="{ data }">
          <span class="currency-cell">{{ formatCurrency(data.total_spent) }}</span>
        </template>
      </Column>

      <Column field="order_count" header="Transactions" sortable>
        <template #body="{ data }">
          <span class="count-cell">{{ data.order_count }}</span>
        </template>
      </Column>

      <Column field="avg_ticket" header="Avg Ticket" sortable>
        <template #body="{ data }">
          <span class="currency-cell">{{ formatCurrency(data.avg_ticket) }}</span>
        </template>
      </Column>

      <Column field="last_visit" header="Last Visit" sortable>
        <template #body="{ data }">
          <span class="date-cell">{{ formatRelativeDate(data.last_visit) }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users" />
          <p>No customer data found</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.top-customers-wrapper {
  overflow-x: auto;
}

.top-customers-table {
  font-size: 0.875rem;
}

.rank-cell {
  font-weight: 700;
  color: var(--p-text-muted-color);
}

.name-cell {
  font-weight: 600;
  color: var(--p-text-color);
}

.currency-cell {
  font-weight: 600;
  color: var(--p-text-color);
  white-space: nowrap;
}

.count-cell {
  color: var(--p-text-color);
  text-align: center;
}

.date-cell {
  color: var(--p-text-muted-color);
  white-space: nowrap;
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

@media (max-width: 768px) {
  .top-customers-card {
    padding: 1rem;
  }

  .top-customers-header {
    margin-bottom: 1rem;
  }

  .top-customers-title {
    font-size: 1rem;
  }
}
</style>
