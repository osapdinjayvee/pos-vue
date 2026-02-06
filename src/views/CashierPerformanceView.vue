<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import CashierRankingTable from '@/components/analytics/CashierRankingTable.vue'
import CashierComparisonCards from '@/components/analytics/CashierComparisonCards.vue'
import CashierVoidDrilldown from '@/components/analytics/CashierVoidDrilldown.vue'
import { cashierAnalyticsService } from '@/services/cashierAnalyticsService'
import type { CashierMetrics, CashierVoidDetail } from '@/types/analytics'

const toast = useToast()

// State
const loading = ref(false)
const voidLoading = ref(false)
const cashiers = ref<CashierMetrics[]>([])
const selectedCashier = ref<CashierMetrics | null>(null)
const voidDetails = ref<CashierVoidDetail[]>([])
const voidDialogVisible = ref(false)

// Date range — default to last 30 days
const dateRange = ref<Date[]>([])

function initDateRange() {
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(now.getDate() - 30)
  dateRange.value = [thirtyDaysAgo, now]
}

// Formatted date strings for queries
const dateFrom = computed(() => {
  if (dateRange.value.length >= 1 && dateRange.value[0]) {
    const d = new Date(dateRange.value[0])
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
})

const dateTo = computed(() => {
  if (dateRange.value.length >= 2 && dateRange.value[1]) {
    const d = new Date(dateRange.value[1])
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
})

// Team average computed from all cashiers
const teamAvg = computed(() => {
  if (cashiers.value.length === 0) return null

  const count = cashiers.value.length
  const avgSales = cashiers.value.reduce((sum, c) => sum + c.totalSales, 0) / count
  const avgTransactions = cashiers.value.reduce((sum, c) => sum + c.transactionCount, 0) / count
  const avgVoidRate = cashiers.value.reduce((sum, c) => sum + c.voidRate, 0) / count

  return { avgSales, avgTransactions, avgVoidRate }
})

// Load cashier metrics
async function loadCashierMetrics() {
  loading.value = true
  selectedCashier.value = null
  voidDetails.value = []
  try {
    cashiers.value = await cashierAnalyticsService.getCashierRanking(
      dateFrom.value,
      dateTo.value,
      'totalSales'
    )
  } catch (error) {
    console.error('Failed to load cashier metrics:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load cashier performance data.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Handle cashier row selection
async function handleCashierSelect(cashier: CashierMetrics) {
  selectedCashier.value = cashier

  // Load void details
  if (cashier.voidCount > 0) {
    voidLoading.value = true
    voidDialogVisible.value = true
    try {
      voidDetails.value = await cashierAnalyticsService.getCashierVoidDetails(
        cashier.userId,
        dateFrom.value,
        dateTo.value
      )
    } catch (error) {
      console.error('Failed to load void details:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load void details.',
        life: 3000
      })
    } finally {
      voidLoading.value = false
    }
  } else {
    voidDetails.value = []
    voidDialogVisible.value = true
  }
}

// Date range change handler
function handleDateRangeChange() {
  if (dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    loadCashierMetrics()
  }
}

onMounted(() => {
  initDateRange()
  loadCashierMetrics()
})
</script>

<template>
  <div>
    <Toast />

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <h1>Cashier Performance</h1>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          placeholder="Select date range"
          dateFormat="yy-mm-dd"
          showIcon
          showButtonBar
          class="date-range-picker"
          @update:modelValue="handleDateRangeChange"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          severity="secondary"
          @click="loadCashierMetrics"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      <!-- Ranking Table (full width) -->
      <div class="full-width-row">
        <CashierRankingTable
          :cashiers="cashiers"
          :loading="loading"
          @select="handleCashierSelect"
        />
      </div>

      <!-- Comparison Cards (shown when cashier selected) -->
      <div v-if="selectedCashier" class="full-width-row">
        <CashierComparisonCards
          :selectedCashier="selectedCashier"
          :teamAvg="teamAvg"
        />
      </div>
    </div>

    <!-- Void Drilldown Dialog -->
    <CashierVoidDrilldown
      v-model:visible="voidDialogVisible"
      :cashier="selectedCashier"
      :voidDetails="voidDetails"
      :loading="voidLoading"
    />
  </div>
</template>

<style scoped>
.date-range-picker {
  width: 260px;
}

@media (max-width: 767.98px) {
  .date-range-picker {
    width: 100%;
  }
}
</style>
