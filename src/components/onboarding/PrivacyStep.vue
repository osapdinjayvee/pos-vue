<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { useOnboarding } from '@/composables/useOnboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const isAgreed = ref(false)
const isAccepting = ref(false)
const acceptError = ref<string | null>(null)

const privacyContent = `
<p>We are committed to protecting your personal data in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines.</p>

<h4 class="mt-3 mb-1 font-semibold">Information We Collect</h4>
<ul class="list-disc pl-5 space-y-1">
  <li>Business registration details (name, TIN, address)</li>
  <li>User account information (name, username, PIN)</li>
  <li>Transaction records and sales data</li>
  <li>Customer information (if CRM features are used)</li>
  <li>Inventory and product data</li>
</ul>

<h4 class="mt-3 mb-1 font-semibold">How We Use Your Data</h4>
<ul class="list-disc pl-5 space-y-1">
  <li>Processing point-of-sale transactions</li>
  <li>Generating BIR-compliant reports and receipts</li>
  <li>Synchronizing data between devices (when online)</li>
  <li>Submitting electronic invoicing/receipts to BIR EIS</li>
</ul>

<h4 class="mt-3 mb-1 font-semibold">Data Storage & Security</h4>
<p>Your data is stored locally on your device and encrypted during transmission. We employ industry-standard security measures to protect your information.</p>

<h4 class="mt-3 mb-1 font-semibold">Your Rights</h4>
<p>Under RA 10173, you have the right to access, correct, and request deletion of your personal data. Contact your system administrator for data-related requests.</p>
`

async function handleAccept() {
  if (!isAgreed.value) return

  isAccepting.value = true
  acceptError.value = null

  try {
    await onboarding.acceptPrivacy()
    emit('next')
  } catch (err: any) {
    acceptError.value = err.message || 'Failed to accept privacy policy'
  } finally {
    isAccepting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Privacy Policy</h2>
      <p class="text-surface-500 mt-1">Please review and accept the privacy policy</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center gap-5 w-full">
        <Message v-if="acceptError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ acceptError }}
        </Message>

        <div
          class="border border-surface-200 rounded-lg p-4 bg-surface-0 overflow-y-auto max-h-80 text-sm text-surface-700 leading-relaxed w-full"
          v-html="privacyContent"
        ></div>

        <!-- Agreement Checkbox -->
        <div class="flex items-start gap-3 pt-2 w-full">
          <Checkbox
            v-model="isAgreed"
            :binary="true"
            inputId="privacy-agree"
          />
          <label for="privacy-agree" class="text-surface-700 cursor-pointer leading-snug">
            I have read and agree to the Privacy Policy
          </label>
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
        label="Accept & Continue"
        icon="pi pi-check"
        iconPos="right"
        class="!h-14 !text-base !font-bold"
        :disabled="!isAgreed || isAccepting"
        :loading="isAccepting"
        @click="handleAccept"
      />
    </div>
  </div>
</template>
