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

const privacy = ref<TermsDocument | null>(null)
const isAgreed = ref(false)
const isFetching = ref(false)
const isAccepting = ref(false)
const fetchError = ref<string | null>(null)
const acceptError = ref<string | null>(null)

const canAccept = computed(() => isAgreed.value && privacy.value !== null)

onMounted(async () => {
  await loadPrivacy()
})

async function loadPrivacy() {
  isFetching.value = true
  fetchError.value = null

  try {
    if (connectivityService.isOnline.value) {
      const fetched = await onboarding.fetchPrivacyPolicy()
      if (fetched) {
        privacy.value = fetched
      } else {
        const cached = await onboarding.getCachedPrivacy()
        if (cached) {
          privacy.value = cached
        } else {
          throw new Error('Failed to load privacy policy from server and no cached version available.')
        }
      }
    } else {
      const cached = await onboarding.getCachedPrivacy()
      if (cached) {
        privacy.value = cached
      } else {
        throw new Error('No internet connection and no cached privacy policy available.')
      }
    }
  } catch (err: any) {
    fetchError.value = err.message || 'Failed to load privacy policy'
  } finally {
    isFetching.value = false
  }
}

async function handleAccept() {
  if (!canAccept.value || !privacy.value) return

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
    <div class="flex-1 overflow-y-auto pb-28">
      <OnboardingConnectivityBanner />

      <Message v-if="fetchError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full mb-3">
        <div class="flex flex-col gap-2">
          <span>{{ fetchError }}</span>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            size="small"
            severity="danger"
            outlined
            @click="loadPrivacy"
          />
        </div>
      </Message>

      <Message v-if="acceptError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full mb-3">
        {{ acceptError }}
      </Message>

      <!-- Loading State -->
      <div v-if="isFetching" class="flex flex-col items-center justify-center py-12 gap-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
        <p class="text-surface-500">Loading privacy policy...</p>
      </div>

      <!-- Privacy Content -->
      <div
        v-else-if="privacy"
        class="border border-surface-200 rounded-lg p-4 bg-surface-0 text-sm text-surface-700 leading-relaxed"
        v-html="privacy.content_html"
      ></div>
    </div>

    <!-- Fixed bottom bar with checkbox + buttons -->
    <div class="fixed bottom-0 left-0 right-0 bg-surface-50 border-t border-surface-200 px-4 py-3">
      <div v-if="privacy && !isFetching" class="flex items-start gap-3 mb-3">
        <Checkbox
          v-model="isAgreed"
          :binary="true"
          inputId="privacy-agree"
        />
        <label for="privacy-agree" class="text-surface-700 cursor-pointer leading-snug text-sm">
          I have read and agree to the Privacy Policy
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
  </div>
</template>
