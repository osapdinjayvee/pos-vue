<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import type { DisplayShift } from '@/types/user'

const props = defineProps<{
  visible: boolean
  mode: 'start' | 'close'
  currentShift?: DisplayShift | null
  expectedCash?: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  start: [openingCash: number]
  close: [closingCash: number, varianceReason: string]
  cancelled: []
}>()

const openingCash = ref(0)
const closingCash = ref(0)
const varianceReason = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const dialogTitle = computed(() => {
  return props.mode === 'start' ? 'Start Shift' : 'Close Shift'
})

const variance = computed(() => {
  if (props.mode !== 'close' || props.expectedCash === undefined) {
    return null
  }
  return closingCash.value - props.expectedCash
})

const varianceClass = computed(() => {
  if (variance.value === null) return ''
  if (variance.value === 0) return 'variance-zero'
  if (variance.value > 0) return 'variance-over'
  return 'variance-short'
})

const varianceLabel = computed(() => {
  if (variance.value === null) return ''
  if (variance.value === 0) return 'No variance'
  if (variance.value > 0) return `Over by ₱${variance.value.toFixed(2)}`
  return `Short by ₱${Math.abs(variance.value).toFixed(2)}`
})

const requiresExplanation = computed(() => {
  return variance.value !== null && variance.value !== 0
})

const canSubmit = computed(() => {
  if (props.mode === 'start') {
    return openingCash.value >= 0
  }

  // Close mode
  if (closingCash.value < 0) return false
  if (requiresExplanation.value && !varianceReason.value.trim()) return false

  return true
})

function handleSubmit() {
  error.value = null

  if (props.mode === 'start') {
    if (openingCash.value < 0) {
      error.value = 'Opening cash cannot be negative'
      return
    }
    emit('start', openingCash.value)
  } else {
    if (closingCash.value < 0) {
      error.value = 'Closing cash cannot be negative'
      return
    }
    if (requiresExplanation.value && !varianceReason.value.trim()) {
      error.value = 'Please explain the variance'
      return
    }
    emit('close', closingCash.value, varianceReason.value.trim())
  }

  closeDialog()
}

function handleCancel() {
  emit('cancelled')
  closeDialog()
}

function closeDialog() {
  dialogVisible.value = false
  resetForm()
}

function resetForm() {
  openingCash.value = 0
  closingCash.value = props.expectedCash || 0
  varianceReason.value = ''
  error.value = null
  isLoading.value = false
}

// Reset form when dialog opens
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

// Pre-fill closing cash with expected when available
watch(
  () => props.expectedCash,
  (expected) => {
    if (expected !== undefined && props.mode === 'close') {
      closingCash.value = expected
    }
  },
  { immediate: true }
)
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    modal
    :closable="!isLoading"
    :close-on-escape="!isLoading"
    :style="{ width: '450px' }"
    class="shift-dialog"
  >
    <div class="shift-content">
      <!-- Error Message -->
      <Message v-if="error" severity="error" :closable="false" class="error-message">
        {{ error }}
      </Message>

      <!-- Start Shift Form -->
      <div v-if="mode === 'start'" class="start-shift-form">
        <div class="info-box">
          <i class="pi pi-info-circle"></i>
          <p>Count the cash in your drawer before starting your shift.</p>
        </div>

        <div class="form-field">
          <label for="opening-cash">Opening Cash Amount</label>
          <InputNumber
            id="opening-cash"
            v-model="openingCash"
            mode="currency"
            currency="PHP"
            locale="en-PH"
            :min="0"
            :disabled="isLoading"
            class="w-full"
            input-class="text-right"
          />
        </div>
      </div>

      <!-- Close Shift Form -->
      <div v-else class="close-shift-form">
        <!-- Current Shift Info -->
        <div v-if="currentShift" class="shift-info">
          <div class="info-row">
            <span class="info-label">Shift Started</span>
            <span class="info-value">{{ new Date(currentShift.startedAt).toLocaleString() }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration</span>
            <span class="info-value">{{ currentShift.duration }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Opening Cash</span>
            <span class="info-value">₱{{ currentShift.openingCash.toFixed(2) }}</span>
          </div>
          <div class="info-row highlight">
            <span class="info-label">Expected Cash</span>
            <span class="info-value">₱{{ (expectedCash || 0).toFixed(2) }}</span>
          </div>
        </div>

        <div class="info-box">
          <i class="pi pi-info-circle"></i>
          <p>Count all cash in your drawer including coins.</p>
        </div>

        <div class="form-field">
          <label for="closing-cash">Closing Cash Amount</label>
          <InputNumber
            id="closing-cash"
            v-model="closingCash"
            mode="currency"
            currency="PHP"
            locale="en-PH"
            :min="0"
            :disabled="isLoading"
            class="w-full"
            input-class="text-right"
          />
        </div>

        <!-- Variance Display -->
        <div v-if="variance !== null" class="variance-box" :class="varianceClass">
          <span class="variance-label">{{ varianceLabel }}</span>
        </div>

        <!-- Variance Explanation -->
        <div v-if="requiresExplanation" class="form-field">
          <label for="variance-reason">Explain Variance <span class="required">*</span></label>
          <Textarea
            id="variance-reason"
            v-model="varianceReason"
            rows="3"
            :disabled="isLoading"
            placeholder="Please explain the cash variance..."
            class="w-full"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="isLoading"
          @click="handleCancel"
        />
        <Button
          :label="mode === 'start' ? 'Start Shift' : 'Close Shift'"
          :loading="isLoading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.shift-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-message {
  margin: 0;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.info-box i {
  font-size: 1.25rem;
  color: var(--p-primary-500);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.info-box p {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-500);
}

.shift-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row.highlight {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
  font-weight: 600;
}

.info-label {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.info-value {
  color: var(--p-text-color);
  font-weight: 500;
}

.variance-box {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}

.variance-zero {
  background: var(--p-green-50);
  color: var(--p-green-600);
}

.variance-over {
  background: var(--p-blue-50);
  color: var(--p-blue-600);
}

.variance-short {
  background: var(--p-red-50);
  color: var(--p-red-600);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
