<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import TopCustomers from '@/components/crm/TopCustomers.vue'
import CustomerDistribution from '@/components/crm/CustomerDistribution.vue'
import InactiveCustomers from '@/components/crm/InactiveCustomers.vue'
import CustomerExport from '@/components/crm/CustomerExport.vue'
import { useCustomers } from '@/composables/useCustomers'

const {
  fetchTopCustomers,
  fetchInactiveCustomers,
  fetchDistribution,
  fetchNewCustomerCount,
  fetchActiveCount,
  fetchAveragePoints
} = useCustomers()

const loading = ref(false)
const dateRange = ref<Date[]>([])
const totalCustomers = ref(0)
const newThisMonth = ref(0)
const activeCount = ref(0)
const avgPoints = ref(0)
const typeDistribution = ref<{ type: string; count: number }[]>([])
const tierDistribution = ref<{ tier_id: string | null; tier_name: string; count: number }[]>([])

const formattedDateRange = computed(() => {
  if (dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    return {
      start: dateRange.value[0].toISOString(),
      end: dateRange.value[1].toISOString()
    }
  }
  return undefined
})

async function loadInsights() {
  loading.value = true
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, newCount, active, points, dist] = await Promise.all([
      fetchActiveCount(),
      fetchNewCustomerCount({ start: startOfMonth.toISOString(), end: now.toISOString() }),
      fetchActiveCount(),
      fetchAveragePoints(),
      fetchDistribution()
    ])

    totalCustomers.value = total
    newThisMonth.value = newCount
    activeCount.value = active
    avgPoints.value = points
    typeDistribution.value = dist.types
    tierDistribution.value = dist.tiers
  } catch (e) {
    console.error('Failed to load insights:', e)
  } finally {
    loading.value = false
  }
}

function handleDateRangeChange() {
  // TopCustomers component watches the dateRange prop
}

onMounted(() => {
  loadInsights()
})
</script>

<template>
  <div class="insights-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h2 class="view-title">Customer Insights</h2>
        <p class="view-subtitle">Analyze customer behavior and engagement</p>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          placeholder="Filter by date range"
          dateFormat="yy-mm-dd"
          showIcon
          showButtonBar
          class="date-range-picker"
          @update:modelValue="handleDateRangeChange"
        />
        <CustomerExport />
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--p-blue-50); color: var(--p-blue-600);">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ totalCustomers.toLocaleString() }}</span>
          <span class="stat-label">Total Customers</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--p-green-50); color: var(--p-green-600);">
          <i class="pi pi-user-plus"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ newThisMonth.toLocaleString() }}</span>
          <span class="stat-label">New This Month</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--p-purple-50); color: var(--p-purple-600);">
          <i class="pi pi-check-circle"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ activeCount.toLocaleString() }}</span>
          <span class="stat-label">Active Customers</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--p-orange-50); color: var(--p-orange-600);">
          <i class="pi pi-star"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ avgPoints.toLocaleString() }}</span>
          <span class="stat-label">Avg. Points</span>
        </div>
      </div>
    </div>

    <!-- Top Customers -->
    <div class="section-card">
      <div class="section-header">
        <h3>Top Customers by Spend</h3>
      </div>
      <TopCustomers :dateRange="formattedDateRange" :limit="10" />
    </div>

    <!-- Distribution + Inactive -->
    <div class="two-col-row">
      <div class="section-card">
        <div class="section-header">
          <h3>Customer Distribution</h3>
        </div>
        <CustomerDistribution
          :typeDistribution="typeDistribution"
          :tierDistribution="tierDistribution"
        />
      </div>
      <div class="section-card">
        <div class="section-header">
          <h3>Inactive Customers</h3>
        </div>
        <InactiveCustomers :inactiveDays="30" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.insights-view {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.view-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.view-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.date-range-picker {
  width: 260px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 10px;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-top: 0.125rem;
}

.section-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.two-col-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1023.98px) {
  .two-col-row {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767.98px) {
  .insights-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .date-range-picker {
    width: 100%;
  }

  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
