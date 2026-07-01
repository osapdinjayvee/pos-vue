<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import AmountInput from '@/components/common/AmountInput.vue'
import { useCartStore } from '@/stores/cart'
import { useSettingsStore } from '@/stores/settings'
import { vatService } from '@/services/vatService'
import { discountRepository } from '@/repositories/discountRepository'
import type { Discount } from '@/types/discount'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'applied'): void
  (e: 'cancel'): void
}>()

const cartStore = useCartStore()
const settingsStore = useSettingsStore()
const { totals, hasDiscount, discount: currentDiscount } = storeToRefs(cartStore)

// View mode: 'list' | 'senior' | 'pwd' | 'percentage' | 'fixed'
const viewMode = ref<'list' | 'senior' | 'pwd' | 'percentage' | 'fixed'>('list')

// Saved discounts from DB
const savedDiscounts = ref<Discount[]>([])
const isLoading = ref(false)

// Manual discount form state
const seniorIdNumber = ref('')
const seniorIdName = ref('')
const pwdIdNumber = ref('')
const pwdIdName = ref('')
const percentageValue = ref<number>(0)
const fixedValue = ref<number>(0)

// Computed
const subtotal = computed(() => totals.value.subtotal)

const percentageDiscountAmount = computed(() =>
  vatService.round((subtotal.value * percentageValue.value) / 100)
)

const canApplySenior = computed(() =>
  seniorIdNumber.value.trim().length > 0 && seniorIdName.value.trim().length > 0
)

const canApplyPWD = computed(() =>
  pwdIdNumber.value.trim().length > 0 && pwdIdName.value.trim().length > 0
)

const canApplyPercentage = computed(() =>
  percentageValue.value > 0 && percentageValue.value <= 100
)

const canApplyFixed = computed(() =>
  fixedValue.value > 0 && fixedValue.value <= subtotal.value
)

// Load discounts when visible
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
    loadDiscounts()
  }
})

async function loadDiscounts() {
  isLoading.value = true
  try {
    savedDiscounts.value = await discountRepository.findActiveForPOS()
  } catch (e) {
    console.error('Failed to load discounts:', e)
    savedDiscounts.value = []
  } finally {
    isLoading.value = false
  }
}

function resetForm() {
  viewMode.value = 'list'
  seniorIdNumber.value = ''
  seniorIdName.value = ''
  pwdIdNumber.value = ''
  pwdIdName.value = ''
  percentageValue.value = 0
  fixedValue.value = 0
}

function formatDiscountValue(d: Discount): string {
  if (d.type === 'percentage' || d.type === 'senior_citizen' || d.type === 'pwd') {
    return `${d.value}%`
  }
  return vatService.formatCurrency(d.value)
}

function formatDiscountType(d: Discount): string {
  if (d.type === 'percentage') return 'Percentage'
  if (d.type === 'fixed_amount') return 'Fixed'
  if (d.type === 'senior_citizen') return 'Senior'
  if (d.type === 'pwd') return 'PWD'
  return d.type
}

function computeSavedDiscountAmount(d: Discount): number {
  if (d.type === 'percentage' || d.type === 'senior_citizen' || d.type === 'pwd') {
    return vatService.round(subtotal.value * (d.value / 100))
  }
  return Math.min(d.value, subtotal.value)
}

function applySavedDiscount(d: Discount) {
  // Only one discount per transaction — must remove the current one first
  if (hasDiscount.value) return
  if (d.type === 'percentage') {
    cartStore.applyPercentageDiscount(d.value, d.code || undefined)
  } else if (d.type === 'fixed_amount') {
    cartStore.applyFixedDiscount(d.value, d.code || undefined)
  } else if (d.type === 'senior_citizen') {
    // Senior requires ID — switch to form
    viewMode.value = 'senior'
    return
  } else if (d.type === 'pwd') {
    viewMode.value = 'pwd'
    return
  }
  emit('applied')
  emit('update:visible', false)
}

function applySeniorDiscount() {
  if (!canApplySenior.value) return
  cartStore.applySeniorDiscount(seniorIdNumber.value, seniorIdName.value)
  emit('applied')
  emit('update:visible', false)
}

