<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import type { SyncHealth } from '@/types/sync'

const props = defineProps<{
  alerts: SyncHealth[]
  loading: boolean
}>()

const emit = defineEmits<{
  viewTerminal: [terminalId: string]
}>()

interface AlertItem {
  terminalId: string
  reason: string
  severity: 'warn' | 'error'
}

const alertItems = computed<AlertItem[]>(() => {
  const items: AlertItem[] = []

  for (const h of props.alerts) {
    const reasons: string[] = []
    let severity: 'warn' | 'error' = 'warn'

    // Check heartbeat staleness
    if (h.last_heartbeat) {
      const heartbeatAge = Date.now() - new Date(h.last_heartbeat).getTime()
      const heartbeatHours = heartbeatAge / 3600000
      if (heartbeatHours >= 8) {
        reasons.push(`No heartbeat for ${Math.floor(heartbeatHours)}+ hours`)
        severity = 'error'
      } else if (heartbeatHours >= 4) {
        reasons.push(`No heartbeat for ${Math.floor(heartbeatHours)}+ hours`)
      }
    } else {
      reasons.push('No heartbeat recorded')
    }

    // Check queue depth
    if (h.queue_depth > 500) {
      reasons.push(`Queue depth > 500 (${h.queue_depth} items)`)
      severity = 'error'
    } else if (h.queue_depth > 100) {
      reasons.push(`Queue depth > 100 (${h.queue_depth} items)`)
    }

    // Check error count
    if (h.error_count >= 10) {
      reasons.push(`${h.error_count} sync errors`)
      severity = 'error'
    } else if (h.error_count >= 5) {
      reasons.push(`${h.error_count} sync errors`)
    }

    if (reasons.length === 0 && h.status === 'critical') {
      reasons.push('Terminal in critical state')
      severity = 'error'
    } else if (reasons.length === 0 && h.status === 'warning') {
      reasons.push('Terminal needs attention')
    }

    items.push({
      terminalId: h.terminal_id,
      reason: reasons.join(' | '),
      severity
    })
  }

  return items
})
</script>

<template>
  <div class="sync-health-alerts">
    <div v-if="loading" class="alerts-loading">
      <ProgressSpinner style="width: 24px; height: 24px" strokeWidth="4" />
      <span>Checking terminal health...</span>
    </div>

    <div v-else-if="alertItems.length === 0" class="no-alerts">
      <Message severity="success" :closable="false">
        All terminals are operating normally.
      </Message>
    </div>

    <div v-else class="alert-list">
      <Message
        v-for="alert in alertItems"
        :key="alert.terminalId"
        :severity="alert.severity"
        :closable="false"
      >
        <div class="alert-content">
          <div class="alert-text">
            <strong>{{ alert.terminalId }}</strong>
            <span class="alert-reason">{{ alert.reason }}</span>
          </div>
          <Button
            label="View"
            icon="pi pi-eye"
            text
            size="small"
            @click="emit('viewTerminal', alert.terminalId)"
          />
        </div>
      </Message>
    </div>
  </div>
</template>

<style scoped>
.sync-health-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alerts-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.no-alerts :deep(.p-message) {
  margin: 0;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-list :deep(.p-message) {
  margin: 0;
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.alert-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.alert-reason {
  font-size: 0.8125rem;
  opacity: 0.85;
}
</style>
