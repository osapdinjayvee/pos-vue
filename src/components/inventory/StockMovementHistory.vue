<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { useInventory } from '@/composables/useInventory'
import type { DisplayStockMovement, MovementType } from '@/types/inventory'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  variantId?: string
  limit?: number
}>()

const emit = defineEmits<{
  'view-all': []
}>()

const { getMovementHistory, isLoading } = useInventory()

const movements = ref<DisplayStockMovement[]>([])

const movementTypeSeverity: Record<MovementType, string> = {
  receive: 'success',
  sale: 'info',
  adjustment: 'warn',
  transfer_in: 'success',
  transfer_out: 'info',
  return: 'secondary',
  void: 'danger',
  void_restore: 'success'
}

async function loadMovements() {
  if (props.variantId) {
    movements.value = await getMovementHistory(props.variantId, { limit: props.limit || 10 })
  } else {
    // Get all recent movements when no variantId specified
    movements.value = await getMovementHistory(undefined, { limit: props.limit || 50 })
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatQuantity(quantity: number): string {
  if (quantity > 0) return `+${quantity}`
  return quantity.toString()
}

function getQuantityClass(quantity: number): string {
  return quantity > 0 ? 'positive' : 'negative'
}

onMounted(loadMovements)

watch(() => props.variantId, loadMovements)

defineExpose({ refresh: loadMovements })
</script>

<template>
  <div class="movement-history">
    <div class="history-header">
      <h4>Stock Movement History</h4>
      <Button
        v-if="movements.length >= (limit || 10)"
        label="View All"
        text
        size="small"
        @click="emit('view-all')"
      />
    </div>

    <DataTable
      :value="movements"
      :loading="isLoading"
      stripedRows
      size="small"
      paginator
      :rows="5"
      :pageLinkSize="3"
      class="movement-table"
    >
      <Column field="createdAt" header="Date">
        <template #body="{ data }">
          <span class="date-cell">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>

      <Column field="movementType" header="Type">
        <template #body="{ data }">
          <Tag
            :value="data.movementTypeLabel"
            :severity="movementTypeSeverity[data.movementType as MovementType]"
          />
        </template>
      </Column>

      <Column field="quantity" header="Qty">
        <template #body="{ data }">
          <span :class="['quantity-cell', getQuantityClass(data.quantity)]">
            {{ formatQuantity(data.quantity) }}
          </span>
        </template>
      </Column>

      <Column field="unitCost" header="Cost">
        <template #body="{ data }">
          <span v-if="data.unitCost !== null">{{ formatCurrency(data.unitCost) }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <Column field="reason" header="Notes">
        <template #body="{ data }">
          <span v-if="data.reason" class="reason-cell">{{ data.reason }}</span>
          <span v-else-if="data.batchNumber" class="batch-cell">Batch: {{ data.batchNumber }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No movement history</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.movement-history {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.movement-table {
  font-size: 0.875rem;
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.quantity-cell {
  font-weight: 600;
}

.quantity-cell.positive {
  color: var(--p-green-600);
}

.quantity-cell.negative {
  color: var(--p-red-600);
}

.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-cell {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}

.text-muted {
  color: var(--p-text-muted-color);
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
</style>
