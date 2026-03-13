<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDiscountManagementStore } from '@/stores/discountManagement'
import { useProductStore } from '@/stores/product'
import { useCategoryStore } from '@/stores/category'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import SelectButton from 'primevue/selectbutton'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import type { PromoDiscountInput, PromoDiscountType } from '@/types/discount'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useDiscountManagementStore()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const isEditMode = computed(() => route.params.id !== undefined)
const pageTitle = computed(() => isEditMode.value ? 'Edit Discount' : 'New Discount')
const isSaving = ref(false)

// Form state
const name = ref('')
const code = ref('')
const type = ref<PromoDiscountType>('percentage')
const value = ref<number>(0)
const minPurchase = ref<number>(0)
const maxDiscount = ref<number | null>(null)
const productIds = ref<string[]>([])
const categoryIds = ref<string[]>([])
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const startTime = ref<Date | null>(null)
const endTime = ref<Date | null>(null)
const selectedWeekdays = ref<number[]>([])
const autoApply = ref(false)
const isActive = ref(true)

const validationError = ref<string | null>(null)

const typeOptions = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed Amount', value: 'fixed_amount' }
]

const weekdayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 }
]

function parseTimeString(timeStr: string): Date {
  const parts = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0)
  return d
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(async () => {
  // Load products and categories for the MultiSelects
  if (productStore.products.length === 0) {
    await productStore.fetchAll()
  }
  if (categoryStore.categories.length === 0) {
    await categoryStore.fetchAll()
  }

  if (isEditMode.value) {
    const discountId = route.params.id as string
    await store.fetchById(discountId)
    const discount = store.currentDiscount
    const scopes = store.currentScopes

    if (discount) {
      name.value = discount.name
      code.value = discount.code || ''
      type.value = discount.type
      value.value = discount.value
      minPurchase.value = discount.min_purchase
      maxDiscount.value = discount.max_discount
      autoApply.value = discount.auto_apply === 1
      isActive.value = discount.is_active === 1
      startDate.value = discount.start_date ? new Date(discount.start_date) : null
      endDate.value = discount.end_date ? new Date(discount.end_date) : null
      startTime.value = discount.start_time ? parseTimeString(discount.start_time) : null
      endTime.value = discount.end_time ? parseTimeString(discount.end_time) : null

      if (discount.weekdays) {
        try {
          selectedWeekdays.value = JSON.parse(discount.weekdays) as number[]
        } catch {
          selectedWeekdays.value = []
        }
      } else {
        selectedWeekdays.value = []
      }

      // Extract product and category IDs from scopes
      productIds.value = scopes
        .filter(s => s.product_id)
        .map(s => s.product_id!)
      categoryIds.value = scopes
        .filter(s => s.category_id)
        .map(s => s.category_id!)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Discount Not Found',
        detail: 'The discount you are trying to edit does not exist.',
        life: 3000
      })
      router.push('/discounts')
    }
  }
})

function validate(): boolean {
  validationError.value = null

  if (!name.value.trim()) {
    validationError.value = 'Discount name is required'
    return false
  }

  if (value.value <= 0) {
    validationError.value = 'Discount value must be greater than 0'
    return false
  }

  if (type.value === 'percentage' && value.value > 100) {
    validationError.value = 'Percentage discount cannot exceed 100%'
    return false
  }

  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    validationError.value = 'Start date must be before end date'
    return false
  }

  return true
}

async function onSave() {
  if (!validate()) return

  isSaving.value = true

  const input: PromoDiscountInput = {
    name: name.value.trim(),
    code: code.value.trim() || undefined,
    type: type.value,
    value: value.value,
    min_purchase: minPurchase.value,
    max_discount: maxDiscount.value || undefined,
    auto_apply: autoApply.value,
    is_active: isActive.value,
    start_date: startDate.value ? formatDateStr(startDate.value) : null,
    end_date: endDate.value ? formatDateStr(endDate.value) : null,
    start_time: startTime.value ? formatTime(startTime.value) : null,
    end_time: endTime.value ? formatTime(endTime.value) : null,
    weekdays: selectedWeekdays.value.length > 0 ? selectedWeekdays.value : null,
    productIds: productIds.value.length > 0 ? productIds.value : undefined,
    categoryIds: categoryIds.value.length > 0 ? categoryIds.value : undefined
  }

  try {
    if (isEditMode.value) {
      const discountId = route.params.id as string
      const updated = await store.update(discountId, input)
      if (updated) {
        toast.add({
          severity: 'success',
          summary: 'Discount Updated',
          detail: `${name.value} has been updated successfully.`,
          life: 3000
        })
        router.push('/discounts')
      } else if (store.error) {
        validationError.value = store.error
      }
    } else {
      const created = await store.create(input)
      if (created) {
        toast.add({
          severity: 'success',
          summary: 'Discount Created',
          detail: `${name.value} has been created successfully.`,
          life: 3000
        })
        router.push('/discounts')
      } else if (store.error) {
        validationError.value = store.error
      }
    }
  } catch (error: any) {
    validationError.value = error.message || 'An unexpected error occurred'
  } finally {
    isSaving.value = false
  }
}

function onCancel() {
  router.push('/discounts')
}

function toggleWeekday(day: number) {
  const idx = selectedWeekdays.value.indexOf(day)
  if (idx >= 0) {
    selectedWeekdays.value.splice(idx, 1)
  } else {
    selectedWeekdays.value.push(day)
  }
}
</script>