function applyPWDDiscount() {
  if (!canApplyPWD.value) return
  cartStore.applyPWDDiscount(pwdIdNumber.value, pwdIdName.value)
  emit('applied')
  emit('update:visible', false)
}

function applyPercentageDiscount() {
  if (!canApplyPercentage.value) return
  cartStore.applyPercentageDiscount(percentageValue.value)
  emit('applied')
  emit('update:visible', false)
}

function applyFixedDiscount() {
  if (!canApplyFixed.value) return
  cartStore.applyFixedDiscount(fixedValue.value)
  emit('applied')
  emit('update:visible', false)
}

function removeCurrentDiscount() {
  cartStore.removeDiscount()
}

function handleClose() {
  emit('update:visible', false)
  emit('cancel')
}

function handleBack() {
  viewMode.value = 'list'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="disc-overlay">
      <div v-if="visible" class="disc-overlay">
        <div class="disc-page">

          <!-- Header -->
          <div class="disc-header">
            <button v-if="viewMode !== 'list'" class="disc-back-btn" @click="handleBack">
              <i class="pi pi-arrow-left"></i>
            </button>
            <h2 class="disc-title">
              <template v-if="viewMode === 'list'">Apply Discount</template>
              <template v-else-if="viewMode === 'senior'">Senior Citizen Discount</template>
              <template v-else-if="viewMode === 'pwd'">PWD Discount</template>
              <template v-else-if="viewMode === 'percentage'">Percentage Discount</template>
              <template v-else-if="viewMode === 'fixed'">Fixed Amount Discount</template>
            </h2>
            <button class="disc-close-btn" @click="handleClose">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Subtotal bar -->
          <div class="disc-subtotal-bar">
            <span class="disc-subtotal-label">Cart Subtotal</span>
            <span class="disc-subtotal-value">{{ vatService.formatCurrency(subtotal) }}</span>
          </div>

          <!-- Current discount notice -->
          <div v-if="hasDiscount" class="disc-notice">
            <i class="pi pi-info-circle"></i>
            <span>A discount is already applied. Remove it before applying a different one.</span>
            <button class="disc-notice-remove" @click="removeCurrentDiscount">Remove</button>
          </div>

          <!-- MAIN CONTENT -->
          <div class="disc-body">

            <!-- ========== LIST VIEW ========== -->
            <template v-if="viewMode === 'list'">

              <!-- Saved discounts from DB -->
              <div v-if="savedDiscounts.length > 0" class="disc-section">
                <h3 class="disc-section-title">
                  <i class="pi pi-tag"></i> Available Discounts
                </h3>
                <div class="disc-grid">
                  <button
                    v-for="d in savedDiscounts"
                    :key="d.id"
                    class="disc-card"
                    :disabled="hasDiscount"
                    @click="applySavedDiscount(d)"
                  >
                    <div class="disc-card-badge">{{ formatDiscountValue(d) }}</div>
                    <div class="disc-card-name">{{ d.name }}</div>
                    <div class="disc-card-type">{{ formatDiscountType(d) }}</div>
                    <div v-if="subtotal > 0" class="disc-card-saves">
                      Save {{ vatService.formatCurrency(computeSavedDiscountAmount(d)) }}
                    </div>
                    <div v-if="d.code" class="disc-card-code">{{ d.code }}</div>
                  </button>
                </div>
              </div>

              <div v-else-if="!isLoading" class="disc-empty">
                <i class="pi pi-tag text-2xl text-neutral-300 mb-2"></i>
                <p class="text-sm text-neutral-400 m-0">No saved discounts available</p>
              </div>

              <!-- Manual discount options -->
              <div class="disc-section">
                <h3 class="disc-section-title">
                  <i class="pi pi-pencil"></i> Manual Discount
                </h3>
                <div class="disc-manual-grid">
                  <button class="disc-manual-btn" :disabled="hasDiscount" @click="viewMode = 'senior'">
                    <i class="pi pi-id-card"></i>
                    <span>Senior Citizen</span>
                    <small>{{ settingsStore.seniorDiscountPercent }}% off</small>
                  </button>
                  <button class="disc-manual-btn" :disabled="hasDiscount" @click="viewMode = 'pwd'">
                    <i class="pi pi-heart"></i>
                    <span>PWD</span>
                    <small>{{ settingsStore.pwdDiscountPercent }}% off</small>
                  </button>
                  <button class="disc-manual-btn" :disabled="hasDiscount" @click="viewMode = 'percentage'">
                    <i class="pi pi-percentage"></i>
                    <span>Percentage</span>
                    <small>Custom %</small>
                  </button>
                  <button class="disc-manual-btn" :disabled="hasDiscount" @click="viewMode = 'fixed'">
                    <i class="pi pi-money-bill"></i>
                    <span>Fixed Amount</span>
                    <small>PHP value</small>
                  </button>
                </div>
              </div>
            </template>

            <!-- ========== SENIOR FORM ========== -->
            <template v-else-if="viewMode === 'senior'">
              <div class="disc-form">
                <div class="disc-form-info">
                  <i class="pi pi-info-circle"></i>
                  <strong>{{ settingsStore.seniorDiscountPercent }}% discount</strong> on VATable items. Discounted items become VAT-exempt per BIR regulations.
                </div>
                <div class="disc-field">
                  <label>Senior Citizen ID Number *</label>
                  <InputText v-model="seniorIdNumber" class="w-full" placeholder="Enter ID number" />
                </div>
                <div class="disc-field">
                  <label>Name on ID *</label>
                  <InputText v-model="seniorIdName" class="w-full" placeholder="Enter name as shown on ID" />
                </div>
                <button
                  class="disc-apply-btn"
                  :disabled="!canApplySenior"
                  @click="applySeniorDiscount"
                >
                  <i class="pi pi-check"></i> Apply Senior Citizen Discount
                </button>
              </div>
            </template>

            <!-- ========== PWD FORM ========== -->
            <template v-else-if="viewMode === 'pwd'">
              <div class="disc-form">
                <div class="disc-form-info">
                  <i class="pi pi-info-circle"></i>
                  <strong>{{ settingsStore.pwdDiscountPercent }}% discount</strong> on VATable items. Discounted items become VAT-exempt per BIR regulations.
                </div>
                <div class="disc-field">
                  <label>PWD ID Number *</label>
                  <InputText v-model="pwdIdNumber" class="w-full" placeholder="Enter ID number" />
                </div>
                <div class="disc-field">
                  <label>Name on ID *</label>
                  <InputText v-model="pwdIdName" class="w-full" placeholder="Enter name as shown on ID" />
                </div>
                <button
                  class="disc-apply-btn"
                  :disabled="!canApplyPWD"
                  @click="applyPWDDiscount"
                >
                  <i class="pi pi-check"></i> Apply PWD Discount
                </button>
              </div>
            </template>

            <!-- ========== PERCENTAGE FORM ========== -->
            <template v-else-if="viewMode === 'percentage'">
              <div class="disc-form">
                <div class="disc-field">
                  <label>Discount Percentage</label>
                  <InputNumber
                    v-model="percentageValue"
                    :min="0"
                    :max="100"
                    suffix="%"
                    class="w-full"
                  />
                </div>
                <div v-if="percentageValue > 0" class="disc-preview">
                  <span>Discount Amount</span>
                  <span class="disc-preview-amount">-{{ vatService.formatCurrency(percentageDiscountAmount) }}</span>
                </div>
                <button
                  class="disc-apply-btn"
                  :disabled="!canApplyPercentage"
                  @click="applyPercentageDiscount"
                >
                  <i class="pi pi-check"></i> Apply {{ percentageValue }}% Discount
                </button>
              </div>
            </template>

            <!-- ========== FIXED FORM ========== -->
            <template v-else-if="viewMode === 'fixed'">
              <div class="disc-form">
                <div class="disc-field">
                  <label>Discount Amount</label>
                  <AmountInput
                    v-model="fixedValue"
                    :min="0"
                    :max="subtotal"
                    class="w-full"
                  />
                </div>
                <div v-if="fixedValue > subtotal" class="disc-form-warn">
                  <i class="pi pi-exclamation-triangle"></i> Discount cannot exceed subtotal
                </div>
                <div v-if="fixedValue > 0 && fixedValue <= subtotal" class="disc-preview">
                  <span>Discount Amount</span>
                  <span class="disc-preview-amount">-{{ vatService.formatCurrency(fixedValue) }}</span>
                </div>
                <button
                  class="disc-apply-btn"
                  :disabled="!canApplyFixed"
                  @click="applyFixedDiscount"
                >
                  <i class="pi pi-check"></i> Apply Fixed Discount
                </button>
              </div>
            </template>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Overlay */
.disc-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  background: var(--p-surface-0);
}

