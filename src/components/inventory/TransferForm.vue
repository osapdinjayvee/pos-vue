<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import { variantRepository } from '@/repositories/variantRepository'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'

const props = defineProps<{
  visible: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: TransferFormData]
}>()

export interface TransferFormData {
  from_variant_id: string
  to_variant_id: string
  quantity: number
  reference: string
  notes: string
}

interface VariantOption {
  label: string
  value: string
  productName: string
  currentStock: number
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const form = ref<TransferFormData>({
  from_variant_id: '',
  to_variant_id: '',
  quantity: 1,
  reference: '',
  notes: ''
})

const validationError = ref<string | null>(null)
const variantOptions = ref<VariantOption[]>([])
const loadingVariants = ref(false)

const fromVariant = computed(() =>
  variantOptions.value.find(v => v.value === form.value.from_variant_id)
)

const toVariant = computed(() =>
  variantOptions.value.find(v => v.value === form.value.to_variant_id)
)

const availableToVariants = computed(() =>
  variantOptions.value.filter(v => v.value !== form.value.from_variant_id)
)

const maxTransferQuantity = computed(() => {
  return fromVariant.value?.currentStock || 0
})

onMounted(async () => {
  await loadVariants()
})

watch(() => props.visible, async (visible) => {
  if (visible) {
    validationError.value = null
    form.value = {
      from_variant_id: '',
      to_variant_id: '',
      quantity: 1,
      reference: generateReference(),
      notes: ''
    }
    await loadVariants()
  }
})

watch(() => form.value.from_variant_id, () => {
  // Reset to_variant if same as from
  if (form.value.to_variant_id === form.value.from_variant_id) {
    form.value.to_variant_id = ''
  }
  // Reset quantity if exceeds available
  if (form.value.quantity > maxTransferQuantity.value) {
    form.value.quantity = maxTransferQuantity.value || 1
  }
})

async function loadVariants() {
  loadingVariants.value = true
  try {
    const variants = await variantRepository.getAll()
    const options: VariantOption[] = []

    for (const variant of variants) {
      const stock = await stockMovementRepository.calculateStock(variant.id)
      options.push({
        label: `${variant.name} (${variant.sku || 'No SKU'})`,
        value: variant.id,
        productName: variant.name,
        currentStock: stock
      })
    }

    variantOptions.value = options
  } finally {
    loadingVariants.value = false
  }
}

function generateReference(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `TRF${year}${month}${day}-${random}`
}

function validate(): boolean {
  validationError.value = null

  if (!form.value.from_variant_id) {
    validationError.value = 'Please select a source variant'
    return false
  }

  if (!form.value.to_variant_id) {
    validationError.value = 'Please select a destination variant'
    return false
  }

  if (form.value.from_variant_id === form.value.to_variant_id) {
    validationError.value = 'Source and destination cannot be the same'
    return false
  }

  if (!form.value.quantity || form.value.quantity <= 0) {
    validationError.value = 'Quantity must be greater than 0'
    return false
  }

  if (form.value.quantity > maxTransferQuantity.value) {
    validationError.value = `Insufficient stock. Maximum available: ${maxTransferQuantity.value}`
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
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Stock Transfer"
    :style="{ width: '500px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="transfer-form">
      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>

      <div class="transfer-section">
        <h5>From (Source)</h5>
        <div class="form-field">
          <label for="fromVariant">Source Variant *</label>
          <Select
            id="fromVariant"
            v-model="form.from_variant_id"
            :options="variantOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select source variant"
            filter
            class="w-full"
            :disabled="loading"
            :loading="loadingVariants"
          >
            <template #option="{ option }">
              <div class="variant-option">
                <span class="variant-name">{{ option.label }}</span>
                <span class="variant-stock">Stock: {{ option.currentStock }}</span>
              </div>
            </template>
          </Select>
          <small v-if="fromVariant" class="stock-info">
            Available: <strong>{{ fromVariant.currentStock }}</strong> units
          </small>
        </div>
      </div>

      <div class="transfer-arrow">
        <i class="pi pi-arrow-down" />
      </div>

      <div class="transfer-section">
        <h5>To (Destination)</h5>
        <div class="form-field">
          <label for="toVariant">Destination Variant *</label>
          <Select
            id="toVariant"
            v-model="form.to_variant_id"
            :options="availableToVariants"
            optionLabel="label"
            optionValue="value"
            placeholder="Select destination variant"
            filter
            class="w-full"
            :disabled="loading || !form.from_variant_id"
            :loading="loadingVariants"
          >
            <template #option="{ option }">
              <div class="variant-option">
                <span class="variant-name">{{ option.label }}</span>
                <span class="variant-stock">Stock: {{ option.currentStock }}</span>
              </div>
            </template>
          </Select>
          <small v-if="toVariant" class="stock-info">
            Current stock: <strong>{{ toVariant.currentStock }}</strong> units
          </small>
        </div>
      </div>

      <Divider />

      <div class="form-row">
        <div class="form-field">
          <label for="quantity">Quantity *</label>
          <InputNumber
            id="quantity"
            v-model="form.quantity"
            :min="1"
            :max="maxTransferQuantity"
            showButtons
            class="w-full"
            :disabled="loading || !form.from_variant_id"
          />
        </div>

        <div class="form-field">
          <label for="reference">Reference</label>
          <div class="input-with-button">
            <InputText
              id="reference"
              v-model="form.reference"
              placeholder="Transfer reference"
              class="w-full"
              :disabled="loading"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              text
              @click="form.reference = generateReference()"
              :disabled="loading"
              v-tooltip="'Generate'"
            />
          </div>
        </div>
      </div>

      <div class="form-field">
        <label for="notes">Notes</label>
        <Textarea
          id="notes"
          v-model="form.notes"
          rows="2"
          placeholder="Reason for transfer..."
          class="w-full"
          :disabled="loading"
        />
      </div>

      <div v-if="fromVariant && toVariant && form.quantity" class="transfer-summary">
        <i class="pi pi-info-circle" />
        <span>
          Transfer <strong>{{ form.quantity }}</strong> units from
          <strong>{{ fromVariant.label }}</strong> to
          <strong>{{ toVariant.label }}</strong>
        </span>
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
        label="Transfer Stock"
        icon="pi pi-arrow-right-arrow-left"
        @click="handleSubmit"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transfer-section h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.transfer-arrow {
  display: flex;
  justify-content: center;
  color: var(--p-primary-color);
  font-size: 1.25rem;
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

.variant-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.variant-name {
  font-weight: 500;
}

.variant-stock {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.stock-info {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.stock-info strong {
  color: var(--p-primary-color);
}

.transfer-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--p-surface-100);
  border-radius: 6px;
  font-size: 0.875rem;
}

.transfer-summary i {
  color: var(--p-primary-color);
  margin-top: 0.125rem;
}

.transfer-summary strong {
  color: var(--p-primary-color);
}
</style>
