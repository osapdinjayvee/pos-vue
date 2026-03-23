<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { DisplayUser } from '@/types/user'

const props = defineProps<{
  users: DisplayUser[]
  loading?: boolean
  search?: string
}>()

const emit = defineEmits<{
  add: []
  edit: [user: DisplayUser]
  deactivate: [user: DisplayUser]
  reactivate: [user: DisplayUser]
  'reset-pin': [user: DisplayUser]
}>()

const filteredUsers = computed(() => {
  if (!props.search?.trim()) {
    return props.users
  }

  const query = props.search.toLowerCase()
  return props.users.filter(
    (user) =>
      user.username.toLowerCase().includes(query) ||
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
  )
})

function getRoleSeverity(role: string): string {
  const roleSeverities: Record<string, string> = {
    admin: 'danger',
    administrator: 'danger',
    supervisor: 'warn',
    cashier: 'info'
  }
  return roleSeverities[role.toLowerCase()] || 'secondary'
}

function getStatusSeverity(isActive: boolean): string {
  return isActive ? 'success' : 'secondary'
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString('en-PH', {
    dateStyle: 'medium'
  })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString('en-PH', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}
</script>

<template>
  <div class="user-list">
    <!-- Data Table -->
    <DataTable
      :value="filteredUsers"
      :loading="loading"
      :paginator="true"
      :rows="10"
      :rows-per-page-options="[10, 20, 50]"
      data-key="id"
      striped-rows
      removable-sort
      scrollable
      scroll-height="flex"
      class="table-container users-table"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users"></i>
          <h3>No Users Found</h3>
          <p v-if="search">No users match your search criteria.</p>
          <p v-else>Get started by adding your first user.</p>
          <Button v-if="!search" label="Add First User" icon="pi pi-plus" @click="emit('add')" />
        </div>
      </template>

      <!-- Username -->
      <Column field="username" header="Username" sortable style="min-width: 150px">
        <template #body="{ data }">
          <span class="username">{{ data.username }}</span>
        </template>
      </Column>

      <!-- Full Name -->
      <Column field="fullName" header="Name" sortable style="min-width: 180px">
        <template #body="{ data }">
          <div class="user-name">
            <span class="name-text">{{ data.fullName }}</span>
            <span v-if="data.email" class="email-text">{{ data.email }}</span>
          </div>
        </template>
      </Column>

      <!-- Role -->
      <Column field="roles" header="Role" style="min-width: 120px">
        <template #body="{ data }">
          <div class="role-tags">
            <Tag
              v-for="role in data.roles"
              :key="role.id"
              :value="role.name"
              :severity="getRoleSeverity(role.code)"
            />
          </div>
        </template>
      </Column>

      <!-- Status -->
      <Column field="isActive" header="Status" sortable style="width: 100px">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? 'Active' : 'Inactive'"
            :severity="getStatusSeverity(data.isActive)"
          />
        </template>
      </Column>

      <!-- Last Login -->
      <Column field="lastLoginAt" header="Last Login" sortable style="min-width: 150px">
        <template #body="{ data }">
          <span class="last-login">{{ formatDateTime(data.lastLoginAt) }}</span>
        </template>
      </Column>

      <!-- Actions -->
      <Column header="Actions" style="width: 150px" :exportable="false">
        <template #body="{ data }">
          <div class="table-actions">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Edit'"
              @click="emit('edit', data)"
            />
            <Button
              icon="pi pi-key"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Reset PIN'"
              @click="emit('reset-pin', data)"
            />
            <Button
              v-if="data.isActive"
              icon="pi pi-ban"
              text
              rounded
              severity="danger"
              v-tooltip.top="'Deactivate'"
              @click="emit('deactivate', data)"
            />
            <Button
              v-else
              icon="pi pi-check-circle"
              text
              rounded
              severity="success"
              v-tooltip.top="'Reactivate'"
              @click="emit('reactivate', data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
}

.users-table {
  max-width: 100%;
}

.username {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 500;
}

.user-name {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.name-text {
  font-weight: 500;
  color: var(--p-text-color);
}

.email-text {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.last-login {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

</style>
