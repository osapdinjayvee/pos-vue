<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import db from '@/db/database'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  dateFrom: string
  dateTo: string
}>()

interface RecentTransaction {
  id: string
  or_number: string
  total_amount: number
  status: string
  created_at: string
}

const transactions = ref<RecentTransaction[]>([])

async function loadData() {
  // Include sales (completed), voids, and refunds/returns (separate table) so the
  // widget reflects all transaction activity, not just completed sales.
  const rows = await db.query<RecentTransaction>(
    `SELECT id, or_number, total_amount, status, created_at FROM (
       SELECT t.id, t.or_number, t.total_amount, t.status, t.created_at
       FROM transactions t
       WHERE date(t.created_at) >= ? AND date(t.created_at) <= ?
       UNION ALL
       SELECT r.id, r.refund_or_number AS or_number, -r.total_refund_amount AS total_amount,
              'refunded' AS status, r.created_at
       FROM refunds r
       WHERE date(r.created_at) >= ? AND date(r.created_at) <= ?
     )
     ORDER BY created_at DESC
     LIMIT 10`,
    [props.dateFrom, props.dateTo, props.dateFrom, props.dateTo]
  )
  transactions.value = rows
}

function getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
  switch (status) {
    case 'completed': return 'success'
    case 'voided': return 'danger'
    case 'refunded': return 'warn'
    default: return 'info'
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadData)
watch(() => [props.dateFrom, props.dateTo], loadData)
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Recent Transactions</h3>
    </div>
    <DataTable
      v-if="transactions.length"
      :value="transactions"
      :rows="5"
      paginator
      :rowsPerPageOptions="[5, 10]"
      stripedRows
    >
      <Column field="or_number" header="OR #" sortable />
      <Column field="total_amount" header="Amount" sortable>
        <template #body="{ data }">
          {{ formatCurrency(data.total_amount) }}
        </template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="created_at" header="Time" sortable>
        <template #body="{ data }">
          {{ formatTime(data.created_at) }}
        </template>
      </Column>
    </DataTable>
    <div v-else style="padding:2rem;text-align:center;color:var(--p-text-muted-color)">
      No transactions for this period
    </div>
  </div>
</template>
