<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import PinPad from './PinPad.vue'
import { authService } from '@/services/authService'

const props = defineProps<{
  visible: boolean
  action: string
  requiredPermission: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  authorized: [supervisorId: string]
  cancelled: []
}>()

const step = ref<'username' | 'pin'>('username')
const supervisorUsername = ref('')
const pin = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)
const pinPadRef = ref<InstanceType<typeof PinPad> | null>(null)
const usernameInputRef = ref<HTMLInputElement | null>(null)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const dialogTitle = computed(() => {
  if (step.value === 'username') {
    return 'Supervisor Authorization Required'
  }
  return `Authorizing: ${supervisorUsername.value}`
})

const actionDescription = computed(() => {
  const actionMap: Record<string, string> = {
    'sales.void': 'Void Transaction',
    'sales.refund': 'Process Refund',
    'inventory.adjust': 'Stock Adjustment'
  }
  return actionMap[props.requiredPermission] || props.action || 'This action'
})

async function handleUsernameSubmit() {
  if (!supervisorUsername.value.trim()) {
    error.value = 'Please enter supervisor username'
    return
  }

  error.value = null
  step.value = 'pin'

  // Focus PIN pad after transition
  setTimeout(() => {
    pinPadRef.value?.focus()
  }, 100)
}

async function handlePinSubmit() {
  if (pin.value.length < 4) {
    error.value = 'PIN must be at least 4 digits'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const result = await authService.verifySupervisorPin(
      supervisorUsername.value,
      pin.value,
      props.requiredPermission
    )

    if (result.authorized) {
      emit('authorized', result.supervisorId!)
      closeDialog()
    } else {
      error.value = result.error || 'Authorization failed'
      pin.value = ''
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Authorization failed'
    pin.value = ''
  } finally {
    isLoading.value = false
  }
}

function handleBack() {
  step.value = 'username'
  pin.value = ''
  error.value = null

  // Focus username input after transition
  setTimeout(() => {
    usernameInputRef.value?.focus()
  }, 100)
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
  step.value = 'username'
  supervisorUsername.value = ''
  pin.value = ''
  error.value = null
  isLoading.value = false
}

// Reset form when dialog opens
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      // Focus username input when dialog opens
      setTimeout(() => {
        usernameInputRef.value?.focus()
      }, 100)
    }
  }
)
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    modal
    :closable="!isLoading"
    :close-on-escape="!isLoading"
    :style="{ width: '400px' }"
    class="supervisor-auth-dialog"
  >
    <div class="supervisor-auth-content">
      <!-- Action Description -->
      <div class="action-info">
        <i class="pi pi-shield action-icon"></i>
        <p class="action-text">
          <strong>{{ actionDescription }}</strong> requires supervisor authorization.
        </p>
      </div>

      <!-- Error Message -->
      <Message v-if="error" severity="error" :closable="false" class="error-message">
        {{ error }}
      </Message>

      <!-- Step 1: Username -->
      <div v-if="step === 'username'" class="username-step">
        <div class="form-field">
          <label for="supervisor-username">Supervisor Username</label>
          <InputText
            id="supervisor-username"
            ref="usernameInputRef"
            v-model="supervisorUsername"
            placeholder="Enter supervisor username"
            :disabled="isLoading"
            class="w-full"
            @keyup.enter="handleUsernameSubmit"
          />
        </div>
      </div>

      <!-- Step 2: PIN -->
      <div v-else class="pin-step">
        <p class="pin-prompt">Enter PIN for {{ supervisorUsername }}</p>
        <PinPad
          ref="pinPadRef"
          v-model="pin"
          :max-length="6"
          :disabled="isLoading"
          @submit="handlePinSubmit"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          v-if="step === 'pin'"
          label="Back"
          text
          severity="secondary"
          :disabled="isLoading"
          @click="handleBack"
        />
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="isLoading"
          @click="handleCancel"
        />
        <Button
          v-if="step === 'username'"
          label="Continue"
          :loading="isLoading"
          @click="handleUsernameSubmit"
        />
        <Button
          v-else
          label="Authorize"
          :loading="isLoading"
          :disabled="pin.length < 4"
          @click="handlePinSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.supervisor-auth-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-info {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.action-icon {
  font-size: 1.5rem;
  color: var(--p-warning-500);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.action-text {
  margin: 0;
  color: var(--p-text-color);
  line-height: 1.5;
}

.error-message {
  margin: 0;
}

.username-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.pin-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pin-prompt {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
