<script setup lang="ts">
/**
 * TimeAnalysisView (T029)
 * Full page for time-based analytics: heatmap, staffing recommendations,
 * period overlay chart, and day drill-down dialog.
 */
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import SalesHeatmap from '@/components/analytics/SalesHeatmap.vue'
import StaffingRecommendations from '@/components/analytics/StaffingRecommendations.vue'
import PeriodOverlayChart from '@/components/analytics/PeriodOverlayChart.vue'
import { timeAnalysisService } from '@/services/timeAnalysisService'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { formatCurrency, getHourLabel } from '@/types/report'
import type { HeatmapCell, StaffingRecommendation as StaffingRec, SalesTrendPoint, DayDrilldown } from '@/types/analytics'

const toast = useToast()

// --- Period selection ---
const periodOptions = [
  { label: 'Last 4 Weeks', value: 'month' },
  { label: 'Last Week', value: 'week' }
]
const selectedPeriod = ref('month')
const dateRange = ref<Date[]>([])

// Compute default date range: last 4 weeks
function getDefaultRange(): { from: string; to: string } {
  const now = new Date()
  const to = toLocalDateStr(now)
  const from = toLocalDateStr(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000))
  return { from, to }
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date()
  const to = toLocalDateStr(now)
  const from = toLocalDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  return { from, to }
}

const effectiveDateRange = computed(() => {
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    return {
      from: toLocalDateStr(dateRange.value[0]),
      to: toLocalDateStr(dateRange.value[1])
    }
  }
  return selectedPeriod.value === 'week' ? getWeekRange() : getDefaultRange()
})

// --- Data state ---
const heatmapCells = ref<HeatmapCell[]>([])
const staffingRecs = ref<StaffingRec[]>([])
const period1Data = ref<SalesTrendPoint[]>([])
const period2Data = ref<SalesTrendPoint[]>([])

const loadingHeatmap = ref(false)
const loadingStaffing = ref(false)
const loadingOverlay = ref(false)

// --- Overlay period labels ---
const period1Label = computed(() => {
  const range = effectiveDateRange.value
  return `${range.from} to ${range.to}`
})

const period2Label = computed(() => {
  // Previous period of equal length
  const range = effectiveDateRange.value
  const fromDate = new Date(range.from)
  const toDate = new Date(range.to)
  const diff = toDate.getTime() - fromDate.getTime()
  const prevTo = new Date(fromDate.getTime() - 1 * 24 * 60 * 60 * 1000)
  const prevFrom = new Date(prevTo.getTime() - diff)
  return `${toLocalDateStr(prevFrom)} to ${toLocalDateStr(prevTo)}`
})

// --- Drill-down dialog ---
const drilldownVisible = ref(false)
const drilldownLoading = ref(false)
const drilldownData = ref<DayDrilldown | null>(null)

// --- Fetch all data ---
async function fetchData() {
  const { from, to } = effectiveDateRange.value

  // Heatmap
  loadingHeatmap.value = true
  try {
    heatmapCells.value = await timeAnalysisService.getHeatmapData(from, to)
  } catch (err) {
    console.error('Failed to load heatmap:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load heatmap data',
      life: 3000
    })
  } finally {
    loadingHeatmap.value = false
  }

  // Staffing
  loadingStaffing.value = true
  try {
    staffingRecs.value = await timeAnalysisService.getStaffingRecommendations(from, to)
  } catch (err) {
    console.error('Failed to load staffing:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load staffing recommendations',
      life: 3000
    })
  } finally {
    loadingStaffing.value = false
  }

  // Overlay: current period vs previous equal-length period
  loadingOverlay.value = true
  try {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const diff = toDate.getTime() - fromDate.getTime()
    const prevTo = new Date(fromDate.getTime() - 1 * 24 * 60 * 60 * 1000)
    const prevFrom = new Date(prevTo.getTime() - diff)

    const overlay = await timeAnalysisService.getPeriodOverlay(
      from,
      to,
      toLocalDateStr(prevFrom),
      toLocalDateStr(prevTo)
    )
    period1Data.value = overlay.period1
    period2Data.value = overlay.period2
  } catch (err) {
    console.error('Failed to load overlay:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load period comparison',
      life: 3000
    })
  } finally {
    loadingOverlay.value = false
  }
}

// --- Heatmap cell click -> drill-down ---
async function handleCellClick(cell: HeatmapCell) {
  // We need a specific date to drill down, but the heatmap gives day-of-week.
  // Use the most recent occurrence of that day-of-week within the date range.
  const { from, to } = effectiveDateRange.value
  const toDate = new Date(to)

  // Find the most recent date matching the day of week
  // SQLite strftime('%w'): 0=Sunday, 1=Monday, ... 6=Saturday
  for (let i = 0; i < 7; i++) {
    const candidate = new Date(toDate.getTime() - i * 24 * 60 * 60 * 1000)
    if (candidate.getDay() === cell.dayOfWeek) {
      const dateStr = toLocalDateStr(candidate)
      if (dateStr >= from) {
        await openDrilldown(dateStr)
        return
      }
    }
  }

  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'No matching date found in the selected range',
    life: 3000
  })
}

