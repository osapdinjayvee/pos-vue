<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import type { DisplayXReading } from '@/types/xReading'
import {
  formatCurrency,
  formatXCounter,
  formatORRange,
  getSyncStatusLabel,
  getSyncStatusSeverity
} from '@/utils/reportFormatter'

const props = defineProps<{
  reading: DisplayXReading
}>()

const formattedCounter = computed(() => formatXCounter(props.reading.xCounter))
const formattedORRange = computed(() =>
  formatORRange(props.reading.beginningOR, props.reading.endingOR)
)
</script>

<template>
  <div class="xreading-display">
    <div class="report-header-section">
      <div class="report-title">
        <h2>X-Reading Report</h2>
        <Tag :value="getSyncStatusLabel(reading.syncStatus)" :severity="getSyncStatusSeverity(reading.syncStatus)" />
      </div>
      <div class="report-meta">
        <span class="counter">{{ formattedCounter }}</span>
        <span class="separator">|</span>
        <span>{{ reading.formattedDate }} {{ reading.formattedTime }}</span>
      </div>
    </div>

    <Divider />

    <div class="report-info-grid">
      <div class="info-item">
        <span class="label">Terminal ID</span>
        <span class="value">{{ reading.terminalId }}</span>
      </div>
      <div class="info-item">
        <span class="label">Cashier</span>
        <span class="value">{{ reading.cashierName || reading.cashierId }}</span>
      </div>
      <div class="info-item">
        <span class="label">OR Number Range</span>
        <span class="value">{{ formattedORRange }}</span>
      </div>
    </div>

    <Divider />

    <div class="report-section">
      <h3>Sales Summary</h3>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="label">Gross Sales</span>
          <span class="value amount">{{ formatCurrency(reading.grossSales) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Less: Discounts</span>
          <span class="value amount negative">{{ formatCurrency(reading.discountTotal) }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">Net Sales</span>
          <span class="value amount">{{ formatCurrency(reading.netSales) }}</span>
        </div>
      </div>
    </div>

    <Divider />

    <div class="report-section">
      <h3>VAT Breakdown</h3>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="label">VATable Sales</span>
          <span class="value amount">{{ formatCurrency(reading.vatableSales) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">VAT Amount (12%)</span>
          <span class="value amount">{{ formatCurrency(reading.vatAmount) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">VAT-Exempt Sales</span>
          <span class="value amount">{{ formatCurrency(reading.vatExemptSales) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Zero-Rated Sales</span>
          <span class="value amount">{{ formatCurrency(reading.zeroRatedSales) }}</span>
        </div>
      </div>
    </div>

    <Divider />

    <div class="report-section">
      <h3>Transaction Summary</h3>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="label">Transaction Count</span>
          <span class="value">{{ reading.transactionCount }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Void Count</span>
          <span class="value">{{ reading.voidCount }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Void Amount</span>
          <span class="value amount">{{ formatCurrency(reading.voidAmount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.xreading-display {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  padding: 1.5rem;
}

.report-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.report-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.report-title h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-surface-900);
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.report-meta .counter {
  font-weight: 600;
  color: var(--p-surface-700);
}

.report-meta .separator {
  color: var(--p-surface-300);
}

.report-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item .value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-surface-800);
}

.report-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-surface-700);
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.summary-row .label {
  font-size: 0.875rem;
  color: var(--p-surface-600);
}

.summary-row .value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-surface-800);
}

.summary-row .value.amount {
  font-family: 'JetBrains Mono', monospace;
}

.summary-row .value.negative {
  color: var(--p-red-500);
}

.summary-row.total {
  border-top: 2px solid var(--p-surface-200);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.summary-row.total .label {
  font-weight: 700;
  color: var(--p-surface-900);
}

.summary-row.total .value {
  font-weight: 700;
  font-size: 1rem;
  color: var(--p-surface-900);
}

@media (max-width: 767.98px) {
  .xreading-display {
    padding: 1rem;
  }

  .report-header-section {
    flex-direction: column;
  }

  .report-info-grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  .xreading-display {
    border: none;
    box-shadow: none;
    padding: 0;
  }
}
</style>
