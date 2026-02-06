<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import FileUpload from 'primevue/fileupload'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import { useCategoryStore } from '@/stores/category'
import type { Product } from '@/repositories/productRepository'

const props = defineProps<{
  product?: Product | null
  loading?: boolean
}>()

const emit = defineEmits<{
  save: [data: ProductFormData]
  cancel: []
}>()

export interface ProductFormData {
  name: string
  description: string
  sku: string
  barcode: string
  category_id: string
  price: number
  cost: number
  low_stock_threshold: number
  status: string
  tax_type: string
  image: string
  expiration_date: string | null
  initialStock?: number
}

const categoryStore = useCategoryStore()

const form = ref<ProductFormData>({
  name: '',
  description: '',
  sku: '',
  barcode: '',
  category_id: '',
  price: 0,
  cost: 0,
  low_stock_threshold: 10,
  status: 'active',
  tax_type: 'vatable',
  image: '',
  expiration_date: null,
  initialStock: 0
})

const expirationDate = ref<Date | null>(null)
const validationError = ref<string | null>(null)

const isEditMode = computed(() => !!props.product)

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const taxTypeOptions = [
  { label: 'VATable (12%)', value: 'vatable' },
  { label: 'VAT Exempt', value: 'vat-exempt' },
  { label: 'Zero-rated', value: 'zero-rated' }
]

const categoryOptions = computed(() => categoryStore.categoryOptions)

// Load categories if not loaded
if (categoryStore.categories.length === 0) {
  categoryStore.fetchAll()
}

// Watch for product changes (edit mode)
watch(() => props.product, (product) => {
  if (product) {
    form.value = {
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      price: product.price,
      cost: product.cost,
      low_stock_threshold: product.low_stock_threshold,
      status: product.status,
      tax_type: product.tax_type,
      image: product.image || '',
      expiration_date: product.expiration_date || null
    }
    expirationDate.value = product.expiration_date ? new Date(product.expiration_date) : null
  }
}, { immediate: true })

// Watch expiration date picker
watch(expirationDate, (date) => {
  if (date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    form.value.expiration_date = `${year}-${month}-${day}`
  } else {
    form.value.expiration_date = null
  }
})

function validate(): boolean {
  validationError.value = null

  if (!form.value.name.trim()) {
    validationError.value = 'Product name is required'
    return false
  }
  if (!form.value.sku.trim()) {
    validationError.value = 'SKU is required'
    return false
  }
  if (!form.value.category_id) {
    validationError.value = 'Category is required'
    return false
  }
  if (form.value.price <= 0) {
    validationError.value = 'Price must be greater than 0'
    return false
  }

  return true
}

function handleSubmit() {
  if (!validate()) return
  emit('save', { ...form.value })
}

function handleCancel() {
  emit('cancel')
}

function onImageSelect(event: any) {
  const file = event.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.image = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function generateSku() {
  const prefix = form.value.name.substring(0, 3).toUpperCase() || 'PRD'
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  form.value.sku = `${prefix}-${random}`
}
</script>

<template>
  <div class="product-form">
    <Message v-if="validationError" severity="warn" :closable="false">
      {{ validationError }}
    </Message>

    <div class="form-section">
      <h4>Basic Information</h4>
      <div class="form-grid">
        <div class="form-field full-width">
          <label for="name">Product Name *</label>
          <InputText
            id="name"
            v-model="form.name"
            placeholder="Enter product name"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="sku">SKU *</label>
          <div class="input-with-button">
            <InputText
              id="sku"
              v-model="form.sku"
              placeholder="e.g., PRD-001"
              class="w-full"
              :disabled="loading"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              text
              @click="generateSku"
              :disabled="loading"
              v-tooltip="'Generate SKU'"
            />
          </div>
        </div>

        <div class="form-field">
          <label for="barcode">Barcode</label>
          <InputText
            id="barcode"
            v-model="form.barcode"
            placeholder="e.g., 4800000000001"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field full-width">
          <label for="category">Category *</label>
          <Select
            id="category"
            v-model="form.category_id"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select category"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field full-width">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Enter product description"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>Pricing & Tax</h4>
      <div class="form-grid">
        <div class="form-field">
          <label for="price">Selling Price *</label>
          <InputNumber
            id="price"
            v-model="form.price"
            mode="currency"
            currency="PHP"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="cost">Cost Price</label>
          <InputNumber
            id="cost"
            v-model="form.cost"
            mode="currency"
            currency="PHP"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field full-width">
          <label for="tax_type">Tax Type</label>
          <Select
            id="tax_type"
            v-model="form.tax_type"
            :options="taxTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>Inventory</h4>
      <div class="form-grid">
        <div v-if="!isEditMode" class="form-field">
          <label for="initialStock">Initial Stock</label>
          <InputNumber
            id="initialStock"
            v-model="form.initialStock"
            :min="0"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="low_stock_threshold">Low Stock Alert</label>
          <InputNumber
            id="low_stock_threshold"
            v-model="form.low_stock_threshold"
            :min="0"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="status">Status</label>
          <Select
            id="status"
            v-model="form.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            :disabled="loading"
          />
        </div>

        <div class="form-field">
          <label for="expiration_date">Expiration Date</label>
          <DatePicker
            id="expiration_date"
            v-model="expirationDate"
            dateFormat="yy-mm-dd"
            showIcon
            showButtonBar
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>Product Image</h4>
      <div class="image-upload">
        <div v-if="form.image" class="image-preview">
          <img :src="form.image" alt="Product" />
          <Button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            class="remove-image"
            @click="form.image = ''"
          />
        </div>
        <FileUpload
          v-else
          mode="basic"
          accept="image/*"
          :maxFileSize="1000000"
          @select="onImageSelect"
          chooseLabel="Choose Image"
          class="w-full"
          :disabled="loading"
        />
        <small class="text-muted">Max file size: 1MB</small>
      </div>
    </div>

    <div class="form-actions">
      <Button
        label="Cancel"
        severity="secondary"
        outlined
        @click="handleCancel"
        :disabled="loading"
      />
      <Button
        :label="isEditMode ? 'Save Changes' : 'Create Product'"
        icon="pi pi-check"
        @click="handleSubmit"
        :loading="loading"
      />
    </div>
  </div>
</template>

<style scoped>
.product-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1.25rem;
}

.form-section h4 {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.full-width {
  grid-column: span 2;
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

.image-upload {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.image-preview {
  position: relative;
  width: 150px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-preview .remove-image {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.full-width {
    grid-column: span 1;
  }
}
</style>
