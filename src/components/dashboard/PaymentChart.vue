<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import Chart from 'primevue/chart'
import { useTheme } from '@/composables/useTheme'
import db from '@/db/database'

const props = defineProps<{
  dateFrom: string
  dateTo: string
}>()

const { isDark } = useTheme()

interface PaymentBreakdown {
  payment_method: string
  total: number
}

const payments = ref<PaymentBreakdown[]>([])

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  maya: 'Maya',
  other_ewallet: 'E-Wallet',
  points: 'Points'
}

async function loadData() {
  const rows = await db.query<PaymentBreakdown>(
    `SELECT tp.payment_method, SUM(tp.amount) as total
     FROM transaction_payments tp
     JOIN transactions t ON t.id = tp.transaction_id
     WHERE date(t.created_at) >= ? AND date(t.created_at) <= ?
       AND t.status = 'completed'
     GROUP BY tp.payment_method
     ORDER BY total DESC`,
    [props.dateFrom, props.dateTo]
  )
  payments.value = rows
}

const chartData = computed(() => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
  return {
    labels: payments.value.map(p => methodLabels[p.payment_method] || p.payment_method),
    datasets: [{
      data: payments.value.map(p => p.total),
      backgroundColor: colors.slice(0, payments.value.length)
    }]
  }
})

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        padding: 20
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.label || ''
          const value = '₱' + Number(ctx.raw).toLocaleString('en-PH', { minimumFractionDigits: 2 })
          return `${label}: ${value}`
        }
      }
    }
  },
  cutout: '60%'
}))

onMounted(loadData)
watch(() => [props.dateFrom, props.dateTo], loadData)
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Payment Methods</h3>
    </div>
    <div style="height: 300px">
      <Chart v-if="payments.length" type="doughnut" :data="chartData" :options="chartOptions" />
      <div v-else style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--p-text-muted-color)">
        No payment data for this period
      </div>
    </div>
  </div>
</template>
