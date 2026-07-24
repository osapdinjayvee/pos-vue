<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useOnboarding } from '@/composables/useOnboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const router = useRouter()
const onboarding = useOnboarding()

const isLaunching = ref(false)
const launchError = ref<string | null>(null)

const businessName = computed(() => {
  return onboarding.progress.value?.license_type
    ? `License: ${onboarding.progress.value.license_type}`
    : null
})

async function handleLaunch() {
  isLaunching.value = true
  launchError.value = null

  try {
    await onboarding.completeOnboarding()
    router.push('/login')
  } catch (err: any) {
    launchError.value = err.message || 'Failed to complete setup'
  } finally {
    isLaunching.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-4">
    <div class="flex-1 flex flex-col items-center justify-center text-center gap-6 overflow-y-auto pb-24">
      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold text-surface-900">Setup Complete!</h2>
        <p class="text-surface-500 text-lg max-w-md">
          Your system is ready to use. All configurations have been saved successfully.
        </p>
      </div>

      <div v-if="businessName" class="text-surface-500 text-sm">
        {{ businessName }}
      </div>

      <div class="flex flex-col gap-3 text-left max-w-sm w-full">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">License verified</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">Business information saved</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">Admin account created</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">Cashier accounts ready</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">Terms accepted</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <i class="pi pi-check text-green-700"></i>
          <span class="text-green-800">Privacy policy accepted</span>
        </div>
      </div>

      <Message v-if="launchError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-sm">
        {{ launchError }}
      </Message>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-surface-50 flex justify-end px-4 py-4">
      <Button
        label="Launch POS"
        icon="pi pi-bolt"
        class="!h-14 !text-base !font-bold"
        :loading="isLaunching"
        @click="handleLaunch"
      />
    </div>
  </div>
</template>
