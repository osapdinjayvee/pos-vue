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
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import db from '@/db/database'
import { formatCurrency, formatDateMedium } from '@/utils/reportFormatter'
import { toCSV, downloadCSV } from '@/utils/reportFormatter'
import { toLocalDateStr } from '@/utils/dateHelpers'

const router = useRouter()
const toast = useToast()

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' }
]

const selectedPeriod = ref('today')
const customDateFrom = ref<Date | null>(null)
const customDateTo = ref<Date | null>(null)
const isLoading = ref(false)

// Daily breakdown data
interface DailyRow {
  date: string
  gross_sales: number
  discount_total: number
  net_sales: number
  vat_amount: number
  transaction_count: number
  items_sold: number
  void_count: number
  refund_count: number
  refund_amount: number
  avg_ticket: number
}

const dailyData = ref<DailyRow[]>([])

// Summary totals
const summary = ref<{
  grossSales: number
  netSales: number
  vatAmount: number
  discountTotal: number
  transactionCount: number
  itemsSold: number
  voidCount: number
  refundCount: number
  refundAmount: number
  avgTicket: number
  avgDaily: number
  dayCount: number
} | null>(null)

// Payment breakdown
const paymentBreakdown = ref<{ method: string; amount: number; count: number }[]>([])

// Top products
const topProducts = ref<{ name: string; quantity: number; revenue: number }[]>([])

const dateRangeLabel = computed(() => {
  const { start, end } = getDateRange()
  if (start === end) return formatDateMedium(start)
  return `${formatDateMedium(start)} — ${formatDateMedium(end)}`
})

function getDateRange(): { start: string; end: string } {
  const now = new Date()

  if (selectedPeriod.value === 'today') {
    const today = toLocalDateStr(now)
    return { start: today, end: today }
  }

  if (selectedPeriod.value === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now.getFullYear(), now.getMonth(), diff)
    return {
      start: toLocalDateStr(start),
      end: toLocalDateStr(now)
    }
  }

  if (selectedPeriod.value === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      start: toLocalDateStr(start),
      end: toLocalDateStr(now)
    }
  }

  // Custom
  return {
    start: customDateFrom.value ? toLocalDateStr(customDateFrom.value) : toLocalDateStr(now),
    end: customDateTo.value ? toLocalDateStr(customDateTo.value) : toLocalDateStr(now)
  }
}

onMounted(() => {
  loadData()
})

watch([selectedPeriod, customDateFrom, customDateTo], () => {
  if (selectedPeriod.value !== 'custom' || (customDateFrom.value && customDateTo.value)) {
    loadData()
  }
})

