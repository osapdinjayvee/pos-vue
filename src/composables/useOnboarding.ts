import { computed } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import { onboardingService } from '@/services/onboardingService'
import { licenseService } from '@/services/licenseService'
import { termsService } from '@/services/termsService'
import { setApiBaseUrl } from '@/config/sync'
import { ONBOARDING_STEPS, type OnboardingStep, type AdminSetupInput, type CashierSetupInput } from '@/types/onboarding'
import type { BusinessConfigInput } from '@/types/settings'

export function useOnboarding() {
  const store = useOnboardingStore()

  const currentStep = computed(() => store.currentStep)
  const currentStepIndex = computed(() => store.currentStepIndex)
  const isComplete = computed(() => store.isComplete)
  const isLicenseVerified = computed(() => store.isLicenseVerified)
  const serverUrl = computed(() => store.serverUrl)
  const heartbeatStatus = computed(() => store.heartbeatStatus)
  const isLoading = computed(() => store.isLoading)
  const error = computed(() => store.error)
  const progress = computed(() => store.progress)

  async function load() {
    await store.load()
    // Restore server URL from DB if present
    if (store.progress?.server_url) {
      setApiBaseUrl(store.progress.server_url)
    }
  }

  function canAdvanceTo(step: OnboardingStep): boolean {
    return onboardingService.canAdvanceTo(step, store.currentStep)
  }

  async function setServerUrl(url: string) {
    setApiBaseUrl(url)
    const { onboardingRepository } = await import('@/repositories/onboardingRepository')
    await onboardingRepository.setServerUrl(url)
    store.setServerUrl(url)
    await store.setStep('license')
  }

  async function verifyLicense(key: string) {
    const result = await licenseService.verify(key)
    if (result.valid) {
      store.setLicenseVerified(key, result.license_type)
      await store.setStep('business')

      // Fire-and-forget: register device in background (never blocks UI)
      import('@/services/deviceService').then(({ deviceService }) => {
        deviceService.register(key).then(regResult => {
          if (regResult.success && regResult.registered_at) {
            const uid = deviceService.getDeviceUid()
            import('@/repositories/onboardingRepository').then(({ onboardingRepository }) => {
              onboardingRepository.setDeviceRegistered(uid, regResult.registered_at!)
              store.setDeviceRegistered(uid, regResult.registered_at!)
            })
          }
        }).catch(err => {
          console.warn('[useOnboarding] Device registration failed (non-blocking):', err)
        })
      }).catch(() => {})
    }
    return result
  }

  async function setLicenseVerified(key: string, type: string) {
    const { onboardingRepository } = await import('@/repositories/onboardingRepository')
    await onboardingRepository.setLicenseVerified(key, type)
    store.setLicenseVerified(key, type)
    await store.setStep('business')
  }

  async function completeBusiness(data: BusinessConfigInput) {
    await onboardingService.completeBusiness(data)
    await store.setStep('admin')
  }

  async function completeAdmin(data: AdminSetupInput) {
    await onboardingService.completeAdmin(data)
    await store.setStep('cashier')
  }

  async function completeCashiers(cashiers: CashierSetupInput[]) {
    await onboardingService.completeCashiers(cashiers)
    await store.setStep('terms')
  }

  async function fetchTerms() {
    return await termsService.fetchActive()
  }

  async function getCachedTerms() {
    return await termsService.getCached()
  }

  async function fetchPrivacyPolicy() {
    return await termsService.fetchPrivacyPolicy()
  }

  async function getCachedPrivacy() {
    return await termsService.getCachedPrivacy()
  }

  async function acceptTerms(termsId: string, version: string, userId: string) {
    await termsService.accept(termsId, version, userId)
    await store.setStep('privacy')
  }

  async function acceptPrivacy() {
    await store.setStep('completion')
  }

  async function completeOnboarding() {
    await onboardingService.completeOnboarding('user-admin')
    store.markComplete()
  }

  return {
    currentStep,
    currentStepIndex,
    isComplete,
    isLicenseVerified,
    serverUrl,
    heartbeatStatus,
    isLoading,
    error,
    progress,
    steps: ONBOARDING_STEPS,
    load,
    canAdvanceTo,
    setServerUrl,
    verifyLicense,
    setLicenseVerified,
    completeBusiness,
    completeAdmin,
    completeCashiers,
    fetchTerms,
    getCachedTerms,
    fetchPrivacyPolicy,
    getCachedPrivacy,
    acceptTerms,
    acceptPrivacy,
    completeOnboarding
  }
}
