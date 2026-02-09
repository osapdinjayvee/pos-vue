<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Stepper from 'primevue/stepper'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'
import ProgressSpinner from 'primevue/progressspinner'
import WelcomeStep from '@/components/onboarding/WelcomeStep.vue'
import LicenseStep from '@/components/onboarding/LicenseStep.vue'
import BusinessStep from '@/components/onboarding/BusinessStep.vue'
import AdminStep from '@/components/onboarding/AdminStep.vue'
import CashierStep from '@/components/onboarding/CashierStep.vue'
import TermsStep from '@/components/onboarding/TermsStep.vue'
import PrivacyStep from '@/components/onboarding/PrivacyStep.vue'
import CompletionStep from '@/components/onboarding/CompletionStep.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { ONBOARDING_STEPS, type OnboardingStep } from '@/types/onboarding'

const onboarding = useOnboarding()
const activeStep = ref<string>('welcome')
const isReady = ref(false)

// Step navigation map: step -> next step value
const stepOrder: OnboardingStep[] = ONBOARDING_STEPS

function getNextStep(current: string): string | null {
  const idx = stepOrder.indexOf(current as OnboardingStep)
  if (idx >= 0 && idx < stepOrder.length - 1) {
    return stepOrder[idx + 1]
  }
  return null
}

function getPrevStep(current: string): string | null {
  const idx = stepOrder.indexOf(current as OnboardingStep)
  if (idx > 0) {
    return stepOrder[idx - 1]
  }
  return null
}

// Each StepPanel exposes activateCallback; we store references via the slot scope
// and call them when step components emit next/back.
// Since PrimeVue Stepper linear mode requires activateCallback from the slot,
// we wrap each step and pass the callback through.

onMounted(async () => {
  await onboarding.load()
  activeStep.value = onboarding.currentStep.value
  isReady.value = true
})

// Sync activeStep with store when store changes externally
watch(() => onboarding.currentStep.value, (newStep) => {
  if (newStep && newStep !== activeStep.value) {
    activeStep.value = newStep
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 flex flex-col">
    <!-- Loading State -->
    <div v-if="!isReady" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
        <p class="text-surface-500">Loading setup wizard...</p>
      </div>
    </div>

    <!-- Stepper -->
    <div v-else class="flex-1 flex flex-col px-4 pb-4 max-w-3xl mx-auto w-full">
      <Stepper v-model:value="activeStep" linear>
        <StepPanels>
          <!-- Welcome -->
          <StepPanel v-slot="{ activateCallback }" value="welcome">
            <WelcomeStep
              @next="activateCallback('license')"
              @back="() => {}"
            />
          </StepPanel>

          <!-- License -->
          <StepPanel v-slot="{ activateCallback }" value="license">
            <LicenseStep
              @next="activateCallback('business')"
              @back="activateCallback('welcome')"
            />
          </StepPanel>

          <!-- Business -->
          <StepPanel v-slot="{ activateCallback }" value="business">
            <BusinessStep
              @next="activateCallback('admin')"
              @back="activateCallback('license')"
            />
          </StepPanel>

          <!-- Admin -->
          <StepPanel v-slot="{ activateCallback }" value="admin">
            <AdminStep
              @next="activateCallback('cashier')"
              @back="activateCallback('business')"
            />
          </StepPanel>

          <!-- Cashier -->
          <StepPanel v-slot="{ activateCallback }" value="cashier">
            <CashierStep
              @next="activateCallback('terms')"
              @back="activateCallback('admin')"
            />
          </StepPanel>

          <!-- Terms -->
          <StepPanel v-slot="{ activateCallback }" value="terms">
            <TermsStep
              @next="activateCallback('privacy')"
              @back="activateCallback('cashier')"
            />
          </StepPanel>

          <!-- Privacy -->
          <StepPanel v-slot="{ activateCallback }" value="privacy">
            <PrivacyStep
              @next="activateCallback('completion')"
              @back="activateCallback('terms')"
            />
          </StepPanel>

          <!-- Completion -->
          <StepPanel v-slot="{ activateCallback }" value="completion">
            <CompletionStep
              @next="() => {}"
              @back="() => {}"
            />
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </div>
</template>
