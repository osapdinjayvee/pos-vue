<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import AmountInput from '@/components/common/AmountInput.vue'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { Customer, CustomerInput, CustomerType } from '@/types/order'
import { CustomerTypeLabels } from '@/types/order'

const props = defineProps<{
  visible: boolean
  customer: Customer | null
  loading: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: CustomerInput]
}>()

interface CustomerFormState {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postal_code: string
  country: string
  customer_type: CustomerType
  credit_limit: number
  notes: string
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.customer)

const customerTypeOptions = Object.entries(CustomerTypeLabels).map(([value, label]) => ({
  value,
  label
}))

const defaultForm = (): CustomerFormState => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  country: 'Philippines',
  customer_type: 'retail',
  credit_limit: 0,
  notes: ''
})

const form = ref<CustomerFormState>(defaultForm())

const validationError = ref<string | null>(null)

watch(() => props.visible, (visible) => {
  if (visible) {
    validationError.value = null
    if (props.customer) {
      form.value = {
        name: props.customer.name,
        email: props.customer.email || '',
        phone: props.customer.phone || '',
        address: props.customer.address || '',
        city: props.customer.city || '',
        postal_code: props.customer.postal_code || '',
        country: props.customer.country || 'Philippines',
        customer_type: props.customer.customer_type,
        credit_limit: props.customer.credit_limit,
        notes: props.customer.notes || ''
      }
    } else {
      form.value = defaultForm()
    }
  }
})

function validate(): boolean {
  validationError.value = null

  if (!form.value.name.trim()) {
    validationError.value = 'Customer name is required'
    return false
  }

  if (!form.value.phone.trim()) {
    validationError.value = 'Phone number is required'
    return false
  }

  if (form.value.email && !isValidEmail(form.value.email)) {
    validationError.value = 'Please enter a valid email address'
    return false
  }

  return true
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function handleSubmit() {
  if (!validate()) return

  const data: CustomerInput = {
    name: form.value.name.trim(),
    email: form.value.email || undefined,
    phone: form.value.phone || undefined,
    address: form.value.address || undefined,
    city: form.value.city || undefined,
    postal_code: form.value.postal_code || undefined,
    country: form.value.country || undefined,
    customer_type: form.value.customer_type,
    credit_limit: form.value.credit_limit,
    notes: form.value.notes || undefined
  }

  emit('save', data)
}

function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditMode ? 'Edit Customer' : 'Add Customer'"
    :style="{ width: '600px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="customer-form">
      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>

      <div class="form-field">
        <label for="customerName">Customer Name *</label>
        <InputText
          id="customerName"
          v-model="form.name"
          placeholder="Enter customer name"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="email">Email</label>
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            placeholder="customer@example.com"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="phone">Phone *</label>
          <InputText
            id="phone"
            v-model="form.phone"
            v-numeric-only
            inputmode="numeric"
            placeholder="Contact number"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-field">
        <label for="address">Address</label>
        <Textarea
          id="address"
          v-model="form.address"
          :rows="3"
          placeholder="Street address"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div class="form-row form-row-3">
        <div class="form-field">
          <label for="city">City</label>
          <InputText
            id="city"
            v-model="form.city"
            placeholder="City"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="postalCode">Postal Code</label>
          <InputText
            id="postalCode"
            v-model="form.postal_code"
            placeholder="ZIP/Postal"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="country">Country</label>
          <InputText
            id="country"
            v-model="form.country"
            placeholder="Country"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="customerType">Customer Type</label>
          <Select
            id="customerType"
            v-model="form.customer_type"
            :options="customerTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select type"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="creditLimit">Credit Limit</label>
          <AmountInput
            id="creditLimit"
            v-model="form.credit_limit"
            :min="0"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-field">
        <label for="notes">Notes</label>
        <Textarea
          id="notes"
          v-model="form.notes"
          :rows="3"
          placeholder="Additional notes about this customer..."
          class="w-full"
          :disabled="loading"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="handleCancel"
        :disabled="loading"
      />
      <Button
        :label="isEditMode ? 'Save Changes' : 'Add Customer'"
        icon="pi pi-check"
        @click="handleSubmit"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.customer-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-row-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.w-full {
  width: 100%;
}
</style>
