<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import { formatCurrency, formatDateLong, formatPaymentMethod } from '@/utils/reportFormatter'
import { toCSV, downloadCSV } from '@/utils/reportFormatter'
import { reportService } from '@/services/reportService'
import db from '@/db/database'
import { toLocalDateStr } from '@/utils/dateHelpers'

const router = useRouter()
const toast = useToast()

const selectedDate = ref(new Date())
const isLoading = ref(false)

// Sales data
const salesData = ref<{
  grossSales: number
  discountTotal: number
  netSales: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  transactionCount: number
  voidCount: number
  voidAmount: number
  refundCount: number
  refundAmount: number
  averageTicket: number
  cashSales: number
  cardSales: number
  otherSales: number
} | null>(null)

// Hourly breakdown
const hourlyData = ref<Array<{ hour: string; sales: number; count: number }>>([])

// Payment breakdown
const paymentData = ref<Array<{ method: string; amount: number; count: number; percentage: number }>>([])

// Category breakdown
const categoryData = ref<Array<{ name: string; sales: number; quantity: number; percentage: number }>>([])

const formattedDate = computed(() => formatDateLong(selectedDate.value))

const summaryCards = computed(() => {
  if (!salesData.value) return []
  return [
    {
      label: 'Gross Sales',
      value: formatCurrency(salesData.value.grossSales),
      icon: 'pi pi-dollar',
      color: 'blue'
    },
    {
      label: 'Net Sales',
      value: formatCurrency(salesData.value.netSales),
      icon: 'pi pi-chart-line',
      color: 'green'
    },
    {
      label: 'Transactions',
      value: String(salesData.value.transactionCount),
      icon: 'pi pi-receipt',
      color: 'purple'
    },
    {
      label: 'Avg. Ticket',
      value: formatCurrency(salesData.value.averageTicket),
      icon: 'pi pi-ticket',
      color: 'orange'
    }
  ]
})

onMounted(() => {
  loadDailyReport()
})

watch(selectedDate, () => {
  loadDailyReport()
})

async function loadDailyReport() {
  isLoading.value = true
  const dateStr = toLocalDateStr(selectedDate.value)

  try {
    // Try to get from aggregate first
    const aggregate = await salesAggregateRepository.findByTerminalDate('POS-001', dateStr)

    if (aggregate) {
      salesData.value = {
        grossSales: aggregate.gross_sales,
        discountTotal: aggregate.discount_total,
        netSales: aggregate.net_sales,
        vatableSales: aggregate.vatable_sales,
        vatAmount: aggregate.vat_amount,
        vatExemptSales: aggregate.vat_exempt_sales,
        zeroRatedSales: aggregate.zero_rated_sales,
        transactionCount: aggregate.transaction_count,
        voidCount: aggregate.void_count,
        voidAmount: aggregate.void_amount,
        refundCount: aggregate.refund_count,
        refundAmount: aggregate.refund_amount,
        averageTicket: aggregate.average_ticket,
        cashSales: aggregate.cash_sales,
        cardSales: aggregate.card_sales,
        otherSales: aggregate.other_sales
      }
    } else {
      // Calculate from transactions directly
      const orders = await db.getOne<{
        gross_sales: number
        discount_total: number
        net_sales: number
        transaction_count: number
      }>(
        `SELECT
          COALESCE(SUM(subtotal), 0) as gross_sales,
          COALESCE(SUM(discount_total), 0) as discount_total,
          COALESCE(SUM(total_amount), 0) as net_sales,
          COUNT(*) as transaction_count
         FROM transactions
         WHERE date(created_at) = ? AND status = 'completed'`,
        [dateStr]
      )

      const txCount = orders?.transaction_count || 0
      const netSales = orders?.net_sales || 0

      salesData.value = {
        grossSales: orders?.gross_sales || 0,
        discountTotal: orders?.discount_total || 0,
        netSales: netSales,
        vatableSales: 0,
        vatAmount: 0,
        vatExemptSales: 0,
        zeroRatedSales: 0,
        transactionCount: txCount,
        voidCount: 0,
        voidAmount: 0,
        refundCount: 0,
        refundAmount: 0,
        averageTicket: txCount > 0 ? netSales / txCount : 0,
        cashSales: 0,
        cardSales: 0,
        otherSales: 0
      }
    }

    // Load hourly breakdown
    const hourlyRows = await db.query<{ hour: number; sales: number; count: number }>(
      `SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COALESCE(SUM(total_amount), 0) as sales,
        COUNT(*) as count
       FROM transactions
       WHERE date(created_at) = ? AND status = 'completed'
       GROUP BY hour
       ORDER BY hour`,
      [dateStr]
    )

    hourlyData.value = hourlyRows.map(r => ({
      hour: `${r.hour > 12 ? r.hour - 12 : r.hour === 0 ? 12 : r.hour}:00 ${r.hour >= 12 ? 'PM' : 'AM'}`,
      sales: r.sales,
      count: r.count
    }))

    // Load payment breakdown
    const totalSales = salesData.value.netSales || 1
    const paymentRows = await db.query<{ method: string; amount: number; count: number }>(
      `SELECT
        tp.payment_method as method,
        COALESCE(SUM(tp.amount), 0) as amount,
        COUNT(*) as count
       FROM transaction_payments tp
       JOIN transactions t ON tp.transaction_id = t.id
       WHERE date(t.created_at) = ? AND t.status = 'completed'
       GROUP BY tp.payment_method
       ORDER BY amount DESC`,
      [dateStr]
    )

    paymentData.value = paymentRows.map(r => ({
      method: formatPaymentMethod(r.method),
      amount: r.amount,
      count: r.count,
      percentage: totalSales > 0 ? Math.round((r.amount / totalSales) * 100) : 0
    }))

    // Load category breakdown
    const categoryRows = await db.query<{ name: string; sales: number; quantity: number }>(
      `SELECT
        COALESCE(c.name, 'Uncategorized') as name,
        COALESCE(SUM(ti.line_total), 0) as sales,
        COALESCE(SUM(ti.quantity), 0) as quantity
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       LEFT JOIN products p ON ti.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE date(t.created_at) = ? AND t.status = 'completed'
       GROUP BY c.id
       ORDER BY sales DESC`,
      [dateStr]
    )

    categoryData.value = categoryRows.map(r => ({
      name: r.name,
      sales: r.sales,
      quantity: r.quantity,
      percentage: totalSales > 0 ? Math.round((r.sales / totalSales) * 100) : 0
    }))
  } catch (e: any) {
    console.error('Error loading daily report:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load daily report',
      life: 5000
    })
  } finally {
    isLoading.value = false
  }
}

