<script setup lang="ts">
interface CustomerStatsData {
  totalOrders: number
  totalSpent: number
  avgTicket: number
  visitFrequency?: string
}

interface Props {
  stats: CustomerStatsData
}

const props = defineProps<Props>()

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
</script>

<template>
  <div class="customer-stats">
    <div class="stat-card">
      <div class="stat-icon">
        <i class="pi pi-shopping-cart"></i>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ props.stats.totalOrders.toLocaleString() }}</span>
        <span class="stat-label">Total Orders</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="pi pi-wallet"></i>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ formatCurrency(props.stats.totalSpent) }}</span>
        <span class="stat-label">Lifetime Spend</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="pi pi-receipt"></i>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ formatCurrency(props.stats.avgTicket) }}</span>
        <span class="stat-label">Avg Ticket</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <i class="pi pi-calendar"></i>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ props.stats.visitFrequency || 'N/A' }}</span>
        <span class="stat-label">Visit Frequency</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-stats {
  display: flex;
  gap: 1rem;
}

.stat-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 10px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
  flex-shrink: 0;
}

.stat-icon i {
  font-size: 1.125rem;
  color: var(--p-primary-color);
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .customer-stats {
    flex-wrap: wrap;
  }

  .stat-card {
    flex: 1 1 calc(50% - 0.5rem);
  }
}

@media (max-width: 576px) {
  .stat-card {
    flex: 1 1 100%;
  }
}
</style>
