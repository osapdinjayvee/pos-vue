<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import OnboardingConnectivityBanner from './OnboardingConnectivityBanner.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { connectivityService } from '@/services/connectivityService'
import type { TermsDocument } from '@/types/onboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const terms = ref<TermsDocument | null>(null)
const isAgreed = ref(false)
const isFetching = ref(false)
const isAccepting = ref(false)
const fetchError = ref<string | null>(null)
const acceptError = ref<string | null>(null)

const termsUnavailable = ref(false)
const canAccept = computed(() => {
  // Allow proceeding if terms couldn't be loaded (server not ready)
  if (termsUnavailable.value) return true
  return isAgreed.value && terms.value !== null
})

onMounted(async () => {
  await loadTerms()
})

async function loadTerms() {
  isFetching.value = true
  fetchError.value = null
  termsUnavailable.value = false

  try {
    // Show cached content immediately if available
    const cached = await onboarding.getCachedTerms()
    if (cached) {
      terms.value = cached
      isFetching.value = false
    }

    // Fetch fresh copy from server (updates cache for next time)
    if (connectivityService.isOnline.value) {
      const fetched = await onboarding.fetchTerms()
      if (fetched) {
        terms.value = fetched
        isFetching.value = false
        return
      }
    }

    // If we already have cached content, we're good
    if (terms.value) return

    // Nothing available
    termsUnavailable.value = true
    fetchError.value = 'Terms not available. You can proceed and accept them later.'
  } catch (err: any) {
    if (!terms.value) {
      termsUnavailable.value = true
      fetchError.value = 'Terms not available. You can proceed and accept them later.'
    }
  } finally {
    isFetching.value = false
  }
}

async function handleAccept() {
  if (!canAccept.value || isAccepting.value) return

  isAccepting.value = true
  acceptError.value = null

  try {
    if (termsUnavailable.value || !terms.value) {
      // Terms couldn't load — still persist the step so resume doesn't return
      // here, then move on.
      await onboarding.skipTerms()
    } else {
      await onboarding.acceptTerms(terms.value.id, terms.value.version, 'user-admin')
    }
    // Always advance on the first click. acceptTerms records best-effort and
    // never throws for a failed remote sync, so the wizard is never trapped on
    // this screen (the "accept twice" report).
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
    <div class="flex-1 min-h-0 overflow-y-auto pb-4">
      <OnboardingConnectivityBanner />

      <Message v-if="fetchError" :severity="termsUnavailable ? 'warn' : 'error'" :closable="false" :icon="termsUnavailable ? 'pi pi-info-circle' : 'pi pi-times-circle'" class="w-full mb-3">
        <div class="flex flex-col gap-2">
          <span>{{ fetchError }}</span>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            @click="loadTerms"
          />
        </div>
      </Message>

      <Message v-if="acceptError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full mb-3">
        {{ acceptError }}
      </Message>

      <!-- Loading State -->
      <div v-if="isFetching" class="flex flex-col items-center justify-center py-12 gap-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
        <p class="text-surface-500">Loading terms and conditions...</p>
      </div>

      <!-- Terms Content -->
      <div
        v-else-if="terms"
        class="border border-surface-200 rounded-lg p-4 bg-surface-0 text-sm text-surface-700 leading-relaxed"
        v-html="terms.content_html"
      ></div>
    </div>

    <!-- Bottom bar with checkbox + buttons -->
    <div class="shrink-0 bg-surface-50 border-t border-surface-200 px-4 py-3">
      <div v-if="terms && !isFetching" class="flex items-start gap-3 mb-3">
        <Checkbox
          v-model="isAgreed"
          :binary="true"
          inputId="terms-agree"
        />
        <label for="terms-agree" class="text-surface-700 cursor-pointer leading-snug text-sm">
          I have read and agree to the Terms and Conditions
        </label>
      </div>
      <div class="flex justify-between">
        <Button
          label="Back"
          text
          icon="pi pi-arrow-left"
          @click="emit('back')"
        />
        <Button
          :label="termsUnavailable ? 'Skip & Continue' : 'Accept & Continue'"
          :icon="termsUnavailable ? 'pi pi-arrow-right' : 'pi pi-check'"
          iconPos="right"
          class="!h-14 !text-base !font-bold"
          :disabled="!canAccept || isAccepting"
          :loading="isAccepting"
          @click="handleAccept"
        />
      </div>
    </div>
  </div>
</template>