function handleExportCSV() {
  if (!salesData.value) return

  const dateStr = toLocalDateStr(selectedDate.value)
  const rows = [
    { field: 'Gross Sales', value: salesData.value.grossSales },
    { field: 'Discounts', value: salesData.value.discountTotal },
    { field: 'Net Sales', value: salesData.value.netSales },
    { field: 'VATable Sales', value: salesData.value.vatableSales },
    { field: 'VAT Amount', value: salesData.value.vatAmount },
    { field: 'VAT-Exempt Sales', value: salesData.value.vatExemptSales },
    { field: 'Zero-Rated Sales', value: salesData.value.zeroRatedSales },
    { field: 'Transaction Count', value: salesData.value.transactionCount },
    { field: 'Average Ticket', value: salesData.value.averageTicket },
    { field: 'Void Count', value: salesData.value.voidCount },
    { field: 'Void Amount', value: salesData.value.voidAmount },
    { field: 'Refund Count', value: salesData.value.refundCount },
    { field: 'Refund Amount', value: salesData.value.refundAmount }
  ]

  const csv = toCSV(rows as unknown as Record<string, unknown>[], [
    { key: 'field', header: 'Field' },
    { key: 'value', header: 'Value', formatter: (v) => String(v) }
  ])

  downloadCSV(csv, `daily-sales-${dateStr}`)
  toast.add({
    severity: 'info',
    summary: 'Export',
    detail: 'Daily sales report exported to CSV',
    life: 2000
  })
}

function handlePrint() {
  window.print()
}

function goBack() {
  router.push('/reports')
}
</script>

