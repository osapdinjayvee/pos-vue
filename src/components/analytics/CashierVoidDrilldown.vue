<script setup lang="ts">
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { CashierVoidDetail, CashierMetrics } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

const props = defineProps<{
  visible: boolean
  cashier: CashierMetrics | null
  voidDetails: CashierVoidDetail[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function onHide() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    :header="`${cashier?.name || 'Cashier'} - Void Details`"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @hide="onHide"
  >
    <!-- Summary Stats -->
    <div v-if="cashier" class="void-summary">
      <div class="void-stat">
        <span class="void-stat-label">Total Voids</span>
        <span class="void-stat-value">{{ cashier.voidCount }}</span>
      </div>
      <div class="void-stat">
        <span class="void-stat-label">Total Void Amount</span>
        <span class="void-stat-value void-amount">{{ formatCurrency(cashier.voidAmount) }}</span>
      </div>
      <div class="void-stat">
        <span class="void-stat-label">Void Rate</span>
        <Tag
          :value="`${cashier.voidRate.toFixed(1)}%`"
          :severity="cashier.voidRate < 2 ? 'success' : cashier.voidRate <= 5 ? 'warn' : 'danger'"
          class="void-rate-tag"
        />
      </div>
    </div>

    <!-- Void Details Table -->
    <DataTable
      :value="voidDetails"
      :loading="loading"
      :paginator="voidDetails.length > 10"
      :rows="10"
      stripedRows
      tableStyle="min-width: 30rem"
    >
      <Column field="date" header="Date" sortable>
        <template #body="{ data }">
          {{ formatDate(data.date) }}
        </template>
      </Column>

      <Column field="orNumber" header="OR#" sortable>
        <template #body="{ data }">
          <span class="or-number">{{ data.orNumber || '-' }}</span>
        </template>
      </Column>

      <Column field="items" header="Items" sortable style="text-align: center;">
        <template #body="{ data }">
          {{ data.items }}
        </template>
      </Column>

      <Column field="amount" header="Amount" sortable style="text-align: right;">
        <template #body="{ data }">
          <span class="font-semibold">{{ formatCurrency(data.amount) }}</span>
        </template>
      </Column>

      <Column field="reason" header="Reason" style="min-width: 10rem;">
        <template #body="{ data }">
          <span class="void-reason">{{ data.reason }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="empty-message">
          <p>No void transactions found.</p>
        </div>
      </template>
    </DataTable>
  </Dialog>
</template>

<style scoped>
.void-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.void-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
}

.void-stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.void-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.void-stat-value.void-amount {
  color: var(--p-red-600);
}

.void-rate-tag {
  margin-top: 0.25rem;
}

.or-number {
  font-family: monospace;
  font-size: 0.875rem;
}

.font-semibold {
  font-weight: 600;
}

.void-reason {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-message p {
  margin: 0;
}

@media (max-width: 575px) {
  .void-summary {
    grid-template-columns: 1fr;
  }
}
</style>
