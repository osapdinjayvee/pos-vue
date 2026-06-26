<script setup lang="ts">
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import AmountInput from '@/components/common/AmountInput.vue'
import { useCashDrawer } from '@/composables/useCashDrawer'

interface Props {
  visible: boolean
  shiftId: string
  userId: string
  terminalId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'drawer-opened': [amount: number]
}>()

const { startShift, isLoading } = useCashDrawer()

const amount = ref<number | null>(null)
const errorMessage = ref('')

const isConfirmDisabled = computed(() => !amount.value || amount.value <= 0 || isLoading.value)

const formattedAmount = computed(() => {
  const val = amount.value || 0
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

async function handleConfirm() {
  if (!amount.value || amount.value <= 0) return
  errorMessage.value = ''

  // Pass as a single lump-sum denomination entry
  const denominations = [{ denomination: 1, quantity: amount.value, subtotal: amount.value }]

  const result = await startShift(props.shiftId, props.userId, props.terminalId, denominations)

  if (result.success) {
    emit('drawer-opened', amount.value)
    emit('update:visible', false)
    amount.value = null
    errorMessage.value = ''
  } else {
    errorMessage.value = result.error || 'Failed to open cash drawer.'
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :dismissable-mask="false"
    :breakpoints="{ '599px': '100vw' }"
    :style="{ width: '420px', maxWidth: '95vw' }"
    @update:visible="emit('update:visible', $event)"
    :pt="{
      root: { class: 'opening-root' },
      header: { class: 'opening-header' },
      content: { class: 'opening-content' },
      footer: { class: 'opening-footer' }
    }"
  >
    <template #header>
      <div class="hdr">
        <div class="hdr-icon"><i class="pi pi-lock-open"></i></div>
        <div>
          <h2>Opening Cash</h2>
          <span class="hdr-sub">Enter the total cash in the drawer</span>
        </div>
      </div>
    </template>

    <div class="body">
      <label class="amount-label" for="opening-amount">Amount (₱)</label>
      <AmountInput
        id="opening-amount"
        v-model="amount"
        :min="0"
        placeholder="0.00"
        :disabled="isLoading"
        class="amount-input"
        inputClass="amount-field"
        autofocus
      />

      <div v-if="errorMessage" class="error-msg">
        <i class="pi pi-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="ftr">
        <Button
          label="Confirm & Open Drawer"
          icon="pi pi-lock-open"
          :loading="isLoading"
          :disabled="isConfirmDisabled"
          class="confirm-btn"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Header */
:deep(.opening-root) {
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
}

:deep(.opening-header) {
  background: var(--primary-color);
  padding: 1.25rem 1.5rem !important;
  border-bottom: none;
}

:deep(.opening-content) {
  padding: 1.5rem !important;
}

:deep(.opening-footer) {
  padding: 0 1.5rem 1.5rem !important;
  border-top: none;
}

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
  gap: 0.75rem;
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
  width: 100%;
}

.confirm-btn {
  width: 100%;
  justify-content: center;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 0.625rem;
}

/* Mobile full-screen */
@media (max-width: 599px) {
  :deep(.opening-root) {
    border-radius: 0;
    margin: 0 !important;
    min-height: 100vh;
  }

  :deep(.opening-header) {
    padding: 1rem !important;
  }

  :deep(.opening-content) {
    padding: 1.25rem 1rem !important;
  }

  :deep(.opening-footer) {
    padding: 0 1rem 1rem !important;
  }

  :deep(.amount-field) {
    font-size: 1.5rem;
    height: 3rem;
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