async function loadData() {
  isLoading.value = true
  const { start, end } = getDateRange()

  try {
    await Promise.all([
      loadDailyBreakdown(start, end),
      loadSummary(start, end),
      loadPaymentBreakdown(start, end),
      loadTopProducts(start, end)
    ])
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

async function loadDailyBreakdown(dateFrom: string, dateTo: string) {
  const rows = await db.query<{
    date: string
    gross_sales: number
    discount_total: number
    net_sales: number
    vat_amount: number
    transaction_count: number
    void_count: number
    refund_count: number
    refund_amount: number
  }>(
    `SELECT
      date(created_at) as date,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN total_amount ELSE 0 END), 0) as gross_sales,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN discount_total ELSE 0 END), 0) as discount_total,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN total_amount - discount_total ELSE 0 END), 0) as net_sales,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN vat_amount ELSE 0 END), 0) as vat_amount,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as transaction_count,
      COALESCE(SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END), 0) as void_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN 1 ELSE 0 END), 0) as refund_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN ABS(total_amount) ELSE 0 END), 0) as refund_amount
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ?
      AND status IN ('completed', 'voided')
    GROUP BY date(created_at)
    ORDER BY date(created_at) DESC`,
    [dateFrom, dateTo]
  )

  // Get items sold per date
  const itemRows = await db.query<{ date: string; items: number }>(
    `SELECT date(t.created_at) as date, COALESCE(SUM(ti.quantity), 0) as items
     FROM transaction_items ti
     INNER JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'completed' AND t.total_amount >= 0
       AND date(t.created_at) >= ? AND date(t.created_at) <= ?
     GROUP BY date(t.created_at)`,
    [dateFrom, dateTo]
  )

  const itemsMap = new Map(itemRows.map(r => [r.date, r.items]))

  dailyData.value = rows.map(r => ({
    ...r,
    items_sold: itemsMap.get(r.date) || 0,
    avg_ticket: r.transaction_count > 0 ? r.gross_sales / r.transaction_count : 0
  }))
}

async function loadSummary(dateFrom: string, dateTo: string) {
  const result = await db.getOne<{
    gross_sales: number
    discount_total: number
    net_sales: number
    vat_amount: number
    transaction_count: number
    void_count: number
    refund_count: number
    refund_amount: number
    day_count: number
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN total_amount ELSE 0 END), 0) as gross_sales,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN discount_total ELSE 0 END), 0) as discount_total,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN total_amount - discount_total ELSE 0 END), 0) as net_sales,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN vat_amount ELSE 0 END), 0) as vat_amount,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount >= 0 THEN 1 ELSE 0 END), 0) as transaction_count,
      COALESCE(SUM(CASE WHEN status = 'voided' THEN 1 ELSE 0 END), 0) as void_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN 1 ELSE 0 END), 0) as refund_count,
      COALESCE(SUM(CASE WHEN status = 'completed' AND total_amount < 0 THEN ABS(total_amount) ELSE 0 END), 0) as refund_amount,
      COUNT(DISTINCT date(created_at)) as day_count
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ?
      AND status IN ('completed', 'voided')`,
    [dateFrom, dateTo]
  )

  const itemsResult = await db.getOne<{ total: number }>(
    `SELECT COALESCE(SUM(ti.quantity), 0) as total
     FROM transaction_items ti
     INNER JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'completed' AND t.total_amount >= 0
       AND date(t.created_at) >= ? AND date(t.created_at) <= ?`,
    [dateFrom, dateTo]
  )

  const gross = result?.gross_sales || 0
  const txCount = result?.transaction_count || 0
  const days = result?.day_count || 1

  summary.value = {
    grossSales: gross,
    netSales: result?.net_sales || 0,
    vatAmount: result?.vat_amount || 0,
    discountTotal: result?.discount_total || 0,
    transactionCount: txCount,
    itemsSold: itemsResult?.total || 0,
    voidCount: result?.void_count || 0,
    refundCount: result?.refund_count || 0,
    refundAmount: result?.refund_amount || 0,
    avgTicket: txCount > 0 ? gross / txCount : 0,
    avgDaily: gross / days,
    dayCount: days
  }
}

async function loadPaymentBreakdown(dateFrom: string, dateTo: string) {
  const rows = await db.query<{ method: string; total: number; cnt: number }>(
    `SELECT tp.payment_method as method,
            COALESCE(SUM(tp.amount), 0) as total,
            COUNT(*) as cnt
     FROM transaction_payments tp
     INNER JOIN transactions t ON t.id = tp.transaction_id
     WHERE t.status = 'completed' AND t.total_amount >= 0
       AND date(t.created_at) >= ? AND date(t.created_at) <= ?
     GROUP BY tp.payment_method
     ORDER BY total DESC`,
    [dateFrom, dateTo]
  )

  paymentBreakdown.value = rows.map(r => ({
    method: r.method,
    amount: r.total,
    count: r.cnt
  }))
}

async function loadTopProducts(dateFrom: string, dateTo: string) {
  const rows = await db.query<{ name: string; qty: number; rev: number }>(
    `SELECT ti.product_name as name,
            SUM(ti.quantity) as qty,
            SUM(ti.line_total) as rev
     FROM transaction_items ti
     INNER JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'completed' AND t.total_amount >= 0
       AND date(t.created_at) >= ? AND date(t.created_at) <= ?
     GROUP BY ti.product_name
     ORDER BY rev DESC
     LIMIT 10`,
    [dateFrom, dateTo]
  )

  topProducts.value = rows.map(r => ({
    name: r.name,
    quantity: r.qty,
    revenue: r.rev
  }))
}

const paymentMethodLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  other_ewallet: 'E-Wallet',
  points: 'Loyalty Points'
}

async function handleExportCSV() {
  if (dailyData.value.length === 0) return

  const csv = toCSV(dailyData.value as unknown as Record<string, unknown>[], [
    { key: 'date', header: 'Date' },
    { key: 'gross_sales', header: 'Gross Sales', formatter: (v) => String(v) },
    { key: 'discount_total', header: 'Discounts', formatter: (v) => String(v) },
    { key: 'net_sales', header: 'Net Sales', formatter: (v) => String(v) },
    { key: 'vat_amount', header: 'VAT', formatter: (v) => String(v) },
    { key: 'transaction_count', header: 'Transactions' },
    { key: 'items_sold', header: 'Items Sold' },
    { key: 'avg_ticket', header: 'Avg Ticket', formatter: (v) => Number(v).toFixed(2) },
    { key: 'void_count', header: 'Voids' },
    { key: 'refund_count', header: 'Refunds' },
    { key: 'refund_amount', header: 'Refund Amount', formatter: (v) => String(v) }
  ])

  const { start, end } = getDateRange()
  const result = await downloadCSV(csv, `sales-summary-${start}-to-${end}`)
  if (!result.success) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: result.error || 'Could not save the CSV file.',
      life: 5000
    })
    return
  }

  toast.add({
    severity: 'info',
    summary: 'Exported',
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
          <p class="text-muted">{{ dateRangeLabel }}</p>
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
          :disabled="dailyData.length === 0"
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
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon green"><i class="pi pi-wallet"></i></div>
          <div class="card-body">
            <span class="card-label">GROSS SALES</span>
            <span class="card-value">{{ formatCurrency(summary.grossSales) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon blue"><i class="pi pi-chart-line"></i></div>
          <div class="card-body">
            <span class="card-label">NET SALES</span>
            <span class="card-value">{{ formatCurrency(summary.netSales) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon purple"><i class="pi pi-receipt"></i></div>
          <div class="card-body">
            <span class="card-label">TRANSACTIONS</span>
            <span class="card-value">{{ summary.transactionCount }}</span>
            <span v-if="summary.voidCount > 0" class="card-sub">{{ summary.voidCount }} voided</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon orange"><i class="pi pi-shopping-bag"></i></div>
          <div class="card-body">
            <span class="card-label">ITEMS SOLD</span>
            <span class="card-value">{{ summary.itemsSold }}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon teal"><i class="pi pi-chart-bar"></i></div>
          <div class="card-body">
            <span class="card-label">AVG TICKET</span>
            <span class="card-value">{{ formatCurrency(summary.avgTicket) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon cyan"><i class="pi pi-calendar"></i></div>
          <div class="card-body">
            <span class="card-label">DAILY AVERAGE</span>
            <span class="card-value">{{ formatCurrency(summary.avgDaily) }}</span>
            <span class="card-sub">{{ summary.dayCount }} day{{ summary.dayCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Secondary Stats -->
      <div class="secondary-stats" v-if="summary.discountTotal > 0 || summary.refundCount > 0 || summary.vatAmount > 0">
        <div class="stat-chip" v-if="summary.discountTotal > 0">
          <i class="pi pi-percentage"></i>
          <span>Discounts: {{ formatCurrency(summary.discountTotal) }}</span>
        </div>
        <div class="stat-chip" v-if="summary.vatAmount > 0">
          <i class="pi pi-building"></i>
          <span>VAT Collected: {{ formatCurrency(summary.vatAmount) }}</span>
        </div>
        <div class="stat-chip warn" v-if="summary.refundCount > 0">
          <i class="pi pi-replay"></i>
          <span>{{ summary.refundCount }} Refund{{ summary.refundCount !== 1 ? 's' : '' }}: {{ formatCurrency(summary.refundAmount) }}</span>
        </div>
      </div>

      <!-- Two-column layout: Payments + Top Products -->
      <div class="details-row" v-if="paymentBreakdown.length > 0 || topProducts.length > 0">
        <div class="section-card" v-if="paymentBreakdown.length > 0">
          <h3>Payment Methods</h3>
          <div class="payment-list">
            <div v-for="p in paymentBreakdown" :key="p.method" class="payment-row">
              <div class="payment-info">
                <Tag :value="paymentMethodLabel[p.method] || p.method" severity="secondary" />
                <span class="payment-count">{{ p.count }} txn{{ p.count !== 1 ? 's' : '' }}</span>
              </div>
              <span class="payment-amount">{{ formatCurrency(p.amount) }}</span>
            </div>
          </div>
        </div>

        <div class="section-card" v-if="topProducts.length > 0">
          <h3>Top Products</h3>
          <div class="product-list">
            <div v-for="(p, i) in topProducts" :key="p.name" class="product-row">
              <span class="product-rank">{{ i + 1 }}</span>
              <div class="product-info">
                <span class="product-name">{{ p.name }}</span>
                <span class="product-qty">{{ p.quantity }} sold</span>
              </div>
              <span class="product-revenue">{{ formatCurrency(p.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Breakdown Table -->
      <div class="section-card">
        <h3>Daily Breakdown</h3>
        <DataTable
          v-if="dailyData.length > 0"
          :value="dailyData"
          stripedRows
          removableSort
          :paginator="dailyData.length > 20"
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
              <span class="amount discount" v-if="data.discount_total > 0">-{{ formatCurrency(data.discount_total) }}</span>
              <span class="amount muted" v-else>—</span>
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
          <Column field="transaction_count" header="Txns" sortable style="width: 80px; text-align: center" />
          <Column field="items_sold" header="Items" sortable style="width: 80px; text-align: center" />
          <Column field="avg_ticket" header="Avg Ticket" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.avg_ticket) }}</span>
            </template>
          </Column>
          <Column header="Returns" style="width: 100px">
            <template #body="{ data }">
              <Tag v-if="data.refund_count > 0" :value="`${data.refund_count}`" severity="warn" />
              <span v-else class="muted">—</span>
            </template>
          </Column>
        </DataTable>
        <div v-else class="empty-inline">
          <p>No transactions for this period</p>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <i class="pi pi-chart-line" style="font-size: 3rem; color: var(--app-surface-300)"></i>
      <h3>No Sales Data</h3>
      <p>No transactions found for the selected period</p>
    </div>
  </div>
</template>

<style scoped>
.summary-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.125rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  transition: box-shadow 0.2s;
}

.summary-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.card-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.card-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.card-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.card-icon.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.card-icon.teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
.card-icon.cyan { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.card-label {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.card-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.3;
}

.card-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Secondary Stats */
.secondary-stats {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--p-text-color);
}

.stat-chip i {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.stat-chip.warn {
  border-color: var(--p-orange-200);
  background: var(--p-orange-50);
}

.stat-chip.warn i {
  color: var(--p-orange-500);
}

/* Details Row */
.details-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.section-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.25rem;
}

.section-card h3 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Payment List */
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--app-surface-100);
}

.payment-row:last-child {
  border-bottom: none;
}

.payment-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.payment-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.payment-amount {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--p-text-color);
}

/* Product List */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0;
}

.product-rank {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--app-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-qty {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.product-revenue {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
  flex-shrink: 0;
}

/* Table */
.amount {
  font-weight: 500;
}

.amount.discount {
  color: var(--p-orange-500);
}

.amount.muted,
.muted {
  color: var(--p-text-muted-color);
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
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
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

@media (max-width: 1024px) {
  .details-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767.98px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .header-actions {
    width: 100%;
  }
}
</style>
