<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useCategoryStore } from '@/stores/category'
import { useSupplierStore } from '@/stores/supplier'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { ProductStatus, TaxType } from '@/types'
import ProductPreview from '@/components/products/ProductPreview.vue'
import VariantList from '@/components/inventory/VariantList.vue'
import VariantForm from '@/components/inventory/VariantForm.vue'
import { variantRepository } from '@/repositories/variantRepository'
import type { DisplayVariant, ProductVariantInput } from '@/types/inventory'
import { toDisplayVariant } from '@/types/inventory'
import { inventoryService } from '@/services/inventoryService'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const supplierStore = useSupplierStore()

const isEditMode = computed(() => route.params.id !== undefined)
const pageTitle = computed(() => isEditMode.value ? 'Edit Product' : 'Add New Product')
const isSaving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Variant management state
const hasVariants = ref(false)
const variants = ref<DisplayVariant[]>([])
const pendingVariants = ref<Array<{ name: string; sku: string; barcode: string; price_override: number | null; cost_override: number | null; attributes: Record<string, string> }>>([])
const showVariantDialog = ref(false)
const editingVariant = ref<DisplayVariant | null>(null)
const variantsLoading = ref(false)

interface ProductForm {
  name: string
  description: string
  sku: string
  barcode: string
  category_id: string
  supplier_id: string
  price: number
  cost: number
  stock: number
  low_stock_threshold: number
  status: ProductStatus
  tax_type: TaxType
  image: string
  expiration_date: Date | null
  // Wholesale pricing
  wholesale_price: number | null
  wholesale_min_qty: number
  auto_apply_wholesale: boolean
  // Variants
  has_variants: boolean
}

interface VariantFormData {
  name: string
  sku: string
  barcode: string
  price_override: number | null
  cost_override: number | null
  attributes: Record<string, string>
}

const defaultForm = (): ProductForm => ({
  name: '',
  description: '',
  sku: '',
  barcode: '',
  category_id: '',
  supplier_id: '',
  price: 0,
  cost: 0,
  stock: 0,
  low_stock_threshold: 10,
  status: 'active',
  tax_type: 'vatable',
  image: '',
  expiration_date: null,
  wholesale_price: null,
  wholesale_min_qty: 1,
  auto_apply_wholesale: false,
  has_variants: false
})

const form = ref<ProductForm>(defaultForm())

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Out of Stock', value: 'out-of-stock' }
]

const taxTypeOptions = [
  { label: 'VATable (12%)', value: 'vatable' },
  { label: 'VAT Exempt', value: 'vat-exempt' },
  { label: 'Zero-rated', value: 'zero-rated' }
]

// Use category store for options
const categoryOptions = computed(() => categoryStore.categoryOptions)

// Use supplier store for options
const supplierOptions = computed(() => supplierStore.supplierOptions)

onMounted(async () => {
  // Always fetch fresh categories and suppliers
  await Promise.all([
    categoryStore.fetchAll(),
    supplierStore.fetchActive()
  ])

  if (isEditMode.value) {
    const productId = route.params.id as string
    const product = await productStore.fetchById(productId)
    if (product) {
      form.value = {
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        low_stock_threshold: product.low_stock_threshold,
        status: product.status,
        tax_type: product.tax_type,
        image: product.image || '',
        expiration_date: product.expiration_date ? new Date(product.expiration_date) : null,
        wholesale_price: product.wholesale_price || null,
        wholesale_min_qty: product.wholesale_min_qty || 1,
        auto_apply_wholesale: Boolean(product.auto_apply_wholesale),
        has_variants: Boolean(product.has_variants)
      }

      // Load variants for this product
      await loadVariants(productId)
      // Show variants section if product has any variants
      hasVariants.value = variants.value.length > 0
    } else {
      toast.add({
        severity: 'error',
        summary: 'Product Not Found',
        detail: 'The product you are trying to edit does not exist.',
        life: 3000
      })
      router.push('/products')
    }
  }
})

// Load variants for a product
async function loadVariants(productId: string) {
  variantsLoading.value = true
  try {
    const dbVariants = await variantRepository.findByProductId(productId)
    // Get stock for each variant
    const variantIds = dbVariants.map(v => v.id)
    const stocks = await inventoryService.getStockMultiple(variantIds)

    variants.value = dbVariants.map(v => toDisplayVariant(v, stocks[v.id] || 0))
  } catch (error) {
    console.error('Error loading variants:', error)
    variants.value = []
  } finally {
    variantsLoading.value = false
  }
}

