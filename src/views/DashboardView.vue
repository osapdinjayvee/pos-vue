<script setup lang="ts">
import { onMounted, computed } from 'vue'
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

// Derive stats cards from live analytics data
const liveStatsData = computed<StatsData[]>(() => {
  const metrics = todayMetrics.value
  const comparison = periodComparison.value

  if (!metrics) {
    return [
      { label: 'Gross Sales', value: '₱0.00', icon: 'pi pi-dollar', trend: 0, trendLabel: 'No data', color: 'green' },
      { label: 'Transactions', value: '0', icon: 'pi pi-shopping-cart', trend: 0, trendLabel: 'No data', color: 'blue' },
      { label: 'Avg. Ticket', value: '₱0.00', icon: 'pi pi-chart-line', trend: 0, trendLabel: 'No data', color: 'orange' },
      { label: 'Net Sales', value: '₱0.00', icon: 'pi pi-wallet', trend: 0, trendLabel: 'No data', color: 'purple' }
    ]
  }

  const grossTrend = comparison?.grossChangePercent || 0
  const txTrend = comparison?.transactionChangePercent || 0
  const avgTrend = comparison?.avgTicketChangePercent || 0
  const trendLabel = comparison?.periodLabel || 'vs previous'

  return [
    {
      label: 'Gross Sales',
      value: formatCurrency(metrics.grossSales),
      icon: 'pi pi-dollar',
      trend: parseFloat(grossTrend.toFixed(1)),
      trendLabel,
      color: 'green'
    },
    {
      label: 'Transactions',
      value: metrics.transactionCount.toLocaleString(),
      icon: 'pi pi-shopping-cart',
      trend: parseFloat(txTrend.toFixed(1)),
      trendLabel,
      color: 'blue'
    },
    {
      label: 'Avg. Ticket',
      value: formatCurrency(metrics.averageTicket),
      icon: 'pi pi-chart-line',
      trend: parseFloat(avgTrend.toFixed(1)),
      trendLabel,
      color: 'orange'
    },
    {
      label: 'Net Sales',
      value: formatCurrency(metrics.netSales),
      icon: 'pi pi-wallet',
      trend: parseFloat(grossTrend.toFixed(1)),
      trendLabel,
      color: 'purple'
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
}

onMounted(async () => {
  await ensureFreshData()
  await loadDashboard()
})
</script>

<template>
  <div class="dashboard-grid">
    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Dashboard</h1>
          <p class="text-muted">Overview of business performance</p>
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

    <!-- Row 1: Stats Cards -->
    <div class="stats-row">
      <StatsCard v-for="stat in liveStatsData" :key="stat.label" :data="stat" />
    </div>

    <!-- Row 2: Sales Trend + Period Comparison -->
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

    <!-- Row 3: Category Breakdown + Payment Methods -->
    <div class="data-row">
      <SalesChart :dateFrom="periodDates.from" :dateTo="periodDates.to" />
      <PaymentChart :dateFrom="periodDates.from" :dateTo="periodDates.to" />
    </div>

    <!-- Row 4: Top Products + Recent Transactions -->
    <div class="data-row">
      <TopProducts :dateFrom="periodDates.from" :dateTo="periodDates.to" />
      <RecentOrders :dateFrom="periodDates.from" :dateTo="periodDates.to" />
    </div>

    <!-- Row 5: Inventory, Customers, EIS -->
    <div class="data-row">
      <LowStockList
        @view-product="handleViewProduct"
        @add-stock="handleAddStock"
      />
      <CustomerSummaryWidget />
    </div>

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
</style>
