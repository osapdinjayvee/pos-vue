<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import { revenueChartData } from '@/data/mockData'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const chartData = computed(() => revenueChartData)

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b'
      }
    },
    y: {
      grid: {
        color: isDark.value ? '#334155' : '#e2e8f0'
      },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        callback: (value: number) => '$' + value.toLocaleString()
      }
    }
  }
}))
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Revenue Overview</h3>
    </div>
    <div style="height: 300px">
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
