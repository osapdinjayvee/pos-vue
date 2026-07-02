<script setup lang="ts">
import { computed } from 'vue'
import Chart from 'primevue/chart'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import type { ABCClassification } from '@/types/analytics'
import { formatCurrency } from '@/types/report'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{
  classifications: ABCClassification[]
  loading?: boolean
}>()

const { isDark } = useTheme()

// Compute distribution summary for chart
const distributionSummary = computed(() => {
  const groups = { A: { count: 0, revenue: 0 }, B: { count: 0, revenue: 0 }, C: { count: 0, revenue: 0 } }

  for (const item of props.classifications) {
    groups[item.abcClass].count++
    groups[item.abcClass].revenue += item.revenue
  }

  return groups
})

// Pie chart data — revenue distribution by class
const chartData = computed(() => ({
  labels: ['A - Top 80%', 'B - Next 15%', 'C - Remaining 5%'],
  datasets: [
    {
      data: [
        distributionSummary.value.A.revenue,
        distributionSummary.value.B.revenue,
        distributionSummary.value.C.revenue
      ],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
      hoverBackgroundColor: ['#059669', '#2563eb', '#d97706']
    }
  ]
}))

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        usePointStyle: true,
        padding: 16
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percent = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
          return `${ctx.label}: ${formatCurrency(ctx.parsed)} (${percent}%)`
        }
      }
    }
  }
}))

function getAbcSeverity(abcClass: string): 'success' | 'info' | 'warn' {
  if (abcClass === 'A') return 'success'
  if (abcClass === 'B') return 'info'
  return 'warn'
}
</script>

<template>
  <div class="abc-analysis">
    <!-- Chart Section -->
    <div class="chart-card">
      <div class="chart-card-header">
        <h3 class="chart-card-title">ABC Revenue Distribution</h3>
        <div v-if="!loading" class="abc-summary">
          <Tag severity="success" :value="`A: ${distributionSummary.A.count} products`" />
          <Tag severity="info" :value="`B: ${distributionSummary.B.count} products`" />
          <Tag severity="warn" :value="`C: ${distributionSummary.C.count} products`" />
        </div>
      </div>

      <div v-if="loading" style="height: 300px; display: flex; align-items: center; justify-content: center;">
        <Skeleton shape="circle" size="200px" />
      </div>
      <div v-else-if="classifications.length === 0" style="height: 300px; display: flex; align-items: center; justify-content: center;">
        <div class="empty-message">
          <i class="pi pi-chart-pie" style="font-size: 2rem; color: var(--app-surface-300);"></i>
          <p>No data for selected period</p>
        </div>
      </div>
      <div v-else style="height: 300px; display: flex; justify-content: center;">
        <Chart type="doughnut" :data="chartData" :options="chartOptions" style="max-width: 400px; width: 100%;" />
      </div>
    </div>

    <!-- Table Section -->
    <div class="table-card">
      <div class="table-card-header">
        <h3 class="table-card-title">Product Classifications</h3>
      </div>

      <div v-if="loading" class="skeleton-container">
        <Skeleton height="2rem" class="mb-2" />
        <Skeleton height="1.5rem" v-for="i in 5" :key="i" class="mb-1" />
      </div>

      <DataTable
        v-else
        :value="classifications"
        :paginator="classifications.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        stripedRows
        size="small"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      >
        <template #empty>
          <div class="empty-message">
            <i class="pi pi-chart-pie" style="font-size: 2rem; color: var(--app-surface-300);"></i>
            <p>No classification data available</p>
          </div>
        </template>

        <Column field="productName" header="Product" sortable>
          <template #body="{ data }">
            <span class="product-name-cell">{{ data.productName }}</span>
          </template>
        </Column>

        <Column field="categoryName" header="Category" sortable style="width: 140px;">
          <template #body="{ data }">
            <span class="text-muted">{{ data.categoryName }}</span>
          </template>
        </Column>

        <Column field="revenue" header="Revenue" sortable style="width: 130px; text-align: right;">
          <template #body="{ data }">
            <span class="numeric-cell">{{ formatCurrency(data.revenue) }}</span>
          </template>
        </Column>

        <Column field="cumulativePercent" header="Cumulative %" sortable style="width: 120px; text-align: right;">
          <template #body="{ data }">
            <span class="numeric-cell">{{ data.cumulativePercent.toFixed(1) }}%</span>
          </template>
        </Column>

        <Column field="abcClass" header="ABC Class" sortable style="width: 100px; text-align: center;">
          <template #body="{ data }">
            <Tag
              :value="data.abcClass"
              :severity="getAbcSeverity(data.abcClass)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.abc-analysis {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.abc-summary {
  display: flex;
  gap: 0.5rem;
}

.skeleton-container {
  padding: 1rem 0;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--p-surface-500);
}

.product-name-cell {
  font-weight: 500;
  color: var(--p-surface-800);
}

.text-muted {
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.numeric-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

@media (max-width: 767.98px) {
  .abc-summary {
    flex-wrap: wrap;
    gap: 0.25rem;
  }
}
</style>
