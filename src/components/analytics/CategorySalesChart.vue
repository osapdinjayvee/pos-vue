<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import type { CategorySalesItem } from '@/types/analytics'

const props = defineProps<{
  categoryData: CategorySalesItem[]
  loading?: boolean
}>()

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899'  // pink
]

const chartData = computed(() => ({
  labels: props.categoryData.map(c => c.categoryName),
  datasets: [
    {
      data: props.categoryData.map(c => c.sales),
      backgroundColor: props.categoryData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      hoverBackgroundColor: props.categoryData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 2,
      borderColor: 'var(--p-surface-0)'
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.parsed || 0
          const formatted = `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          const percentage = props.categoryData[ctx.dataIndex]?.percentage?.toFixed(1) || '0.0'
          return ` ${ctx.label}: ${formatted} (${percentage}%)`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Sales by Category</h3>
    </div>

    <div v-if="loading" class="chart-skeleton">
      <Skeleton shape="circle" size="200px" />
    </div>

    <div v-else-if="categoryData.length === 0" class="chart-empty">
      <i class="pi pi-chart-pie" style="font-size: 2rem; color: var(--p-surface-300);"></i>
      <p class="text-muted">No category data available</p>
    </div>

    <div v-else class="chart-container">
      <Chart type="doughnut" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.chart-skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 350px;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 350px;
}

.chart-container {
  height: 350px;
  position: relative;
}

.text-muted {
  color: var(--p-surface-500);
  font-size: 0.875rem;
  margin: 0;
}
</style>
