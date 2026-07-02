<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DatePicker from 'primevue/datepicker'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import { useToast } from 'primevue/usetoast'
import { eisReportService } from '@/services/eisReportService'
import { eisService } from '@/services/eisService'
import type { EISSummaryReport, EISZReadingComparison, EISDailyBreakdown } from '@/types/eis'

const router = useRouter()
const toast = useToast()
const loading = ref(false)
const eisEnabled = ref(true)
const backfilling = ref(false)
const backfillProgress = ref(0)
const backfillTotal = ref(0)
const selectedMonth = ref(new Date())
const summary = ref<EISSummaryReport | null>(null)
const comparison = ref<EISZReadingComparison | null>(null)
const dailyBreakdown = ref<EISDailyBreakdown[]>([])

function getDateRange(date: Date): { dateFrom: string; dateTo: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const dateFrom = new Date(year, month, 1).toISOString()
  const dateTo = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { dateFrom, dateTo }
}

async function loadReport() {
  loading.value = true
  try {
    eisEnabled.value = await eisService.isEnabled()
    if (!eisEnabled.value) return

    const { dateFrom, dateTo } = getDateRange(selectedMonth.value)
    const [s, c, d] = await Promise.all([
      eisReportService.getSubmissionSummary(dateFrom, dateTo),
      eisReportService.getComparisonWithZReading(dateFrom, dateTo),
      eisReportService.getDailyBreakdown(dateFrom, dateTo)
    ])
    summary.value = s
    comparison.value = c
    dailyBreakdown.value = d
  } catch (e) {
    console.error('[EISSummaryReport] Load failed:', e)
  } finally {
    loading.value = false
  }
}

async function runBackfill() {
  backfilling.value = true
  backfillProgress.value = 0
  backfillTotal.value = 0
  try {
    const count = await eisService.backfillHistorical(undefined, (current, total) => {
      backfillProgress.value = current
      backfillTotal.value = total
    })
    toast.add({ severity: 'success', summary: 'Backfill Complete', detail: `${count} transactions enqueued for EIS submission.`, life: 4000 })
    await loadReport()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Backfill Failed', detail: 'Could not backfill historical transactions.', life: 4000 })
  } finally {
    backfilling.value = false
  }
}

function goToSettings() {
  router.push('/settings')
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

function matchSeverity(pct: number): 'success' | 'warn' | 'danger' {
  if (pct >= 99.9) return 'success'
  if (pct >= 99) return 'warn'
  return 'danger'
}

const hasNoData = () => summary.value && summary.value.submittedCount === 0 && summary.value.pendingCount === 0 && summary.value.failedCount === 0

onMounted(loadReport)
</script>

<template>
  <div class="eis-summary-report">
    <!-- EIS Not Enabled Warning -->
    <Message v-if="!eisEnabled && !loading" severity="warn" class="mb-4" :closable="false">
      <div class="eis-warning">
        <span>EIS integration is not enabled. Configure it in <strong>Settings → EIS</strong> tab to start submitting transactions to BIR.</span>
        <Button label="Go to Settings" icon="pi pi-cog" severity="warn" size="small" class="mt-2" @click="goToSettings" />
      </div>
    </Message>

    <template v-if="eisEnabled">
      <div class="report-toolbar">
        <DatePicker
          v-model="selectedMonth"
          view="month"
          dateFormat="MM yy"
          showIcon
          class="month-picker"
        />
        <Button label="Generate" icon="pi pi-chart-bar" :loading="loading" @click="loadReport" />
      </div>

      <!-- Backfill prompt when EIS is enabled but no submissions exist -->
      <Message v-if="hasNoData() && !loading" severity="info" class="mt-4" :closable="false">
        <div class="eis-warning">
          <span>No EIS submissions found. You can backfill historical transactions to enqueue them for submission.</span>
          <div class="mt-2">
            <Button label="Submit Historical Transactions" icon="pi pi-history" :loading="backfilling" @click="runBackfill" />
          </div>
          <ProgressBar v-if="backfilling && backfillTotal > 0" :value="Math.round((backfillProgress / backfillTotal) * 100)" class="mt-2" style="height: 6px" />
        </div>
      </Message>
    </template>

    <div v-if="summary && eisEnabled" class="summary-cards mt-4">
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Total Submitted</span>
            <span class="stat-value">{{ summary.submittedCount }}</span>
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Gross Sales</span>
            <span class="stat-value">{{ formatCurrency(summary.totalGrossSales) }}</span>
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">VAT Amount</span>
            <span class="stat-value">{{ formatCurrency(summary.totalVatAmount) }}</span>
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Net Sales</span>
            <span class="stat-value">{{ formatCurrency(summary.totalNetSales) }}</span>
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Failed / Pending</span>
            <div class="stat-tags">
              <Tag v-if="summary.failedCount > 0" :value="String(summary.failedCount)" severity="danger" />
              <Tag v-if="summary.pendingCount > 0" :value="String(summary.pendingCount)" severity="warn" />
              <span v-if="summary.failedCount === 0 && summary.pendingCount === 0">None</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div v-if="comparison && eisEnabled" class="comparison-section mt-4">
      <h3>EIS vs Z-Reading Comparison</h3>
      <div class="comparison-grid">
        <div class="comparison-item">
          <label>EIS Total</label>
          <span>{{ formatCurrency(comparison.eisGross) }}</span>
        </div>
        <div class="comparison-item">
          <label>Z-Reading Total</label>
          <span>{{ formatCurrency(comparison.zReadingGross) }}</span>
        </div>
        <div class="comparison-item">
          <label>Difference</label>
          <span :class="comparison.difference !== 0 ? 'text-red' : ''">
            {{ formatCurrency(comparison.difference) }}
          </span>
        </div>
        <div class="comparison-item">
          <label>Match</label>
          <Tag :value="`${comparison.matchPercentage}%`" :severity="matchSeverity(comparison.matchPercentage)" />
        </div>
      </div>
    </div>

    <div v-if="dailyBreakdown.length > 0 && eisEnabled" class="daily-section mt-4">
      <h3>Daily Breakdown</h3>
      <DataTable :value="dailyBreakdown" stripedRows size="small">
        <Column field="date" header="Date" :sortable="true" style="width: 120px" />
        <Column field="submittedCount" header="Submitted" :sortable="true" style="width: 100px" />
        <Column header="Gross Sales" :sortable="true" style="width: 140px">
          <template #body="{ data }">{{ formatCurrency(data.grossSales) }}</template>
        </Column>
        <Column header="VAT" style="width: 120px">
          <template #body="{ data }">{{ formatCurrency(data.vatAmount) }}</template>
        </Column>
        <Column header="Net Sales" style="width: 140px">
          <template #body="{ data }">{{ formatCurrency(data.netSales) }}</template>
        </Column>
        <Column field="failedCount" header="Failed" style="width: 80px">
          <template #body="{ data }">
            <Tag v-if="data.failedCount > 0" :value="String(data.failedCount)" severity="danger" />
            <span v-else>0</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.report-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.month-picker {
  width: 200px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.card-stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-tags {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.comparison-item label {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.comparison-item span {
  font-weight: 600;
}

.text-red {
  color: var(--p-red-500);
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.eis-warning {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>
