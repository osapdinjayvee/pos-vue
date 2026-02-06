<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { customerRepository } from '@/repositories/customerRepository'

interface InactiveCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  last_visit: string | null
  total_spent: number
}

const props = withDefaults(
  defineProps<{
    inactiveDays?: number
  }>(),
  {
    inactiveDays: 30
  }
)

const customers = ref<InactiveCustomer[]>([])
const loading = ref(false)

function formatCurrency(value: number): string {
  return '\u20B1' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  const visitDate = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - visitDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

async function loadData() {
  loading.value = true
  try {
    customers.value = await customerRepository.getInactive(props.inactiveDays)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.inactiveDays,
  () => {
    loadData()
  }
)

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="inactive-customers-card">
    <DataTable
      :value="customers"
      :loading="loading"
      stripedRows
      dataKey="id"
    >
      <Column field="name" header="Name" sortable />

      <Column field="phone" header="Phone">
        <template #body="{ data }">
          <span v-if="data.phone">{{ data.phone }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <Column field="email" header="Email">
        <template #body="{ data }">
          <span v-if="data.email">{{ data.email }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <Column field="last_visit" header="Last Visit" sortable>
        <template #body="{ data }">
          {{ daysAgo(data.last_visit) }}
        </template>
      </Column>

      <Column field="total_spent" header="Lifetime Spend" sortable>
        <template #body="{ data }">
          {{ formatCurrency(data.total_spent ?? 0) }}
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users" />
          <p>No inactive customers found</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.inactive-customers-card {
  overflow-x: auto;
}

.text-muted {
  color: var(--p-text-muted-color);
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
  margin-bottom: 0;
  font-size: 1rem;
}
</style>
