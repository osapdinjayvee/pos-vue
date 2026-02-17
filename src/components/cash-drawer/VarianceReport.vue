<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { varianceService } from '@/services/varianceService'
import { toLocalDateStr } from '@/utils/dateHelpers'

// Types
interface VarianceRecord {
  sessionId: string
  date: string
  cashierName: string
  openingAmount: number
  expectedAmount: number
  closingAmount: number
  variance: number
  varianceReason: string | null
}

interface CashierSummary {
  cashierName: string
  shiftCount: number
  totalOver: number
  totalShort: number
  netVariance: number
  avgVariancePerShift: number
}

// State
const startDate = ref<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const endDate = ref<Date>(new Date())
const activeTab = ref('0')
const loading = ref(false)

const varianceRecords = ref<VarianceRecord[]>([])
const cashierSummaries = ref<CashierSummary[]>([])
const flaggedShifts = ref<VarianceRecord[]>([])

const selectedShift = ref<VarianceRecord | null>(null)
const shiftDetail = ref<any>(null)
const showDetailDialog = ref(false)

// Computed
const totalOver = computed(() => {
  return varianceRecords.value
    .filter(r => r.variance > 0)
    .reduce((sum, r) => sum + r.variance, 0)
})

const totalShort = computed(() => {
  return Math.abs(varianceRecords.value
    .filter(r => r.variance < 0)
    .reduce((sum, r) => sum + r.variance, 0))
})

const netVariance = computed(() => {
  return varianceRecords.value.reduce((sum, r) => sum + r.variance, 0)
})

const flaggedCount = computed(() => {
  return varianceRecords.value.filter(r => Math.abs(r.variance) > 100).length
})

