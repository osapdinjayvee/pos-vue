<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import type { Product, ProductStatus } from '@/types'
import { categories } from '@/types'
import { products } from '@/data/mockData'
import ProductPreview from '@/components/products/ProductPreview.vue'

const route = useRoute()
const router = useRouter()

const isEditMode = computed(() => route.params.id !== undefined)
const pageTitle = computed(() => isEditMode.value ? 'Edit Product' : 'Add New Product')

const defaultForm = (): Partial<Product> => ({
  name: '',
  description: '',
  sku: '',
  barcode: '',
  category: '',
  price: 0,
  cost: 0,
  stock: 0,
  status: 'active' as ProductStatus,
  image: ''
})

const form = ref<Partial<Product>>(defaultForm())

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Out of Stock', value: 'out-of-stock' }
]

const categoryOptions = categories.map(c => ({ label: c, value: c }))

onMounted(() => {
  if (isEditMode.value) {
    const productId = route.params.id as string
    const existingProduct = products.find(p => p.id === productId)
    if (existingProduct) {
      form.value = { ...existingProduct }
    } else {
      router.push('/products')
    }
  }
})

const getDateString = () => {
  return new Date().toISOString().split('T')[0] as string
}

const onSave = () => {
  const today = getDateString()

  if (isEditMode.value) {
    const index = products.findIndex(p => p.id === route.params.id)
    const existing = products[index]
    if (index > -1 && existing) {
      products[index] = {
        id: existing.id,
        name: form.value.name ?? existing.name,
        description: form.value.description ?? existing.description,
        image: form.value.image ?? existing.image,
        price: form.value.price ?? existing.price,
        cost: form.value.cost ?? existing.cost,
        sku: form.value.sku ?? existing.sku,
        barcode: form.value.barcode ?? existing.barcode,
        category: form.value.category ?? existing.category,
        stock: form.value.stock ?? existing.stock,
        status: form.value.status ?? existing.status,
        sold: existing.sold,
        revenue: existing.revenue,
        createdAt: existing.createdAt,
        updatedAt: today
      }
    }
  } else {
    const newProduct: Product = {
      id: `PROD-${String(products.length + 1).padStart(3, '0')}`,
      name: form.value.name || '',
      description: form.value.description || '',
      image: form.value.image || '',
      price: form.value.price || 0,
      cost: form.value.cost || 0,
      sku: form.value.sku || '',
      barcode: form.value.barcode || '',
      category: form.value.category || '',
      stock: form.value.stock || 0,
      status: form.value.status || 'active',
      sold: 0,
      revenue: 0,
      createdAt: today,
      updatedAt: today
    }
    products.unshift(newProduct)
  }

  router.push('/products')
}

const onCancel = () => {
  router.push('/products')
}

const onImageSelect = (event: any) => {
  const file = event.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.image = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const onImageClear = () => {
  form.value.image = ''
}
</script>

<template>
  <div class="product-form-page">
    <div class="page-header">
      <div class="header-left">
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          severity="secondary"
          @click="onCancel"
        />
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="header-actions">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="onCancel"
        />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create Product'"
          icon="pi pi-check"
          @click="onSave"
        />
      </div>
    </div>

    <div class="form-content">
      <div class="form-column">
        <div class="form-card">
          <h3>Basic Information</h3>
          <div class="form-grid">
            <div class="form-field full-width">
              <label for="name">Product Name *</label>
              <InputText
                id="name"
                v-model="form.name"
                placeholder="Enter product name"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="sku">SKU *</label>
              <InputText
                id="sku"
                v-model="form.sku"
                placeholder="e.g., PRD-001"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="barcode">Barcode</label>
              <InputText
                id="barcode"
                v-model="form.barcode"
                placeholder="e.g., 1234567890123"
                class="w-full"
              />
            </div>
            <div class="form-field full-width">
              <label for="category">Category *</label>
              <Select
                id="category"
                v-model="form.category"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select category"
                class="w-full"
              />
            </div>
            <div class="form-field full-width">
              <label for="description">Description</label>
              <Textarea
                id="description"
                v-model="form.description"
                rows="4"
                placeholder="Enter product description"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Pricing</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="price">Selling Price *</label>
              <InputNumber
                id="price"
                v-model="form.price"
                mode="currency"
                currency="USD"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="cost">Cost Price</label>
              <InputNumber
                id="cost"
                v-model="form.cost"
                mode="currency"
                currency="USD"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Inventory</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="stock">Stock Quantity *</label>
              <InputNumber
                id="stock"
                v-model="form.stock"
                :min="0"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="status">Status *</label>
              <Select
                id="status"
                v-model="form.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Product Image</h3>
          <FileUpload
            mode="basic"
            accept="image/*"
            :maxFileSize="1000000"
            @select="onImageSelect"
            @clear="onImageClear"
            chooseLabel="Choose Image"
            class="w-full"
          />
          <small class="text-muted">Max file size: 1MB. Supported formats: JPG, PNG, GIF</small>
        </div>
      </div>

      <div class="preview-column">
        <div class="preview-sticky">
          <ProductPreview :product="form" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-form-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 100%;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--p-surface-0);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.form-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  max-width: 100%;
  overflow: hidden;
}

.form-content > * {
  min-width: 0;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.form-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  overflow: hidden;
}

.form-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-grid > * {
  min-width: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.form-field.full-width {
  grid-column: span 2;
}

.form-field :deep(input),
.form-field :deep(.p-inputtext),
.form-field :deep(.p-select),
.form-field :deep(.p-inputnumber),
.form-field :deep(.p-textarea) {
  max-width: 100%;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.w-full {
  width: 100%;
}

.text-muted {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  margin-top: 0.5rem;
  display: block;
}

.preview-column {
  position: relative;
}

.preview-sticky {
  position: sticky;
  top: 2rem;
}

@media (max-width: 1024px) {
  .form-content {
    grid-template-columns: 1fr;
  }

  .preview-column {
    order: -1;
  }

  .preview-sticky {
    position: relative;
    top: 0;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.full-width {
    grid-column: span 1;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }
}
</style>
