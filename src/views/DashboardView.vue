<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import PaymentChart from '@/components/dashboard/PaymentChart.vue'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'
import TopProducts from '@/components/dashboard/TopProducts.vue'
import LowStockList from '@/components/inventory/LowStockList.vue'
import CustomerSummaryWidget from '@/components/crm/CustomerSummaryWidget.vue'
import EISDashboardWidget from '@/components/eis/EISDashboardWidget.vue'
import SalesTrendChart from '@/components/analytics/SalesTrendChart.vue'
import PeriodComparisonCard from '@/components/analytics/PeriodComparisonCard.vue'
import PeriodSelector from '@/components/analytics/PeriodSelector.vue'
import DataFreshnessBanner from '@/components/analytics/DataFreshnessBanner.vue'
import { useAnalytics } from '@/composables/useAnalytics'
import { formatCurrency } from '@/types/report'
import db from '@/db/database'
import type { StatsData } from '@/types'
import type { AnalyticsPeriod } from '@/types/analytics'
import type { DisplayStockAlert } from '@/types/inventory'

const router = useRouter()
const {
  todayMetrics,
  salesTrend,
  periodComparison,
  isLoading,
  isAggregating,
  currentPeriod,
  lastUpdatedLabel,
  isDataStale,
  loadDashboard,
  changePeriod,
  ensureFreshData,
  refreshData,
  getPeriodDates
} = useAnalytics()

// Reactive date range derived from current period
const periodDates = computed(() => getPeriodDates())

// Inventory summary (loaded once)
const inventoryStats = ref<{
  totalUnits: number
  inventoryValue: number
  retailValue: number
  expectedProfit: number
  profitMargin: number
  totalProducts: number
  lowStock: number
  outOfStock: number
} | null>(null)

async function loadInventoryStats() {
  const result = await db.getOne<{
    total_products: number
    total_units: number
    inventory_value: number
    retail_value: number
    low_stock: number
    out_of_stock: number
  }>(
    `SELECT
      COUNT(*) as total_products,
      COALESCE(SUM(p.stock), 0) as total_units,
      COALESCE(SUM(p.stock * COALESCE(
        (SELECT sm.unit_cost
         FROM stock_movements sm
         JOIN product_variants pv ON pv.id = sm.variant_id
         WHERE pv.product_id = p.id
           AND sm.movement_type = 'receive'
           AND sm.unit_cost IS NOT NULL
         ORDER BY sm.created_at DESC LIMIT 1),
        p.cost
      )), 0) as inventory_value,
      COALESCE(SUM(p.stock * p.price), 0) as retail_value,
      COALESCE(SUM(CASE WHEN p.stock > 0 AND p.stock <= p.low_stock_threshold THEN 1 ELSE 0 END), 0) as low_stock,
      COALESCE(SUM(CASE WHEN p.stock = 0 THEN 1 ELSE 0 END), 0) as out_of_stock
     FROM products p WHERE p.status != 'inactive'`
  )

  if (result) {
    const inv = result.inventory_value
    const ret = result.retail_value
    const profit = ret - inv
    inventoryStats.value = {
      totalProducts: result.total_products,
      totalUnits: result.total_units,
      inventoryValue: inv,
      retailValue: ret,
      expectedProfit: profit,
      profitMargin: ret > 0 ? (profit / ret) * 100 : 0,
      lowStock: result.low_stock,
      outOfStock: result.out_of_stock
    }
  }
}

// Items sold for the period
const itemsSold = ref(0)
async function loadItemsSold() {
  const dates = getPeriodDates()
  const result = await db.getOne<{ total: number }>(
    `SELECT COALESCE(SUM(ti.quantity), 0) as total
     FROM transaction_items ti
     INNER JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'completed' AND t.total_amount >= 0
       AND date(t.created_at) >= ? AND date(t.created_at) <= ?`,
    [dates.from, dates.to]
  )
  itemsSold.value = result?.total || 0
}

// Sales stat cards (top row)
const salesStats = computed<StatsData[]>(() => {
  const metrics = todayMetrics.value
  const comparison = periodComparison.value
  const trendLabel = comparison?.periodLabel || 'vs previous'

  if (!metrics) {
    return [
      { label: 'Total Sales', value: '₱0.00', icon: 'pi pi-wallet', trend: 0, trendLabel: 'No data', color: 'green' },
      { label: 'Net Income', value: '₱0.00', icon: 'pi pi-chart-line', trend: 0, trendLabel: 'No data', color: 'blue' },
      { label: 'Transactions', value: '0', icon: 'pi pi-receipt', trend: 0, trendLabel: 'No data', color: 'purple' },
      { label: 'Items Sold', value: '0', icon: 'pi pi-shopping-bag', trend: 0, trendLabel: 'No data', color: 'orange' }
    ]
  }

  const grossTrend = comparison?.grossChangePercent || 0
  const txTrend = comparison?.transactionChangePercent || 0

  return [
    {
      label: 'Total Sales',
      value: formatCurrency(metrics.grossSales),
      icon: 'pi pi-wallet',
      trend: parseFloat(grossTrend.toFixed(1)),
      trendLabel,
      color: 'green'
    },
    {
      label: 'Net Income',
      value: formatCurrency(metrics.netSales),
      icon: 'pi pi-chart-line',
      trend: parseFloat(grossTrend.toFixed(1)),
      trendLabel,
      color: 'blue'
    },
    {
      label: 'Transactions',
      value: metrics.transactionCount.toLocaleString(),
      icon: 'pi pi-receipt',
      trend: parseFloat(txTrend.toFixed(1)),
      trendLabel,
      color: 'purple',
      subtitle: metrics.voidCount > 0 ? `${metrics.voidCount} voided` : undefined
    },
    {
      label: 'Items Sold',
      value: itemsSold.value.toLocaleString(),
      icon: 'pi pi-shopping-bag',
      trend: 0,
      trendLabel,
      color: 'orange'
    }
  ]
})

