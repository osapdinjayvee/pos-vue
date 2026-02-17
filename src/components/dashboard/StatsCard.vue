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
        <div class="stats-card-label">{{ data.label }}</div>
        <div class="stats-card-value">{{ data.value }}</div>
        <div v-if="data.subtitle" class="stats-card-subtitle">{{ data.subtitle }}</div>
      </div>
      <div class="stats-card-icon" :class="data.color">
        <i :class="data.icon"></i>
      </div>
    </div>
    <div
      v-if="data.trend !== 0 || data.trendLabel"
      class="stats-card-trend"
      :class="{ positive: data.trend > 0, negative: data.trend < 0, neutral: data.trend === 0 }"
    >
      <template v-if="data.trend !== 0">
        <i :class="data.trend > 0 ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right'"></i>
        {{ Math.abs(data.trend) }}%
      </template>
      <span>{{ data.trendLabel }}</span>
    </div>
  </div>
</template>
