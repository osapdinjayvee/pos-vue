<script setup lang="ts">
/**
 * PeriodOverlayChart (T028)
 * Line chart overlaying two date periods for comparison.
 * Period 1: solid blue line. Period 2: dashed gray line.
 */
import { computed } from 'vue'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import type { SalesTrendPoint } from '@/types/analytics'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{
  period1Data: SalesTrendPoint[]
  period2Data: SalesTrendPoint[]
  period1Label: string
  period2Label: string
  loading?: boolean
}>()

const { isDark } = useTheme()

const data = computed(() => {
  // Use the longer dataset length for labels
  const maxLen = Math.max(props.period1Data.length, props.period2Data.length)
  const labels = Array.from({ length: maxLen }, (_, i) => `Day ${i + 1}`)

  return {
    labels,
    datasets: [
      {
        label: props.period1Label,
        data: props.period1Data.map((p) => p.sales),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: props.period1Data.length > 31 ? 0 : 3,
        pointHoverRadius: 5,
        borderDash: []
      },
      {
        label: props.period2Label,
        data: props.period2Data.map((p) => p.sales),
        borderColor: '#94a3b8',
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: props.period2Data.length > 31 ? 0 : 3,
        pointHoverRadius: 5,
        borderDash: [6, 4]
      }
    ]
  }
})

const options = computed(() => ({
  maintainAspectRatio: false,
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        pointStyle: 'line'
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          `${ctx.dataset.label}: ₱${ctx.parsed.y.toLocaleString('en-PH', {
            minimumFractionDigits: 2
          })}`
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
        maxTicksLimit: 15
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

const hasData = computed(
  () => props.period1Data.length > 0 || props.period2Data.length > 0
)
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Period Comparison</h3>
    </div>

    <div
      v-if="loading"
      style="height: 300px; display: flex; align-items: center; justify-content: center;"
    >
      <Skeleton height="260px" width="100%" />
    </div>

    <div
      v-else-if="!hasData"
      style="height: 300px; display: flex; align-items: center; justify-content: center;"
    >
      <p style="color: var(--p-text-muted-color);">No data for selected periods</p>
    </div>

    <div v-else style="height: 300px;">
      <Chart type="line" :data="data" :options="options" />
    </div>
  </div>
</template>