// Watch hasVariants toggle
watch(hasVariants, (newValue) => {
  form.value.has_variants = newValue
})

const validateForm = (): string | null => {
  if (!form.value.name.trim()) return 'Product name is required'
  if (!form.value.sku.trim()) return 'SKU is required'
  if (!form.value.category_id) return 'Category is required'
  if (form.value.price <= 0) return 'Price must be greater than 0'
  return null
}

// Helper to format Date to YYYY-MM-DD string
const formatDateForDb = (date: Date | null): string | null => {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const onSave = async () => {
  const validationError = validateForm()
  if (validationError) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: validationError,
      life: 3000
    })
    return
  }

  isSaving.value = true

  // Prepare data with date converted to string and empty FKs as null
  const formData = {
    ...form.value,
    supplier_id: form.value.supplier_id || null,
    category_id: form.value.category_id || null,
    expiration_date: formatDateForDb(form.value.expiration_date)
  }

  try {
    if (isEditMode.value) {
      const productId = route.params.id as string
      const updated = await productStore.update(productId, formData)

      if (updated) {
        toast.add({
          severity: 'success',
          summary: 'Product Updated',
          detail: `${form.value.name} has been updated successfully.`,
          life: 3000
        })
        router.push('/products')
      } else if (productStore.error) {
        toast.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: productStore.error,
          life: 5000
        })
      }
    } else {
      const created = await productStore.create(formData)

      if (created) {
        toast.add({
          severity: 'success',
          summary: 'Product Created',
          detail: `${form.value.name} has been created successfully.`,
          life: 3000
        })
        router.push('/products')
      } else if (productStore.error) {
        toast.add({
          severity: 'error',
          summary: 'Creation Failed',
          detail: productStore.error,
          life: 5000
        })
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'An unexpected error occurred',
      life: 5000
    })
  } finally {
    isSaving.value = false
  }
}

const onCancel = () => {
  router.push('/products')
}

// Convert form to display format for preview component
const previewProduct = computed(() => ({
  name: form.value.name,
  description: form.value.description,
  image: form.value.image,
  price: form.value.price,
  cost: form.value.cost,
  sku: form.value.sku,
  barcode: form.value.barcode,
  category: categoryStore.categories.find(c => c.id === form.value.category_id)?.name || '',
  stock: form.value.stock,
  status: form.value.status
}))

const triggerImageUpload = () => {
  fileInput.value?.click()
}

const onImageSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file size (1MB max)
  if (file.size > 1000000) {
    toast.add({
      severity: 'error',
      summary: 'File Too Large',
      detail: 'Image must be less than 1MB',
      life: 3000
    })
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.image = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Reset input
  input.value = ''
}

// Variant management functions
function onAddVariant() {
  editingVariant.value = null
  showVariantDialog.value = true
}

function onEditVariant(variant: DisplayVariant) {
  editingVariant.value = variant
  showVariantDialog.value = true
}

function onDeleteVariant(variant: DisplayVariant) {
  confirm.require({
    message: `Are you sure you want to delete variant "${variant.name}"?`,
    header: 'Delete Variant',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger'
    },
    accept: async () => {
      if (isEditMode.value) {
        // Delete from database
        try {
          await variantRepository.delete(variant.id)
          variants.value = variants.value.filter(v => v.id !== variant.id)
          toast.add({
            severity: 'success',
            summary: 'Variant Deleted',
            detail: `${variant.name} has been deleted`,
            life: 3000
          })
        } catch (error: any) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: error.message || 'Failed to delete variant',
            life: 5000
          })
        }
      } else {
        // Remove from pending variants (for new products)
        const idx = pendingVariants.value.findIndex(v => v.name === variant.name && v.sku === variant.sku)
        if (idx !== -1) {
          pendingVariants.value.splice(idx, 1)
          // Update display variants
          variants.value = variants.value.filter(v => v.id !== variant.id)
        }
      }
    }
  })
}

