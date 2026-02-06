<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Tag from 'primevue/tag'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import { useEIS } from '@/composables/useEIS'

const props = defineProps<{
  transactionId: string
}>()

const { formatEISStatus } = useEIS()

const status = ref<string | null>(null)
const birReference = ref<string | null>(null)
const statusDisplay = ref<{ label: string; severity: 'info' | 'success' | 'warn' | 'danger' } | null>(null)

async function loadStatus() {
  const submission = await eisSubmissionRepository.findByTransactionId(props.transactionId)
  if (submission) {
    status.value = submission.status
    birReference.value = submission.bir_reference
    statusDisplay.value = formatEISStatus(submission.status)
  }
}

onMounted(loadStatus)
watch(() => props.transactionId, loadStatus)
</script>

<template>
  <span v-if="statusDisplay" class="eis-status-badge">
    <Tag
      :value="statusDisplay.label"
      :severity="statusDisplay.severity"
      class="eis-tag"
    />
    <small v-if="birReference" class="bir-ref" v-tooltip.bottom="birReference">
      {{ birReference.substring(0, 12) }}{{ birReference.length > 12 ? '...' : '' }}
    </small>
  </span>
</template>

<style scoped>
.eis-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.eis-tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

.bir-ref {
  color: var(--p-text-muted-color);
  font-size: 0.6875rem;
}
</style>
