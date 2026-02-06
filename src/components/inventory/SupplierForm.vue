<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { Supplier } from '@/types/inventory'

const props = defineProps<{
  visible: boolean
  supplier?: Supplier | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: SupplierFormData]
}>()

export interface SupplierFormData {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  notes: string
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.supplier)

const form = ref<SupplierFormData>({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  notes: ''
})

const validationError = ref<string | null>(null)

watch(() => props.visible, (visible) => {
  if (visible) {
    validationError.value = null
    if (props.supplier) {
      form.value = {
        name: props.supplier.name,
        contact_person: props.supplier.contact_person || '',
        email: props.supplier.email || '',
        phone: props.supplier.phone || '',
        address: props.supplier.address || '',
        notes: props.supplier.notes || ''
      }
    } else {
      form.value = {
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      }
    }
  }
})

function validate(): boolean {
  validationError.value = null

  if (!form.value.name.trim()) {
    validationError.value = 'Supplier name is required'
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
  emit('save', { ...form.value })
}

function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditMode ? 'Edit Supplier' : 'Add Supplier'"
    :style="{ width: '550px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="supplier-form">
      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>

      <div class="form-field">
        <label for="supplierName">Supplier Name *</label>
        <InputText
          id="supplierName"
          v-model="form.name"
          placeholder="Enter supplier name"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="contactPerson">Contact Person</label>
          <InputText
            id="contactPerson"
            v-model="form.contact_person"
            placeholder="Primary contact name"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="phone">Phone</label>
          <InputText
            id="phone"
            v-model="form.phone"
            placeholder="Contact number"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-model="form.email"
          type="email"
          placeholder="supplier@example.com"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div class="form-field">
        <label for="address">Address</label>
        <Textarea
          id="address"
          v-model="form.address"
          rows="2"
          placeholder="Supplier address"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div class="form-field">
        <label for="notes">Notes</label>
        <Textarea
          id="notes"
          v-model="form.notes"
          rows="2"
          placeholder="Additional notes about this supplier..."
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
        :label="isEditMode ? 'Save Changes' : 'Add Supplier'"
        icon="pi pi-check"
        @click="handleSubmit"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.supplier-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
