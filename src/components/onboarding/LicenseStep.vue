<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import OnboardingConnectivityBanner from './OnboardingConnectivityBanner.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { connectivityService } from '@/services/connectivityService'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const licenseKey = ref('')
const verifyError = ref<string | null>(null)
const verifySuccess = ref<string | null>(null)
const licenseType = ref<string | null>(null)
const isVerifying = ref(false)

const isDev = import.meta.env.DEV
const alreadyVerified = computed(() => onboarding.isLicenseVerified.value)
const canProceed = computed(() => alreadyVerified.value || !!verifySuccess.value)
const isOffline = computed(() => !connectivityService.isOnline.value)

onMounted(() => {
  if (alreadyVerified.value && onboarding.progress.value) {
    licenseType.value = onboarding.progress.value.license_type
    verifySuccess.value = 'License already verified'
  }
})

async function handleBypass() {
  isVerifying.value = true
  try {
    await onboarding.setLicenseVerified('DEV-TEST-KEY', 'development')
    verifySuccess.value = 'License bypassed (dev mode)'
    licenseType.value = 'development'
  } finally {
    isVerifying.value = false
  }
}

async function handleVerify() {
  if (!licenseKey.value.trim()) {
    verifyError.value = 'Please enter a license key'
    return
  }

  verifyError.value = null
  verifySuccess.value = null
  isVerifying.value = true

  try {
    const result = await onboarding.verifyLicense(licenseKey.value.trim())
    if (result.valid) {
      verifySuccess.value = 'License verified successfully'
      licenseType.value = result.license_type
    } else {
      verifyError.value = result.error || 'Invalid license key'
    }
  } catch (err: any) {
    verifyError.value = err.message || 'Failed to verify license'
  } finally {
    isVerifying.value = false
  }
}

function handleNext() {
  emit('next')
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">License Verification</h2>
      <p class="text-surface-500 mt-1">Enter your license key to activate the POS system</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center justify-center gap-5 min-h-full">
        <OnboardingConnectivityBanner />

        <Message v-if="verifyError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ verifyError }}
        </Message>

        <Message v-if="verifySuccess" severity="success" :closable="false" icon="pi pi-check-circle" class="w-full max-w-md">
          {{ verifySuccess }}
          <span v-if="licenseType"> &mdash; License type: <strong>{{ licenseType }}</strong></span>
        </Message>

        <div v-if="!alreadyVerified" class="flex flex-col gap-3 w-full max-w-md">
          <label for="license-key" class="font-semibold text-surface-700">License Key</label>
          <InputText
            id="license-key"
            v-model="licenseKey"
            placeholder="Enter your license key"
            fluid
            :disabled="isVerifying || !!verifySuccess"
          />
          <Button
            label="Verify License"
            icon="pi pi-check"
            :loading="isVerifying"
            :disabled="!licenseKey.trim() || isOffline || !!verifySuccess"
            @click="handleVerify"
          />
          <Button
            v-if="isDev"
            label="Skip (Dev Mode)"
            icon="pi pi-forward"
            severity="secondary"
            outlined
            :loading="isVerifying"
            :disabled="!!verifySuccess"
            @click="handleBypass"
          />
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
        :disabled="!canProceed"
        @click="handleNext"
      />
    </div>
  </div>
</template>
