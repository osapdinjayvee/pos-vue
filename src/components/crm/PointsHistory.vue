<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useLoyalty } from '@/composables/useLoyalty'
import type { LoyaltyTransaction, LoyaltyTransactionType } from '@/types/loyalty'
import { LoyaltyTransactionTypeLabels } from '@/types/loyalty'

const props = defineProps<{
  customerId: string
}>()

const { getPointsHistory, isLoading } = useLoyalty()

const history = ref<LoyaltyTransaction[]>([])
const loading = ref(false)

const typeSeverityMap: Record<LoyaltyTransactionType, string> = {
  earn: 'success',
  redeem: 'info',
  expire: 'warn',
  adjustment: 'secondary'
}

async function loadHistory() {
  loading.value = true
  try {
    history.value = await getPointsHistory(props.customerId)
  } catch (e) {
    console.error('Failed to load points history:', e)
    history.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatPoints(transaction: LoyaltyTransaction): string {
  const pts = transaction.points
  if (transaction.type === 'earn' || transaction.type === 'adjustment') {
    return pts > 0 ? `+${pts}` : pts.toString()
  }
  if (transaction.type === 'redeem' || transaction.type === 'expire') {
    return pts < 0 ? pts.toString() : `-${pts}`
  }
  return pts > 0 ? `+${pts}` : pts.toString()
}

function getPointsClass(transaction: LoyaltyTransaction): string {
  const pts = transaction.points
  if (transaction.type === 'redeem' || transaction.type === 'expire') {
    return 'points-negative'
  }
  return pts >= 0 ? 'points-positive' : 'points-negative'
}

onMounted(() => {
  loadHistory()
})

watch(() => props.customerId, () => {
  loadHistory()
})

defineExpose({ loadHistory })
</script>

<template>
  <div class="points-history">
    <DataTable
      :value="history"
      :loading="loading || isLoading"
      dataKey="id"
      stripedRows
      paginator
      :rows="10"
      :rowsPerPageOptions="[10, 20]"
      sortField="created_at"
      :sortOrder="-1"
      class="points-table"
    >
      <Column field="created_at" header="Date" sortable>
        <template #body="{ data }">
          <span class="date-cell">{{ formatDate(data.created_at) }}</span>
        </template>
      </Column>

      <Column field="type" header="Type" sortable>
        <template #body="{ data }">
          <Tag
            :value="LoyaltyTransactionTypeLabels[data.type as LoyaltyTransactionType]"
            :severity="typeSeverityMap[data.type as LoyaltyTransactionType]"
          />
        </template>
      </Column>

      <Column field="points" header="Points" sortable>
        <template #body="{ data }">
          <span :class="['points-cell', getPointsClass(data)]">
            {{ formatPoints(data) }}
          </span>
        </template>
      </Column>

      <Column field="balance_after" header="Balance After" sortable>
        <template #body="{ data }">
          <span class="balance-cell">{{ data.balance_after }}</span>
        </template>
      </Column>

      <Column field="reason" header="Reason">
        <template #body="{ data }">
          <span v-if="data.reason" class="reason-cell">{{ data.reason }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <Column field="transaction_id" header="Transaction">
        <template #body="{ data }">
          <span v-if="data.transaction_id" class="transaction-link">
            {{ data.transaction_id }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-star" />
          <p>No loyalty activity yet</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.points-history {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.points-table {
  font-size: 0.875rem;
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.points-cell {
  font-weight: 600;
}

.points-cell.points-positive {
  color: var(--p-green-600);
}

.points-cell.points-negative {
  color: var(--p-red-600);
}

.balance-cell {
  font-weight: 600;
  color: var(--p-text-color);
}

.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-link {
  font-weight: 600;
  color: var(--p-primary-color);
  font-size: 0.8125rem;
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
  margin: 0;
  font-size: 1rem;
}
</style>
