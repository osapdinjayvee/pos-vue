<script setup lang="ts">
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import ProgressBar from 'primevue/progressbar'
import type { SyncHealth, SyncHealthStatus } from '@/types/sync'

const props = defineProps<{
  health: SyncHealth
}>()

const emit = defineEmits<{
  select: [terminalId: string]
}>()

function relativeTime(date: string | null): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

function statusSeverity(status: SyncHealthStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  switch (status) {
    case 'healthy': return 'success'
    case 'warning': return 'warn'
    case 'critical': return 'danger'
    default: return 'secondary'
  }
}

function statusLabel(status: SyncHealthStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function queueColor(): string {
  if (props.health.queue_depth > 500) return '#ef4444'
  if (props.health.queue_depth > 100) return '#f59e0b'
  return '#22c55e'
}

function queuePercentage(): number {
  // Cap at 1000 for visual scale
  return Math.min((props.health.queue_depth / 1000) * 100, 100)
}

function handleClick() {
  emit('select', props.health.terminal_id)
}
</script>

<template>
  <Card class="health-card" @click="handleClick">
    <template #header>
      <div class="card-header">
        <div class="terminal-info">
          <strong class="terminal-id">{{ health.terminal_id }}</strong>
          <span class="branch-name">{{ health.branch_id }}</span>
        </div>
        <Tag
          :value="statusLabel(health.status)"
          :severity="statusSeverity(health.status)"
        />
      </div>
    </template>
    <template #content>
      <div class="health-details">
        <!-- Last Heartbeat -->
        <div class="detail-row">
          <span class="detail-label">
            <i class="pi pi-heart"></i>
            Last Heartbeat
          </span>
          <span class="detail-value">{{ relativeTime(health.last_heartbeat) }}</span>
        </div>

        <!-- Last Upload -->
        <div class="detail-row">
          <span class="detail-label">
            <i class="pi pi-cloud-upload"></i>
            Last Upload
          </span>
          <span class="detail-value">{{ relativeTime(health.last_upload) }}</span>
        </div>

        <!-- Last Download -->
        <div class="detail-row">
          <span class="detail-label">
            <i class="pi pi-cloud-download"></i>
            Last Download
          </span>
          <span class="detail-value">{{ relativeTime(health.last_download) }}</span>
        </div>

        <!-- Queue Depth -->
        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">
              <i class="pi pi-list"></i>
              Queue Depth
            </span>
            <span class="detail-value">{{ health.queue_depth }}</span>
          </div>
          <ProgressBar
            :value="queuePercentage()"
            :showValue="false"
            :dt="{ valueBg: queueColor() }"
            style="height: 6px"
          />
        </div>

        <!-- Error Count -->
        <div class="detail-row">
          <span class="detail-label">
            <i class="pi pi-exclamation-triangle"></i>
            Errors
          </span>
          <Badge
            v-if="health.error_count > 0"
            :value="String(health.error_count)"
            severity="danger"
          />
          <span v-else class="detail-value">0</span>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.health-card {
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
  height: 100%;
}

.health-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem 0;
}

.terminal-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.terminal-id {
  font-size: 1rem;
}

.branch-name {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.health-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.detail-label i {
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
</style>
