<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import { customerRepository } from '@/repositories/customerRepository'
import { loyaltyConfigRepository } from '@/repositories/loyaltyConfigRepository'
import type { LoyaltyConfig } from '@/types/loyalty'

// ---------------------
// Props
// ---------------------

const props = defineProps<{
  visible: boolean
  customerId: string
}>()

// ---------------------
// Emits
// ---------------------

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'redeem', data: { points: number; phpValue: number }): void
  (e: 'cancel'): void
}>()

// ---------------------
// Local state
// ---------------------

const loading = ref(false)
const availablePoints = ref(0)
const redeemPoints = ref<number | null>(null)
const config = ref<LoyaltyConfig | null>(null)

// ---------------------
// Computed
// ---------------------

const redeemRate = computed(() => config.value?.redeem_rate ?? 0)

const minRedemption = computed(() => config.value?.min_redemption ?? 0)

const availablePhpValue = computed(() => availablePoints.value * redeemRate.value)

const discountValue = computed(() => (redeemPoints.value ?? 0) * redeemRate.value)

const currentRedeemPoints = computed(() => redeemPoints.value ?? 0)

const isBelowMinimum = computed(() =>
  currentRedeemPoints.value > 0 && currentRedeemPoints.value < minRedemption.value
)

const isInsufficientPoints = computed(() =>
  currentRedeemPoints.value > availablePoints.value
)

const isValid = computed(() =>
  currentRedeemPoints.value >= minRedemption.value &&
  currentRedeemPoints.value <= availablePoints.value &&
  currentRedeemPoints.value > 0
)

// ---------------------
// Currency formatting
// ---------------------

function formatCurrency(value: number): string {
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// ---------------------
// Data loading
// ---------------------

async function loadData() {
  loading.value = true
  try {
    const customer = await customerRepository.findById(props.customerId)
    availablePoints.value = customer?.loyalty_points ?? 0

    const loyaltyConfig = await loyaltyConfigRepository.getConfig()
    config.value = loyaltyConfig ?? null

    redeemPoints.value = null
  } catch (e) {
    console.error('Failed to load redemption data:', e)
    availablePoints.value = 0
    config.value = null
  } finally {
    loading.value = false
  }
}

// ---------------------
// Watch visibility
// ---------------------

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadData()
    }
  }
)

// ---------------------
// Actions
// ---------------------

function handleConfirm() {
  if (!isValid.value) return

  emit('redeem', {
    points: currentRedeemPoints.value,
    phpValue: discountValue.value
  })
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Redeem Loyalty Points"
    :modal="true"
    :closable="true"
    :style="{ width: '450px' }"
    @hide="handleCancel"
  >
    <div class="points-redemption">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading loyalty data...</span>
      </div>

      <template v-else>
        <!-- Available Points Balance Card -->
        <div class="points-balance-card">
          <span class="balance-label">Available Points</span>
          <div class="balance-points">
            <span class="balance-number">{{ availablePoints.toLocaleString('en-PH') }}</span>
            <span class="balance-pts">pts</span>
          </div>
          <span class="balance-equivalent">{{ formatCurrency(availablePhpValue) }} equivalent</span>
        </div>

        <!-- Redemption Input -->
        <div class="redemption-input-section">
          <label class="input-label">Points to Redeem</label>
          <InputNumber
            v-model="redeemPoints"
            :min="0"
            :max="availablePoints"
            :step="10"
            :show-buttons="true"
            button-layout="horizontal"
            increment-icon="pi pi-plus"
            decrement-icon="pi pi-minus"
            fluid
            placeholder="Enter points"
          />
          <span v-if="config" class="input-hint">
            Minimum: {{ minRedemption.toLocaleString('en-PH') }} points
          </span>
        </div>

        <!-- Validation Messages -->
        <Message v-if="isBelowMinimum" severity="warn" :closable="false">
          Minimum redemption is {{ minRedemption.toLocaleString('en-PH') }} points.
        </Message>

        <Message v-if="isInsufficientPoints" severity="error" :closable="false">
          Insufficient points. You only have {{ availablePoints.toLocaleString('en-PH') }} points available.
        </Message>

        <!-- Discount Value Preview -->
        <div v-if="currentRedeemPoints > 0 && !isInsufficientPoints" class="discount-preview">
          <div class="discount-row">
            <span class="discount-label">Discount Value</span>
            <span class="discount-value">{{ formatCurrency(discountValue) }}</span>
          </div>
          <span class="discount-rate-info">
            Rate: 1 point = {{ formatCurrency(redeemRate) }}
          </span>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleCancel"
        />
        <Button
          :label="`Redeem ${currentRedeemPoints.toLocaleString('en-PH')} Points`"
          icon="pi pi-check"
          :disabled="!isValid || loading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.points-redemption {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Loading State */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

/* Points Balance Card */
.points-balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.5rem 1rem;
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 12px;
  text-align: center;
}

.balance-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.balance-points {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.balance-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--p-primary-color);
  line-height: 1;
}

.balance-pts {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-primary-color);
  opacity: 0.7;
}

.balance-equivalent {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Redemption Input Section */
.redemption-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.input-hint {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Discount Preview */
.discount-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: var(--p-green-50);
  border: 1px solid var(--p-green-200);
  border-radius: 10px;
}

.discount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.discount-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.discount-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--p-green-600);
}

.discount-rate-info {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Dialog Footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