// Inventory stat cards (second row)
const inventoryStatsCards = computed<StatsData[]>(() => {
  const inv = inventoryStats.value

  if (!inv) {
    return [
      { label: 'Inventory Value', value: '₱0.00', icon: 'pi pi-box', trend: 0, trendLabel: '', color: 'teal' },
      { label: 'Retail Value', value: '₱0.00', icon: 'pi pi-tag', trend: 0, trendLabel: '', color: 'blue' },
      { label: 'Expected Profit', value: '₱0.00', icon: 'pi pi-arrow-up-right', trend: 0, trendLabel: '', color: 'green' },
      { label: 'Stock Status', value: '0', icon: 'pi pi-warehouse', trend: 0, trendLabel: '', color: 'orange' }
    ]
  }

  return [
    {
      label: 'Inventory Value',
      value: formatCurrency(inv.inventoryValue),
      icon: 'pi pi-box',
      trend: 0,
      trendLabel: `${inv.totalUnits.toLocaleString()} units in stock`,
      color: 'teal',
      subtitle: `${inv.totalProducts} products`
    },
    {
      label: 'Retail Value',
      value: formatCurrency(inv.retailValue),
      icon: 'pi pi-tag',
      trend: 0,
      trendLabel: 'at selling price',
      color: 'blue'
    },
    {
      label: 'Expected Profit',
      value: formatCurrency(inv.expectedProfit),
      icon: 'pi pi-trending-up',
      trend: 0,
      trendLabel: `${inv.profitMargin.toFixed(1)}% margin`,
      color: 'green'
    },
    {
      label: 'Stock Alerts',
      value: `${inv.lowStock + inv.outOfStock}`,
      icon: 'pi pi-exclamation-triangle',
      trend: 0,
      trendLabel: `${inv.lowStock} low, ${inv.outOfStock} out`,
      color: inv.outOfStock > 0 ? 'red' : inv.lowStock > 0 ? 'orange' : 'green'
    }
  ]
})

function handleViewProduct(alert: DisplayStockAlert) {
  router.push(`/products/${alert.productId}`)
}

function handleAddStock(alert: DisplayStockAlert) {
  router.push(`/products/${alert.productId}`)
}

async function handlePeriodChange(payload: { period: AnalyticsPeriod; dateFrom: string; dateTo: string }) {
  await changePeriod(payload.period, payload.dateFrom, payload.dateTo)
  await loadItemsSold()
}

onMounted(async () => {
  await ensureFreshData()
  await Promise.all([
    loadDashboard(),
    loadInventoryStats(),
    loadItemsSold()
  ])
})
</script>

<template>
  <div class="dashboard-grid">
    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Dashboard</h1>
          <p class="text-muted">Business overview and performance</p>
        </div>
      </div>
      <div class="header-right">
        <PeriodSelector v-model="currentPeriod" @change="handlePeriodChange" />
      </div>
    </div>

    <DataFreshnessBanner
      :lastUpdated="lastUpdatedLabel"
      :isStale="isDataStale"
      :isRefreshing="isAggregating"
      @refresh="refreshData"
    />

    <!-- Section: Sales Overview -->
    <div class="section-label">Sales Overview</div>
    <div class="stats-row">
      <StatsCard v-for="stat in salesStats" :key="stat.label" :data="stat" />
    </div>

    <!-- Section: Inventory Overview -->
    <div class="section-label">Inventory Overview</div>
    <div class="stats-row">
      <StatsCard v-for="stat in inventoryStatsCards" :key="stat.label" :data="stat" />
    </div>

    <!-- Sales Trend + Period Comparison -->
    <div class="charts-row">
      <SalesTrendChart
        :chartData="salesTrend"
        :period="currentPeriod"
        :loading="isLoading"
      />
      <PeriodComparisonCard
        :data="periodComparison"
        :loading="isLoading"
      />
    </div>

    <!-- Category Breakdown + Payment Methods -->
    <div class="data-row">
      <SalesChart :dateFrom="periodDates.from" :dateTo="periodDates.to" />
      <PaymentChart :dateFrom="periodDates.from" :dateTo="periodDates.to" />
    </div>

    <!-- Top Products + Recent Transactions -->
    <div class="data-row">
      <TopProducts :dateFrom="periodDates.from" :dateTo="periodDates.to" />
      <RecentOrders :dateFrom="periodDates.from" :dateTo="periodDates.to" />
    </div>

    <!-- Low Stock + Customers -->
    <div class="data-row">
      <LowStockList
        @view-product="handleViewProduct"
        @add-stock="handleAddStock"
      />
      <CustomerSummaryWidget />
    </div>

    <!-- EIS -->
    <div class="full-width-row">
      <EISDashboardWidget />
    </div>
  </div>
</template>

<style scoped>
.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  margin-bottom: -0.75rem;
}
</style>
