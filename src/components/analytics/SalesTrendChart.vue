<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import { useTheme } from '@/composables/useTheme'
import type { SalesTrendPoint, AnalyticsPeriod } from '@/types/analytics'

const props = defineProps<{
  chartData: SalesTrendPoint[]
  period: AnalyticsPeriod
  loading?: boolean
}>()

const { isDark } = useTheme()

const data = computed(() => ({
  labels: props.chartData.map(p => p.label),
  datasets: [
    {
      label: 'Sales',
      data: props.chartData.map(p => p.sales),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: props.chartData.length > 31 ? 0 : 3,
      pointHoverRadius: 5
    }
  ]
}))

const options = computed(() => ({
  maintainAspectRatio: false,
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `Sales: ₱${ctx.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 12
      }
    },
    y: {
      grid: { color: isDark.value ? '#334155' : '#e2e8f0' },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        callback: (value: number) => '₱' + value.toLocaleString()
      }
    }
  }
}))
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Sales Trend</h3>
      <span class="text-muted" style="font-size: 0.75rem;">
        {{ period === 'today' ? 'Hourly' : 'Daily' }}
      </span>
    </div>
    <div v-if="loading" style="height: 300px; display: flex; align-items: center; justify-content: center;">
      <Skeleton height="260px" width="100%" />
    </div>
    <div v-else-if="chartData.length === 0" style="height: 300px; display: flex; align-items: center; justify-content: center;">
      <p class="text-muted">No data for selected period</p>
    </div>
    <div v-else style="height: 300px;">
      <Chart type="line" :data="data" :options="options" />
    </div>
  </div>
</template>
