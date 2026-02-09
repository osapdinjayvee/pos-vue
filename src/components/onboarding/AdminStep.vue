<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { useOnboarding } from '@/composables/useOnboarding'
import type { AdminSetupInput } from '@/types/onboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const form = ref({
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  pin: '',
  confirmPin: ''
})

const isSaving = ref(false)
const saveError = ref<string | null>(null)

const pinMismatch = computed(() => {
  return form.value.pin.length > 0 &&
    form.value.confirmPin.length > 0 &&
    form.value.pin !== form.value.confirmPin
})

const pinLengthValid = computed(() => {
  const len = form.value.pin.length
  return len >= 4 && len <= 6
})

const pinIsDigitsOnly = computed(() => /^\d*$/.test(form.value.pin))

const isValid = computed(() => {
  return !!(
    form.value.username.trim() &&
    form.value.firstName.trim() &&
    form.value.lastName.trim() &&
    form.value.pin.length >= 4 &&
    form.value.pin.length <= 6 &&
    pinIsDigitsOnly.value &&
    form.value.pin === form.value.confirmPin
  )
})

function enforceUsername() {
  form.value.username = form.value.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

async function handleNext() {
  if (!isValid.value) return

  isSaving.value = true
  saveError.value = null

  try {
    const data: AdminSetupInput = {
      username: form.value.username,
      pin: form.value.pin,
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email || undefined
    }
    await onboarding.completeAdmin(data)
    emit('next')
  } catch (err: any) {
    saveError.value = err.message || 'Failed to create admin account'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Admin Account</h2>
      <p class="text-surface-500 mt-1">Set up the administrator credentials</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center gap-5 w-full">
        <Message v-if="saveError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ saveError }}
        </Message>

        <div class="flex flex-col gap-4 w-full max-w-md">
          <!-- Username -->
          <div class="flex flex-col gap-1">
            <label for="admin-username" class="font-semibold text-surface-700">
              Username <span class="text-red-500">*</span>
            </label>
            <InputText
              id="admin-username"
              v-model="form.username"
              placeholder="admin username (lowercase)"
              fluid
              @input="enforceUsername"
            />
          </div>

          <!-- First Name & Last Name -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label for="admin-first-name" class="font-semibold text-surface-700">
                First Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="admin-first-name"
                v-model="form.firstName"
                placeholder="First name"
                fluid
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="admin-last-name" class="font-semibold text-surface-700">
                Last Name <span class="text-red-500">*</span>
              </label>
              <InputText
                id="admin-last-name"
                v-model="form.lastName"
                placeholder="Last name"
                fluid
              />
            </div>
          </div>

          <!-- Email -->
          <div class="flex flex-col gap-1">
            <label for="admin-email" class="font-semibold text-surface-700">Email</label>
            <InputText
              id="admin-email"
              v-model="form.email"
              type="email"
              placeholder="Email address (optional)"
              fluid
            />
          </div>

          <!-- PIN -->
          <div class="flex flex-col gap-1">
            <label for="admin-pin" class="font-semibold text-surface-700">
              PIN <span class="text-red-500">*</span>
            </label>
            <Password
              id="admin-pin"
              v-model="form.pin"
              placeholder="4-6 digit PIN"
              :feedback="false"
              toggleMask
              fluid
              inputClass="w-full"
            />
            <small v-if="form.pin && !pinIsDigitsOnly" class="text-red-500">
              PIN must contain only digits
            </small>
            <small v-else-if="form.pin && !pinLengthValid" class="text-red-500">
              PIN must be 4-6 digits
            </small>
          </div>

          <!-- Confirm PIN -->
          <div class="flex flex-col gap-1">
            <label for="admin-confirm-pin" class="font-semibold text-surface-700">
              Confirm PIN <span class="text-red-500">*</span>
            </label>
            <Password
              id="admin-confirm-pin"
              v-model="form.confirmPin"
              placeholder="Re-enter PIN"
              :feedback="false"
              toggleMask
              fluid
              inputClass="w-full"
            />
            <small v-if="pinMismatch" class="text-red-500">
              PINs do not match
            </small>
          </div>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-surface-50 flex justify-between px-4 py-4">
      <Button
        label="Back"
        text
        icon="pi pi-arrow-left"
        @click="emit('back')"
      />
      <Button
        label="Next"
        icon="pi pi-arrow-right"
        iconPos="right"
        class="!h-14 !text-base !font-bold"
        :disabled="!isValid || isSaving"
        :loading="isSaving"
        @click="handleNext"
      />
    </div>
  </div>
</template>
