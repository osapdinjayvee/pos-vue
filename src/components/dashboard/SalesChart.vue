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

interface CategoryRevenue {
  name: string
  revenue: number
}

const categories = ref<CategoryRevenue[]>([])

async function loadData() {
  const rows = await db.query<{ name: string; revenue: number }>(
    `SELECT COALESCE(p.category_id, 'uncategorized') as cat_id,
            COALESCE(c.name, 'Uncategorized') as name,
            SUM(ti.line_total) as revenue
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     LEFT JOIN products p ON p.id = ti.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE date(t.created_at) >= ? AND date(t.created_at) <= ?
       AND t.status = 'completed'
     GROUP BY cat_id
     ORDER BY revenue DESC
     LIMIT 8`,
    [props.dateFrom, props.dateTo]
  )
  categories.value = rows
}

const chartData = computed(() => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316']
  return {
    labels: categories.value.map(c => c.name),
    datasets: [{
      data: categories.value.map(c => c.revenue),
      backgroundColor: colors.slice(0, categories.value.length),
      borderRadius: 4,
      barThickness: 24
    }]
  }
})

const chartOptions = computed(() => ({
  indexAxis: 'y' as const,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => '₱' + Number(ctx.raw).toLocaleString('en-PH', { minimumFractionDigits: 2 })
      }
    }
  },
  scales: {
    x: {
      grid: { color: isDark.value ? '#334155' : '#e2e8f0' },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        callback: (value: number) => '₱' + value.toLocaleString()
      }
    },
    y: {
      grid: { display: false },
      ticks: { color: isDark.value ? '#94a3b8' : '#64748b' }
    }
  }
}))

onMounted(loadData)
watch(() => [props.dateFrom, props.dateTo], loadData)
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Sales by Category</h3>
    </div>
    <div style="height: 300px">
      <Chart v-if="categories.length" type="bar" :data="chartData" :options="chartOptions" />
      <div v-else style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--p-text-muted-color)">
        No category data for this period
      </div>
    </div>
  </div>
</template>
