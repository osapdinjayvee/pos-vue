<template>
  <Dialog
    :visible="visible"
    modal
    header="Closing Cash Count"
    :closable="!isProcessing"
    :dismissableMask="!isProcessing"
    class="closing-count-dialog"
    @update:visible="handleVisibilityChange"
  >
    <div class="closing-count-content">
      <!-- Denomination Entry -->
      <div class="denomination-section">
        <h3>Enter Actual Cash Count</h3>
        <DenominationEntry
          :readonly="isProcessing"
          @update:denominations="handleDenominationsUpdate"
        />
      </div>

      <!-- Variance Display -->
      <div class="variance-section">
        <h3>Reconciliation</h3>
        <VarianceDisplay
          v-if="expectedCashBreakdown"
          :expected-cash="expectedCash"
          :actual-cash="actualCash"
          :threshold="varianceThreshold"
          :breakdown="expectedCashBreakdown"
        />
        <div v-else class="loading-breakdown">
          Loading expected cash details...
        </div>
      </div>

      <!-- Variance Reason (if needed) -->
      <div v-if="requiresVarianceReason" class="variance-reason-section">
        <label for="variance-reason" class="variance-reason-label">
          <i class="pi pi-exclamation-triangle"></i>
          Variance Explanation Required ({{ formatCurrency(variance) }})
        </label>
        <Textarea
          id="variance-reason"
          v-model="varianceReason"
          rows="3"
          placeholder="Please explain the variance reason..."
          :disabled="isProcessing"
          class="variance-reason-input"
          :class="{ 'p-invalid': requiresVarianceReason && !varianceReason }"
        />
        <small v-if="requiresVarianceReason && !varianceReason" class="p-error">
          Variance reason is required when variance exceeds threshold.
        </small>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
        <i class="pi pi-times-circle"></i>
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Close Without Count"
          severity="warn"
          text
          :disabled="isProcessing"
          @click="showSupervisorAuth = true"
        />
        <div class="dialog-footer-right">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            :disabled="isProcessing"
            @click="handleCancel"
          />
          <Button
            label="Close Drawer"
            icon="pi pi-check"
            :loading="isProcessing"
            :disabled="isCloseDisabled"
            @click="handleCloseDrawer"
          />
        </div>
      </div>
    </template>
  </Dialog>

  <SupervisorAuthDialog
    v-model:visible="showSupervisorAuth"
    action="Close Without Count"
    requiredPermission="inventory.adjust"
    @authorized="handleSupervisorOverride"
    @cancelled="showSupervisorAuth = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import DenominationEntry from './DenominationEntry.vue';
import VarianceDisplay from './VarianceDisplay.vue';
import SupervisorAuthDialog from '@/components/auth/SupervisorAuthDialog.vue';
import { useDenominationCount } from '@/composables/useDenominationCount';
import { useCashDrawer } from '@/composables/useCashDrawer';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'drawer-closed', payload: { variance: number; breakdown: any }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Composables
const { total, getDenominations, reset } = useDenominationCount();
const {
  endShift,
  expectedCash,
  expectedCashBreakdown,
  varianceThreshold,
  isLoading,
  refreshExpectedCash
} = useCashDrawer();

// Local state
const actualCash = ref(0);
const varianceReason = ref('');
const errorMessage = ref('');
const isProcessing = ref(false);
const showSupervisorAuth = ref(false);

// Computed
const variance = computed(() => actualCash.value - expectedCash.value);

const requiresVarianceReason = computed(() => {
  return Math.abs(variance.value) > varianceThreshold.value;
});

const isCloseDisabled = computed(() => {
  if (actualCash.value === 0) return true;
  if (requiresVarianceReason.value && !varianceReason.value.trim()) return true;
  return isProcessing.value;
});

// Methods
const handleDenominationsUpdate = (denominations: { denomination: number; quantity: number; subtotal: number }[]) => {
  actualCash.value = denominations.reduce((sum, d) => sum + d.subtotal, 0);
};

const handleVisibilityChange = (value: boolean) => {
  if (!isProcessing.value) {
    emit('update:visible', value);
  }
};

const handleCancel = () => {
  if (!isProcessing.value) {
    resetForm();
    emit('update:visible', false);
  }
};

const handleCloseDrawer = async () => {
  if (isCloseDisabled.value) return;

  errorMessage.value = '';
  isProcessing.value = true;

  try {
    const denominations = getDenominations();
    const reason = requiresVarianceReason.value ? varianceReason.value.trim() : undefined;

    const result = await endShift(denominations, reason);

    if (!result.success) {
      errorMessage.value = result.error || 'Failed to close drawer. Please try again.';
      return;
    }

    // Emit success event with variance and breakdown
    emit('drawer-closed', {
      variance: result.variance ?? variance.value,
      breakdown: result.breakdown ?? expectedCashBreakdown.value
    });

    // Close dialog and reset
    resetForm();
    emit('update:visible', false);
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to close drawer. Please try again.';
  } finally {
    isProcessing.value = false;
  }
};

const handleSupervisorOverride = async (supervisorId: string) => {
  showSupervisorAuth.value = false;
  isProcessing.value = true;
  errorMessage.value = '';

  try {
    const result = await endShift([], 'Supervisor override - unverified close');

    if (!result.success) {
      errorMessage.value = result.error || 'Failed to close drawer.';
      return;
    }

    emit('drawer-closed', {
      variance: result.variance ?? 0,
      breakdown: result.breakdown ?? expectedCashBreakdown.value
    });

    resetForm();
    emit('update:visible', false);
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to close drawer.';
  } finally {
    isProcessing.value = false;
  }
};

const resetForm = () => {
  reset();
  actualCash.value = 0;
  varianceReason.value = '';
  errorMessage.value = '';
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

// Watch for dialog visibility to refresh expected cash
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetForm();
    refreshExpectedCash();
  }
});
</script>

<style scoped>
.closing-count-dialog {
  max-width: 800px;
  width: 100%;
}

.closing-count-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

.denomination-section,
.variance-section,
.variance-reason-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.denomination-section h3,
.variance-section h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 2px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.loading-breakdown {
  padding: 2rem;
  text-align: center;
  color: var(--text-color-secondary);
  font-style: italic;
}

.variance-reason-section {
  background: var(--yellow-50);
  border: 1px solid var(--yellow-200);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.variance-reason-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--yellow-800);
  margin-bottom: 0.5rem;
}

.variance-reason-label i {
  font-size: 1.2rem;
}

.variance-reason-input {
  width: 100%;
  font-family: inherit;
}

.variance-reason-input.p-invalid {
  border-color: var(--red-500);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: var(--border-radius);
  color: var(--red-800);
}

.error-message i {
  font-size: 1.2rem;
  color: var(--red-500);
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.dialog-footer-right {
  display: flex;
  gap: 0.75rem;
}

/* Dark mode support */
:global(.dark) .variance-reason-section {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
}

:global(.dark) .variance-reason-label {
  color: var(--yellow-400);
}

:global(.dark) .error-message {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--red-400);
}

:global(.dark) .loading-breakdown {
  color: var(--text-color-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .closing-count-dialog {
    max-width: 100%;
    margin: 1rem;
  }

  .closing-count-content {
    gap: 1.5rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer button {
    width: 100%;
  }
}
</style>
