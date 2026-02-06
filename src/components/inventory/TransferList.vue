<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import type { DisplayStockMovement } from '@/types/inventory'
import { toDisplayStockMovement } from '@/types/inventory'

const props = defineProps<{
  search?: string
  dateRange?: Date[] | null
}>()

const emit = defineEmits<{
  'new-transfer': []
}>()

interface TransferRecord {
  id: string
  reference: string
  fromVariantName: string
  toVariantName: string
  quantity: number
  notes: string
  createdAt: string
  createdBy: string
}

const transfers = ref<TransferRecord[]>([])
const loading = ref(false)

const filteredTransfers = computed(() => {
  let result = transfers.value

  if (props.search?.trim()) {
    const query = props.search.toLowerCase()
    result = result.filter(t =>
      t.reference.toLowerCase().includes(query) ||
      t.fromVariantName.toLowerCase().includes(query) ||
      t.toVariantName.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query)
    )
  }

  if (props.dateRange && props.dateRange.length === 2) {
    const startDate = props.dateRange[0]
    const endDate = props.dateRange[1]
    if (startDate && endDate) {
      result = result.filter(t => {
        const date = new Date(t.createdAt)
        return date >= startDate && date <= endDate
      })
    }
  }

  return result
})

onMounted(async () => {
  await loadTransfers()
})

async function loadTransfers() {
  loading.value = true
  try {
    // Get all transfer_out movements and pair with transfer_in
    const movements = await stockMovementRepository.getAll()
    const transferOuts = movements.filter(m => m.movement_type === 'transfer_out')

    const transferRecords: TransferRecord[] = []

    for (const out of transferOuts) {
      // Find matching transfer_in with same reference_id
      const inMovement = movements.find(m =>
        m.movement_type === 'transfer_in' &&
        m.reference_id === out.reference_id
      )

      if (inMovement) {
        const outDisplay = toDisplayStockMovement(out)
        const inDisplay = toDisplayStockMovement(inMovement)

        transferRecords.push({
          id: out.id,
          reference: out.reference_id || `TRF-${out.id.slice(0, 8)}`,
          fromVariantName: outDisplay.variantName || 'Unknown',
          toVariantName: inDisplay.variantName || 'Unknown',
          quantity: Math.abs(out.quantity),
          notes: out.reason || '',
          createdAt: out.created_at,
          createdBy: out.user_id || 'System'
        })
      }
    }

    // Sort by date descending
    transferRecords.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    transfers.value = transferRecords
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

defineExpose({ loadTransfers })
</script>

<template>
  <div class="transfer-list">
    <DataTable
      :value="filteredTransfers"
      :loading="loading"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20, 50]"
      class="transfer-table"
      dataKey="id"
      sortField="createdAt"
      :sortOrder="-1"
    >
      <Column field="reference" header="Reference" sortable>
        <template #body="{ data }">
          <span class="reference-cell">{{ data.reference }}</span>
        </template>
      </Column>

      <Column field="fromVariantName" header="From" sortable>
        <template #body="{ data }">
          <div class="variant-cell">
            <i class="pi pi-sign-out out-icon" />
            <span>{{ data.fromVariantName }}</span>
          </div>
        </template>
      </Column>

      <Column field="toVariantName" header="To" sortable>
        <template #body="{ data }">
          <div class="variant-cell">
            <i class="pi pi-sign-in in-icon" />
            <span>{{ data.toVariantName }}</span>
          </div>
        </template>
      </Column>

      <Column field="quantity" header="Qty" sortable>
        <template #body="{ data }">
          <Tag :value="data.quantity.toString()" severity="info" />
        </template>
      </Column>

      <Column field="createdAt" header="Date" sortable>
        <template #body="{ data }">
          <span class="date-cell">{{ formatDate(data.createdAt) }}</span>
        </template>
      </Column>

      <Column field="notes" header="Notes">
        <template #body="{ data }">
          <span class="notes-cell" :title="data.notes">
            {{ data.notes || '-' }}
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-arrow-right-arrow-left" />
          <p>No transfers found</p>
          <Button
            label="Create First Transfer"
            icon="pi pi-plus"
            @click="emit('new-transfer')"
          />
        </div>
      </template>
    </DataTable>

    <div class="summary-bar">
      <span class="summary-text">
        Showing {{ filteredTransfers.length }} of {{ transfers.length }} transfers
      </span>
    </div>
  </div>
</template>

<style scoped>
.transfer-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transfer-table {
  font-size: 0.875rem;
}

.reference-cell {
  font-family: monospace;
  font-weight: 500;
  color: var(--p-primary-color);
}

.variant-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.out-icon {
  color: var(--p-red-500);
  font-size: 0.875rem;
}

.in-icon {
  color: var(--p-green-500);
  font-size: 0.875rem;
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.notes-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
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
  margin-bottom: 1rem;
  font-size: 1rem;
}

.summary-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
}

.summary-text {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
</style>
