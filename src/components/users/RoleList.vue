<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { DisplayRole } from '@/types/user'

const props = defineProps<{
  roles: DisplayRole[]
  loading?: boolean
  search?: string
}>()

const emit = defineEmits<{
  add: []
  edit: [role: DisplayRole]
  delete: [role: DisplayRole]
  duplicate: [role: DisplayRole]
}>()

const filteredRoles = computed(() => {
  if (!props.search?.trim()) {
    return props.roles
  }

  const query = props.search.toLowerCase()
  return props.roles.filter(
    (role) =>
      role.name.toLowerCase().includes(query) ||
      role.code.toLowerCase().includes(query) ||
      role.description.toLowerCase().includes(query)
  )
})

function getPermissionCount(role: DisplayRole): string {
  if (role.permissions.includes('*')) {
    return 'All Permissions'
  }

  const count = role.permissions.length
  return `${count} permission${count !== 1 ? 's' : ''}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PH', {
    dateStyle: 'medium'
  })
}
</script>

<template>
  <div class="role-list">
    <!-- Data Table -->
    <DataTable
      :value="filteredRoles"
      :loading="loading"
      :paginator="true"
      :rows="10"
      :rows-per-page-options="[10, 20, 50]"
      data-key="id"
      striped-rows
      removable-sort
      class="roles-table"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-shield"></i>
          <h3>No Roles Found</h3>
          <p v-if="search">No roles match your search criteria.</p>
          <p v-else>Get started by adding your first custom role.</p>
          <Button v-if="!search" label="Add First Role" icon="pi pi-plus" @click="emit('add')" />
        </div>
      </template>

      <!-- Name -->
      <Column field="name" header="Role" sortable style="min-width: 180px">
        <template #body="{ data }">
          <div class="role-info">
            <span class="role-name">{{ data.name }}</span>
            <span class="role-code">{{ data.code }}</span>
          </div>
        </template>
      </Column>

      <!-- Description -->
      <Column field="description" header="Description" style="min-width: 250px">
        <template #body="{ data }">
          <span class="role-description">{{ data.description || 'No description' }}</span>
        </template>
      </Column>

      <!-- Permissions -->
      <Column field="permissions" header="Permissions" style="min-width: 150px">
        <template #body="{ data }">
          <Tag
            :value="getPermissionCount(data)"
            :severity="data.permissions.includes('*') ? 'danger' : 'info'"
          />
        </template>
      </Column>

      <!-- Type -->
      <Column field="isDefault" header="Type" style="width: 100px">
        <template #body="{ data }">
          <Tag
            :value="data.isDefault ? 'Default' : 'Custom'"
            :severity="data.isDefault ? 'secondary' : 'success'"
          />
        </template>
      </Column>

      <!-- Status -->
      <Column field="isActive" header="Status" style="width: 100px">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? 'Active' : 'Inactive'"
            :severity="data.isActive ? 'success' : 'secondary'"
          />
        </template>
      </Column>

      <!-- Actions -->
      <Column header="Actions" style="width: 130px" :exportable="false">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Edit'"
              @click="emit('edit', data)"
            />
            <Button
              icon="pi pi-copy"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Duplicate'"
              @click="emit('duplicate', data)"
            />
            <Button
              v-if="!data.isDefault"
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              v-tooltip.top="'Delete'"
              @click="emit('delete', data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.role-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.roles-table {
  background: var(--p-surface-0);
  border-radius: 12px;
  overflow: hidden;
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.role-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.role-code {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.role-description {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-state i {
  font-size: 3rem;
  color: var(--p-text-muted-color);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: var(--p-text-muted-color);
}
</style>
