<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import type { MembershipTier, MembershipTierInput } from '@/types/tier'

const props = withDefaults(
  defineProps<{
    visible: boolean
    tier: MembershipTier | null
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'save': [data: MembershipTierInput]
}>()

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Form state
const form = ref<{
  name: string
  min_spend: number
  discount_rate: number
  points_multiplier: number
  display_order: number
  is_active: boolean
}>({
  name: '',
  min_spend: 0,
  discount_rate: 0,
  points_multiplier: 1,
  display_order: 1,
  is_active: true
})

// Validation error
const validationError = ref<string | null>(null)

// Computed properties
const isEditMode = computed(() => !!props.tier)
const dialogTitle = computed(() =>
  isEditMode.value ? 'Edit Tier' : 'New Tier'
)

// Watch for tier changes and populate form
watch(
  () => props.tier,
  (newTier) => {
    if (newTier) {
      // Edit mode: populate from tier, convert discount_rate from decimal to percentage
      form.value = {
        name: newTier.name,
        min_spend: newTier.min_spend,
        discount_rate: newTier.discount_rate * 100, // Convert 0.05 to 5
        points_multiplier: newTier.points_multiplier,
        display_order: newTier.display_order,
        is_active: newTier.is_active === 1
      }
    } else {
      // Create mode: reset form
      form.value = {
        name: '',
        min_spend: 0,
        discount_rate: 0,
        points_multiplier: 1,
        display_order: 1,
        is_active: true
      }
    }
    validationError.value = null
  }
)

// Validate form
function validateForm(): boolean {
  validationError.value = null

  if (!form.value.name.trim()) {
    validationError.value = 'Tier name is required'
    return false
  }

  if (form.value.discount_rate < 0 || form.value.discount_rate > 100) {
    validationError.value = 'Discount rate must be between 0 and 100%'
    return false
  }

  if (form.value.points_multiplier < 1) {
    validationError.value = 'Points multiplier must be at least 1'
    return false
  }

  if (form.value.display_order < 1) {
    validationError.value = 'Display order must be at least 1'
    return false
  }

  return true
}

// Handle save
function handleSave() {
  if (!validateForm()) {
    return
  }

  const data: MembershipTierInput = {
    name: form.value.name.trim(),
    min_spend: form.value.min_spend,
    discount_rate: form.value.discount_rate / 100, // Convert 5 to 0.05
    points_multiplier: form.value.points_multiplier,
    display_order: Math.round(form.value.display_order),
    is_active: form.value.is_active
  }

  emit('save', data)
}

// Handle cancel
function handleCancel() {
  dialogVisible.value = false
  validationError.value = null
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    :style="{ width: '500px' }"
    :modal="true"
    :closable="!loading"
  >
    <div class="tier-form">
      <!-- Validation error message -->
      <Message
        v-if="validationError"
        severity="error"
        :closable="false"
        class="mb-4"
      >
        {{ validationError }}
      </Message>

      <!-- Name field -->
      <div class="form-field">
        <label for="name">Tier Name *</label>
        <InputText
          id="name"
          v-model="form.name"
          placeholder="e.g., Bronze, Silver, Gold"
          class="w-full"
          :disabled="loading"
          @keyup.enter="handleSave"
        />
      </div>

      <!-- Minimum Spend field -->
      <div class="form-field">
        <label for="min_spend">Minimum Spend (PHP)</label>
        <InputNumber
          id="min_spend"
          v-model="form.min_spend"
          mode="currency"
          currency="PHP"
          :min="0"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <!-- Discount Rate field -->
      <div class="form-field">
        <label for="discount_rate">Discount Rate (%)</label>
        <InputNumber
          id="discount_rate"
          v-model="form.discount_rate"
          :min="0"
          :max="100"
          suffix=" %"
          class="w-full"
          :disabled="loading"
        />
        <small class="text-hint">Enter as percentage (e.g., 5 = 5% discount)</small>
      </div>

      <!-- Points Multiplier field -->
      <div class="form-field">
        <label for="points_multiplier">Points Multiplier</label>
        <InputNumber
          id="points_multiplier"
          v-model="form.points_multiplier"
          :min="1"
          :step="0.25"
          suffix=" x"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <!-- Display Order field -->
      <div class="form-field">
        <label for="display_order">Display Order</label>
        <InputNumber
          id="display_order"
          v-model="form.display_order"
          :min="1"
          :use-grouping="false"
          class="w-full"
          :disabled="loading"
        />
      </div>

      <!-- Active status toggle -->
      <div class="form-field toggle-field">
        <ToggleSwitch
          id="is_active"
          v-model="form.is_active"
          :disabled="loading"
        />
        <label for="is_active">Active</label>
      </div>
    </div>

    <!-- Dialog footer with buttons -->
    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        severity="secondary"
        outlined
        @click="handleCancel"
        :disabled="loading"
      />
      <Button
        label="Save"
        icon="pi pi-check"
        @click="handleSave"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.tier-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0 1rem;
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

.form-field :deep(input),
.form-field :deep(.p-inputtext),
.form-field :deep(.p-inputnumber) {
  width: 100%;
}

.toggle-field {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.toggle-field label {
  margin: 0;
  cursor: pointer;
}

.text-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  display: block;
  margin-top: 0.25rem;
}

.w-full {
  width: 100%;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
