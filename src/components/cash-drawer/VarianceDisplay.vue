<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import type { ExpectedCashBreakdown } from '@/types/cashDrawer'

interface Props {
  expectedCash: number
  actualCash: number
  threshold?: number
  breakdown?: ExpectedCashBreakdown | null
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 100,
  breakdown: null
})

const variance = computed(() => props.actualCash - props.expectedCash)

const variancePercentage = computed(() => {
  if (props.expectedCash === 0) return 0
  return (variance.value / props.expectedCash) * 100
})

const varianceStatus = computed(() => {
  const absVariance = Math.abs(variance.value)
  return absVariance <= props.threshold ? 'balanced' : 'unbalanced'
})

const varianceLabel = computed(() => {
  if (variance.value > 0) return 'Over'
  if (variance.value < 0) return 'Short'
  return 'Balanced'
})

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}
</script>

<template>
  <Card class="variance-card">
    <template #title>Cash Variance</template>
    <template #content>
      <div class="variance-summary">
        <div class="summary-item">
          <div class="label">Expected Cash</div>
          <div class="amount">{{ formatCurrency(expectedCash) }}</div>
        </div>

        <div class="summary-item">
          <div class="label">Actual Cash</div>
          <div class="amount">{{ formatCurrency(actualCash) }}</div>
        </div>

        <div class="summary-item variance-item">
          <div class="label">Variance ({{ varianceLabel }})</div>
          <div
            class="amount variance-amount"
            :class="varianceStatus"
          >
            {{ formatCurrency(variance) }}
          </div>
        </div>

        <div class="summary-item">
          <div class="label">Variance Percentage</div>
          <div
            class="amount percentage"
            :class="varianceStatus"
          >
            {{ variancePercentage.toFixed(2) }}%
          </div>
        </div>
      </div>

      <div v-if="breakdown" class="breakdown-section">
        <h4 class="breakdown-title">Expected Cash Breakdown</h4>
        <div class="breakdown-items">
          <div class="breakdown-item">
            <span class="breakdown-label">Opening Amount</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.openingAmount) }}</span>
          </div>

          <div class="breakdown-item positive">
            <span class="breakdown-label">+ Cash Sales</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.cashSales) }}</span>
          </div>

          <div class="breakdown-item negative">
            <span class="breakdown-label">- Cash Refunds</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.cashRefunds) }}</span>
          </div>

          <div v-if="breakdown.refundDetails && breakdown.refundDetails.length > 0" class="refund-details">
            <div
              v-for="(refund, idx) in breakdown.refundDetails"
              :key="idx"
              class="refund-detail-item"
            >
              <span class="refund-or">{{ refund.orNumber }}</span>
              <span class="refund-amount">-{{ formatCurrency(refund.amount) }}</span>
              <span class="refund-time">{{ formatTime(refund.createdAt) }}</span>
            </div>
          </div>

          <div class="breakdown-item negative">
            <span class="breakdown-label">- Cash Drops</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.totalDrops) }}</span>
          </div>

          <div class="breakdown-item positive">
            <span class="breakdown-label">+ Cash Paid-Ins</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.totalPaidIns) }}</span>
          </div>

          <div class="breakdown-item total">
            <span class="breakdown-label">= Expected Cash</span>
            <span class="breakdown-value">{{ formatCurrency(breakdown.expectedCash) }}</span>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.variance-card {
  width: 100%;
}

.variance-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.variance-item {
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
}

.variance-amount {
  font-weight: 700;
}

.variance-amount.balanced,
.percentage.balanced {
  color: var(--green-600);
}

.variance-amount.unbalanced,
.percentage.unbalanced {
  color: var(--red-600);
}

.breakdown-section {
  border-top: 1px solid var(--surface-border);
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}

.breakdown-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1rem;
}

.breakdown-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.breakdown-item.positive .breakdown-label {
  color: var(--green-600);
}

.breakdown-item.negative .breakdown-label {
  color: var(--red-600);
}

.breakdown-item.total {
  border-top: 2px solid var(--surface-border);
  padding-top: 1rem;
  margin-top: 0.5rem;
  font-weight: 600;
}

.breakdown-label {
  font-size: 0.9375rem;
  color: var(--text-color-secondary);
}

.breakdown-item.total .breakdown-label,
.breakdown-item.total .breakdown-value {
  font-size: 1.125rem;
  color: var(--text-color);
  font-weight: 700;
}

.breakdown-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-color);
}

.refund-details {
  margin-left: 1.5rem;
  padding: 0.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.refund-detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
  padding: 0.25rem 0.5rem;
  background: var(--surface-50);
  border-radius: 4px;
}

.refund-or {
  font-weight: 600;
  color: var(--red-600);
  min-width: 100px;
}

.refund-amount {
  font-weight: 600;
  color: var(--red-600);
  min-width: 80px;
  text-align: right;
}

.refund-time {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

@media (max-width: 768px) {
  .variance-summary {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .amount {
    font-size: 1.25rem;
  }
}
</style>
