<script setup lang="ts">
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import type { BranchSummary } from '@/types/sync'

defineProps<{
  summary: BranchSummary
}>()

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString()
}
</script>

<template>
  <Card class="branch-card">
    <template #header>
      <div class="card-header">
        <div class="branch-name">
          <strong>{{ summary.branch_name }}</strong>
          <span class="branch-code">{{ summary.branch_code }}</span>
        </div>
        <Tag
          :value="summary.is_online ? 'Online' : 'Offline'"
          :severity="summary.is_online ? 'success' : 'danger'"
        />
      </div>
    </template>
    <template #content>
      <div class="metrics">
        <div class="metric">
          <span class="metric-label">Today's Sales</span>
          <span class="metric-value">{{ formatCurrency(summary.today_sales) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Transactions</span>
          <span class="metric-value">{{ summary.today_transactions }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Ticket</span>
          <span class="metric-value">{{ formatCurrency(summary.today_average_ticket) }}</span>
        </div>
      </div>
      <div class="sync-info">
        <span class="sync-label">Last sync: {{ formatLastSync(summary.last_sync) }}</span>
        <Tag
          v-if="summary.pending_sync_count > 0"
          :value="`${summary.pending_sync_count} pending`"
          severity="warn"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.branch-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem 0;
}

.branch-name {
  display: flex;
  flex-direction: column;
}

.branch-code {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 600;
}

.sync-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--app-surface-200);
}

.sync-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
</style>
