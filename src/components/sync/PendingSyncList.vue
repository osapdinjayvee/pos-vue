<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { SyncQueue } from '@/types/sync'

const props = defineProps<{
  items: SyncQueue[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'retry': [item: SyncQueue]
  'retry-all': []
  'clear-completed': []
  'delete': [item: SyncQueue]
}>()

function statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | undefined {
  switch (status) {
    case 'completed': return 'success'
    case 'syncing': return 'info'
    case 'pending': return 'warn'
    case 'failed': return 'danger'
    default: return undefined
  }
}

function entityIcon(type: string): string {
  switch (type) {
    case 'transaction': return 'pi pi-shopping-cart'
    case 'void': return 'pi pi-ban'
    case 'refund': return 'pi pi-replay'
    case 'stock_movement': return 'pi pi-box'
    default: return 'pi pi-circle'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString()
}

const hasFailedItems = computed(() => props.items.some((i) => i.status === 'failed'))
const hasCompletedItems = computed(() => props.items.some((i) => i.status === 'completed'))
</script>

<template>
  <DataTable
    :value="items"
    :loading="loading"
    paginator
    :rows="20"
    :rowsPerPageOptions="[10, 20, 50]"
    stripedRows
    size="small"
    sortField="created_at"
    :sortOrder="-1"
  >
    <template #header>
      <div class="list-header">
        <span>Sync Queue ({{ items.length }} items)</span>
        <div class="list-actions">
          <Button
            v-if="hasFailedItems"
            label="Retry All Failed"
            icon="pi pi-refresh"
            severity="warn"
            size="small"
            outlined
            @click="emit('retry-all')"
          />
          <Button
            v-if="hasCompletedItems"
            label="Clear Completed"
            icon="pi pi-trash"
            severity="secondary"
            size="small"
            outlined
            @click="emit('clear-completed')"
          />
        </div>
      </div>
    </template>

    <template #empty>
      <div class="empty-state">
        <i class="pi pi-cloud-upload" style="font-size: 2rem; color: var(--p-text-muted-color)"></i>
        <p>No items in the sync queue</p>
      </div>
    </template>

    <Column field="entity_type" header="Type" :sortable="true" style="width: 120px">
      <template #body="{ data }">
        <div class="entity-type">
          <i :class="entityIcon(data.entity_type)"></i>
          <span>{{ data.entity_type }}</span>
        </div>
      </template>
    </Column>

    <Column field="entity_id" header="Entity ID" :sortable="true" style="width: 200px">
      <template #body="{ data }">
        <code class="entity-id">{{ data.entity_id.substring(0, 16) }}...</code>
      </template>
    </Column>

    <Column field="operation" header="Op" :sortable="true" style="width: 80px" />

    <Column field="status" header="Status" :sortable="true" style="width: 140px">
      <template #body="{ data }">
        <div class="status-tags">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
          <Tag v-if="data.last_error?.startsWith('server_rejected:')" value="Rejected" severity="danger" />
        </div>
      </template>
    </Column>

    <Column field="attempts" header="Attempts" :sortable="true" style="width: 90px" />

    <Column field="last_error" header="Last Error" style="min-width: 200px">
      <template #body="{ data }">
        <span v-if="data.last_error" class="error-text">{{ data.last_error }}</span>
        <span v-else class="no-error">-</span>
      </template>
    </Column>

    <Column field="created_at" header="Created" :sortable="true" style="width: 160px">
      <template #body="{ data }">
        {{ formatDate(data.created_at) }}
      </template>
    </Column>

    <Column header="Actions" style="width: 100px">
      <template #body="{ data }">
        <div class="row-actions">
          <Button
            v-if="data.status === 'failed'"
            icon="pi pi-refresh"
            severity="warn"
            text
            rounded
            size="small"
            v-tooltip="'Retry'"
            @click="emit('retry', data)"
          />
          <Button
            v-if="data.status === 'completed' || data.status === 'failed'"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            v-tooltip="'Delete'"
            @click="emit('delete', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
}

.entity-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.entity-id {
  font-size: 0.75rem;
  background: var(--app-surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.status-tags {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.error-text {
  color: var(--p-red-500);
  font-size: 0.8125rem;
}

.no-error {
  color: var(--p-text-muted-color);
}

.row-actions {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
}
</style>
