<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { EISSubmission } from '@/types/eis'

const props = defineProps<{
  submission: EISSubmission | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  retry: [id: string]
}>()

const parsedError = computed(() => {
  if (!props.submission?.last_error) return null
  try {
    return JSON.parse(props.submission.last_error)
  } catch {
    return { message: props.submission.last_error, errorType: 'unknown' }
  }
})

const errorTypeSeverity = computed(() => {
  if (!parsedError.value) return 'info'
  switch (parsedError.value.errorType) {
    case 'temporary': return 'warn'
    case 'validation': return 'danger'
    case 'rejected': return 'danger'
    case 'duplicate': return 'info'
    default: return 'warn'
  }
})

const fieldErrors = computed(() => {
  if (!parsedError.value?.message) return []
  try {
    const parsed = JSON.parse(parsedError.value.message)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([field, msg]) => ({ field, error: String(msg) }))
    }
  } catch { /* not JSON field errors */ }
  return []
})

const grossSales = computed(() => {
  if (!props.submission?.payload) return 0
  try { return JSON.parse(props.submission.payload).gross_sales || 0 } catch { return 0 }
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('close')"
    header="Submission Error Details"
    :modal="true"
    :style="{ width: '600px' }"
  >
    <div v-if="submission" class="error-detail">
      <div class="summary-row">
        <div class="summary-item">
          <label>OR Number</label>
          <span class="mono">{{ submission.or_number }}</span>
        </div>
        <div class="summary-item">
          <label>Date</label>
          <span>{{ formatDate(submission.created_at) }}</span>
        </div>
        <div class="summary-item">
          <label>Amount</label>
          <span>{{ formatCurrency(grossSales) }}</span>
        </div>
      </div>

      <div class="error-section mt-4">
        <div class="error-header">
          <label>Error Classification</label>
          <Tag
            v-if="parsedError"
            :value="parsedError.errorType || 'unknown'"
            :severity="errorTypeSeverity"
          />
        </div>

        <div class="error-message mt-2">
          <p>{{ parsedError?.message || 'No error details available' }}</p>
        </div>
      </div>

      <div v-if="fieldErrors.length > 0" class="field-errors mt-4">
        <label>Field Validation Errors</label>
        <DataTable :value="fieldErrors" size="small" class="mt-2">
          <Column field="field" header="Field" style="width: 40%" />
          <Column field="error" header="Error" />
        </DataTable>
      </div>

      <div class="retry-section mt-4">
        <div class="retry-info">
          <span>Attempts: <strong>{{ submission.attempts }}</strong></span>
          <span v-if="submission.last_attempt"> | Last: {{ formatDate(submission.last_attempt) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" @click="emit('close')" />
      <Button
        v-if="submission && submission.status === 'failed'"
        label="Retry Now"
        icon="pi pi-refresh"
        @click="submission && emit('retry', submission.id)"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.summary-row {
  display: flex;
  gap: 2rem;
}

.summary-item label {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.summary-item span {
  font-weight: 600;
}

.mono {
  font-family: monospace;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-header label {
  font-weight: 600;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 6px;
  border-left: 3px solid var(--p-red-500);
}

.error-message p {
  margin: 0;
  font-size: 0.875rem;
  word-break: break-word;
}

.field-errors label {
  font-weight: 600;
  font-size: 0.875rem;
}

.retry-info {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
</style>
