<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import VarianceDisplay from '@/components/cash-drawer/VarianceDisplay.vue'
import SupervisorAuthDialog from '@/components/auth/SupervisorAuthDialog.vue'
import { useShift } from '@/composables/useShift'
import { useCashDrawer } from '@/composables/useCashDrawer'
import { useAuthStore } from '@/stores/auth'

interface Props {
  visible: boolean
  mode: 'start' | 'end'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'shift-started': []
  'shift-ended': []
}>()

const router = useRouter()
const authStore = useAuthStore()
const shift = useShift()
const drawer = useCashDrawer()

// Form state
const cashAmount = ref<number | null>(null)
const varianceReason = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

// Supervisor override
const showSupervisorAuth = ref(false)

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const dialogHeader = computed(() =>
  props.mode === 'start' ? 'Start Shift' : 'End Shift'
)

const dialogIcon = computed(() =>
  props.mode === 'start' ? 'pi pi-sign-in' : 'pi pi-sign-out'
)

const isConfirmDisabled = computed(() =>
  !cashAmount.value || cashAmount.value < 0 || isSubmitting.value
)

// End-shift computed
const actualCash = computed(() => cashAmount.value || 0)
const expectedCash = computed(() => drawer.expectedCash.value)
const variance = computed(() => actualCash.value - expectedCash.value)
const showVarianceReason = computed(() =>
  props.mode === 'end' && Math.abs(variance.value) > (drawer.varianceThreshold.value || 100)
)

// Reset form when dialog opens
watch(() => props.visible, async (visible) => {
  if (visible) {
    cashAmount.value = null
    varianceReason.value = ''
    errorMessage.value = ''
    isSubmitting.value = false

    if (props.mode === 'end') {
      await drawer.refreshExpectedCash()
    }
  }
})

