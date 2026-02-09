<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import OnboardingConnectivityBanner from './OnboardingConnectivityBanner.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { connectivityService } from '@/services/connectivityService'
import type { TermsActiveResponse } from '@/types/onboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const terms = ref<TermsActiveResponse | null>(null)
const isAgreed = ref(false)
const isFetching = ref(false)
const isAccepting = ref(false)
const fetchError = ref<string | null>(null)
const acceptError = ref<string | null>(null)

const canAccept = computed(() => isAgreed.value && terms.value !== null)

onMounted(async () => {
  await loadTerms()
})

async function loadTerms() {
  isFetching.value = true
  fetchError.value = null

  // Dev mode: skip API, use mock terms
  if (import.meta.env.DEV) {
    terms.value = {
      id: 'dev-terms',
      version: '1.0.0',
      title: 'Terms and Conditions',
      content_html: '<p>This is a placeholder for the Terms and Conditions during development. In production, actual terms will be fetched from the server.</p>',
      published_at: new Date().toISOString()
    }
    isFetching.value = false
    return
  }

  try {
    if (connectivityService.isOnline.value) {
      terms.value = await onboarding.fetchTerms()
    } else {
      const cached = await onboarding.getCachedTerms()
      if (cached) {
        terms.value = cached
      } else {
        throw new Error('No internet connection and no cached terms available.')
      }
    }
  } catch (err: any) {
    fetchError.value = err.message || 'Failed to load terms and conditions'
  } finally {
    isFetching.value = false
  }
}

async function handleAccept() {
  if (!canAccept.value || !terms.value) return

  isAccepting.value = true
  acceptError.value = null

  try {
    await onboarding.acceptTerms(terms.value.id, terms.value.version, 'user-admin')
    emit('next')
  } catch (err: any) {
    acceptError.value = err.message || 'Failed to accept terms'
  } finally {
    isAccepting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Terms & Conditions</h2>
      <p class="text-surface-500 mt-1">Please review and accept the terms to continue</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center gap-5 w-full">
        <OnboardingConnectivityBanner />

        <Message v-if="fetchError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          <div class="flex flex-col gap-2">
            <span>{{ fetchError }}</span>
            <Button
              label="Retry"
              icon="pi pi-refresh"
              size="small"
              severity="danger"
              outlined
              @click="loadTerms"
            />
          </div>
        </Message>

        <Message v-if="acceptError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ acceptError }}
        </Message>

        <!-- Loading State -->
        <div v-if="isFetching" class="flex flex-col items-center justify-center py-12 gap-4">
          <ProgressSpinner style="width: 50px; height: 50px" />
          <p class="text-surface-500">Loading terms and conditions...</p>
        </div>

        <!-- Terms Content -->
        <template v-else-if="terms">
          <h3 class="font-semibold text-surface-800 text-lg">{{ terms.title }}</h3>

          <div
            class="border border-surface-200 rounded-lg p-4 bg-surface-0 overflow-y-auto max-h-80 text-sm text-surface-700 leading-relaxed w-full"
            v-html="terms.content_html"
          ></div>

          <!-- Agreement Checkbox -->
          <div class="flex items-start gap-3 pt-2 w-full">
            <Checkbox
              v-model="isAgreed"
              :binary="true"
              inputId="terms-agree"
            />
            <label for="terms-agree" class="text-surface-700 cursor-pointer leading-snug">
              I have read and agree to the Terms and Conditions
            </label>
          </div>
        </template>
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
        :disabled="!canAccept || isAccepting"
        :loading="isAccepting"
        @click="handleAccept"
      />
    </div>
  </div>
</template>
