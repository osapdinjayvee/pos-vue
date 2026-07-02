<script setup lang="ts">
/**
 * ReportResultsTable Component (T047)
 * Dynamic DataTable that renders columns based on report result configuration.
 * Supports currency, percent, number, and date formatting with totals row.
 */
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'
import type { ReportResult } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  result: ReportResult | null
  loading?: boolean
}>()

/**
 * Format a cell value based on its column type.
 */
function formatCell(value: any, type: string): string {
  if (value == null || value === undefined) return '-'

  switch (type) {
    case 'currency':
      return formatCurrency(Number(value))
    case 'percent':
      return `${(Number(value) * 100).toFixed(1)}%`
    case 'number':
      return Number(value).toLocaleString()
    case 'date':
      return String(value)
    default:
      return String(value)
  }
}

/**
 * Get alignment class based on column type.
 */
function getAlignStyle(type: string): string {
  switch (type) {
    case 'currency':
    case 'number':
    case 'percent':
      return 'text-align: right;'
    default:
      return ''
  }
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Report Results</h3>
      <span v-if="result && result.data.length" class="results-count">
        {{ result.data.length }} row{{ result.data.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton-container">
      <Skeleton height="2rem" class="mb-2" />
      <Skeleton height="1.5rem" v-for="i in 8" :key="i" class="mb-1" />
    </div>

    <!-- Empty state when no result yet -->
    <div v-else-if="!result" class="empty-message">
      <i class="pi pi-chart-bar" style="font-size: 2.5rem; color: var(--app-surface-300);"></i>
      <p>Configure dimensions and measures, then click "Generate Report" to view results.</p>
    </div>

    <!-- Empty result set -->
    <div v-else-if="result.data.length === 0" class="empty-message">
      <i class="pi pi-info-circle" style="font-size: 2rem; color: var(--p-surface-400);"></i>
      <p>No data found for the selected criteria.</p>
    </div>

    <!-- Results table -->
    <DataTable
      v-else
      :value="result.data"
      :paginator="true"
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      stripedRows
      size="small"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      sortMode="single"
      removableSort
    >
      <template #empty>
        <div class="empty-message">
          <p>No data available</p>
        </div>
      </template>

      <Column
        v-for="col in result.columns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable !== false"
        :style="getAlignStyle(col.type)"
      >
        <template #body="{ data }">
          <span
            :class="{
              'numeric-cell': ['currency', 'number', 'percent'].includes(col.type),
              'text-positive': col.type === 'currency' && Number(data[col.field]) > 0 && col.field === 'profit',
              'text-negative': col.type === 'currency' && Number(data[col.field]) < 0 && col.field === 'profit'
            }"
          >
            {{ formatCell(data[col.field], col.type) }}
          </span>
        </template>

        <!-- Footer totals -->
        <template #footer v-if="result.totals && result.totals[col.field] !== undefined">
          <span class="total-cell numeric-cell">
            {{ formatCell(result.totals[col.field], col.type) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.skeleton-container {
  padding: 1rem 0;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.results-count {
  font-size: 0.8125rem;
  color: var(--p-surface-500);
  font-weight: 500;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  color: var(--p-surface-500);
  text-align: center;
}

.empty-message p {
  margin: 0;
  font-size: 0.9375rem;
  max-width: 400px;
}

.numeric-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.total-cell {
  font-weight: 700;
  color: var(--p-surface-900);
}

.text-positive {
  color: #10b981;
}

.text-negative {
  color: #ef4444;
}
</style>
