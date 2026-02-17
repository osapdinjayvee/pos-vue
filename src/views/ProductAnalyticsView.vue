<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import TopProductsTable from '@/components/analytics/TopProductsTable.vue'
import CategorySalesChart from '@/components/analytics/CategorySalesChart.vue'
import SlowMoversTable from '@/components/analytics/SlowMoversTable.vue'
import ProductComparison from '@/components/analytics/ProductComparison.vue'
import { productAnalyticsService } from '@/services/productAnalyticsService'
import type {
  TopProductItem,
  CategorySalesItem,
  SlowMoverItem,
  ProductComparisonData
} from '@/types/analytics'
import db from '@/db/database'
import { toLocalDateStr } from '@/utils/dateHelpers'

const toast = useToast()

// Date range — default last 30 days
const now = new Date()
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(now.getDate() - 30)

const dateRange = ref<Date[]>([thirtyDaysAgo, now])

// Data state
const topProducts = ref<TopProductItem[]>([])
const categoryData = ref<CategorySalesItem[]>([])
const slowMovers = ref<SlowMoverItem[]>([])
const compareData = ref<ProductComparisonData[]>([])

// Loading flags
const loadingTop = ref(false)
const loadingCategory = ref(false)
const loadingSlow = ref(false)
const loadingCompare = ref(false)

// Comparison component ref
const comparisonRef = ref<InstanceType<typeof ProductComparison> | null>(null)

function formatDateStr(date: Date): string {
  return toLocalDateStr(date)
}

function getDateRange(): { dateFrom: string; dateTo: string } {
  const dates = dateRange.value
  if (dates && dates.length === 2 && dates[0] && dates[1]) {
    return {
      dateFrom: formatDateStr(dates[0]),
      dateTo: formatDateStr(dates[1])
    }
  }
  return {
    dateFrom: formatDateStr(thirtyDaysAgo),
    dateTo: formatDateStr(now)
  }
}

async function loadTopProducts() {
  loadingTop.value = true
  try {
    const { dateFrom, dateTo } = getDateRange()
    topProducts.value = await productAnalyticsService.getTopProducts(dateFrom, dateTo, 20)
  } catch (e: any) {
    console.error('Error loading top products:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load top products',
      life: 5000
    })
  } finally {
    loadingTop.value = false
  }
}

async function loadCategorySales() {
  loadingCategory.value = true
  try {
    const { dateFrom, dateTo } = getDateRange()
    categoryData.value = await productAnalyticsService.getCategorySales(dateFrom, dateTo)
  } catch (e: any) {
    console.error('Error loading category sales:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load category sales',
      life: 5000
    })
  } finally {
    loadingCategory.value = false
  }
}

async function loadSlowMovers() {
  loadingSlow.value = true
  try {
    const { dateFrom, dateTo } = getDateRange()
    slowMovers.value = await productAnalyticsService.getSlowMovers(dateFrom, dateTo, 5)
  } catch (e: any) {
    console.error('Error loading slow movers:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load slow movers',
      life: 5000
    })
  } finally {
    loadingSlow.value = false
  }
}

async function loadAllData() {
  await Promise.all([
    loadTopProducts(),
    loadCategorySales(),
    loadSlowMovers()
  ])
}

async function handleCompareSearch(query: string) {
  try {
    const rows = await db.query<{ id: string; name: string; sku: string }>(
      `SELECT id, name, sku FROM products WHERE status = 'active' AND (name LIKE ? OR sku LIKE ?) LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    )
    comparisonRef.value?.setSuggestions(rows)
  } catch (e: any) {
    console.error('Error searching products:', e)
  }
}

async function handleCompareSelect(productIds: string[]) {
  loadingCompare.value = true
  try {
    const { dateFrom, dateTo } = getDateRange()
    compareData.value = await productAnalyticsService.compareProducts(productIds, dateFrom, dateTo)
  } catch (e: any) {
    console.error('Error loading comparison:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to load product comparison',
      life: 5000
    })
  } finally {
    loadingCompare.value = false
  }
}

function handleApplyDateRange() {
  loadAllData()
  // Also refresh comparison if products are selected
  if (compareData.value.length > 0) {
    const ids = compareData.value.map(d => d.productId)
    handleCompareSelect(ids)
  }
}

// Watch date range changes (when user selects both dates)
watch(dateRange, (newVal) => {
  if (newVal && newVal.length === 2 && newVal[0] && newVal[1]) {
    handleApplyDateRange()
  }
})

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <div class="product-analytics-view">
    <Toast />

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <h1>Product Analytics</h1>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          dateFormat="yy-mm-dd"
          showIcon
          :maxDate="new Date()"
          placeholder="Select date range"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="handleApplyDateRange"
        />
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Row 1: Top Products (full width) -->
      <div class="full-width-row">
        <TopProductsTable :products="topProducts" :loading="loadingTop" />
      </div>

      <!-- Row 2: Category Chart + Slow Movers -->
      <div class="data-row">
        <CategorySalesChart :categoryData="categoryData" :loading="loadingCategory" />
        <SlowMoversTable :products="slowMovers" :loading="loadingSlow" />
      </div>

      <!-- Row 3: Product Comparison (full width) -->
      <div class="full-width-row">
        <ProductComparison
          ref="comparisonRef"
          :compareData="compareData"
          :loading="loadingCompare"
          @search="handleCompareSearch"
          @select="handleCompareSelect"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-analytics-view {
  padding: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 767.98px) {
  .header-actions {
    width: 100%;
  }
}
</style>
