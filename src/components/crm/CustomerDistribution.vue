<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'

interface TypeDistributionItem {
  type: string
  count: number
}

interface TierDistributionItem {
  tier_id: string | null
  tier_name: string
  count: number
}

interface Props {
  typeDistribution: TypeDistributionItem[]
  tierDistribution: TierDistributionItem[]
}

const props = defineProps<Props>()

const totalByType = computed(() => {
  return props.typeDistribution.reduce((sum, item) => sum + item.count, 0)
})

const totalByTier = computed(() => {
  return props.tierDistribution.reduce((sum, item) => sum + item.count, 0)
})

function capitalizeType(type: string): string {
  if (!type) return 'Unknown'
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

function getPercentage(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    retail: '#3b82f6',
    wholesale: '#f59e0b',
    vip: '#8b5cf6'
  }
  return colors[type.toLowerCase()] ?? '#6b7280'
}

function getTierColor(tierName: string): string {
  const colors: Record<string, string> = {
    bronze: '#b45309',
    silver: '#6b7280',
    gold: '#d97706',
    platinum: '#059669',
    'no tier': '#9ca3af'
  }
  return colors[tierName.toLowerCase()] ?? '#6b7280'
}
</script>

<template>
  <div class="customer-distribution">
    <div class="distribution-section">
      <h3 class="section-title">By Type</h3>
      <div class="distribution-list">
        <div
          v-for="item in typeDistribution"
          :key="item.type"
          class="distribution-item"
        >
          <div class="item-header">
            <span class="item-name">{{ capitalizeType(item.type) }}</span>
            <span class="item-stats">
              <span class="item-count">{{ item.count.toLocaleString() }}</span>
              <span class="item-percentage">({{ getPercentage(item.count, totalByType) }}%)</span>
            </span>
          </div>
          <ProgressBar
            :value="getPercentage(item.count, totalByType)"
            :showValue="false"
            :dt="{ valueBg: getTypeColor(item.type) }"
            class="distribution-bar"
          />
        </div>
        <div v-if="typeDistribution.length === 0" class="empty-state">
          No type data available
        </div>
      </div>
      <div class="section-total">
        Total: <strong>{{ totalByType.toLocaleString() }}</strong>
      </div>
    </div>

    <div class="distribution-section">
      <h3 class="section-title">By Tier</h3>
      <div class="distribution-list">
        <div
          v-for="item in tierDistribution"
          :key="item.tier_id ?? 'no-tier'"
          class="distribution-item"
        >
          <div class="item-header">
            <span class="item-name">{{ item.tier_name }}</span>
            <span class="item-stats">
              <span class="item-count">{{ item.count.toLocaleString() }}</span>
              <span class="item-percentage">({{ getPercentage(item.count, totalByTier) }}%)</span>
            </span>
          </div>
          <ProgressBar
            :value="getPercentage(item.count, totalByTier)"
            :showValue="false"
            :dt="{ valueBg: getTierColor(item.tier_name) }"
            class="distribution-bar"
          />
        </div>
        <div v-if="tierDistribution.length === 0" class="empty-state">
          No tier data available
        </div>
      </div>
      <div class="section-total">
        Total: <strong>{{ totalByTier.toLocaleString() }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-distribution {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem;
}

.distribution-section {
  padding: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 1.25rem 0;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.item-stats {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.item-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.item-percentage {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.distribution-bar {
  height: 8px;
  border-radius: 4px;
}

.section-total {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  text-align: right;
}

.section-total strong {
  color: var(--p-text-color);
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 768px) {
  .customer-distribution {
    grid-template-columns: 1fr;
  }
}
</style>
