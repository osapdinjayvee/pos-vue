<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { Supplier } from '@/types/inventory'
import { supplierRepository } from '@/repositories/supplierRepository'

const props = defineProps<{
  search?: string
}>()

const emit = defineEmits<{
  add: []
  edit: [supplier: Supplier]
  delete: [supplier: Supplier]
  'view-products': [supplier: Supplier]
}>()

const suppliers = ref<Supplier[]>([])
const loading = ref(false)

const filteredSuppliers = computed(() => {
  if (!props.search?.trim()) {
    return suppliers.value
  }
  const query = props.search.toLowerCase()
  return suppliers.value.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.contact_person?.toLowerCase().includes(query) ||
    s.email?.toLowerCase().includes(query) ||
    s.phone?.includes(query)
  )
})

onMounted(async () => {
  await loadSuppliers()
})

async function loadSuppliers() {
  loading.value = true
  try {
    suppliers.value = await supplierRepository.getAll()
  } finally {
    loading.value = false
  }
}

async function handleDelete(supplier: Supplier) {
  emit('delete', supplier)
}

function getStatusSeverity(isActive: boolean): string {
  return isActive ? 'success' : 'secondary'
}

defineExpose({ loadSuppliers })
</script>

<template>
  <div class="supplier-list">
    <DataTable
      :value="filteredSuppliers"
      :loading="loading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      class="supplier-table"
      dataKey="id"
    >
      <Column field="name" header="Supplier Name" sortable>
        <template #body="{ data }">
          <div class="supplier-cell">
            <span class="supplier-name">{{ data.name }}</span>
          </div>
        </template>
      </Column>

      <Column field="contact_person" header="Contact" sortable>
        <template #body="{ data }">
          <span class="contact-cell">{{ data.contact_person || '-' }}</span>
        </template>
      </Column>

      <Column field="email" header="Email">
        <template #body="{ data }">
          <a v-if="data.email" :href="`mailto:${data.email}`" class="email-link">
            {{ data.email }}
          </a>
          <span v-else class="empty-cell">-</span>
        </template>
      </Column>

      <Column field="phone" header="Phone">
        <template #body="{ data }">
          <a v-if="data.phone" :href="`tel:${data.phone}`" class="phone-link">
            {{ data.phone }}
          </a>
          <span v-else class="empty-cell">-</span>
        </template>
      </Column>

      <Column field="is_active" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.is_active ? 'Active' : 'Inactive'"
            :severity="getStatusSeverity(data.is_active)"
          />
        </template>
      </Column>

      <Column header="Actions" headerStyle="width: 10rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-box"
              text
              rounded
              severity="info"
              size="small"
              @click="emit('view-products', data)"
              v-tooltip="'View Products'"
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
          <p>No suppliers found</p>
          <Button
            label="Add First Supplier"
            icon="pi pi-plus"
            @click="emit('add')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.supplier-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.supplier-table {
  font-size: 0.875rem;
}

.supplier-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.supplier-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.contact-cell {
  color: var(--p-text-color);
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
