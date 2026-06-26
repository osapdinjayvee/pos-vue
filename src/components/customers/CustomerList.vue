<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Customer, CustomerType } from '@/types/order'
import { CustomerTypeLabels } from '@/types/order'
import { customerRepository } from '@/repositories/customerRepository'

const props = defineProps<{
  search?: string
}>()

const emit = defineEmits<{
  add: []
  edit: [customer: Customer]
  delete: [customer: Customer]
  view: [customer: Customer]
  pay: [customer: Customer]
}>()

const customers = ref<Customer[]>([])
const loading = ref(false)

const filteredCustomers = computed(() => {
  if (!props.search?.trim()) {
    return customers.value
  }
  const query = props.search.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.email?.toLowerCase().includes(query) ||
    c.phone?.includes(query) ||
    c.customer_type.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  await loadCustomers()
})

async function loadCustomers() {
  loading.value = true
  try {
    customers.value = await customerRepository.findAll({ orderBy: 'name', orderDir: 'ASC' })
  } finally {
    loading.value = false
  }
}

function handleDelete(customer: Customer) {
  emit('delete', customer)
}

function getTypeSeverity(type: CustomerType): string {
  switch (type) {
    case 'retail': return 'info'
    case 'wholesale': return 'warn'
    case 'vip': return 'success'
    default: return 'secondary'
  }
}

function getStatusSeverity(isActive: number): string {
  return isActive === 1 ? 'success' : 'danger'
}

function formatCurrency(value: number): string {
  return '\u20B1' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-PH')
}

defineExpose({ loadCustomers })
</script>

<template>
  <div class="customer-list">
    <DataTable
      :value="filteredCustomers"
      :loading="loading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      class="customer-table"
      dataKey="id"
    >
      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <div class="customer-cell">
            <span class="customer-name">{{ data.name }}</span>
          </div>
        </template>
      </Column>

      <Column header="Contact">
        <template #body="{ data }">
          <div class="contact-cell">
            <a v-if="data.email" :href="`mailto:${data.email}`" class="email-link">
              {{ data.email }}
            </a>
            <span v-else class="empty-cell">-</span>
            <a v-if="data.phone" :href="`tel:${data.phone}`" class="phone-link">
              {{ data.phone }}
            </a>
            <span v-else class="empty-cell">-</span>
          </div>
        </template>
      </Column>

      <Column field="customer_type" header="Type" sortable>
        <template #body="{ data }">
          <Tag
            :value="CustomerTypeLabels[data.customer_type as CustomerType]"
            :severity="getTypeSeverity(data.customer_type)"
          />
        </template>
      </Column>

      <Column field="is_active" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.is_active === 1 ? 'Active' : 'Inactive'"
            :severity="getStatusSeverity(data.is_active)"
          />
        </template>
      </Column>

      <Column field="loyalty_points" header="Points" sortable>
        <template #body="{ data }">
          <span class="points-cell">{{ formatNumber(data.loyalty_points) }}</span>
        </template>
      </Column>

      <Column field="current_balance" header="Balance" sortable>
        <template #body="{ data }">
          <span class="balance-cell">{{ formatCurrency(data.current_balance) }}</span>
        </template>
      </Column>

      <Column header="Actions" headerStyle="width: 10rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              v-if="data.current_balance > 0"
              icon="pi pi-wallet"
              text
              rounded
              severity="warn"
              size="small"
              @click="emit('pay', data)"
              v-tooltip="'Receive Payment'"
            />
            <Button
              icon="pi pi-eye"
              text
              rounded
              severity="info"
              size="small"
              @click="emit('view', data)"
              v-tooltip="'View'"
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
              @click="handleDelete(data)"
              v-tooltip="'Delete'"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users" />
          <p>No customers found</p>
          <Button
            label="Add First Customer"
            icon="pi pi-plus"
            @click="emit('add')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.customer-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.customer-table {
  font-size: 0.875rem;
}

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.customer-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.contact-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.email-link,
.phone-link {
  color: var(--p-primary-color);
  text-decoration: none;
}

.email-link:hover,
.phone-link:hover {
  text-decoration: underline;
}

.empty-cell {
  color: var(--p-text-muted-color);
}

.points-cell {
  color: var(--p-text-color);
}

.balance-cell {
  color: var(--p-text-color);
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
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin-bottom: 1rem;
  font-size: 1rem;
}
</style>