<template>
  <div class="daily-sales-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div>
          <h1>Daily Sales Report</h1>
          <p class="text-muted">{{ formattedDate }}</p>
        </div>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="selectedDate"
          dateFormat="yy-mm-dd"
          showIcon
          :maxDate="new Date()"
        />
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :disabled="!salesData"
          @click="handleExportCSV"
        />
        <Button
          label="Print"
          icon="pi pi-print"
          severity="secondary"
          outlined
          @click="handlePrint()"
        />
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <ProgressSpinner />
      <p>Loading daily report...</p>
    </div>

    <template v-else-if="salesData">
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

      <div class="report-sections">
        <!-- VAT Breakdown -->
        <div class="section-card">
          <h3>VAT Breakdown</h3>
          <div class="summary-rows">
            <div class="summary-row">
              <span>VATable Sales</span>
              <span class="amount">{{ formatCurrency(salesData.vatableSales) }}</span>
            </div>
            <div class="summary-row">
              <span>VAT Amount (12%)</span>
              <span class="amount">{{ formatCurrency(salesData.vatAmount) }}</span>
            </div>
            <div class="summary-row">
              <span>VAT-Exempt Sales</span>
              <span class="amount">{{ formatCurrency(salesData.vatExemptSales) }}</span>
            </div>
            <div class="summary-row">
              <span>Zero-Rated Sales</span>
              <span class="amount">{{ formatCurrency(salesData.zeroRatedSales) }}</span>
            </div>
          </div>
        </div>

        <!-- Voids & Refunds -->
        <div class="section-card">
          <h3>Voids & Refunds</h3>
          <div class="summary-rows">
            <div class="summary-row">
              <span>Void Count</span>
              <span>{{ salesData.voidCount }}</span>
            </div>
            <div class="summary-row">
              <span>Void Amount</span>
              <span class="amount negative">{{ formatCurrency(salesData.voidAmount) }}</span>
            </div>
            <div class="summary-row">
              <span>Refund Count</span>
              <span>{{ salesData.refundCount }}</span>
            </div>
            <div class="summary-row">
              <span>Refund Amount</span>
              <span class="amount negative">{{ formatCurrency(salesData.refundAmount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-sections">
        <!-- Hourly Breakdown -->
        <div class="section-card" v-if="hourlyData.length > 0">
          <h3>Sales by Hour</h3>
          <DataTable :value="hourlyData" size="small" stripedRows>
            <Column field="hour" header="Hour" />
            <Column field="sales" header="Sales">
              <template #body="{ data }">
                <span class="amount">{{ formatCurrency(data.sales) }}</span>
              </template>
            </Column>
            <Column field="count" header="Transactions" />
          </DataTable>
        </div>

        <!-- Payment Breakdown -->
        <div class="section-card" v-if="paymentData.length > 0">
          <h3>Sales by Payment Method</h3>
          <DataTable :value="paymentData" size="small" stripedRows>
            <Column field="method" header="Method" />
            <Column field="amount" header="Amount">
              <template #body="{ data }">
                <span class="amount">{{ formatCurrency(data.amount) }}</span>
              </template>
            </Column>
            <Column field="count" header="Count" />
            <Column field="percentage" header="%">
              <template #body="{ data }">
                {{ data.percentage }}%
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="section-card" v-if="categoryData.length > 0">
        <h3>Sales by Category</h3>
        <DataTable :value="categoryData" size="small" stripedRows>
          <Column field="name" header="Category" />
          <Column field="sales" header="Sales">
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.sales) }}</span>
            </template>
          </Column>
          <Column field="quantity" header="Qty Sold" />
          <Column field="percentage" header="%">
            <template #body="{ data }">
              {{ data.percentage }}%
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <div v-else class="empty-state">
      <i class="pi pi-chart-bar" style="font-size: 3rem; color: var(--app-surface-300)"></i>
      <h3>No Sales Data</h3>
      <p>No sales transactions found for this date</p>
    </div>
  </div>
</template>

<style scoped>
.daily-sales-view {
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
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
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

.summary-card--blue .card-icon {
  background: var(--p-blue-50);
  color: var(--p-blue-500);
}

.summary-card--green .card-icon {
  background: var(--p-green-50);
  color: var(--p-green-500);
}

.summary-card--purple .card-icon {
  background: var(--p-purple-50);
  color: var(--p-purple-500);
}

.summary-card--orange .card-icon {
  background: var(--p-orange-50);
  color: var(--p-orange-500);
}

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
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-surface-900);
}

.report-sections {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-card {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.section-card h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-surface-700);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--p-surface-600);
}

.amount {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--p-surface-800);
}

.negative {
  color: var(--p-red-500);
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

.empty-state p {
  margin: 0;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

@media (max-width: 767.98px) {
  .daily-sales-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .report-sections {
    grid-template-columns: 1fr;
  }
}
</style>
