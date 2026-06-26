<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputMask from 'primevue/inputmask'
import Message from 'primevue/message'
import { useOnboarding } from '@/composables/useOnboarding'
import type { BusinessConfigInput } from '@/types/settings'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

const form = ref<BusinessConfigInput>({
  business_name: '',
  trade_name: '',
  tin: '',
  branch_code: '',
  address: '',
  city: '',
  province: '',
  zip_code: '',
  phone: '',
  email: ''
})

const isSaving = ref(false)
const saveError = ref<string | null>(null)

const isValid = computed(() => {
  return !!(
    form.value.business_name?.trim() &&
    form.value.tin?.trim() &&
    form.value.branch_code?.trim() &&
    form.value.address?.trim()
  )
})

async function handleNext() {
  if (!isValid.value) return

  isSaving.value = true
  saveError.value = null

  try {
    await onboarding.completeBusiness(form.value)
    emit('next')
  } catch (err: any) {
    saveError.value = err.message || 'Failed to save business information'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Business Information</h2>
      <p class="text-surface-500 mt-1">Enter your BIR-registered business details</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
      <div class="flex flex-col items-center gap-5 w-full">
        <Message v-if="saveError" severity="error" :closable="false" icon="pi pi-times-circle" class="w-full max-w-md">
          {{ saveError }}
        </Message>

        <div class="flex flex-col gap-4 w-full max-w-md">
          <!-- Business Name -->
          <div class="flex flex-col gap-1">
            <label for="business_name" class="font-semibold text-surface-700">
              Business Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="business_name"
              v-model="form.business_name"
              placeholder="Registered business name"
              fluid
            />
          </div>

          <!-- Trade Name -->
          <div class="flex flex-col gap-1">
            <label for="trade_name" class="font-semibold text-surface-700">Trade Name</label>
            <InputText
              id="trade_name"
              v-model="form.trade_name"
              placeholder="DBA / Trade name (optional)"
              fluid
            />
          </div>

          <!-- TIN -->
          <div class="flex flex-col gap-1">
            <label for="tin" class="font-semibold text-surface-700">
              TIN <span class="text-red-500">*</span>
            </label>
            <InputMask
              id="tin"
              v-model="form.tin"
              mask="99-9999999-999"
              placeholder="99-9999999-999"
              fluid
            />
          </div>

          <!-- Branch Code -->
          <div class="flex flex-col gap-1">
            <label for="branch_code" class="font-semibold text-surface-700">
              Branch Code <span class="text-red-500">*</span>
            </label>
            <InputText
              id="branch_code"
              v-model="form.branch_code"
              placeholder="e.g. 000"
              fluid
            />
          </div>

          <!-- Address -->
          <div class="flex flex-col gap-1">
            <label for="address" class="font-semibold text-surface-700">
              Address <span class="text-red-500">*</span>
            </label>
            <InputText
              id="address"
              v-model="form.address"
              placeholder="Street address"
              fluid
            />
          </div>

          <!-- City & Province -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label for="city" class="font-semibold text-surface-700">City</label>
              <InputText
                id="city"
                v-model="form.city"
                placeholder="City"
                fluid
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="province" class="font-semibold text-surface-700">Province</label>
              <InputText
                id="province"
                v-model="form.province"
                placeholder="Province"
                fluid
              />
            </div>
          </div>

          <!-- Zip Code -->
          <div class="flex flex-col gap-1">
            <label for="zip_code" class="font-semibold text-surface-700">Zip Code</label>
            <InputText
              id="zip_code"
              v-model="form.zip_code"
              placeholder="Zip code"
              fluid
            />
          </div>

          <!-- Phone -->
          <div class="flex flex-col gap-1">
            <label for="phone" class="font-semibold text-surface-700">Phone</label>
            <InputText
              id="phone"
              v-model="form.phone"
              v-numeric-only
              inputmode="numeric"
              placeholder="Contact phone number"
              fluid
            />
          </div>

          <!-- Email -->
          <div class="flex flex-col gap-1">
            <label for="email" class="font-semibold text-surface-700">Email</label>
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              placeholder="Business email address"
              fluid
            />
          </div>
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
        :disabled="!isValid || isSaving"
        :loading="isSaving"
        @click="handleNext"
      />
    </div>
  </div>
</template>
