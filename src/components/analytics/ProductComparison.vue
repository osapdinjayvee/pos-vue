<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import type { ProductComparisonData } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

const props = defineProps<{
  compareData: ProductComparisonData[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'search': [query: string]
  'select': [productIds: string[]]
}>()

const productA = ref<any>(null)
const productB = ref<any>(null)
const suggestions = ref<any[]>([])

function handleSearch(event: { query: string }) {
  emit('search', event.query)
}

// Expose method for parent to update suggestions
defineExpose({
  setSuggestions(items: any[]) {
    suggestions.value = items
  }
})

watch([productA, productB], () => {
  const ids: string[] = []
  if (productA.value?.id) ids.push(productA.value.id)
  if (productB.value?.id) ids.push(productB.value.id)
  if (ids.length > 0) {
    emit('select', ids)
  }
})

const dataA = computed(() => props.compareData[0] || null)
const dataB = computed(() => props.compareData[1] || null)

const COMPARE_COLORS = ['#3b82f6', '#f59e0b']

const trendChartData = computed(() => {
  if (!dataA.value) return null

  // Use product A labels as the baseline
  const labels = dataA.value.trendData.map(p => p.label)

  const datasets: any[] = [
    {
      label: dataA.value.productName,
      data: dataA.value.trendData.map(p => p.sales),
      borderColor: COMPARE_COLORS[0],
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: false,
      pointRadius: labels.length > 31 ? 0 : 3
    }
  ]

  if (dataB.value) {
    datasets.push({
      label: dataB.value.productName,
      data: dataB.value.trendData.map(p => p.sales),
      borderColor: COMPARE_COLORS[1],
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.4,
      fill: false,
      pointRadius: labels.length > 31 ? 0 : 3
    })
  }

  return { labels, datasets }
})

const trendChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          ` ${ctx.dataset.label}: \u20B1${ctx.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
    },
    y: {
      ticks: {
        callback: (value: number) => '\u20B1' + value.toLocaleString()
      }
    }
  }
}))
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Product Comparison</h3>
    </div>

    <!-- Search Inputs -->
    <div class="comparison-inputs">
      <div class="input-group">
        <label class="input-label">Product A</label>
        <AutoComplete
          v-model="productA"
          :suggestions="suggestions"
          optionLabel="name"
          placeholder="Search product..."
          @complete="handleSearch"
          :minLength="2"
          class="comparison-autocomplete"
        />
      </div>
      <div class="input-group">
        <label class="input-label">Product B</label>
        <AutoComplete
          v-model="productB"
          :suggestions="suggestions"
          optionLabel="name"
          placeholder="Search product..."
          @complete="handleSearch"
          :minLength="2"
          class="comparison-autocomplete"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="comparison-loading">
      <Skeleton height="120px" width="100%" />
    </div>

    <!-- Comparison Data -->
    <div v-else-if="compareData.length > 0" class="comparison-content">
      <!-- Side-by-side Cards -->
      <div class="comparison-cards">
        <div
          v-for="(product, idx) in compareData"
          :key="product.productId"
          class="comparison-card"
          :class="`comparison-card--${idx === 0 ? 'a' : 'b'}`"
        >
          <h4 class="comparison-card-title">{{ product.productName }}</h4>
          <div class="comparison-metrics">
            <div class="metric">
              <span class="metric-label">Units Sold</span>
              <span class="metric-value">{{ product.unitsSold.toLocaleString() }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Revenue</span>
              <span class="metric-value">{{ formatCurrency(product.revenue) }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Profit</span>
              <span class="metric-value" :class="{ 'text-positive': product.profit > 0, 'text-negative': product.profit < 0 }">
                {{ formatCurrency(product.profit) }}
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Price</span>
              <span class="metric-value">{{ formatCurrency(product.avgPrice) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div v-if="trendChartData" class="comparison-chart">
        <h4 class="comparison-chart-title">Revenue Trend</h4>
        <div class="chart-wrapper">
          <Chart type="line" :data="trendChartData" :options="trendChartOptions" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="comparison-empty">
      <i class="pi pi-search" style="font-size: 2rem; color: var(--p-surface-300);"></i>
      <p>Search and select products above to compare</p>
    </div>
  </div>
</template>

<style scoped>
.comparison-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-surface-500);
}

.comparison-autocomplete {
  width: 100%;
}

.comparison-autocomplete :deep(.p-autocomplete-input) {
  width: 100%;
}

.comparison-loading {
  padding: 1rem 0;
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.comparison-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.comparison-card {
  border-radius: 10px;
  padding: 1.25rem;
  border: 1px solid var(--p-surface-200);
  background: var(--p-surface-50);
}

.comparison-card--a {
  border-top: 3px solid #3b82f6;
}

.comparison-card--b {
  border-top: 3px solid #f59e0b;
}

.comparison-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-surface-800);
  margin: 0 0 1rem;
}

.comparison-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.metric-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-surface-500);
}

.metric-value {
  font-size: 0.9375rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: var(--p-surface-800);
}

.text-positive {
  color: #10b981;
}

.text-negative {
  color: #ef4444;
}

.comparison-chart {
  border: 1px solid var(--p-surface-200);
  border-radius: 10px;
  padding: 1rem;
  background: var(--p-surface-50);
}

.comparison-chart-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-surface-700);
  margin: 0 0 0.75rem;
}

.chart-wrapper {
  height: 250px;
  position: relative;
}

.comparison-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .comparison-inputs,
  .comparison-cards {
    grid-template-columns: 1fr;
  }

  .comparison-metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
