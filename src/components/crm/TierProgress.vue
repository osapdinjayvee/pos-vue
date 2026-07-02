<template>
  <div class="tier-progress-card">
    <div class="tier-labels">
      <span class="tier-name current-tier">{{ currentTier.name }}</span>
      <span class="tier-name next-tier">{{ nextTierName }}</span>
    </div>

    <ProgressBar
      :value="progressPercentage"
      :show-value="false"
      class="progress-bar"
    />

    <div class="tier-info">
      <span v-if="isHighestTier" class="highest-tier-text">
        <i class="pi pi-check-circle success-icon" />
        Highest tier reached
      </span>
      <span v-else class="remaining-spend-text">
        ₱{{ remainingSpend.toLocaleString('en-PH', { minimumFractionDigits: 0 }) }}
        more to {{ nextTier?.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import type { MembershipTier } from '@/types/tier'

const props = defineProps<{
  currentSpend: number
  currentTier: MembershipTier
  nextTier: MembershipTier | null
}>()

const isHighestTier = computed(() => props.nextTier === null)

const progressPercentage = computed(() => {
  if (isHighestTier.value) return 100

  if (!props.nextTier) return 0

  const percentage = (props.currentSpend / props.nextTier.min_spend) * 100
  return Math.min(percentage, 100)
})

const remainingSpend = computed(() => {
  if (!props.nextTier) return 0
  return Math.max(0, props.nextTier.min_spend - props.currentSpend)
})

const nextTierName = computed(() => {
  return props.nextTier?.name ?? 'Highest Tier'
})
</script>

<style scoped>
.tier-progress-card {
  background: var(--app-surface-50);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--p-surface-border);
}

.tier-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.tier-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color-secondary);
}

.current-tier {
  text-align: left;
}

.next-tier {
  text-align: right;
}

.progress-bar {
  margin-bottom: 1rem;
}

.tier-info {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--p-text-color-secondary);
}

.highest-tier-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-success-600);
  font-weight: 500;
}

.success-icon {
  font-size: 1rem;
}

.remaining-spend-text {
  font-weight: 500;
  color: var(--p-text-color);
}
</style>