async function openDrilldown(date: string) {
  drilldownVisible.value = true
  drilldownLoading.value = true
  drilldownData.value = null

  try {
    drilldownData.value = await timeAnalysisService.getDayDrilldown(date)
  } catch (err) {
    console.error('Failed to load drill-down:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load day details',
      life: 3000
    })
  } finally {
    drilldownLoading.value = false
  }
}

// --- Date range picker change ---
function handleDateRangeChange() {
  fetchData()
}

// --- Period button change ---
function handlePeriodChange() {
  dateRange.value = []
  fetchData()
}

// --- Mount ---
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="dashboard-grid">
    <Toast />

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <h1>Time Analysis</h1>
        <p class="text-muted">Sales patterns by day and hour</p>
      </div>
      <div class="header-actions">
        <SelectButton
          v-model="selectedPeriod"
          :options="periodOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          @change="handlePeriodChange"
        />
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          placeholder="Custom date range"
          dateFormat="M dd, yy"
          showIcon
          style="min-width: 240px;"
          @hide="handleDateRangeChange"
        />
      </div>
    </div>

    <!-- Heatmap (full width) -->
    <div class="full-width-row">
      <SalesHeatmap
        :cells="heatmapCells"
        :loading="loadingHeatmap"
        @cell-click="handleCellClick"
      />
    </div>

    <!-- Row: Staffing + Period Overlay -->
    <div class="data-row">
      <StaffingRecommendations
        :recommendations="staffingRecs"
        :loading="loadingStaffing"
      />
      <PeriodOverlayChart
        :period1-data="period1Data"
        :period2-data="period2Data"
        :period1-label="period1Label"
        :period2-label="period2Label"
        :loading="loadingOverlay"
      />
    </div>

    <!-- Day Drill-Down Dialog -->
    <Dialog
      v-model:visible="drilldownVisible"
      :header="drilldownData ? `Day Details: ${drilldownData.date}` : 'Day Details'"
      :modal="true"
      :style="{ width: '800px', maxWidth: '95vw' }"
      :closable="true"
    >
      <div v-if="drilldownLoading" style="display: flex; justify-content: center; padding: 2rem;">
        <ProgressSpinner style="width: 48px; height: 48px;" />
      </div>

      <div v-else-if="drilldownData" class="drilldown-content">
        <!-- Summary -->
        <div class="drilldown-summary">
          <div class="drilldown-stat">
            <span class="drilldown-stat-label">Total Sales</span>
            <span class="drilldown-stat-value">{{ formatCurrency(drilldownData.totalSales) }}</span>
          </div>
          <div class="drilldown-stat">
            <span class="drilldown-stat-label">Transactions</span>
            <span class="drilldown-stat-value">{{ drilldownData.totalTransactions }}</span>
          </div>
        </div>

        <!-- Hourly Breakdown -->
        <h4 style="margin: 1.5rem 0 0.75rem;">Hourly Breakdown</h4>
        <DataTable
          :value="drilldownData.hourlyBreakdown"
          :rows="24"
          :paginator="false"
          scrollable
          scrollHeight="250px"
          stripedRows
          size="small"
        >
          <Column field="label" header="Hour" style="min-width: 100px" />
          <Column field="sales" header="Sales" style="min-width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.sales) }}
            </template>
          </Column>
          <Column field="count" header="Transactions" style="min-width: 110px" />
        </DataTable>

        <!-- Top Products -->
        <h4 style="margin: 1.5rem 0 0.75rem;">Top Products</h4>
        <DataTable
          v-if="drilldownData.topProducts.length > 0"
          :value="drilldownData.topProducts"
          :rows="10"
          :paginator="false"
          stripedRows
          size="small"
        >
          <Column field="name" header="Product" style="min-width: 180px" />
          <Column field="quantity" header="Qty Sold" style="min-width: 80px" />
          <Column field="revenue" header="Revenue" style="min-width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.revenue) }}
            </template>
          </Column>
        </DataTable>
        <p v-else style="color: var(--p-text-muted-color); font-size: 0.875rem;">
          No product data for this date.
        </p>

        <!-- Payment Breakdown -->
        <h4 style="margin: 1.5rem 0 0.75rem;">Payment Breakdown</h4>
        <DataTable
          v-if="drilldownData.paymentBreakdown.length > 0"
          :value="drilldownData.paymentBreakdown"
          :rows="10"
          :paginator="false"
          stripedRows
          size="small"
        >
          <Column field="method" header="Method" style="min-width: 120px">
            <template #body="{ data }">
              <span style="text-transform: capitalize;">{{ data.method.replace('_', ' ') }}</span>
            </template>
          </Column>
          <Column field="amount" header="Amount" style="min-width: 120px">
            <template #body="{ data }">
              {{ formatCurrency(data.amount) }}
            </template>
          </Column>
          <Column field="count" header="Count" style="min-width: 80px" />
        </DataTable>
        <p v-else style="color: var(--p-text-muted-color); font-size: 0.875rem;">
          No payment data for this date.
        </p>
      </div>

      <div v-else style="text-align: center; padding: 2rem; color: var(--p-text-muted-color);">
        No data available.
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.drilldown-content {
  display: flex;
  flex-direction: column;
}

.drilldown-summary {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.drilldown-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.drilldown-stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  font-weight: 600;
}

.drilldown-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
}
</style>
