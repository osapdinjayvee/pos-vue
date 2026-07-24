<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { supplierRepository } from '@/repositories/supplierRepository'
import type { Batch } from '@/types/inventory'

const props = defineProps<{
  visible: boolean
  batch?: Batch | null
  variantId: string
  variantName: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: BatchFormData]
}>()

export interface BatchFormData {
  batch_number: string
  expiry_date: string | null
  manufacture_date: string | null
  received_date: string
  supplier_id: string | null
  notes: string
  initial_quantity?: number
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.batch)

function getTodayDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const form = ref<BatchFormData>({
  batch_number: '',
  expiry_date: null,
  manufacture_date: null,
  received_date: getTodayDate(),
  supplier_id: null,
  notes: '',
  initial_quantity: 0
})

const expiryDate = ref<Date | null>(null)
const manufactureDate = ref<Date | null>(null)
const receivedDate = ref<Date>(new Date())

const validationError = ref<string | null>(null)
const supplierOptions = ref<{ label: string; value: string }[]>([])

onMounted(async () => {
  supplierOptions.value = await supplierRepository.getSupplierOptions()
})

watch(() => props.visible, (visible) => {
  if (visible) {
    validationError.value = null
    if (props.batch) {
      form.value = {
        batch_number: props.batch.batch_number,
        expiry_date: props.batch.expiry_date,
        manufacture_date: props.batch.manufacture_date,
        received_date: props.batch.received_date,
        supplier_id: props.batch.supplier_id,
        notes: props.batch.notes || ''
      }
      expiryDate.value = props.batch.expiry_date ? new Date(props.batch.expiry_date) : null
      manufactureDate.value = props.batch.manufacture_date ? new Date(props.batch.manufacture_date) : null
      receivedDate.value = new Date(props.batch.received_date)
    } else {
      form.value = {
        batch_number: '',
        expiry_date: null,
        manufacture_date: null,
        received_date: getTodayDate(),
        supplier_id: null,
        notes: '',
        initial_quantity: 0
      }
      expiryDate.value = null
      manufactureDate.value = null
      receivedDate.value = new Date()
    }
  }
})

function formatDate(date: Date | null): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

watch(expiryDate, (date) => {
  form.value.expiry_date = formatDate(date)
})

watch(manufactureDate, (date) => {
  form.value.manufacture_date = formatDate(date)
})

watch(receivedDate, (date) => {
  form.value.received_date = formatDate(date) || getTodayDate()
})

function validate(): boolean {
  validationError.value = null

  if (!form.value.batch_number.trim()) {
    validationError.value = 'Batch number is required'
    return false
  }

  if (!form.value.received_date) {
    validationError.value = 'Received date is required'
    return false
  }

  if (!isEditMode.value && (!form.value.initial_quantity || form.value.initial_quantity <= 0)) {
    validationError.value = 'Initial quantity must be greater than 0'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validate()) return
  emit('save', { ...form.value })
}

function handleCancel() {
  dialogVisible.value = false
}

function generateBatchNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  form.value.batch_number = `LOT${year}${month}${day}-${random}`
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditMode ? 'Edit Batch' : 'Add Batch'"
    :style="{ width: '500px' }"
    :breakpoints="{ '640px': '100vw' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="batch-form">
      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>

      <div class="variant-info">
        <i class="pi pi-box" />
        <span>{{ variantName }}</span>
      </div>

      <div class="form-field">
        <label for="batchNumber">Batch/Lot Number *</label>
        <div class="input-with-button">
          <InputText
            id="batchNumber"
            v-model="form.batch_number"
            placeholder="e.g., LOT240115-ABC"
            class="w-full"
            :disabled="loading"
          />
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            text
            @click="generateBatchNumber"
            :disabled="loading"
            v-tooltip="'Generate'"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="receivedDate">Received Date *</label>
          <DatePicker
            id="receivedDate"
            v-model="receivedDate"
            dateFormat="yy-mm-dd"
            showIcon
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="expiryDate">Expiry Date</label>
          <DatePicker
            id="expiryDate"
            v-model="expiryDate"
            dateFormat="yy-mm-dd"
            showIcon
            showButtonBar
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="manufactureDate">Manufacture Date</label>
          <DatePicker
            id="manufactureDate"
            v-model="manufactureDate"
            dateFormat="yy-mm-dd"
            showIcon
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="supplier">Supplier</label>
          <Select
            id="supplier"
            v-model="form.supplier_id"
            :options="supplierOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select supplier"
            showClear
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div v-if="!isEditMode" class="form-field">
        <label for="initialQuantity">Initial Quantity *</label>
        <InputNumber
          id="initialQuantity"
          v-model="form.initial_quantity"
          :min="1"
          showButtons
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
          placeholder="Optional notes about this batch..."
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
        :label="isEditMode ? 'Save Changes' : 'Add Batch'"
        icon="pi pi-check"
        @click="handleSubmit"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.batch-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.variant-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--app-surface-100);
  border-radius: 6px;
  font-weight: 500;
}

.variant-info i {
  color: var(--p-primary-color);
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

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button .w-full {
  flex: 1;
}

.w-full {
  width: 100%;
}

/* Date pickers side by side are too cramped to tap accurately on a tablet in
   portrait, so stack every field below the mobile breakpoint. */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .batch-form :deep(.p-inputtext),
  .batch-form :deep(.p-datepicker-input),
  .batch-form :deep(.p-select) {
    min-height: 2.75rem;
  }
}
</style>