// Start Shift
async function handleStartShift() {
  if (!cashAmount.value || cashAmount.value < 0) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const openingCash = cashAmount.value
    const result = await shift.startShift(openingCash)

    if (!result.success) {
      errorMessage.value = result.error || 'Failed to start shift'
      return
    }

    // Open drawer session
    const shiftId = shift.currentShift.value?.id
    const userId = authStore.currentUser?.id
    const terminalId = authStore.terminalId || 'POS-001'

    if (shiftId && userId) {
      const denominations = [{ denomination: 1, quantity: openingCash, subtotal: openingCash }]
      const drawerResult = await drawer.startShift(shiftId, userId, terminalId, denominations)

      if (!drawerResult.success) {
        errorMessage.value = drawerResult.error || 'Failed to open cash drawer'
        return
      }
    }

    dialogVisible.value = false
    emit('shift-started')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// End Shift
async function handleEndShift() {
  if (!cashAmount.value || cashAmount.value < 0) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const closingCash = cashAmount.value
    const denominations = [{ denomination: 1, quantity: closingCash, subtotal: closingCash }]
    const reason = showVarianceReason.value ? varianceReason.value : undefined

    const drawerResult = await drawer.endShift(denominations, reason)
    if (!drawerResult.success) {
      errorMessage.value = drawerResult.error || 'Failed to close drawer'
      return
    }

    const shiftResult = await shift.closeShift(closingCash, reason)
    if (!shiftResult.success) {
      errorMessage.value = shiftResult.error || 'Failed to close shift'
      return
    }

    dialogVisible.value = false
    emit('shift-ended')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// Close Without Count (supervisor override)
function handleCloseWithoutCount() {
  showSupervisorAuth.value = true
}

async function handleSupervisorAuthorized(supervisorId: string) {
  showSupervisorAuth.value = false
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const result = await shift.forceCloseShift(supervisorId)
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to force close shift'
      return
    }

    dialogVisible.value = false
    emit('shift-ended')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// Quick actions
function navigateToXRead() {
  dialogVisible.value = false
  router.push('/reports/x-reading')
}

function navigateToZRead() {
  dialogVisible.value = false
  router.push('/reports/z-reading')
}

function handleConfirm() {
  if (props.mode === 'start') {
    handleStartShift()
  } else {
    handleEndShift()
  }
}

function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogHeader"
    modal
    :closable="!isSubmitting"
    :close-on-escape="!isSubmitting"
    :dismissable-mask="false"
    :style="{ width: '480px', maxWidth: '95vw' }"
    :pt="{
      root: { class: 'shift-dialog-root' },
      header: { class: props.mode === 'start' ? 'shift-dialog-header-start' : 'shift-dialog-header-end' },
      content: { class: 'shift-dialog-content' },
      footer: { class: 'shift-dialog-footer' }
    }"
  >
    <template #header>
      <div class="hdr">
        <div class="hdr-icon">
          <i :class="dialogIcon"></i>
        </div>
        <div>
          <h2>{{ dialogHeader }}</h2>
          <span class="hdr-sub">
            {{ mode === 'start' ? 'Enter the opening cash in the drawer' : 'Enter the closing cash count' }}
          </span>
        </div>
      </div>
    </template>

    <div class="body">
      <!-- Cash Amount Input (both modes) -->
      <div class="form-section">
        <label class="amount-label" for="shift-cash-amount">
          {{ mode === 'start' ? 'Opening Cash (₱)' : 'Closing Cash (₱)' }}
        </label>
        <InputNumber
          id="shift-cash-amount"
          v-model="cashAmount"
          :min="0"
          :min-fraction-digits="2"
          :max-fraction-digits="2"
          mode="currency"
          currency="PHP"
          locale="en-PH"
          placeholder="0.00"
          :disabled="isSubmitting"
          class="amount-input"
          inputClass="amount-field"
          autofocus
          @keydown.enter="handleConfirm"
        />
      </div>

      <!-- End Mode: Variance Display -->
      <div v-if="mode === 'end' && cashAmount !== null && cashAmount >= 0" class="variance-section">
        <VarianceDisplay
          :expected-cash="expectedCash"
          :actual-cash="actualCash"
          :threshold="drawer.varianceThreshold.value || 100"
          :breakdown="drawer.expectedCashBreakdown.value"
        />
      </div>

      <!-- End Mode: Variance Reason -->
      <div v-if="showVarianceReason" class="form-section">
        <label class="amount-label" for="variance-reason">
          Variance Reason <span class="text-red-500">*</span>
        </label>
        <Textarea
          id="variance-reason"
          v-model="varianceReason"
          rows="3"
          placeholder="Explain the reason for the variance..."
          :disabled="isSubmitting"
          class="w-full"
        />
      </div>

      <!-- End Mode: Quick Actions -->
      <div v-if="mode === 'end'" class="quick-actions">
        <Button
          label="View X-Reading"
          icon="pi pi-file"
          severity="secondary"
          outlined
          size="small"
          @click="navigateToXRead"
        />
        <Button
          label="View Z-Reading"
          icon="pi pi-file-export"
          severity="secondary"
          outlined
          size="small"
          @click="navigateToZRead"
        />
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-msg">
        <i class="pi pi-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="ftr">
        <Button
          label="Cancel"
          severity="secondary"
          text
          :disabled="isSubmitting"
          @click="handleCancel"
        />

        <Button
          v-if="mode === 'end'"
          label="Close Without Count"
          severity="warn"
          text
          :disabled="isSubmitting"
          @click="handleCloseWithoutCount"
        />

        <Button
          :label="mode === 'start' ? 'Start Shift' : 'End Shift & Close Drawer'"
          :icon="mode === 'start' ? 'pi pi-sign-in' : 'pi pi-sign-out'"
          :loading="isSubmitting"
          :disabled="isConfirmDisabled"
          :severity="mode === 'start' ? 'primary' : 'danger'"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>

  <!-- Supervisor Auth for Close Without Count -->
  <SupervisorAuthDialog
    :visible="showSupervisorAuth"
    action="Close shift without cash count"
    required-permission="shift.force_close"
    @update:visible="showSupervisorAuth = $event"
    @authorized="handleSupervisorAuthorized"
    @cancelled="showSupervisorAuth = false"
  />
</template>

<style scoped>
/* Dialog root */
:deep(.shift-dialog-root) {
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
}

:deep(.shift-dialog-header-start) {
  background: var(--primary-color);
  padding: 1.25rem 1.5rem !important;
  border-bottom: none;
}

:deep(.shift-dialog-header-end) {
  background: var(--red-600);
  padding: 1.25rem 1.5rem !important;
  border-bottom: none;
}

:deep(.shift-dialog-content) {
  padding: 1.5rem !important;
}

:deep(.shift-dialog-footer) {
  padding: 0 1.5rem 1.5rem !important;
  border-top: none;
}

/* Header */
.hdr {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.hdr-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.hdr-icon i {
  font-size: 1.25rem;
  color: #fff;
}

.hdr h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

.hdr-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
}

/* Body */
.body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.amount-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.amount-input {
  width: 100%;
}

:deep(.amount-field) {
  width: 100%;
  height: 3.5rem;
  font-size: 1.75rem;
  font-weight: 800;
  text-align: center;
  border-radius: 0.625rem;
}

.variance-section {
  margin: 0 -1.5rem;
  padding: 0 1.5rem;
}

.variance-section :deep(.variance-card) {
  box-shadow: none;
  border: 1px solid var(--surface-border);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 0.5rem;
}

.quick-actions :deep(.p-button) {
  flex: 1;
}

/* Error */
.error-msg {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 0.5rem;
  color: var(--red-700);
  font-size: 0.8125rem;
}

.error-msg i {
  color: var(--red-500);
  flex-shrink: 0;
}

/* Footer */
.ftr {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

/* Mobile */
@media (max-width: 599px) {
  :deep(.shift-dialog-root) {
    border-radius: 0;
    margin: 0 !important;
    min-height: 100vh;
  }

  :deep(.amount-field) {
    font-size: 1.5rem;
    height: 3rem;
  }

  .quick-actions {
    flex-direction: column;
  }
}

/* Dark mode */
:root.p-dark .error-msg {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
  color: var(--red-400);
}

:root.p-dark .error-msg i {
  color: var(--red-400);
}
</style>
