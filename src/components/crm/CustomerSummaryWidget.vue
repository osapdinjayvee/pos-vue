<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useCustomers } from '@/composables/useCustomers'

const router = useRouter()
const { fetchActiveCount, fetchNewCustomerCount, fetchAveragePoints } = useCustomers()

const totalCustomers = ref(0)
const newThisMonth = ref(0)
const avgPoints = ref(0)
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, newCount, points] = await Promise.all([
      fetchActiveCount(),
      fetchNewCustomerCount({ start: startOfMonth.toISOString(), end: now.toISOString() }),
      fetchAveragePoints()
    ])

    totalCustomers.value = total
    newThisMonth.value = newCount
    avgPoints.value = points
  } catch (e) {
    console.error('Failed to load customer summary:', e)
  } finally {
    loading.value = false
  }
}

function viewInsights() {
  router.push('/customer-insights')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="customer-widget">
    <div class="widget-header">
      <h3>Customers</h3>
      <Button label="View Insights" icon="pi pi-arrow-right" iconPos="right" text size="small" @click="viewInsights" />
    </div>

    <div class="widget-stats">
      <div class="widget-stat">
        <div class="stat-icon" style="background: var(--p-blue-50); color: var(--p-blue-600);">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-detail">
          <span class="stat-value">{{ totalCustomers.toLocaleString() }}</span>
          <span class="stat-label">Total Active</span>
        </div>
      </div>

      <div class="widget-stat">
        <div class="stat-icon" style="background: var(--p-green-50); color: var(--p-green-600);">
          <i class="pi pi-user-plus"></i>
        </div>
        <div class="stat-detail">
          <span class="stat-value">{{ newThisMonth.toLocaleString() }}</span>
          <span class="stat-label">New This Month</span>
        </div>
      </div>

      <div class="widget-stat">
        <div class="stat-icon" style="background: var(--p-orange-50); color: var(--p-orange-600);">
          <i class="pi pi-star"></i>
        </div>
        <div class="stat-detail">
          <span class="stat-value">{{ avgPoints.toLocaleString() }}</span>
          <span class="stat-label">Avg. Points</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-widget {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 12px;
  padding: 1.25rem;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.widget-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.widget-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.widget-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  font-size: 1rem;
  flex-shrink: 0;
}

.stat-detail {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}
</style>