<template>
  <div class="discount-form-page">
    <Toast />

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
          :label="isEditMode ? 'Save Changes' : 'Create Discount'"
          icon="pi pi-check"
          @click="onSave"
          :loading="isSaving"
        />
      </div>
    </div>

    <Message v-if="validationError" severity="warn" :closable="false">
      {{ validationError }}
    </Message>

    <div class="form-layout">
      <!-- Left Column -->
      <div class="form-col">
        <!-- Basic Info -->
        <div class="form-card">
          <h3>Basic Information</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="discountName">Name *</label>
              <InputText
                id="discountName"
                v-model="name"
                placeholder="Discount name"
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="discountCode">Code</label>
              <InputText
                id="discountCode"
                v-model="code"
                placeholder="Promo code (optional)"
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label>Type</label>
              <SelectButton
                v-model="type"
                :options="typeOptions"
                optionLabel="label"
                optionValue="value"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="discountValue">Value *</label>
              <InputNumber
                id="discountValue"
                v-model="value"
                :suffix="type === 'percentage' ? '%' : undefined"
                :prefix="type === 'fixed_amount' ? '\u20B1' : undefined"
                :min="0"
                :max="type === 'percentage' ? 100 : undefined"
                class="w-full"
                :disabled="isSaving"
              />
            </div>
          </div>
        </div>

        <!-- Scope -->
        <div class="form-card">
          <h3>Scope</h3>
          <div class="form-grid">
            <div class="form-field full-width">
              <label for="discountProducts">Products</label>
              <MultiSelect
                id="discountProducts"
                v-model="productIds"
                :options="productStore.products"
                optionLabel="name"
                optionValue="id"
                placeholder="All products (leave empty)"
                :maxSelectedLabels="3"
                class="w-full"
                filter
                :disabled="isSaving"
              />
            </div>
            <div class="form-field full-width">
              <label for="discountCategories">Categories</label>
              <MultiSelect
                id="discountCategories"
                v-model="categoryIds"
                :options="categoryStore.categories"
                optionLabel="name"
                optionValue="id"
                placeholder="All categories (leave empty)"
                :maxSelectedLabels="3"
                class="w-full"
                filter
                :disabled="isSaving"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="form-col">
        <!-- Limits -->
        <div class="form-card">
          <h3>Limits</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="minPurchase">Min Purchase</label>
              <InputNumber
                id="minPurchase"
                v-model="minPurchase"
                prefix="\u20B1"
                :min="0"
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="maxDiscount">Max Discount</label>
              <InputNumber
                id="maxDiscount"
                v-model="maxDiscount"
                prefix="\u20B1"
                :min="0"
                class="w-full"
                placeholder="No limit"
                :disabled="isSaving"
              />
            </div>
          </div>
        </div>

        <!-- Schedule -->
        <div class="form-card">
          <h3>Schedule</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="startDate">Start Date</label>
              <DatePicker
                id="startDate"
                v-model="startDate"
                dateFormat="yy-mm-dd"
                placeholder="No start date"
                showIcon
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="endDate">End Date</label>
              <DatePicker
                id="endDate"
                v-model="endDate"
                dateFormat="yy-mm-dd"
                placeholder="No end date"
                showIcon
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="startTime">Start Time</label>
              <DatePicker
                id="startTime"
                v-model="startTime"
                timeOnly
                hourFormat="24"
                placeholder="No start time"
                showIcon
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field">
              <label for="endTime">End Time</label>
              <DatePicker
                id="endTime"
                v-model="endTime"
                timeOnly
                hourFormat="24"
                placeholder="No end time"
                showIcon
                class="w-full"
                :disabled="isSaving"
              />
            </div>
            <div class="form-field full-width">
              <label>Weekdays</label>
              <div class="weekday-group">
                <button
                  v-for="day in weekdayOptions"
                  :key="day.value"
                  type="button"
                  class="weekday-btn"
                  :class="{ selected: selectedWeekdays.includes(day.value) }"
                  @click="toggleWeekday(day.value)"
                  :disabled="isSaving"
                >
                  {{ day.label }}
                </button>
              </div>
              <small class="help-text">Leave all unselected for every day</small>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div class="form-card">
          <h3>Settings</h3>
          <div class="toggle-row">
            <div class="toggle-field">
              <ToggleSwitch
                id="autoApplyToggle"
                v-model="autoApply"
                :disabled="isSaving"
              />
              <label for="autoApplyToggle">Auto-apply</label>
            </div>
            <div class="toggle-field">
              <ToggleSwitch
                id="activeToggle"
                v-model="isActive"
                :disabled="isSaving"
              />
              <label for="activeToggle">Active</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discount-form-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.form-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.form-col {
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

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.w-full {
  width: 100%;
}

.weekday-group {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.weekday-btn {
  min-width: 48px;
  height: 36px;
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  background: var(--p-surface-0);
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0 0.5rem;
}

.weekday-btn:hover {
  border-color: var(--p-primary-color);
  color: var(--p-primary-color);
}

.weekday-btn.selected {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
  color: var(--p-primary-color);
}

.weekday-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.help-text {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.toggle-row {
  display: flex;
  gap: 2rem;
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  cursor: pointer;
}

@media (max-width: 1024px) {
  .form-layout {
    grid-template-columns: 1fr;
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

  .discount-form-page {
    gap: 0.75rem;
  }

  .form-layout {
    gap: 0.75rem;
  }

  .form-col {
    gap: 0.75rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.full-width {
    grid-column: span 1;
  }

  .weekday-btn {
    min-width: 40px;
    height: 32px;
    font-size: 0.75rem;
  }
}
</style>
