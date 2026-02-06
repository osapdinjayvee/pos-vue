<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { authService } from '@/services/authService'

const props = defineProps<{
  visible: boolean
  actionLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'authorized', supervisorId: string): void
  (e: 'cancel'): void
}>()

const supervisorUsername = ref('')
const supervisorPin = ref('')
const isVerifying = ref(false)
const error = ref<string | null>(null)

watch(() => props.visible, (visible) => {
  if (visible) {
    supervisorUsername.value = ''
    supervisorPin.value = ''
    error.value = null
    isVerifying.value = false
  }
})

async function handleAuthorize() {
  if (!supervisorUsername.value.trim() || !supervisorPin.value) {
    error.value = 'Please enter both username and PIN'
    return
  }

  isVerifying.value = true
  error.value = null

  try {
    const result = await authService.verifySupervisorPin(
      supervisorUsername.value.trim(),
      supervisorPin.value,
      'pos.manager_override'
    )

    if (result.authorized && result.supervisorId) {
      emit('authorized', result.supervisorId)
      emit('update:visible', false)
    } else {
      error.value = result.error || 'Authorization failed'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Verification error'
  } finally {
    isVerifying.value = false
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :style="{ width: '420px' }"
    @hide="handleCancel"
    :header="actionLabel ? `Authorization: ${actionLabel}` : 'Manager Override'"
  >
    <div class="py-2">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-lock text-amber-600"></i>
        </div>
        <p class="text-sm text-neutral-600 m-0">
          This action requires supervisor authorization. Enter your credentials to proceed.
        </p>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-neutral-700 mb-2">Supervisor Username</label>
        <InputText
          v-model="supervisorUsername"
          class="w-full"
          placeholder="Enter username"
          @keydown.enter="handleAuthorize"
          autofocus
        />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-neutral-700 mb-2">PIN</label>
        <Password
          v-model="supervisorPin"
          :feedback="false"
          toggleMask
          class="w-full"
          inputClass="w-full"
          placeholder="Enter PIN"
          @keydown.enter="handleAuthorize"
        />
      </div>

      <Message v-if="error" severity="error" :closable="false" class="mb-0">{{ error }}</Message>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        @click="handleCancel"
        :disabled="isVerifying"
      />
      <Button
        label="Authorize"
        icon="pi pi-shield"
        severity="warn"
        @click="handleAuthorize"
        :loading="isVerifying"
        :disabled="!supervisorUsername.trim() || !supervisorPin"
      />
    </template>
  </Dialog>
</template>
