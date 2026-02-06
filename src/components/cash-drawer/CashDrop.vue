<template>
  <Dialog
    :visible="visible"
    modal
    :closable="!isLoading"
    :closeOnEscape="!isLoading"
    class="cash-drop-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <i class="pi pi-minus-circle"></i>
        <span>Cash Drop</span>
      </div>
    </template>

    <div class="cash-drop-content">
      <div class="info-section">
        <div class="info-item">
          <label>Current Expected Balance</label>
          <div class="amount current">{{ formatCurrency(expectedCash) }}</div>
        </div>
      </div>

      <div class="form-section">
        <div class="field">
          <label for="drop-amount">Drop Amount *</label>
          <InputNumber
            id="drop-amount"
            v-model="dropAmount"
            mode="currency"
            currency="PHP"
            locale="en-PH"
            :min="0.01"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            :disabled="isLoading"
            class="w-full"
            placeholder="0.00"
            autofocus
          />
          <small v-if="dropAmount && dropAmount <= 0" class="error-text">
            Amount must be greater than 0
          </small>
        </div>

        <div class="field">
          <label for="drop-reason">Reason *</label>
          <InputText
            id="drop-reason"
            v-model="reason"
            :disabled="isLoading"
            class="w-full"
            placeholder="Enter reason for cash drop"
          />
        </div>
      </div>

      <div v-if="dropAmount && dropAmount > 0" class="preview-section">
        <div class="preview-item">
          <label>New Expected Balance</label>
          <div class="amount preview">{{ formatCurrency(newBalance) }}</div>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleCancel"
          :disabled="isLoading"
        />
        <Button
          label="Confirm Drop"
          severity="danger"
          @click="handleConfirmClick"
          :disabled="!isFormValid || isLoading"
          :loading="isLoading"
        />
      </div>
    </template>
  </Dialog>

  <SupervisorAuthDialog
    v-model:visible="showSupervisorAuth"
    action="Cash Drop"
    requiredPermission="inventory.adjust"
    @authorized="handleSupervisorAuthorized"
    @cancelled="handleSupervisorCancelled"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import SupervisorAuthDialog from '@/components/auth/SupervisorAuthDialog.vue'
import { useCashDrawer } from '@/composables/useCashDrawer'
import { useToast } from 'primevue/usetoast'

// Props
interface Props {
  visible: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'drop-completed': []
}>()

// Composables
const { doCashDrop, expectedCash, isLoading } = useCashDrawer()
const toast = useToast()

// State
const dropAmount = ref<number | null>(null)
const reason = ref('')
const showSupervisorAuth = ref(false)
const errorMessage = ref('')

// Computed
const newBalance = computed(() => {
  if (!dropAmount.value || dropAmount.value <= 0) return expectedCash.value
  return expectedCash.value - dropAmount.value
})

const isFormValid = computed(() => {
  return (
    dropAmount.value !== null &&
    dropAmount.value > 0 &&
    reason.value.trim().length > 0
  )
})

// Methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount)
}

const handleConfirmClick = () => {
  if (!isFormValid.value) return

  errorMessage.value = ''
  showSupervisorAuth.value = true
}

const handleSupervisorAuthorized = async (supervisorId: string) => {
  if (!dropAmount.value || !reason.value.trim()) return

  try {
    const result = await doCashDrop(
      dropAmount.value,
      reason.value.trim(),
      supervisorId
    )

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: 'Cash Drop Completed',
        detail: `${formatCurrency(dropAmount.value)} removed from drawer`,
        life: 3000
      })

      emit('drop-completed')
      resetForm()
      emit('update:visible', false)
    } else {
      errorMessage.value = result.error || 'Failed to complete cash drop'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  }
}

const handleSupervisorCancelled = () => {
  showSupervisorAuth.value = false
}

const handleCancel = () => {
  if (!isLoading.value) {
    resetForm()
    emit('update:visible', false)
  }
}

const resetForm = () => {
  dropAmount.value = null
  reason.value = ''
  errorMessage.value = ''
  showSupervisorAuth.value = false
}
</script>

<style scoped>
.cash-drop-dialog :deep(.p-dialog) {
  width: 500px;
  max-width: 95vw;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.dialog-header i {
  color: var(--red-500);
  font-size: 1.5rem;
}

.cash-drop-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-section,
.preview-section {
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
  border: 1px solid var(--surface-200);
}

.info-item,
.preview-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label,
.preview-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.amount {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: monospace;
}

.amount.current {
  color: var(--primary-color);
}

.amount.preview {
  color: var(--orange-600);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 500;
  font-size: 0.875rem;
}

.w-full {
  width: 100%;
}

.error-text {
  color: var(--red-500);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  color: var(--red-700);
  font-size: 0.875rem;
}

.error-message i {
  color: var(--red-500);
  font-size: 1rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.preview-section {
  background: var(--orange-50);
  border-color: var(--orange-200);
}
</style>
