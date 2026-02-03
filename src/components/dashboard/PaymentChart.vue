<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import { paymentChartData } from '@/data/mockData'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const chartData = computed(() => paymentChartData)

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        padding: 20
      }
    }
  },
  cutout: '60%'
}))
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Payment Methods</h3>
    </div>
    <div style="height: 300px">
      <Chart type="doughnut" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
