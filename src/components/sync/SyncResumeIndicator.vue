<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'

const props = defineProps<{
  resumePoint: string
  remaining: number
  lastSyncAt?: string | null
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const resumeLabel = computed(() => {
  const shortId = props.resumePoint.length > 16
    ? props.resumePoint.substring(0, 16) + '...'
    : props.resumePoint
  return `Resuming sync from item ${shortId}`
})

const lastSyncDisplay = computed(() => {
  if (!props.lastSyncAt) return null
  try {
    const date = new Date(props.lastSyncAt)
    return date.toLocaleString()
  } catch {
    return props.lastSyncAt
  }
})

function handleClose() {
  emit('dismiss')
}
</script>

<template>
  <div class="sync-resume-indicator">
    <Message severity="info" :closable="true" @close="handleClose">
      <template #default>
        <div class="resume-content">
          <div class="resume-main">
            <i class="pi pi-replay" />
            <span class="resume-text">{{ resumeLabel }}</span>
          </div>
          <div class="resume-details">
            <span v-if="lastSyncDisplay" class="resume-detail">
              <i class="pi pi-clock" />
              Last sync: {{ lastSyncDisplay }}
            </span>
            <span class="resume-detail">
              <i class="pi pi-list" />
              {{ remaining }} items remaining
            </span>
          </div>
        </div>
      </template>
    </Message>
  </div>
</template>

<style scoped>
.sync-resume-indicator {
  margin-bottom: 0.5rem;
}

.resume-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.resume-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.resume-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  padding-left: 1.5rem;
}

.resume-detail {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0.85;
}
</style>
