<script setup lang="ts">
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'

const router = useRouter()

const reportCards = [
  {
    title: 'X-Reading',
    description: 'Generate shift snapshot report. Shows current shift totals without closing the register.',
    icon: 'pi pi-file',
    route: '/reports/x-reading',
    severity: 'info' as const
  },
  {
    title: 'Z-Reading',
    description: 'Generate end-of-day BIR-compliant closing report. Resets daily counters.',
    icon: 'pi pi-file-check',
    route: '/reports/z-reading',
    severity: 'warn' as const
  },
  {
    title: 'Daily Sales',
    description: 'View daily sales breakdown with hourly, payment method, and category analysis.',
    icon: 'pi pi-chart-bar',
    route: '/reports/daily-sales',
    severity: 'success' as const
  },
  {
    title: 'Sales Summary',
    description: 'Weekly and monthly sales summaries with trend comparison.',
    icon: 'pi pi-chart-line',
    route: '/reports/sales-summary',
    severity: 'secondary' as const
  }
]

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="reports-view">
    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Reports & Analytics</h1>
          <p class="text-muted">Generate BIR-compliant reports and view sales analytics</p>
        </div>
      </div>
    </div>

    <div class="reports-grid">
      <Card
        v-for="card in reportCards"
        :key="card.route"
        class="report-card"
        @click="navigateTo(card.route)"
      >
        <template #content>
          <div class="report-card-content">
            <div class="report-icon" :class="`report-icon--${card.severity}`">
              <i :class="card.icon" style="font-size: 1.5rem"></i>
            </div>
            <div class="report-info">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <div class="report-action">
              <Button icon="pi pi-arrow-right" text rounded />
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.reports-view {
  padding: 1.5rem;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.report-card {
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.report-card-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-icon--info {
  background: var(--p-blue-50);
  color: var(--p-blue-500);
}

.report-icon--warn {
  background: var(--p-orange-50);
  color: var(--p-orange-500);
}

.report-icon--success {
  background: var(--p-green-50);
  color: var(--p-green-500);
}

.report-icon--secondary {
  background: var(--app-surface-100);
  color: var(--p-surface-600);
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--p-surface-900);
}

.report-info p {
  font-size: 0.813rem;
  color: var(--p-surface-500);
  margin: 0;
  line-height: 1.4;
}

.report-action {
  flex-shrink: 0;
}

@media (max-width: 767.98px) {
  .reports-view {
    padding: 1rem;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }
}
</style>
