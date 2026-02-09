<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import Card from 'primevue/card'
import { useOnboarding } from '@/composables/useOnboarding'
import type { CashierSetupInput } from '@/types/onboarding'

const emit = defineEmits<{
  next: []
  back: []
}>()

const onboarding = useOnboarding()

interface CashierForm {
  username: string
  firstName: string
  lastName: string
  pin: string
  confirmPin: string
}

const cashiers = ref<CashierSetupInput[]>([])
const showForm = ref(false)
const editIndex = ref<number | null>(null)

const newCashier = ref<CashierForm>({
  username: '',
  firstName: '',
  lastName: '',
  pin: '',
  confirmPin: ''
})

const isSaving = ref(false)
const saveError = ref<string | null>(null)
const formError = ref<string | null>(null)

const canAddCashier = computed(() => {
  const c = newCashier.value
  return !!(
    c.username.trim() &&
    c.firstName.trim() &&
    c.lastName.trim() &&
    c.pin.length >= 4 &&
    c.pin.length <= 6 &&
    /^\d+$/.test(c.pin) &&
    c.pin === c.confirmPin
  )
})

const hasCashiers = computed(() => cashiers.value.length > 0)

function enforceUsername() {
  newCashier.value.username = newCashier.value.username.toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

function openAddForm() {
  editIndex.value = null
  newCashier.value = { username: '', firstName: '', lastName: '', pin: '', confirmPin: '' }
  formError.value = null
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  formError.value = null
}

function addCashier() {
  if (!canAddCashier.value) return

  // Check for duplicate username
  const username = newCashier.value.username.trim()
  const isDuplicate = cashiers.value.some((c, i) => c.username === username && i !== editIndex.value)
  if (isDuplicate) {
    formError.value = 'A cashier with this username already exists'
    return
  }

  const cashier: CashierSetupInput = {
    username,
    firstName: newCashier.value.firstName.trim(),
    lastName: newCashier.value.lastName.trim(),
    pin: newCashier.value.pin
  }

  if (editIndex.value !== null) {
    cashiers.value[editIndex.value] = cashier
  } else {
    cashiers.value.push(cashier)
  }

  showForm.value = false
  formError.value = null
}

function removeCashier(index: number) {
  cashiers.value.splice(index, 1)
}

async function handleNext() {
  if (!hasCashiers.value) return

  isSaving.value = true
  saveError.value = null

  try {
    await onboarding.completeCashiers(cashiers.value)
    emit('next')
  } catch (err: any) {
    saveError.value = err.message || 'Failed to create cashier accounts'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen px-2">
    <!-- Fixed header -->
    <div class="shrink-0 text-center pt-6 pb-3">
      <h2 class="text-2xl font-bold text-surface-900">Cashier Accounts</h2>
      <p class="text-surface-500 mt-1">Add at least one cashier to operate the POS terminal</p>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto pb-24">
    <div class="flex flex-col items-center gap-5 w-full">

    <Message v-if="saveError" severity="error" :closable="false" icon="pi pi-times-circle">
      {{ saveError }}
    </Message>

    <!-- Cashier List -->
    <div v-if="cashiers.length > 0" class="flex flex-col gap-3">
      <Card v-for="(cashier, index) in cashiers" :key="index">
        <template #content>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <i class="pi pi-user text-primary"></i>
              </div>
              <div>
                <div class="font-semibold text-surface-900">
                  {{ cashier.firstName }} {{ cashier.lastName }}
                </div>
                <div class="text-sm text-surface-500">@{{ cashier.username }}</div>
              </div>
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="removeCashier(index)"
            />
          </div>
        </template>
      </Card>
    </div>

    <Message v-else severity="info" :closable="false" icon="pi pi-info-circle">
      No cashiers added yet. Add at least one cashier to continue.
    </Message>

    <!-- Add Cashier Form -->
    <div v-if="showForm" class="flex flex-col gap-4 p-4 border border-surface-200 rounded-lg bg-surface-0">
      <h3 class="font-semibold text-surface-800">
        {{ editIndex !== null ? 'Edit Cashier' : 'New Cashier' }}
      </h3>

      <Message v-if="formError" severity="error" :closable="false" icon="pi pi-times-circle">
        {{ formError }}
      </Message>

      <!-- Username -->
      <div class="flex flex-col gap-1">
        <label for="cashier-username" class="font-semibold text-surface-700">
          Username <span class="text-red-500">*</span>
        </label>
        <InputText
          id="cashier-username"
          v-model="newCashier.username"
          placeholder="cashier username (lowercase)"
          fluid
          @input="enforceUsername"
        />
      </div>

      <!-- First Name & Last Name -->
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label for="cashier-first-name" class="font-semibold text-surface-700">
            First Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="cashier-first-name"
            v-model="newCashier.firstName"
            placeholder="First name"
            fluid
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="cashier-last-name" class="font-semibold text-surface-700">
            Last Name <span class="text-red-500">*</span>
          </label>
          <InputText
            id="cashier-last-name"
            v-model="newCashier.lastName"
            placeholder="Last name"
            fluid
          />
        </div>
      </div>

      <!-- PIN -->
      <div class="flex flex-col gap-1">
        <label for="cashier-pin" class="font-semibold text-surface-700">
          PIN <span class="text-red-500">*</span>
        </label>
        <Password
          id="cashier-pin"
          v-model="newCashier.pin"
          placeholder="4-6 digit PIN"
          :feedback="false"
          toggleMask
          fluid
          inputClass="w-full"
        />
        <small v-if="newCashier.pin && !/^\d*$/.test(newCashier.pin)" class="text-red-500">
          PIN must contain only digits
        </small>
        <small v-else-if="newCashier.pin && (newCashier.pin.length < 4 || newCashier.pin.length > 6)" class="text-red-500">
          PIN must be 4-6 digits
        </small>
      </div>

      <!-- Confirm PIN -->
      <div class="flex flex-col gap-1">
        <label for="cashier-confirm-pin" class="font-semibold text-surface-700">
          Confirm PIN <span class="text-red-500">*</span>
        </label>
        <Password
          id="cashier-confirm-pin"
          v-model="newCashier.confirmPin"
          placeholder="Re-enter PIN"
          :feedback="false"
          toggleMask
          fluid
          inputClass="w-full"
        />
        <small
          v-if="newCashier.confirmPin && newCashier.pin !== newCashier.confirmPin"
          class="text-red-500"
        >
          PINs do not match
        </small>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-2 pt-2">
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="cancelForm"
        />
        <Button
          :label="editIndex !== null ? 'Update' : 'Add Cashier'"
          icon="pi pi-check"
          :disabled="!canAddCashier"
          @click="addCashier"
        />
      </div>
    </div>

    <!-- Add Cashier Button -->
    <Button
      v-if="!showForm"
      label="Add Cashier"
      icon="pi pi-plus"
      severity="secondary"
      outlined
      class="w-full"
      @click="openAddForm"
    />
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
        :disabled="!hasCashiers || isSaving"
        :loading="isSaving"
        @click="handleNext"
      />
    </div>
  </div>
</template>