.disc-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--p-surface-0);
  overflow: hidden;
  animation: disc-pop 0.2s ease both;
}

/* Header */
.disc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.disc-title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--p-text-color);
}

.disc-back-btn,
.disc-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  border: none;
  background: var(--p-surface-100);
  color: var(--p-text-muted-color);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.disc-back-btn:hover,
.disc-close-btn:hover {
  background: var(--p-surface-200);
}

/* Subtotal bar */
.disc-subtotal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--p-surface-50);
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.disc-subtotal-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  font-weight: 500;
}
.disc-subtotal-value {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--p-text-color);
  font-variant-numeric: tabular-nums;
}

/* Notice */
.disc-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #eff6ff;
  border-bottom: 1px solid #dbeafe;
  font-size: 0.8125rem;
  color: #3b82f6;
  flex-shrink: 0;
}
.disc-notice-remove {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #93c5fd;
  background: var(--p-surface-0);
  color: #3b82f6;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.disc-notice-remove:hover {
  background: #dbeafe;
}

/* Body */
.disc-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

/* Section */
.disc-section {
  margin-bottom: 1.5rem;
}
.disc-section:last-child {
  margin-bottom: 0;
}
.disc-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

/* Discount cards grid */
.disc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.disc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  border-radius: 0.875rem;
  border: 1.5px solid var(--p-surface-200);
  background: var(--p-surface-0);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.disc-card:hover {
  border-color: var(--p-primary-300);
  background: var(--p-primary-50);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.disc-card:active {
  transform: scale(0.97);
}

.disc-card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  background: var(--p-primary-500);
  color: white;
  font-size: 1rem;
  font-weight: 800;
  min-width: 3rem;
}

