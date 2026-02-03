<script setup lang="ts">
import type { StatsData } from '@/types'

defineProps<{
  data: StatsData
}>()
</script>

<template>
  <div class="stats-card">
    <div class="stats-card-header">
      <div>
        <div class="stats-card-value">{{ data.value }}</div>
        <div class="stats-card-label">{{ data.label }}</div>
      </div>
      <div class="stats-card-icon" :class="data.color">
        <i :class="data.icon"></i>
      </div>
    </div>
    <div
      class="stats-card-trend"
      :class="{ positive: data.trend > 0, negative: data.trend < 0 }"
    >
      <i :class="data.trend > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
      {{ Math.abs(data.trend) }}%
      <span>{{ data.trendLabel }}</span>
    </div>
  </div>
</template>
