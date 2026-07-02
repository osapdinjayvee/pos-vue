<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { DisplayBatch } from '@/types/inventory'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  batches: DisplayBatch[]
  variantName: string
  loading?: boolean
}>()

const emit = defineEmits<{
  add: []
  edit: [batch: DisplayBatch]
  delete: [batch: DisplayBatch]
  'add-stock': [batch: DisplayBatch]
}>()

const totalStock = computed(() => {
  return props.batches.reduce((sum, b) => sum + b.currentQuantity, 0)
})

function getExpiryStatus(batch: DisplayBatch): { label: string; severity: string } {
  if (!batch.expiryDate) {
    return { label: 'No Expiry', severity: 'secondary' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(batch.expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return { label: 'Expired', severity: 'danger' }
  }
  if (daysUntilExpiry === 0) {
    return { label: 'Expires Today', severity: 'danger' }
  }
  if (daysUntilExpiry <= 7) {
    return { label: `${daysUntilExpiry}d left`, severity: 'danger' }
  }
  if (daysUntilExpiry <= 30) {
    return { label: `${daysUntilExpiry}d left`, severity: 'warn' }
  }
  if (daysUntilExpiry <= 90) {
    return { label: `${daysUntilExpiry}d left`, severity: 'info' }
  }
  return { label: 'Good', severity: 'success' }
}

function getStockSeverity(quantity: number): string {
  if (quantity === 0) return 'danger'
  if (quantity <= 10) return 'warn'
  return 'success'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="batch-list">
    <div class="list-header">
      <div class="header-info">
        <h4>Batches</h4>
        <span class="variant-name">{{ variantName }}</span>
        <span class="total-stock">Total: <strong>{{ totalStock }}</strong></span>
      </div>
      <Button
        label="Add Batch"
        icon="pi pi-plus"
        size="small"
        @click="emit('add')"
        :disabled="loading"
      />
    </div>

    <DataTable
      :value="batches"
      :loading="loading"
      stripedRows
      size="small"
      class="batch-table"
      sortField="expiryDate"
      :sortOrder="1"
    >
      <Column field="batchNumber" header="Batch #" sortable>
        <template #body="{ data }">
          <span class="batch-number">{{ data.batchNumber }}</span>
        </template>
      </Column>

      <Column field="currentQuantity" header="Qty" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.currentQuantity.toString()"
            :severity="getStockSeverity(data.currentQuantity)"
          />
        </template>
      </Column>

      <Column field="expiryDate" header="Expiry" sortable>
        <template #body="{ data }">
          <div class="expiry-cell">
            <span>{{ formatDate(data.expiryDate) }}</span>
            <Tag
              :value="getExpiryStatus(data).label"
              :severity="getExpiryStatus(data).severity"
              class="expiry-tag"
            />
          </div>
        </template>
      </Column>

      <Column field="receivedDate" header="Received" sortable>
        <template #body="{ data }">
          <span class="date-cell">{{ formatDate(data.receivedDate) }}</span>
        </template>
      </Column>

      <Column field="supplierName" header="Supplier">
        <template #body="{ data }">
          <span class="supplier-cell">{{ data.supplierName || '-' }}</span>
        </template>
      </Column>

      <Column field="unitCost" header="Cost">
        <template #body="{ data }">
          <span v-if="data.unitCost" class="cost-cell">{{ formatCurrency(data.unitCost) }}</span>
          <span v-else class="cost-cell">-</span>
        </template>
      </Column>

      <Column header="Actions" headerStyle="width: 7rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-plus"
              text
              rounded
              severity="success"
              size="small"
              @click="emit('add-stock', data)"
              v-tooltip="'Add Stock'"
              :disabled="getExpiryStatus(data).label === 'Expired'"
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
              @click="emit('delete', data)"
              v-tooltip="'Delete'"
              :disabled="data.currentQuantity > 0"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No batches yet</p>
          <Button
            label="Add First Batch"
            icon="pi pi-plus"
            size="small"
            @click="emit('add')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-info h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.variant-name {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  padding: 0.25rem 0.5rem;
  background: var(--app-surface-100);
  border-radius: 4px;
}

.total-stock {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.total-stock strong {
  color: var(--p-text-color);
}

.batch-table {
  font-size: 0.875rem;
}

.batch-number {
  font-family: monospace;
  font-weight: 500;
}

.expiry-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.expiry-tag {
  font-size: 0.6875rem;
  width: fit-content;
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.supplier-cell {
  font-size: 0.8125rem;
}

.cost-cell {
  font-size: 0.8125rem;
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 1rem;
}
</style>
