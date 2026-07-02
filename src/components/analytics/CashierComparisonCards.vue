<script setup lang="ts">
import type { CashierMetrics } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  selectedCashier: CashierMetrics | null
  teamAvg: { avgSales: number; avgTransactions: number; avgVoidRate: number } | null
}>()

function getDiffClass(individual: number, team: number, lowerIsBetter: boolean = false): string {
  if (lowerIsBetter) {
    return individual <= team ? 'indicator-positive' : 'indicator-negative'
  }
  return individual >= team ? 'indicator-positive' : 'indicator-negative'
}

function getDiffIcon(individual: number, team: number, lowerIsBetter: boolean = false): string {
  if (lowerIsBetter) {
    return individual <= team ? 'pi pi-arrow-down' : 'pi pi-arrow-up'
  }
  return individual >= team ? 'pi pi-arrow-up' : 'pi pi-arrow-down'
}

function formatDiff(individual: number, team: number): string {
  if (team === 0) return '-'
  const diff = ((individual - team) / team) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}%`
}
</script>

<template>
  <div v-if="selectedCashier && teamAvg" class="comparison-cards">
    <div class="chart-card-header" style="grid-column: 1 / -1;">
      <h3 class="chart-card-title">{{ selectedCashier.name }} vs Team Average</h3>
    </div>

    <!-- Avg Sales Card -->
    <div class="comparison-card">
      <div class="comparison-card-header">
        <i class="pi pi-dollar" style="color: var(--p-green-600);" />
        <span class="comparison-card-title">Avg Sales</span>
      </div>
      <div class="comparison-values">
        <div class="comparison-row">
          <span class="comparison-label">Individual</span>
          <span class="comparison-value">{{ formatCurrency(selectedCashier.totalSales) }}</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Team Avg</span>
          <span class="comparison-value team-value">{{ formatCurrency(teamAvg.avgSales) }}</span>
        </div>
      </div>
      <div
        class="comparison-indicator"
        :class="getDiffClass(selectedCashier.totalSales, teamAvg.avgSales)"
      >
        <i :class="getDiffIcon(selectedCashier.totalSales, teamAvg.avgSales)" style="font-size: 0.75rem;" />
        <span>{{ formatDiff(selectedCashier.totalSales, teamAvg.avgSales) }} vs team</span>
      </div>
    </div>

    <!-- Avg Transactions Card -->
    <div class="comparison-card">
      <div class="comparison-card-header">
        <i class="pi pi-receipt" style="color: var(--p-blue-600);" />
        <span class="comparison-card-title">Transactions</span>
      </div>
      <div class="comparison-values">
        <div class="comparison-row">
          <span class="comparison-label">Individual</span>
          <span class="comparison-value">{{ selectedCashier.transactionCount.toLocaleString() }}</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Team Avg</span>
          <span class="comparison-value team-value">{{ teamAvg.avgTransactions.toFixed(0) }}</span>
        </div>
      </div>
      <div
        class="comparison-indicator"
        :class="getDiffClass(selectedCashier.transactionCount, teamAvg.avgTransactions)"
      >
        <i :class="getDiffIcon(selectedCashier.transactionCount, teamAvg.avgTransactions)" style="font-size: 0.75rem;" />
        <span>{{ formatDiff(selectedCashier.transactionCount, teamAvg.avgTransactions) }} vs team</span>
      </div>
    </div>

    <!-- Avg Void Rate Card -->
    <div class="comparison-card">
      <div class="comparison-card-header">
        <i class="pi pi-ban" style="color: var(--p-red-600);" />
        <span class="comparison-card-title">Void Rate</span>
      </div>
      <div class="comparison-values">
        <div class="comparison-row">
          <span class="comparison-label">Individual</span>
          <span class="comparison-value">{{ selectedCashier.voidRate.toFixed(1) }}%</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Team Avg</span>
          <span class="comparison-value team-value">{{ teamAvg.avgVoidRate.toFixed(1) }}%</span>
        </div>
      </div>
      <div
        class="comparison-indicator"
        :class="getDiffClass(selectedCashier.voidRate, teamAvg.avgVoidRate, true)"
      >
        <i :class="getDiffIcon(selectedCashier.voidRate, teamAvg.avgVoidRate, true)" style="font-size: 0.75rem;" />
        <span>{{ formatDiff(selectedCashier.voidRate, teamAvg.avgVoidRate) }} vs team</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
}

.comparison-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.comparison-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.comparison-card-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.comparison-values {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.comparison-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.comparison-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.comparison-value.team-value {
  font-weight: 500;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.comparison-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  padding-top: 0.5rem;
  border-top: 1px solid var(--app-surface-200);
}

.comparison-indicator.indicator-positive {
  color: var(--p-green-600);
}

.comparison-indicator.indicator-negative {
  color: var(--p-red-600);
}

@media (max-width: 768px) {
  .comparison-cards {
    grid-template-columns: 1fr;
  }
}
</style>
