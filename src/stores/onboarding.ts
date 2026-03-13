import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { onboardingRepository } from '@/repositories/onboardingRepository'
import { ONBOARDING_STEPS, type OnboardingStep, type OnboardingProgress } from '@/types/onboarding'

export const useOnboardingStore = defineStore('onboarding', () => {
  // State
  const progress = ref<OnboardingProgress | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const currentStep = computed<OnboardingStep>(() => progress.value?.current_step || 'welcome')
  const currentStepIndex = computed(() => ONBOARDING_STEPS.indexOf(currentStep.value))
  const isComplete = computed(() => progress.value?.is_completed === 1)
  const isLicenseVerified = computed(() => !!progress.value?.license_verified_at)
  const serverUrl = computed(() => progress.value?.server_url || null)
  const heartbeatStatus = computed(() => progress.value?.heartbeat_status || 'unknown')

  // Actions
  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      progress.value = await onboardingRepository.getProgress()
    } catch (err: any) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  async function setStep(step: OnboardingStep): Promise<void> {
    await onboardingRepository.setCurrentStep(step)
    if (progress.value) {
      progress.value = { ...progress.value, current_step: step, updated_at: new Date().toISOString() }
    }
  }

  function setServerUrl(url: string): void {
    if (progress.value) {
      progress.value = { ...progress.value, server_url: url }
    }
  }

  function setLicenseVerified(key: string, type: string): void {
    if (progress.value) {
      progress.value = {
        ...progress.value,
        license_key: key,
        license_type: type,
        license_verified_at: new Date().toISOString()
      }
    }
  }

  function setDeviceRegistered(deviceUid: string, registeredAt: string): void {
    if (progress.value) {
      progress.value = { ...progress.value, device_uid: deviceUid, device_registered_at: registeredAt }
    }
  }

  function setHeartbeatStatus(status: string): void {
    if (progress.value) {
      progress.value = { ...progress.value, heartbeat_status: status, heartbeat_last_at: new Date().toISOString() }
    }
  }

  function markComplete(): void {
    if (progress.value) {
      progress.value = { ...progress.value, is_completed: 1, activated_at: new Date().toISOString() }
    }
  }

  return {
    progress,
    isLoading,
    error,
    currentStep,
    currentStepIndex,
    isComplete,
    isLicenseVerified,
    serverUrl,
    heartbeatStatus,
    load,
    setStep,
    setServerUrl,
    setLicenseVerified,
    setDeviceRegistered,
    setHeartbeatStatus,
    markComplete
  }
})

export default useOnboardingStore
