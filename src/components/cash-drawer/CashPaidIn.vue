<script setup lang="ts">
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import AmountInput from '@/components/common/AmountInput.vue';
import InputText from 'primevue/inputtext';
import SupervisorAuthDialog from '@/components/auth/SupervisorAuthDialog.vue';
import { useCashDrawer } from '@/composables/useCashDrawer';

// Props
const props = defineProps<{
  visible: boolean;
}>();

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'paid-in-completed': [];
}>();

// Composables
const { doCashPaidIn, expectedCash, isLoading } = useCashDrawer();

// State
const amount = ref<number | null>(null);
const reason = ref('');
const showSupervisorAuth = ref(false);
const errorMessage = ref('');

// Computed
const newBalance = computed(() => {
  return expectedCash.value + (amount.value || 0);
});

const isFormValid = computed(() => {
  return amount.value !== null && amount.value > 0 && reason.value.trim() !== '';
});

// Methods
const handleClose = () => {
  emit('update:visible', false);
  resetForm();
};

const resetForm = () => {
  amount.value = null;
  reason.value = '';
  errorMessage.value = '';
};

const handleConfirmClick = () => {
  if (!isFormValid.value) {
    errorMessage.value = 'Please enter a valid amount and reason';
    return;
  }

  errorMessage.value = '';
  showSupervisorAuth.value = true;
};

const handleSupervisorAuthorized = async (supervisorId: string) => {
  showSupervisorAuth.value = false;

  if (!amount.value || !reason.value) return;

  try {
    const result = await doCashPaidIn(amount.value, reason.value, supervisorId);

    if (result.success) {
      emit('paid-in-completed');
      handleClose();
    } else {
      errorMessage.value = result.error || 'Failed to record cash paid-in';
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An error occurred';
  }
};

const handleSupervisorCancelled = () => {
  showSupervisorAuth.value = false;
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Cash Paid-In"
    :style="{ width: '500px' }"
    :closable="!isLoading"
    @update:visible="handleClose"
  >
    <div class="cash-paid-in-form">
      <div class="form-section">
        <label for="amount" class="form-label required">Amount</label>
        <AmountInput
          id="amount"
          v-model="amount"
          :min="0.01"
          placeholder="0.00"
          :disabled="isLoading"
          class="w-full"
        />
      </div>

      <div class="form-section">
        <label for="reason" class="form-label required">Reason</label>
        <InputText
          id="reason"
          v-model="reason"
          placeholder="Change replenishment"
          :disabled="isLoading"
          class="w-full"
        />
      </div>

      <div class="balance-preview">
        <div class="balance-row">
          <span class="balance-label">Current Expected Balance:</span>
          <span class="balance-value">{{ expectedCash.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) }}</span>
        </div>
        <div class="balance-row">
          <span class="balance-label">Paid-In Amount:</span>
          <span class="balance-value highlight">+{{ (amount || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) }}</span>
        </div>
        <div class="balance-row total">
          <span class="balance-label">New Expected Balance:</span>
          <span class="balance-value">{{ newBalance.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) }}</span>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isLoading"
          @click="handleClose"
        />
        <Button
          label="Confirm Paid-In"
          severity="success"
          :disabled="!isFormValid || isLoading"
          :loading="isLoading"
          @click="handleConfirmClick"
        />
      </div>
    </template>
  </Dialog>

  <SupervisorAuthDialog
    v-model:visible="showSupervisorAuth"
    action="Cash Paid-In"
    required-permission="inventory.adjust"
    @authorized="handleSupervisorAuthorized"
    @cancelled="handleSupervisorCancelled"
  />
</template>

<style scoped>
.cash-paid-in-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: var(--text-color);
}

.form-label.required::after {
  content: ' *';
  color: var(--red-500);
}

.balance-preview {
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-row.total {
  padding-top: 0.75rem;
  border-top: 2px solid var(--surface-300);
  font-weight: 600;
  font-size: 1.1rem;
}

.balance-label {
  color: var(--text-color-secondary);
}

.balance-row.total .balance-label {
  color: var(--text-color);
}

.balance-value {
  font-weight: 500;
  color: var(--text-color);
}

.balance-value.highlight {
  color: var(--green-600);
  font-weight: 600;
}

.balance-row.total .balance-value {
  color: var(--primary-color);
  font-size: 1.2rem;
}

.error-message {
  padding: 0.75rem;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  color: var(--red-700);
  font-size: 0.9rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.w-full {
  width: 100%;
}
</style>
