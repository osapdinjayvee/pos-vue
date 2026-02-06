<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { ProductVariant, DisplayVariant } from '@/types/inventory'

const props = defineProps<{
  visible: boolean
  variant?: ProductVariant | DisplayVariant | null
  productId: string
  productName: string
  basePrice: number
  baseCost: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: VariantFormData]
}>()

export interface VariantFormData {
  name: string
  sku: string
  barcode: string
  price_override: number | null
  cost_override: number | null
  attributes: Record<string, string>
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.variant)

const form = ref<VariantFormData>({
  name: '',
  sku: '',
  barcode: '',
  price_override: null,
  cost_override: null,
  attributes: {}
})

const validationError = ref<string | null>(null)
const newAttributeKey = ref('')
const newAttributeValue = ref('')

const effectivePrice = computed(() => form.value.price_override ?? props.basePrice)
const effectiveCost = computed(() => form.value.cost_override ?? props.baseCost)

const attributeEntries = computed(() => Object.entries(form.value.attributes))

watch(() => props.visible, (visible) => {
  if (visible) {
    validationError.value = null
    if (props.variant) {
      const v = props.variant as any
      const priceOverride = v.price_override ?? v.priceOverride ?? null
      const costOverride = v.cost_override ?? v.costOverride ?? null
      const attributes = typeof v.attributes === 'string'
        ? JSON.parse(v.attributes)
        : (v.attributes || {})

      form.value = {
        name: v.name,
        sku: v.sku || '',
        barcode: v.barcode || '',
        price_override: priceOverride,
        cost_override: costOverride,
        attributes
      }
    } else {
      form.value = {
        name: '',
        sku: '',
        barcode: '',
        price_override: null,
        cost_override: null,
        attributes: {}
      }
    }
  }
})

function addAttribute() {
  if (!newAttributeKey.value.trim()) return
  form.value.attributes[newAttributeKey.value.trim()] = newAttributeValue.value.trim()
  newAttributeKey.value = ''
  newAttributeValue.value = ''
}

function removeAttribute(key: string) {
  delete form.value.attributes[key]
}

function validate(): boolean {
  validationError.value = null
  if (!form.value.name.trim()) {
    validationError.value = 'Variant name is required'
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

function generateSku() {
  const prefix = props.productName.substring(0, 3).toUpperCase()
  const variantPart = form.value.name.substring(0, 2).toUpperCase() || 'V1'
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  form.value.sku = `${prefix}-${variantPart}-${random}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditMode ? 'Edit Variant' : 'Add Variant'"
    :modal="true"
    :closable="!loading"
    :draggable="false"
    class="variant-dialog"
  >
    <div class="variant-form">
      <!-- Error Message -->
      <div v-if="validationError" class="error-message">
        <i class="pi pi-exclamation-circle"></i>
        {{ validationError }}
      </div>

      <!-- Basic Information -->
      <div class="form-section">
        <h4>Basic Information</h4>
        <div class="form-grid">
          <div class="form-field full-width">
            <label for="variantName">Variant Name *</label>
            <InputText
              id="variantName"
              v-model="form.name"
              placeholder="e.g., Small, Red, 500ml"
              class="w-full"
              :disabled="loading"
            />
          </div>
          <div class="form-field">
            <label for="variantSku">SKU</label>
            <div class="input-with-action">
              <InputText
                id="variantSku"
                v-model="form.sku"
                placeholder="e.g., PRD-SM-01"
                class="w-full"
                :disabled="loading"
              />
              <Button
                icon="pi pi-sync"
                severity="secondary"
                text
                size="small"
                @click="generateSku"
                :disabled="loading"
                v-tooltip.top="'Generate SKU'"
              />
            </div>
          </div>
          <div class="form-field">
            <label for="variantBarcode">Barcode</label>
            <InputText
              id="variantBarcode"
              v-model="form.barcode"
              placeholder="e.g., 1234567890123"
              class="w-full"
              :disabled="loading"
            />
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div class="form-section">
        <h4>Pricing</h4>
        <small class="section-hint">Leave empty to use base product pricing</small>
        <div class="form-grid">
          <div class="form-field">
            <label for="priceOverride">Selling Price</label>
            <InputNumber
              id="priceOverride"
              v-model="form.price_override"
              mode="currency"
              currency="PHP"
              class="w-full"
              :disabled="loading"
            />
            <small class="text-muted">Effective: {{ formatCurrency(effectivePrice) }}</small>
          </div>
          <div class="form-field">
            <label for="costOverride">Cost Price</label>
            <InputNumber
              id="costOverride"
              v-model="form.cost_override"
              mode="currency"
              currency="PHP"
              class="w-full"
              :disabled="loading"
            />
            <small class="text-muted">Effective: {{ formatCurrency(effectiveCost) }}</small>
          </div>
        </div>
      </div>

      <!-- Attributes -->
      <div class="form-section">
        <h4>Attributes</h4>
        <small class="section-hint">Add custom attributes like Size, Color, etc.</small>

        <div v-if="attributeEntries.length > 0" class="attributes-list">
          <Tag
            v-for="[key, value] in attributeEntries"
            :key="key"
            severity="info"
            class="attribute-tag"
          >
            <span class="attribute-content">
              <strong>{{ key }}:</strong> {{ value }}
              <i
                class="pi pi-times remove-icon"
                @click="removeAttribute(key)"
              ></i>
            </span>
          </Tag>
        </div>

        <div class="form-grid">
          <div class="form-field">
            <label for="attrKey">Attribute Key</label>
            <InputText
              id="attrKey"
              v-model="newAttributeKey"
              placeholder="e.g., Size"
              :disabled="loading"
              class="w-full"
            />
          </div>
          <div class="form-field">
            <label for="attrValue">Attribute Value</label>
            <div class="input-with-action">
              <InputText
                id="attrValue"
                v-model="newAttributeValue"
                placeholder="e.g., Large"
                :disabled="loading"
                class="w-full"
                @keyup.enter="addAttribute"
              />
              <Button
                icon="pi pi-plus"
                severity="secondary"
                @click="addAttribute"
                :disabled="loading || !newAttributeKey.trim()"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="handleCancel"
          :disabled="loading"
        />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Add Variant'"
          icon="pi pi-check"
          @click="handleSubmit"
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.variant-dialog :deep(.p-dialog) {
  width: 500px;
  max-width: 95vw;
}

.variant-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--p-red-50);
  color: var(--p-red-700);
  border-radius: var(--p-border-radius);
  font-size: 0.875rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.section-hint {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  margin-top: -0.5rem;
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
  min-width: 0;
}

.form-field.full-width {
  grid-column: span 2;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.input-with-action {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.input-with-action .w-full {
  flex: 1;
  min-width: 0;
}

.text-muted {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.attributes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.attribute-tag {
  font-size: 0.85rem;
}

.attribute-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remove-icon {
  cursor: pointer;
  font-size: 0.7rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-icon:hover {
  opacity: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.w-full {
  width: 100%;
}

@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.full-width {
    grid-column: span 1;
  }
}
</style>