.disc-card-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--p-text-color);
  margin-top: 0.25rem;
}

.disc-card-type {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.disc-card-saves {
  font-size: 0.8125rem;
  color: #16a34a;
  font-weight: 700;
  margin-top: 0.125rem;
}

.disc-card-code {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  font-family: monospace;
  background: var(--p-surface-100);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  margin-top: 0.25rem;
}

/* Empty state */
.disc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
}

/* Manual discount buttons */
.disc-manual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.disc-manual-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  border-radius: 0.875rem;
  border: 1.5px solid var(--p-surface-200);
  background: var(--p-surface-0);
  cursor: pointer;
  transition: all 0.15s;
}
.disc-manual-btn:hover {
  border-color: var(--p-surface-300);
  background: var(--p-surface-50);
}
.disc-manual-btn:active {
  transform: scale(0.97);
}
.disc-card:disabled,
.disc-manual-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.disc-manual-btn i {
  font-size: 1.25rem;
  color: var(--p-text-muted-color);
}
.disc-manual-btn span {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--p-text-color);
}
.disc-manual-btn small {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Form views */
.disc-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.disc-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.disc-field label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.disc-form-info {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.disc-form-info i {
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.disc-form-warn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.625rem;
  background: #fef3c7;
  color: #d97706;
  font-size: 0.8125rem;
  font-weight: 600;
}

.disc-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.disc-preview span:first-child {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}
.disc-preview-amount {
  font-size: 1.125rem;
  font-weight: 800;
  color: #16a34a;
  font-variant-numeric: tabular-nums;
}

.disc-apply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 0.875rem;
  border: none;
  background: var(--p-primary-500);
  color: white;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 0.5rem;
}
.disc-apply-btn:hover:not(:disabled) {
  background: var(--p-primary-600);
}
.disc-apply-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.disc-apply-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Animations */
@keyframes disc-pop {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.disc-overlay-enter-active { transition: opacity 0.2s ease; }
.disc-overlay-leave-active { transition: opacity 0.15s ease; }
.disc-overlay-enter-from,
.disc-overlay-leave-to { opacity: 0; }
</style>