async function onSaveVariant(data: VariantFormData) {
  // Validate SKU uniqueness
  const excludeId = editingVariant.value?.id
  if (data.sku) {
    // Check against other variants in database
    const skuTaken = await variantRepository.skuExists(data.sku, excludeId)
    if (skuTaken) {
      toast.add({
        severity: 'error',
        summary: 'Duplicate SKU',
        detail: 'A variant with this SKU already exists',
        life: 5000
      })
      return
    }
    // Check against pending variants (new product mode)
    if (!excludeId && pendingVariants.value.some(v => v.sku === data.sku)) {
      toast.add({
        severity: 'error',
        summary: 'Duplicate SKU',
        detail: 'Another variant already uses this SKU',
        life: 5000
      })
      return
    }
  }

  // Validate barcode uniqueness
  if (data.barcode) {
    const barcodeTaken = await variantRepository.barcodeExists(data.barcode, excludeId)
    if (barcodeTaken) {
      toast.add({
        severity: 'error',
        summary: 'Duplicate Barcode',
        detail: 'A variant with this barcode already exists',
        life: 5000
      })
      return
    }
  }

  if (isEditMode.value && editingVariant.value) {
    // Update existing variant in database
    try {
      const updated = await variantRepository.updateVariant(editingVariant.value.id, {
        name: data.name,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        price_override: data.price_override ?? undefined,
        cost_override: data.cost_override ?? undefined,
        attributes: Object.keys(data.attributes).length > 0 ? data.attributes : undefined
      })
      if (updated) {
        const stock = await inventoryService.getStock(updated.id)
        const displayVariant = toDisplayVariant(updated, stock)
        const idx = variants.value.findIndex(v => v.id === updated.id)
        if (idx !== -1) {
          variants.value[idx] = displayVariant
        }
        toast.add({
          severity: 'success',
          summary: 'Variant Updated',
          detail: `${data.name} has been updated`,
          life: 3000
        })
      }
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: error.message || 'Failed to update variant',
        life: 5000
      })
    }
  } else if (isEditMode.value) {
    // Add new variant to existing product
    const productId = route.params.id as string
    try {
      const created = await variantRepository.createVariant({
        product_id: productId,
        name: data.name,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        price_override: data.price_override ?? undefined,
        cost_override: data.cost_override ?? undefined,
        attributes: Object.keys(data.attributes).length > 0 ? data.attributes : undefined,
        display_order: variants.value.length
      })
      if (created) {
        const displayVariant = toDisplayVariant(created, 0)
        variants.value.push(displayVariant)
        toast.add({
          severity: 'success',
          summary: 'Variant Added',
          detail: `${data.name} has been added`,
          life: 3000
        })
      }
    } catch (error: any) {
      toast.add({
        severity: 'error',
        summary: 'Creation Failed',
        detail: error.message || 'Failed to create variant',
        life: 5000
      })
    }
  } else {
    // Add to pending variants for new product
    pendingVariants.value.push(data)
    // Create a display-friendly version for the UI
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    variants.value.push({
      id: tempId,
      productId: '',
      sku: data.sku,
      barcode: data.barcode,
      name: data.name,
      attributes: data.attributes,
      priceOverride: data.price_override,
      costOverride: data.cost_override,
      imageUrl: '',
      isActive: true,
      displayOrder: pendingVariants.value.length - 1,
      currentStock: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  showVariantDialog.value = false
}

function onAddStockToVariant(variant: DisplayVariant) {
  // Navigate to stock adjustment or show stock dialog
  // For now, just show a message that they need to save the product first
  if (!isEditMode.value) {
    toast.add({
      severity: 'info',
      summary: 'Save Product First',
      detail: 'Please save the product before adding stock to variants',
      life: 3000
    })
    return
  }
  // Could open stock movement dialog here
  router.push(`/products/${route.params.id}`)
}

// Calculate total stock across all variants
const totalVariantStock = computed(() => {
  return variants.value.reduce((sum, v) => sum + v.currentStock, 0)
})
</script>

<template>
  <div class="product-form-page">
    <Toast />
    <ConfirmDialog />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onImageSelect"
    />

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
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="onCancel"
          :disabled="isSaving"
        />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create Product'"
          icon="pi pi-check"
          @click="onSave"
          :loading="isSaving"
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
                v-model="form.category_id"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select category"
                class="w-full"
              />
            </div>
            <div class="form-field full-width">
              <label for="supplier">Supplier</label>
              <Select
                id="supplier"
                v-model="form.supplier_id"
                :options="supplierOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select supplier (optional)"
                class="w-full"
                showClear
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
          <h3>Pricing & Tax</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="price">Selling Price *</label>
              <InputNumber
                id="price"
                v-model="form.price"
                mode="currency"
                currency="PHP"
                class="w-full"
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
              />
            </div>
            <div class="form-field full-width">
              <label for="tax_type">Tax Type *</label>
              <Select
                id="tax_type"
                v-model="form.tax_type"
                :options="taxTypeOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Wholesale Pricing</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="wholesale_price">Wholesale Price</label>
              <InputNumber
                id="wholesale_price"
                v-model="form.wholesale_price"
                mode="currency"
                currency="PHP"
                class="w-full"
                placeholder="Leave empty to disable"
              />
            </div>
            <div class="form-field">
              <label for="wholesale_min_qty">Minimum Quantity</label>
              <InputNumber
                id="wholesale_min_qty"
                v-model="form.wholesale_min_qty"
                :min="1"
                class="w-full"
                :disabled="!form.wholesale_price"
              />
              <small class="text-muted">Min items to activate wholesale price</small>
            </div>
            <div class="form-field full-width">
              <div class="toggle-field">
                <ToggleSwitch
                  id="auto_apply_wholesale"
                  v-model="form.auto_apply_wholesale"
                  :disabled="!form.wholesale_price"
                />
                <label for="auto_apply_wholesale">Auto-apply wholesale pricing</label>
              </div>
              <small class="text-muted">Automatically apply wholesale price when quantity threshold is met</small>
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3>Inventory</h3>
          <div class="form-grid">
            <div class="form-field">
              <label>Current Stock</label>
              <div class="stock-display">
                <span class="stock-value">{{ isEditMode ? totalVariantStock : 0 }} units</span>
                <small v-if="!isEditMode" class="stock-hint">Stock can be added after product creation</small>
                <small v-else class="stock-hint">Manage stock via Adjustments or Inventory page</small>
              </div>
            </div>
            <div class="form-field">
              <label for="low_stock_threshold">Low Stock Alert</label>
              <InputNumber
                id="low_stock_threshold"
                v-model="form.low_stock_threshold"
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
            <div class="form-field">
              <label for="expiration_date">Expiration Date</label>
              <DatePicker
                id="expiration_date"
                v-model="form.expiration_date"
                dateFormat="yy-mm-dd"
                showIcon
                showButtonBar
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- Product Variants Section -->
        <div class="form-card">
          <h3>Product Variants</h3>
          <div class="variants-toggle">
            <ToggleSwitch
              id="has_variants"
              v-model="hasVariants"
            />
            <label for="has_variants">This product has variants (e.g., sizes, colors)</label>
          </div>

          <div v-if="hasVariants" class="variants-section">
            <VariantList
              :variants="variants"
              :base-price="form.price"
              :base-cost="form.cost"
              :loading="variantsLoading"
              @add="onAddVariant"
              @edit="onEditVariant"
              @delete="onDeleteVariant"
              @add-stock="onAddStockToVariant"
            />
          </div>
        </div>

      </div>

      <!-- Variant Form Dialog -->
      <VariantForm
        v-model:visible="showVariantDialog"
        :variant="editingVariant"
        :product-id="isEditMode ? (route.params.id as string) : ''"
        :product-name="form.name"
        :base-price="form.price"
        :base-cost="form.cost"
        @save="onSaveVariant"
      />

      <div class="preview-column">
        <div class="preview-sticky">
          <ProductPreview
            :product="previewProduct"
            @image-click="triggerImageUpload"
          />
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
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--p-surface-0);
  padding: 0 1rem;
  min-height: 64px;
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.125rem;
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
  overflow: visible;
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

.toggle-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-field label {
  margin: 0;
  cursor: pointer;
}

.variants-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.variants-toggle label {
  font-size: 0.875rem;
  color: var(--p-text-color);
  cursor: pointer;
}

.variants-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.stock-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 6px;
}

.stock-display .stock-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.stock-display .stock-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
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
  top: 0;
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

@media (max-width: 767.98px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.full-width {
    grid-column: span 1;
  }

  .page-header {
    padding: 0.5rem 0.75rem;
    min-height: auto;
  }

  .header-left h1 {
    font-size: 1rem;
  }
}

@media (max-width: 879.98px) {
  .page-header {
    padding: 0.5rem;
    border-radius: 8px;
  }

  .header-left h1 {
    font-size: 0.875rem;
  }

  .header-actions :deep(.p-button-label) {
    display: none;
  }

  .form-card {
    padding: 1rem;
    border-radius: 8px;
  }

  .form-card h3 {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }

  .product-form-page {
    gap: 0.75rem;
  }

  .form-content {
    gap: 0.75rem;
  }

  .form-column {
    gap: 0.75rem;
  }
}
</style>
