<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { useTransactionStore } from '@/stores/transaction'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{
  visible: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'voided'): void
  (e: 'cancel'): void
}>()

const transactionStore = useTransactionStore()

// State
const supervisorPin = ref('')
const voidReason = ref('')
const isVerifying = ref(false)
const error = ref<string | null>(null)

// Supervisor credentials (in production, this would verify against database)
const SUPERVISOR_PIN = '1234' // Demo PIN

// Watch for dialog open
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
  }
})

function resetForm() {
  supervisorPin.value = ''
  voidReason.value = ''
  error.value = null
}

async function handleVoid() {
  if (!props.transaction) return

  // Validate inputs
  if (!supervisorPin.value) {
    error.value = 'Please enter supervisor PIN'
    return
  }

  if (!voidReason.value.trim()) {
    error.value = 'Please enter a reason for voiding'
    return
  }

  // Verify PIN
  if (supervisorPin.value !== SUPERVISOR_PIN) {
    error.value = 'Invalid supervisor PIN'
    return
  }

  isVerifying.value = true
  error.value = null

  try {
    const result = await transactionStore.voidTransaction(
      props.transaction.id,
      voidReason.value,
      'supervisor' // In production, get actual supervisor ID
    )

    if (result.success) {
      emit('voided')
      emit('update:visible', false)
    } else {
      error.value = result.error || 'Failed to void transaction'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    isVerifying.value = false
  }
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Void Transaction"
    :modal="true"
    :closable="true"
    :style="{ width: '450px' }"
    @hide="handleCancel"
  >
    <div class="void-dialog">
      <Message severity="warn" :closable="false" class="mb-4">
        <div class="text-sm">
          <strong>Warning:</strong> This action cannot be undone. The transaction will be marked as voided and inventory will be restored.
        </div>
      </Message>

      <!-- Transaction Info -->
      <div v-if="transaction" class="transaction-info p-3 border-round bg-surface-50 mb-4">
        <div class="flex justify-content-between mb-2">
          <span class="text-600">OR Number:</span>
          <span class="font-semibold">{{ transaction.or_number }}</span>
        </div>
        <div class="flex justify-content-between">
          <span class="text-600">Amount:</span>
          <span class="font-semibold">₱{{ transaction.total_amount.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Supervisor PIN -->
      <div class="mb-3">
        <label class="block text-sm font-medium mb-2">Supervisor PIN *</label>
        <Password
          v-model="supervisorPin"
          :feedback="false"
          toggleMask
          class="w-full"
          placeholder="Enter supervisor PIN"
          inputClass="w-full"
        />
      </div>

      <!-- Void Reason -->
      <div class="mb-3">
        <label class="block text-sm font-medium mb-2">Reason for Void *</label>
        <Textarea
          v-model="voidReason"
          rows="3"
          class="w-full"
          placeholder="Enter reason for voiding this transaction"
        />
      </div>

      <!-- Error Message -->
      <Message v-if="error" severity="error" class="mb-3">
        {{ error }}
      </Message>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        @click="handleCancel"
        :disabled="isVerifying"
      />
      <Button
        label="Void Transaction"
        severity="danger"
        icon="pi pi-ban"
        @click="handleVoid"
        :loading="isVerifying"
        :disabled="!supervisorPin || !voidReason"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.transaction-info {
  border: 1px solid var(--surface-border);
}
</style>
