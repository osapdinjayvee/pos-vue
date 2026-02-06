<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import { formatCurrency, formatDateMedium, formatDateRange } from '@/utils/reportFormatter'
import { toCSV, downloadCSV } from '@/utils/reportFormatter'
import type { SalesAggregate } from '@/types/report'

const router = useRouter()
const toast = useToast()

const periodOptions = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

const selectedPeriod = ref('week')
const customDateFrom = ref<Date | null>(null)
const customDateTo = ref<Date | null>(null)
const isLoading = ref(false)

const aggregates = ref<SalesAggregate[]>([])
const summary = ref<{
  totalGross: number
  totalNet: number
  totalVAT: number
  totalTransactions: number
  totalVoids: number
  totalRefunds: number
  averageDaily: number
} | null>(null)

const dateRange = computed(() => {
  const { start, end } = getDateRange()
  return formatDateRange(start, end)
})

const summaryCards = computed(() => {
  if (!summary.value) return []
  return [
    {
      label: 'Total Gross Sales',
      value: formatCurrency(summary.value.totalGross),
      icon: 'pi pi-dollar',
      color: 'blue'
    },
    {
      label: 'Total Net Sales',
      value: formatCurrency(summary.value.totalNet),
      icon: 'pi pi-chart-line',
      color: 'green'
    },
    {
      label: 'Total VAT',
      value: formatCurrency(summary.value.totalVAT),
      icon: 'pi pi-percentage',
      color: 'purple'
    },
    {
      label: 'Total Transactions',
      value: String(summary.value.totalTransactions),
      icon: 'pi pi-receipt',
      color: 'orange'
    },
    {
      label: 'Daily Average',
      value: formatCurrency(summary.value.averageDaily),
      icon: 'pi pi-chart-bar',
      color: 'cyan'
    }
  ]
})

function getDateRange(): { start: string; end: string } {
  const now = new Date()

  if (selectedPeriod.value === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now.getFullYear(), now.getMonth(), diff)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  if (selectedPeriod.value === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // Custom
  return {
    start: customDateFrom.value?.toISOString().split('T')[0] || now.toISOString().split('T')[0],
    end: customDateTo.value?.toISOString().split('T')[0] || now.toISOString().split('T')[0]
  }
}

onMounted(() => {
  loadSummary()
})

watch([selectedPeriod, customDateFrom, customDateTo], () => {
  if (selectedPeriod.value !== 'custom' || (customDateFrom.value && customDateTo.value)) {
    loadSummary()
  }
})

async function loadSummary() {
  isLoading.value = true
  const { start, end } = getDateRange()

  try {
    aggregates.value = await salesAggregateRepository.getForPeriod('branch-main', start, end)
    summary.value = await salesAggregateRepository.getSummary('branch-main', start, end)
  } catch (e: any) {
    console.error('Error loading sales summary:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load sales summary',
      life: 5000
    })
  } finally {
    isLoading.value = false
  }
}

function handleExportCSV() {
  if (aggregates.value.length === 0) return

  const csv = toCSV(aggregates.value as unknown as Record<string, unknown>[], [
    { key: 'date', header: 'Date' },
    { key: 'gross_sales', header: 'Gross Sales', formatter: (v) => String(v) },
    { key: 'discount_total', header: 'Discounts', formatter: (v) => String(v) },
    { key: 'net_sales', header: 'Net Sales', formatter: (v) => String(v) },
    { key: 'vat_amount', header: 'VAT', formatter: (v) => String(v) },
    { key: 'transaction_count', header: 'Transactions' },
    { key: 'average_ticket', header: 'Avg Ticket', formatter: (v) => String(v) },
    { key: 'void_count', header: 'Voids' },
    { key: 'refund_count', header: 'Refunds' }
  ])

  const { start, end } = getDateRange()
  downloadCSV(csv, `sales-summary-${start}-to-${end}`)
  toast.add({
    severity: 'info',
    summary: 'Export',
    detail: 'Sales summary exported to CSV',
    life: 2000
  })
}

function goBack() {
  router.push('/reports')
}
</script>

<template>
  <div class="summary-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div>
          <h1>Sales Summary</h1>
          <p class="text-muted">{{ dateRange }}</p>
        </div>
      </div>
      <div class="header-actions">
        <SelectButton v-model="selectedPeriod" :options="periodOptions" optionLabel="label" optionValue="value" />
        <template v-if="selectedPeriod === 'custom'">
          <DatePicker v-model="customDateFrom" placeholder="From" dateFormat="yy-mm-dd" showIcon :maxDate="new Date()" />
          <DatePicker v-model="customDateTo" placeholder="To" dateFormat="yy-mm-dd" showIcon :maxDate="new Date()" />
        </template>
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :disabled="aggregates.length === 0"
          @click="handleExportCSV"
        />
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <ProgressSpinner />
      <p>Loading sales summary...</p>
    </div>

    <template v-else-if="summary">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          class="summary-card"
          :class="`summary-card--${card.color}`"
        >
          <div class="card-icon">
            <i :class="card.icon"></i>
          </div>
          <div class="card-content">
            <span class="card-label">{{ card.label }}</span>
            <span class="card-value">{{ card.value }}</span>
          </div>
        </div>
      </div>

      <!-- Daily Breakdown Table -->
      <div class="section-card">
        <h3>Daily Breakdown</h3>
        <DataTable
          v-if="aggregates.length > 0"
          :value="aggregates"
          stripedRows
          removableSort
          :paginator="aggregates.length > 20"
          :rows="20"
        >
          <Column field="date" header="Date" sortable>
            <template #body="{ data }">
              {{ formatDateMedium(data.date) }}
            </template>
          </Column>
          <Column field="gross_sales" header="Gross Sales" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.gross_sales) }}</span>
            </template>
          </Column>
          <Column field="discount_total" header="Discounts" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.discount_total) }}</span>
            </template>
          </Column>
          <Column field="net_sales" header="Net Sales" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.net_sales) }}</span>
            </template>
          </Column>
          <Column field="vat_amount" header="VAT" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.vat_amount) }}</span>
            </template>
          </Column>
          <Column field="transaction_count" header="Txns" sortable style="width: 80px" />
          <Column field="average_ticket" header="Avg Ticket" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.average_ticket) }}</span>
            </template>
          </Column>
        </DataTable>
        <div v-else class="empty-inline">
          <p>No data for this period</p>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <i class="pi pi-chart-line" style="font-size: 3rem; color: var(--p-surface-300)"></i>
      <h3>No Sales Data</h3>
      <p>No sales data available for the selected period</p>
    </div>
  </div>
</template>

<style scoped>
.summary-view {
  padding: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-surface-900);
}

.header-left .text-muted {
  color: var(--p-surface-500);
  margin: 0;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.summary-card--blue .card-icon { background: var(--p-blue-50); color: var(--p-blue-500); }
.summary-card--green .card-icon { background: var(--p-green-50); color: var(--p-green-500); }
.summary-card--purple .card-icon { background: var(--p-purple-50); color: var(--p-purple-500); }
.summary-card--orange .card-icon { background: var(--p-orange-50); color: var(--p-orange-500); }
.summary-card--cyan .card-icon { background: var(--p-cyan-50); color: var(--p-cyan-500); }

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.card-label {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-surface-900);
}

.section-card {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  padding: 1.25rem;
}

.section-card h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-surface-700);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.amount {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 0.75rem;
  text-align: center;
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
}

.empty-state h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-surface-700);
}

.empty-state p,
.empty-inline p {
  margin: 0;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.empty-inline {
  text-align: center;
  padding: 2rem;
}

@media (max-width: 767.98px) {
  .summary-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
