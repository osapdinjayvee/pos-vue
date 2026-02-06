<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { customerService } from '@/services/customerService'
import type { Customer, CustomerType } from '@/types/order'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'registered': [customer: Customer]
}>()

const name = ref('')
const phone = ref('')
const email = ref('')
const customerType = ref<CustomerType>('retail')
const isLoading = ref(false)
const errors = ref<Record<string, string>>({})

const customerTypeOptions = [
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'VIP', value: 'vip' }
]

watch(() => props.visible, (val) => {
  if (val) resetForm()
})

function resetForm() {
  name.value = ''
  phone.value = ''
  email.value = ''
  customerType.value = 'retail'
  errors.value = {}
}

function validate(): boolean {
  errors.value = {}

  if (!name.value.trim()) {
    errors.value.name = 'Name is required'
  }

  if (!phone.value.trim()) {
    errors.value.phone = 'Phone number is required'
  }

  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = 'Invalid email format'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSave() {
  if (!validate()) return

  isLoading.value = true
  try {
    const customer = await customerService.registerCustomer({
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim() || undefined,
      customer_type: customerType.value
    })

    emit('registered', customer)
    emit('update:visible', false)
  } catch (error) {
    console.error('Error registering customer:', error)
    errors.value.general = error instanceof Error ? error.message : 'Failed to register customer'
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Quick Customer Registration"
    :modal="true"
    :closable="true"
    :style="{ width: '420px' }"
    @hide="handleClose"
  >
    <div class="registration-form">
      <div v-if="errors.general" class="error-message">
        {{ errors.general }}
      </div>

      <div class="form-field">
        <label for="reg-name">Name *</label>
        <InputText
          id="reg-name"
          v-model="name"
          placeholder="Customer name"
          :invalid="!!errors.name"
          class="w-full"
        />
        <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
      </div>

      <div class="form-field">
        <label for="reg-phone">Phone *</label>
        <InputText
          id="reg-phone"
          v-model="phone"
          placeholder="Phone number"
          :invalid="!!errors.phone"
          class="w-full"
        />
        <small v-if="errors.phone" class="p-error">{{ errors.phone }}</small>
      </div>

      <div class="form-field">
        <label for="reg-email">Email</label>
        <InputText
          id="reg-email"
          v-model="email"
          placeholder="Email (optional)"
          :invalid="!!errors.email"
          class="w-full"
        />
        <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
      </div>

      <div class="form-field">
        <label for="reg-type">Customer Type</label>
        <Select
          id="reg-type"
          v-model="customerType"
          :options="customerTypeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="handleClose"
      />
      <Button
        label="Register"
        icon="pi pi-check"
        :loading="isLoading"
        @click="handleSave"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.registration-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-field label {
  font-weight: 600;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.5rem 0.75rem;
  background: var(--p-red-50);
  color: var(--p-red-700);
  border-radius: 6px;
  font-size: 0.875rem;
}

.w-full {
  width: 100%;
}
</style>
