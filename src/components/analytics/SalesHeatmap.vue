<script setup lang="ts">
/**
 * SalesHeatmap (T026)
 * CSS grid heatmap: 7 rows (Mon-Sun) x 24 columns (0:00-23:00)
 * Shows sales intensity with green color gradients.
 */
import { computed, ref } from 'vue'
import Skeleton from 'primevue/skeleton'
import type { HeatmapCell } from '@/types/analytics'
import { formatCurrency, getHourLabel } from '@/types/report'

const props = defineProps<{
  cells: HeatmapCell[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'cell-click': [cell: HeatmapCell]
}>()

const hoveredCell = ref<HeatmapCell | null>(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

// Day labels (Monday first). Note: SQLite strftime('%w') returns 0=Sun, 1=Mon, ..., 6=Sat
// We remap so Mon=0, Tue=1, ... Sun=6 in grid row order
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Map SQLite day-of-week (0=Sun) to our Mon-first index (0=Mon)
function toDayIndex(sqliteDow: number): number {
  // 0(Sun) -> 6, 1(Mon) -> 0, 2(Tue) -> 1, ... 6(Sat) -> 5
  return sqliteDow === 0 ? 6 : sqliteDow - 1
}

const hours = Array.from({ length: 24 }, (_, i) => i)

// Build a lookup map: key = `${dayIndex}-${hour}` -> HeatmapCell
const cellMap = computed(() => {
  const map = new Map<string, HeatmapCell>()
  for (const cell of props.cells) {
    const dayIdx = toDayIndex(cell.dayOfWeek)
    map.set(`${dayIdx}-${cell.hour}`, cell)
  }
  return map
})

function getCellForPosition(dayIndex: number, hour: number): HeatmapCell | null {
  return cellMap.value.get(`${dayIndex}-${hour}`) ?? null
}

function getCellStyle(dayIndex: number, hour: number): Record<string, string> {
  const cell = getCellForPosition(dayIndex, hour)
  if (!cell) {
    return {
      backgroundColor: 'var(--app-surface-100)',
      opacity: '1'
    }
  }
  const alpha = Math.max(0.1, cell.intensity)
  return {
    backgroundColor: `rgba(34, 197, 94, ${alpha})`,
    cursor: 'pointer'
  }
}

function handleMouseEnter(event: MouseEvent, dayIndex: number, hour: number) {
  const cell = getCellForPosition(dayIndex, hour)
  if (cell) {
    hoveredCell.value = cell
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    tooltipX.value = rect.left + rect.width / 2
    tooltipY.value = rect.top - 8
  }
}

function handleMouseLeave() {
  hoveredCell.value = null
}

function handleClick(dayIndex: number, hour: number) {
  const cell = getCellForPosition(dayIndex, hour)
  if (cell) {
    emit('cell-click', cell)
  }
}
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Sales Heatmap</h3>
      <span style="font-size: 0.75rem; color: var(--p-text-muted-color);">
        Day of Week vs Hour
      </span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="heatmap-loading">
      <Skeleton height="280px" width="100%" />
    </div>

    <!-- Empty state -->
    <div v-else-if="cells.length === 0" class="heatmap-empty">
      <i class="pi pi-th-large" style="font-size: 2rem; color: var(--p-surface-400);"></i>
      <p style="color: var(--p-text-muted-color); margin: 0.5rem 0 0;">No heatmap data</p>
    </div>

    <!-- Heatmap grid -->
    <div v-else class="heatmap-container">
      <!-- Hour column headers -->
      <div class="heatmap-grid">
        <!-- Empty top-left corner -->
        <div class="heatmap-corner"></div>
        <!-- Hour headers -->
        <div
          v-for="hour in hours"
          :key="'h-' + hour"
          class="heatmap-hour-header"
        >
          {{ hour }}
        </div>

        <!-- Rows: one per day -->
        <template v-for="(dayLabel, dayIndex) in dayLabels" :key="'d-' + dayIndex">
          <!-- Day label -->
          <div class="heatmap-day-label">{{ dayLabel }}</div>
          <!-- Cells for each hour -->
          <div
            v-for="hour in hours"
            :key="'c-' + dayIndex + '-' + hour"
            class="heatmap-cell"
            :style="getCellStyle(dayIndex, hour)"
            @mouseenter="handleMouseEnter($event, dayIndex, hour)"
            @mouseleave="handleMouseLeave"
            @click="handleClick(dayIndex, hour)"
          ></div>
        </template>
      </div>

      <!-- Tooltip -->
      <Teleport to="body">
        <div
          v-if="hoveredCell"
          class="heatmap-tooltip"
          :style="{
            left: tooltipX + 'px',
            top: tooltipY + 'px'
          }"
        >
          <div class="heatmap-tooltip-title">
            {{ dayLabels[toDayIndex(hoveredCell.dayOfWeek)] }} {{ getHourLabel(hoveredCell.hour) }}
          </div>
          <div class="heatmap-tooltip-row">
            Sales: <strong>{{ formatCurrency(hoveredCell.sales) }}</strong>
          </div>
          <div class="heatmap-tooltip-row">
            Transactions: <strong>{{ Math.round(hoveredCell.transactionCount) }}</strong>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.heatmap-loading,
.heatmap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}

.heatmap-container {
  overflow-x: auto;
}

.heatmap-grid {
  display: grid;
  /* 1 label column + 24 hour columns */
  grid-template-columns: 48px repeat(24, 1fr);
  gap: 2px;
  min-width: 600px;
}

.heatmap-corner {
  /* Empty top-left cell */
}

.heatmap-hour-header {
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  padding: 0.25rem 0;
}

.heatmap-day-label {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  padding-right: 0.5rem;
}

.heatmap-cell {
  aspect-ratio: 1;
  min-height: 24px;
  border-radius: 3px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.heatmap-cell:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
  position: relative;
}
</style>

<style>
/* Tooltip styles (not scoped so Teleport works) */
.heatmap-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: var(--p-surface-900);
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 10000;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.heatmap-tooltip-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.25rem;
}

.heatmap-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  line-height: 1.4;
}
</style>
