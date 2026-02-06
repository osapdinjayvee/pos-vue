<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import type { PeriodComparisonData } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  data: PeriodComparisonData | null
  loading?: boolean
}>()

function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Period Comparison</h3>
      <span v-if="data" class="text-muted" style="font-size: 0.75rem;">{{ data.periodLabel }}</span>
    </div>

    <div v-if="loading" class="comparison-grid">
      <div v-for="i in 3" :key="i" class="comparison-item">
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="1.5rem" width="80%" class="mt-1" />
        <Skeleton height="0.875rem" width="50%" class="mt-1" />
      </div>
    </div>

    <div v-else-if="!data" class="comparison-empty">
      <p class="text-muted">No comparison data available</p>
    </div>

    <div v-else class="comparison-grid">
      <div class="comparison-item">
        <span class="comparison-label">Gross Sales</span>
        <span class="comparison-value">{{ formatCurrency(data.currentGross) }}</span>
        <span class="comparison-change" :class="data.grossChangePercent >= 0 ? 'positive' : 'negative'">
          <i :class="data.grossChangePercent >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size: 0.7rem;" />
          {{ formatChange(data.grossChangePercent) }}
        </span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Transactions</span>
        <span class="comparison-value">{{ data.currentTransactions.toLocaleString() }}</span>
        <span class="comparison-change" :class="data.transactionChangePercent >= 0 ? 'positive' : 'negative'">
          <i :class="data.transactionChangePercent >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size: 0.7rem;" />
          {{ formatChange(data.transactionChangePercent) }}
        </span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Avg. Ticket</span>
        <span class="comparison-value">{{ formatCurrency(data.currentAvgTicket) }}</span>
        <span class="comparison-change" :class="data.avgTicketChangePercent >= 0 ? 'positive' : 'negative'">
          <i :class="data.avgTicketChangePercent >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size: 0.7rem;" />
          {{ formatChange(data.avgTicketChangePercent) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  text-align: center;
}

.comparison-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.comparison-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}

.comparison-change {
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.comparison-change.positive {
  color: var(--p-green-600);
}

.comparison-change.negative {
  color: var(--p-red-600);
}

.comparison-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

@media (max-width: 640px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}
</style>