// Methods
const loadReport = async () => {
  loading.value = true
  try {
    const start = toLocalDateStr(startDate.value)
    const end = toLocalDateStr(endDate.value)
    const [records, summaries, flagged] = await Promise.all([
      varianceService.getVarianceReport(start, end),
      varianceService.getCashierVarianceSummary(start, end),
      varianceService.getFlaggedShifts(start, end, 100)
    ])
    varianceRecords.value = records as unknown as VarianceRecord[]
    cashierSummaries.value = summaries as unknown as CashierSummary[]
    flaggedShifts.value = flagged as unknown as VarianceRecord[]
  } catch (err) {
    console.error('Failed to load variance report:', err)
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => {
  return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getVarianceSeverity = (variance: number) => {
  const absVariance = Math.abs(variance)
  if (absVariance > 200) return 'danger'
  if (absVariance > 100) return 'warn'
  return 'success'
}

const getVarianceTag = (variance: number) => {
  return variance >= 0 ? 'Over' : 'Short'
}

const openShiftDetail = async (shift: VarianceRecord) => {
  selectedShift.value = shift
  try {
    const detail = await varianceService.getShiftDetail(shift.sessionId)
    shiftDetail.value = {
      ...shift,
      openingDenominations: [] as { denomination: number; count: number; total: number }[],
      closingDenominations: [] as { denomination: number; count: number; total: number }[],
      operations: detail.operations.map(op => ({
        type: op.type,
        amount: op.amount || 0,
        time: op.created_at,
        reason: op.reason,
        denominations: op.denominations
      })),
      expectedBreakdown: null
    }
    // Extract opening/closing denominations from operations
    for (const op of detail.operations) {
      if (op.type === 'open' && op.denominations.length > 0) {
        shiftDetail.value.openingDenominations = op.denominations.map((d: any) => ({
          denomination: d.denomination,
          count: d.quantity,
          total: d.subtotal
        }))
      }
      if (op.type === 'close' && op.denominations.length > 0) {
        shiftDetail.value.closingDenominations = op.denominations.map((d: any) => ({
          denomination: d.denomination,
          count: d.quantity,
          total: d.subtotal
        }))
      }
    }
    showDetailDialog.value = true
  } catch (err) {
    console.error('Failed to load shift detail:', err)
  }
}

// Lifecycle
onMounted(() => {
  loadReport()
})
</script>

<template>
  <div class="variance-report">
    <!-- Date Range Filters -->
    <Card class="filter-card">
      <template #content>
        <div class="filter-row">
          <div class="filter-group">
            <label>Start Date</label>
            <DatePicker v-model="startDate" dateFormat="M d, yy" showIcon />
          </div>
          <div class="filter-group">
            <label>End Date</label>
            <DatePicker v-model="endDate" dateFormat="M d, yy" showIcon />
          </div>
          <Button label="Load Report" icon="pi pi-search" @click="loadReport" :loading="loading" />
        </div>
      </template>
    </Card>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <Card class="summary-card over">
        <template #content>
          <div class="summary-content">
            <i class="pi pi-arrow-up"></i>
            <div class="summary-text">
              <span class="summary-label">Total Over</span>
              <span class="summary-value">{{ formatCurrency(totalOver) }}</span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="summary-card short">
        <template #content>
          <div class="summary-content">
            <i class="pi pi-arrow-down"></i>
            <div class="summary-text">
              <span class="summary-label">Total Short</span>
              <span class="summary-value">{{ formatCurrency(totalShort) }}</span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="summary-card net">
        <template #content>
          <div class="summary-content">
            <i class="pi pi-chart-line"></i>
            <div class="summary-text">
              <span class="summary-label">Net Variance</span>
              <span class="summary-value" :class="{ positive: netVariance > 0, negative: netVariance < 0 }">
                {{ formatCurrency(Math.abs(netVariance)) }}
              </span>
            </div>
          </div>
        </template>
      </Card>

      <Card class="summary-card flagged">
        <template #content>
          <div class="summary-content">
            <i class="pi pi-exclamation-triangle"></i>
            <div class="summary-text">
              <span class="summary-label">Flagged Shifts</span>
              <span class="summary-value">{{ flaggedCount }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Tabs -->
    <Card class="tabs-card">
      <template #content>
        <Tabs v-model:value="activeTab">
          <TabList>
            <Tab value="0">All Shifts</Tab>
            <Tab value="1">By Cashier</Tab>
            <Tab value="2">Alerts</Tab>
          </TabList>

          <TabPanels>
            <!-- All Shifts Tab -->
            <TabPanel value="0">
              <DataTable
                :value="varianceRecords"
                :loading="loading"
                sortMode="multiple"
                paginator
                :rows="20"
                @row-click="openShiftDetail($event.data)"
                class="variance-table"
              >
                <Column field="date" header="Date" sortable>
                  <template #body="{ data }">
                    {{ formatDate(data.date) }}
                  </template>
                </Column>
                <Column field="cashierName" header="Cashier" sortable></Column>
                <Column field="openingAmount" header="Opening" sortable>
                  <template #body="{ data }">
                    {{ formatCurrency(data.openingAmount) }}
                  </template>
                </Column>
                <Column field="expectedAmount" header="Expected" sortable>
                  <template #body="{ data }">
                    {{ formatCurrency(data.expectedAmount) }}
                  </template>
                </Column>
                <Column field="closingAmount" header="Actual" sortable>
                  <template #body="{ data }">
                    {{ formatCurrency(data.closingAmount) }}
                  </template>
                </Column>
                <Column field="variance" header="Variance" sortable>
                  <template #body="{ data }">
                    <Tag
                      :severity="data.variance >= 0 ? 'success' : 'danger'"
                      :value="`${formatCurrency(Math.abs(data.variance))} ${getVarianceTag(data.variance)}`"
                    />
                  </template>
                </Column>
                <Column field="varianceReason" header="Reason">
                  <template #body="{ data }">
                    <span class="reason-text">{{ data.varianceReason }}</span>
                  </template>
                </Column>
              </DataTable>
            </TabPanel>

            <!-- By Cashier Tab -->
            <TabPanel value="1">
              <DataTable
                :value="cashierSummaries"
                :loading="loading"
                sortMode="multiple"
                class="cashier-table"
              >
                <Column field="cashierName" header="Cashier" sortable></Column>
                <Column field="shiftCount" header="Shift Count" sortable></Column>
                <Column field="totalOver" header="Total Over" sortable>
                  <template #body="{ data }">
                    <span class="positive">{{ formatCurrency(data.totalOver) }}</span>
                  </template>
                </Column>
                <Column field="totalShort" header="Total Short" sortable>
                  <template #body="{ data }">
                    <span class="negative">{{ formatCurrency(data.totalShort) }}</span>
                  </template>
                </Column>
                <Column field="netVariance" header="Net Variance" sortable>
                  <template #body="{ data }">
                    <span :class="{ positive: data.netVariance > 0, negative: data.netVariance < 0 }">
                      {{ formatCurrency(Math.abs(data.netVariance)) }}
                    </span>
                  </template>
                </Column>
                <Column field="avgVariancePerShift" header="Avg per Shift" sortable>
                  <template #body="{ data }">
                    <span :class="{ positive: data.avgVariancePerShift > 0, negative: data.avgVariancePerShift < 0 }">
                      {{ formatCurrency(Math.abs(data.avgVariancePerShift)) }}
                    </span>
                  </template>
                </Column>
              </DataTable>
            </TabPanel>

            <!-- Alerts Tab -->
            <TabPanel value="2">
              <DataTable
                :value="flaggedShifts"
                :loading="loading"
                sortMode="multiple"
                @row-click="openShiftDetail($event.data)"
                class="alerts-table"
              >
                <Column field="date" header="Date" sortable>
                  <template #body="{ data }">
                    {{ formatDate(data.date) }}
                  </template>
                </Column>
                <Column field="cashierName" header="Cashier" sortable></Column>
                <Column field="variance" header="Variance" sortable>
                  <template #body="{ data }">
                    <Tag
                      severity="danger"
                      :value="`${formatCurrency(Math.abs(data.variance))} ${getVarianceTag(data.variance)}`"
                    />
                  </template>
                </Column>
                <Column field="varianceReason" header="Reason">
                  <template #body="{ data }">
                    <span class="reason-text">{{ data.varianceReason }}</span>
                  </template>
                </Column>
                <Column header="Status">
                  <template #body>
                    <Tag severity="warn" value="Requires Review" />
                  </template>
                </Column>
              </DataTable>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </Card>

    <!-- Shift Detail Dialog -->
    <Dialog
      v-model:visible="showDetailDialog"
      header="Shift Details"
      :modal="true"
      :style="{ width: '900px' }"
      class="shift-detail-dialog"
    >
      <div v-if="shiftDetail" class="shift-detail">
        <!-- Header Info -->
        <div class="detail-header">
          <div class="detail-info">
            <h3>{{ shiftDetail.cashierName }}</h3>
            <p>{{ formatDate(shiftDetail.date) }}</p>
            <p class="session-id">Session: {{ shiftDetail.sessionId }}</p>
          </div>
          <div class="detail-variance">
            <span class="variance-label">Variance</span>
            <Tag
              :severity="getVarianceSeverity(shiftDetail.variance)"
              :value="`${formatCurrency(Math.abs(shiftDetail.variance))} ${getVarianceTag(shiftDetail.variance)}`"
              class="variance-tag-large"
            />
            <p v-if="shiftDetail.varianceReason" class="variance-reason">{{ shiftDetail.varianceReason }}</p>
          </div>
        </div>

        <!-- Amount Summary -->
        <div class="amount-summary">
          <div class="amount-item">
            <span class="amount-label">Opening</span>
            <span class="amount-value">{{ formatCurrency(shiftDetail.openingAmount) }}</span>
          </div>
          <div class="amount-item">
            <span class="amount-label">Expected</span>
            <span class="amount-value">{{ formatCurrency(shiftDetail.expectedAmount) }}</span>
          </div>
          <div class="amount-item">
            <span class="amount-label">Actual</span>
            <span class="amount-value">{{ formatCurrency(shiftDetail.closingAmount) }}</span>
          </div>
        </div>

        <!-- Denominations -->
        <div v-if="shiftDetail.openingDenominations?.length || shiftDetail.closingDenominations?.length" class="denominations-section">
          <div v-if="shiftDetail.openingDenominations?.length" class="denomination-column">
            <h4>Opening Denominations</h4>
            <table class="denomination-table">
              <thead>
                <tr>
                  <th>Denomination</th>
                  <th>Count</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="denom in shiftDetail.openingDenominations" :key="denom.denomination">
                  <td>{{ formatCurrency(denom.denomination) }}</td>
                  <td>{{ denom.count }}</td>
                  <td>{{ formatCurrency(denom.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="shiftDetail.closingDenominations?.length" class="denomination-column">
            <h4>Closing Denominations</h4>
            <table class="denomination-table">
              <thead>
                <tr>
                  <th>Denomination</th>
                  <th>Count</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="denom in shiftDetail.closingDenominations" :key="denom.denomination">
                  <td>{{ formatCurrency(denom.denomination) }}</td>
                  <td>{{ denom.count }}</td>
                  <td>{{ formatCurrency(denom.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Operations -->
        <div v-if="shiftDetail.operations?.length" class="operations-section">
          <h4>Operations</h4>
          <table class="operations-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(op, index) in shiftDetail.operations" :key="index">
                <td>
                  <Tag :value="op.type" :severity="op.type === 'drop' ? 'warn' : op.type === 'paid_in' ? 'info' : 'secondary'" />
                </td>
                <td :class="{ positive: op.amount > 0, negative: op.type === 'drop' }">
                  {{ formatCurrency(Math.abs(op.amount)) }}
                </td>
                <td>{{ formatDate(op.time) }}</td>
                <td>{{ op.reason || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.variance-report {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-card {
  background: var(--surface-card);
}

.filter-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
}

.filter-group label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: var(--surface-card);
}

.summary-card.over {
  border-left: 4px solid var(--green-500);
}

.summary-card.short {
  border-left: 4px solid var(--red-500);
}

.summary-card.net {
  border-left: 4px solid var(--blue-500);
}

.summary-card.flagged {
  border-left: 4px solid var(--orange-500);
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-content i {
  font-size: 2rem;
  color: var(--text-color-secondary);
}

.summary-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

.summary-value.positive {
  color: var(--green-600);
}

.summary-value.negative {
  color: var(--red-600);
}

.tabs-card {
  background: var(--surface-card);
}

.variance-table,
.cashier-table,
.alerts-table {
  cursor: pointer;
}

.variance-table :deep(tbody tr:hover),
.alerts-table :deep(tbody tr:hover) {
  background: var(--surface-hover);
}

.reason-text {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.positive {
  color: var(--green-600);
  font-weight: 600;
}

.negative {
  color: var(--red-600);
  font-weight: 600;
}

/* Shift Detail Dialog */
.shift-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.detail-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.detail-info p {
  margin: 0.25rem 0;
  color: var(--text-color-secondary);
}

.session-id {
  font-size: 0.875rem;
  font-family: monospace;
}

.detail-variance {
  text-align: right;
}

.variance-label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
}

.variance-tag-large {
  font-size: 1.125rem;
  padding: 0.5rem 1rem;
}

.variance-reason {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.amount-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
}

.amount-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.amount-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.amount-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color);
}

.breakdown-section {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
}

.breakdown-section h4 {
  margin: 0 0 1rem 0;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.breakdown-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.breakdown-value {
  font-size: 1.125rem;
  font-weight: 600;
}

.denominations-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.denomination-column h4 {
  margin: 0 0 1rem 0;
}

.denomination-table,
.operations-table {
  width: 100%;
  border-collapse: collapse;
}

.denomination-table th,
.denomination-table td,
.operations-table th,
.operations-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--surface-border);
}

.denomination-table th,
.operations-table th {
  background: var(--surface-ground);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.denomination-table td:nth-child(2),
.denomination-table td:nth-child(3) {
  text-align: right;
}

.operations-section {
  margin-top: 1rem;
}

.operations-section h4 {
  margin: 0 0 1rem 0;
}

.operations-table td:nth-child(2) {
  text-align: right;
}

/* Responsive */
@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .amount-summary,
  .breakdown-grid {
    grid-template-columns: 1fr;
  }

  .denominations-section {
    grid-template-columns: 1fr;
  }

  .shift-detail-dialog {
    width: 95vw !important;
  }
}
</style>
