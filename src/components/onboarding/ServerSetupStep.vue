<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import OnboardingConnectivityBanner from './OnboardingConnectivityBanner.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { connectivityService } from '@/services/connectivityService'
import { getApiBaseUrl, setApiBaseUrl } from '@/config/sync'
import { httpClient } from '@/services/httpClient'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const serverUrl = ref('')
const testError = ref<string | null>(null)
const testSuccess = ref<string | null>(null)
const isTesting = ref(false)
const isSaving = ref(false)

const isOffline = computed(() => !connectivityService.isOnline.value)
const canProceed = computed(() => !!testSuccess.value)

onMounted(() => {
  // Pre-fill with existing URL or default
  if (onboarding.progress.value?.server_url) {
    serverUrl.value = onboarding.progress.value.server_url
    testSuccess.value = 'Server already configured'
  } else {
    serverUrl.value = getApiBaseUrl()
  }
})

function normalizeUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '')
  // Auto-append /api if the user entered a full URL without it
  if (url && url.startsWith('http') && !url.endsWith('/api')) {
    url += '/api'
  }
  return url
}

async function handleTestConnection() {
  const url = normalizeUrl(serverUrl.value)
  if (!url) {
    testError.value = 'Please enter a server URL'
    return
  }

  testError.value = null
  testSuccess.value = null
  isTesting.value = true

  try {
    // Use raw fetch — works on all platforms (Capacitor patches window.fetch natively)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${url}/ping`, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (response.ok) {
      setApiBaseUrl(url)
      testSuccess.value = 'Connection successful'
      serverUrl.value = url
    } else {
      testError.value = `Server returned status ${response.status}`
    }
  } catch (err: any) {
    // Show full error detail for debugging
    const name = err.name || ''
    const msg = err.message || ''
    if (name === 'AbortError') {
      testError.value = 'Connection timed out (10s). Is the server running?'
    } else {
      testError.value = `Connection failed: ${name} - ${msg}`
    }
  } finally {
    isTesting.value = false
  }
}

async function handleNext() {
  const url = normalizeUrl(serverUrl.value)
  isSaving.value = true
  try {
    await onboarding.setServerUrl(url)
    emit('next')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Server Connection</h2>
      <p class="text-surface-500 mt-1">Configure the server URL for license verification and sync</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center justify-center gap-5 min-h-full">
        <OnboardingConnectivityBanner message="Internet connection required to test server" />

        <Message v-if="testError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ testError }}
        </Message>

        <Message v-if="testSuccess" severity="success" :closable="false" icon="pi pi-check-circle" class="w-full max-w-md">
          {{ testSuccess }}
        </Message>

        <div class="flex flex-col gap-3 w-full max-w-md">
          <label for="server-url" class="font-semibold text-surface-700">Server URL</label>
          <InputText
            id="server-url"
            v-model="serverUrl"
            placeholder="https://your-server.com/api"
            fluid
            :disabled="isTesting || isSaving"
          />
          <p class="text-xs text-surface-400">
            Enter your server domain (e.g. <code>https://pos-app.test</code>) — <code>/api</code> is added automatically
          </p>
          <Button
            label="Test Connection"
            icon="pi pi-wifi"
            :loading="isTesting"
            :disabled="!serverUrl.trim() || isOffline"
            severity="secondary"
            @click="handleTestConnection"
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
        :loading="isSaving"
        @click="handleNext"
      />
    </div>
  </div>
</template>
