<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
import type { InventoryOverview } from '@/types/analytics'
import { formatCurrency } from '@/types/report'

defineProps<{
  overview: InventoryOverview | null
  loading?: boolean
}>()
</script>

<template>
  <div class="overview-cards">
    <!-- Total Inventory Value -->
    <div class="stats-card">
      <div class="stats-card-header">
        <div class="stats-card-icon green">
          <i class="pi pi-wallet"></i>
        </div>
      </div>
      <template v-if="loading">
        <Skeleton height="2rem" width="60%" class="mb-2" />
        <Skeleton height="1rem" width="40%" />
      </template>
      <template v-else>
        <div class="stats-card-value">{{ overview ? formatCurrency(overview.totalValue) : formatCurrency(0) }}</div>
        <div class="stats-card-label">Total Inventory Value</div>
      </template>
    </div>

    <!-- Average Turnover Rate -->
    <div class="stats-card">
      <div class="stats-card-header">
        <div class="stats-card-icon blue">
          <i class="pi pi-sync"></i>
        </div>
      </div>
      <template v-if="loading">
        <Skeleton height="2rem" width="60%" class="mb-2" />
        <Skeleton height="1rem" width="40%" />
      </template>
      <template v-else>
        <div class="stats-card-value">{{ overview ? overview.avgTurnoverRate.toFixed(2) : '0.00' }}<span class="stats-card-unit">&times;/year</span></div>
        <div class="stats-card-label">Avg. Turnover Rate</div>
      </template>
    </div>

    <!-- Average Days of Supply -->
    <div class="stats-card">
      <div class="stats-card-header">
        <div class="stats-card-icon orange">
          <i class="pi pi-calendar"></i>
        </div>
      </div>
      <template v-if="loading">
        <Skeleton height="2rem" width="60%" class="mb-2" />
        <Skeleton height="1rem" width="40%" />
      </template>
      <template v-else>
        <div class="stats-card-value">{{ overview ? overview.avgDaysOfSupply : 0 }}<span class="stats-card-unit"> days</span></div>
        <div class="stats-card-label">Avg. Days of Supply</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.stats-card-unit {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  margin-left: 0.25rem;
}

@media (max-width: 1023.98px) {
  .overview-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767.98px) {
  .overview-cards {
    grid-template-columns: 1fr;
  }
}
</style>
