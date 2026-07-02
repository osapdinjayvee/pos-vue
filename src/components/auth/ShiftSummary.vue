<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import type { DisplayShift } from '@/types/user'

const props = defineProps<{
  shift: DisplayShift
  showDetails?: boolean
}>()

const statusSeverity = computed(() => {
  switch (props.shift.status) {
    case 'open':
      return 'success'
    case 'closed':
      return 'info'
    case 'force_closed':
      return 'warn'
    default:
      return 'secondary'
  }
})

const varianceSeverity = computed(() => {
  if (props.shift.variance === null) return 'secondary'
  if (props.shift.variance === 0) return 'success'
  if (props.shift.variance > 0) return 'info'
  return 'danger'
})

const varianceLabel = computed(() => {
  if (props.shift.variance === null) return 'N/A'
  if (props.shift.variance === 0) return 'No Variance'
  if (props.shift.variance > 0) return `+₱${props.shift.variance.toFixed(2)}`
  return `-₱${Math.abs(props.shift.variance).toFixed(2)}`
})

const formattedStartTime = computed(() => {
  return new Date(props.shift.startedAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
})

const formattedEndTime = computed(() => {
  if (!props.shift.endedAt) return 'In Progress'
  return new Date(props.shift.endedAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
})
</script>

<template>
  <Card class="shift-summary-card">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <h3 class="shift-title">Shift Summary</h3>
          <Tag :severity="statusSeverity" :value="shift.statusLabel" />
        </div>
        <span class="shift-duration">{{ shift.duration }}</span>
      </div>
    </template>

    <template #content>
      <div class="summary-content">
        <!-- User & Terminal Info -->
        <div class="info-section">
          <div class="info-item">
            <i class="pi pi-user"></i>
            <div class="info-details">
              <span class="info-label">Cashier</span>
              <span class="info-value">{{ shift.userName }}</span>
            </div>
          </div>
          <div class="info-item">
            <i class="pi pi-desktop"></i>
            <div class="info-details">
              <span class="info-label">Terminal</span>
              <span class="info-value">{{ shift.terminalId }}</span>
            </div>
          </div>
        </div>

        <!-- Time Info -->
        <div class="time-section">
          <div class="time-item">
            <span class="time-label">Started</span>
            <span class="time-value">{{ formattedStartTime }}</span>
          </div>
          <div class="time-item">
            <span class="time-label">Ended</span>
            <span class="time-value">{{ formattedEndTime }}</span>
          </div>
        </div>

        <!-- Cash Summary -->
        <div class="cash-section">
          <div class="cash-row">
            <span class="cash-label">Opening Cash</span>
            <span class="cash-value">₱{{ shift.openingCash.toFixed(2) }}</span>
          </div>

          <div v-if="shift.expectedCash !== null" class="cash-row">
            <span class="cash-label">Expected Cash</span>
            <span class="cash-value">₱{{ shift.expectedCash.toFixed(2) }}</span>
          </div>

          <div v-if="shift.closingCash !== null" class="cash-row">
            <span class="cash-label">Closing Cash</span>
            <span class="cash-value">₱{{ shift.closingCash.toFixed(2) }}</span>
          </div>

          <div v-if="shift.variance !== null" class="cash-row variance-row">
            <span class="cash-label">Variance</span>
            <Tag :severity="varianceSeverity" :value="varianceLabel" />
          </div>
        </div>

        <!-- Variance Reason -->
        <div v-if="shift.varianceReason && showDetails" class="variance-section">
          <span class="variance-reason-label">Variance Explanation</span>
          <p class="variance-reason-text">{{ shift.varianceReason }}</p>
        </div>

        <!-- Force Closed Info -->
        <div v-if="shift.status === 'force_closed' && shift.closedBy" class="force-closed-section">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Force closed by supervisor</span>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.shift-summary-card {
  border: 1px solid var(--app-surface-200);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--app-surface-50);
  border-bottom: 1px solid var(--app-surface-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.shift-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.shift-duration {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-section {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-item i {
  font-size: 1.25rem;
  color: var(--p-primary-500);
}

.info-details {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-weight: 500;
  color: var(--p-text-color);
}

.time-section {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.time-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
}

.time-value {
  font-weight: 500;
  color: var(--p-text-color);
}

.cash-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cash-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--app-surface-200);
}

.cash-row:last-child {
  border-bottom: none;
}

.variance-row {
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  border-top: 2px solid var(--app-surface-200);
  border-bottom: none;
}

.cash-label {
  color: var(--p-text-muted-color);
}

.cash-value {
  font-weight: 600;
  color: var(--p-text-color);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.variance-section {
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.variance-reason-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.5rem;
}

.variance-reason-text {
  margin: 0;
  color: var(--p-text-color);
  line-height: 1.5;
}

.force-closed-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--p-orange-50);
  border-radius: 8px;
  color: var(--p-orange-600);
  font-size: 0.875rem;
}

.force-closed-section i {
  font-size: 1rem;
}
</style>
