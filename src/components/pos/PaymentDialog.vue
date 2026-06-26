<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Dialog from 'primevue/dialog'
import AmountInput from '@/components/common/AmountInput.vue'
import InputText from 'primevue/inputtext'
import gcashIcon from '@/assets/icons/gcash-svgrepo-com.svg'
import mayaIcon from '@/assets/icons/maya-svgrepo-com.svg'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { vatService } from '@/services/vatService'
import { receiptService } from '@/services/receiptService'
import { customerRepository } from '@/repositories/customerRepository'
import { loyaltyConfigRepository } from '@/repositories/loyaltyConfigRepository'
import PointsRedemption from '@/components/crm/PointsRedemption.vue'
import type { PaymentMethod, PaymentEntry } from '@/types/payment'
import type { CreditValidation } from '@/types/credit'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'complete', payments: PaymentEntry[]): void
  (e: 'cancel'): void
}>()

const cartStore = useCartStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { totals } = storeToRefs(cartStore)

const businessInfo = computed(() => receiptService.getBusinessInfo())

// All possible payment methods
const allPaymentMethods: Array<{ label: string; value: PaymentMethod; icon: string; svgIcon?: string; key: keyof typeof settingsStore.paymentMethods }> = [
  { label: 'Cash', value: 'cash', icon: 'pi pi-money-bill', key: 'cash' },
  { label: 'Card', value: 'card', icon: 'pi pi-credit-card', key: 'card' },
  { label: 'GCash', value: 'gcash', icon: '', svgIcon: gcashIcon, key: 'gcash' },
  { label: 'Maya', value: 'maya', icon: '', svgIcon: mayaIcon, key: 'maya' },
  { label: 'GrabPay', value: 'grab_pay', icon: 'pi pi-car', key: 'grabPay' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: 'pi pi-building', key: 'bankTransfer' },
  { label: 'Check', value: 'check', icon: 'pi pi-file', key: 'check' }
]

// Filter by enabled payment methods from settings
const paymentMethods = computed(() =>
  allPaymentMethods.filter(m => settingsStore.paymentMethods[m.key])
)

// State
const selectedMethod = ref<PaymentMethod>('cash')
const cashTendered = ref<number>(0)
const referenceNumber = ref('')
const payments = ref<PaymentEntry[]>([])
const isSplitPayment = ref(false)
const splitAmount = ref<number>(0)

// Points redemption state
const showPointsRedemption = ref(false)
const customerPoints = ref(0)
const minRedemption = ref(100)
const hasRedeemablePoints = ref(false)
const pointsPaymentApplied = ref(false)
const pointsPaymentAmount = ref(0)
const pointsRedeemed = ref(0)

// Credit (utang) state
const creditEnabled = computed(() => settingsStore.paymentMethods.credit)
const creditAvailable = ref(0)
const creditAllowed = ref(false)
const creditLimitValue = ref(0)
const hasCustomer = computed(() => !!cartStore.customerId)

async function loadCustomerCredit() {
  creditAllowed.value = false
  creditAvailable.value = 0
  creditLimitValue.value = 0
  const cid = cartStore.customerId
  if (!cid || !creditEnabled.value) return
  try {
    const customer = await customerRepository.findById(cid)
    if (!customer) return
    const limit = customer.credit_limit ?? 0
    const balance = customer.current_balance ?? 0
    const available = Math.max(0, limit - balance)
    creditLimitValue.value = limit
    creditAvailable.value = available
    creditAllowed.value = limit > 0 && available > 0
  } catch {
    creditAllowed.value = false
  }
}

// Show the credit section when enabled in settings (regardless of customer/limit)
const showCreditOption = computed(() => creditEnabled.value)

async function loadCustomerPoints() {
  const cid = cartStore.customerId
  if (!cid) {
    hasRedeemablePoints.value = false
    return
  }
  try {
    const [customer, config] = await Promise.all([
      customerRepository.findById(cid),
      loyaltyConfigRepository.getConfig()
    ])
    if (customer && config && config.is_active) {
      customerPoints.value = customer.loyalty_points
      minRedemption.value = config.min_redemption
      hasRedeemablePoints.value = customer.loyalty_points >= config.min_redemption
    } else {
      hasRedeemablePoints.value = false
    }
  } catch {
    hasRedeemablePoints.value = false
  }
}

function handlePointsRedeem(data: { points: number; phpValue: number }) {
  showPointsRedemption.value = false
  pointsPaymentApplied.value = true
  pointsPaymentAmount.value = data.phpValue
  pointsRedeemed.value = data.points

  // Add as a payment entry
  const pointsEntry: PaymentEntry = {
    method: 'points' as PaymentMethod,
    amount: data.phpValue,
    referenceNumber: `${data.points} pts`
  }
  payments.value.push(pointsEntry)
}

function removePointsPayment() {
  const idx = payments.value.findIndex(p => p.method === ('points' as PaymentMethod))
  if (idx >= 0) {
    payments.value.splice(idx, 1)
  }
  pointsPaymentApplied.value = false
  pointsPaymentAmount.value = 0
  pointsRedeemed.value = 0
}

// Computed
const totalAmount = computed(() => totals.value.grandTotal)

// Amount covered by points (if applied outside split mode)
const pointsDiscount = computed(() => pointsPaymentApplied.value ? pointsPaymentAmount.value : 0)

// Effective amount remaining after points discount
const effectiveTotal = computed(() => Math.max(0, totalAmount.value - pointsDiscount.value))

const paidAmount = computed(() =>
  payments.value.filter(p => p.method !== ('points' as PaymentMethod)).reduce((sum, p) => sum + p.amount, 0)
)

const remainingAmount = computed(() =>
  Math.max(0, effectiveTotal.value - paidAmount.value)
)

const change = computed(() =>
  selectedMethod.value === 'cash'
    ? Math.max(0, cashTendered.value - (isSplitPayment.value ? splitAmount.value : remainingAmount.value))
    : 0
)

const canComplete = computed(() => {
  if (isSplitPayment.value) {
    return paidAmount.value >= effectiveTotal.value
  }

  if (remainingAmount.value <= 0) return true

  if (selectedMethod.value === 'cash') {
    return cashTendered.value >= remainingAmount.value
  }

  if (selectedMethod.value === 'credit') {
    return remainingAmount.value <= creditAvailable.value
  }

  return referenceNumber.value.trim().length > 0
})

const formattedTotal = computed(() => vatService.formatCurrency(totalAmount.value))
const formattedPaid = computed(() => vatService.formatCurrency(paidAmount.value))
const formattedRemaining = computed(() => vatService.formatCurrency(remainingAmount.value))
const formattedChange = computed(() => vatService.formatCurrency(change.value))

// Denomination buttons for cash tendered (additive)
const denominations = [
  { label: 'Exact', value: 'exact' as const },
  { label: '0.50', value: 0.5 },
  { label: '1.00', value: 1 },
  { label: '5.00', value: 5 },
  { label: '10.00', value: 10 },
  { label: '20.00', value: 20 },
  { label: '50.00', value: 50 },
  { label: '100.00', value: 100 },
  { label: '200.00', value: 200 },
  { label: '500.00', value: 500 },
  { label: '1000.00', value: 1000 }
]

// Watch for dialog open
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
    loadCustomerPoints()
    loadCustomerCredit()
  }
})

function resetForm() {
  selectedMethod.value = 'cash'
  cashTendered.value = 0
  referenceNumber.value = ''
  payments.value = []
  isSplitPayment.value = false
  splitAmount.value = 0
  pointsPaymentApplied.value = false
  pointsPaymentAmount.value = 0
  pointsRedeemed.value = 0
}

function addDenomination(denom: typeof denominations[number]) {
  if (denom.value === 'exact') {
    cashTendered.value = isSplitPayment.value ? splitAmount.value : remainingAmount.value
  } else {
    cashTendered.value += denom.value
  }
}

function clearCash() {
  cashTendered.value = 0
}

function addSplitPayment() {
  const amount = selectedMethod.value === 'cash'
    ? Math.min(cashTendered.value, splitAmount.value || remainingAmount.value)
    : (splitAmount.value || remainingAmount.value)

  if (amount <= 0) return

  const payment: PaymentEntry = {
    method: selectedMethod.value,
    amount,
    tendered: selectedMethod.value === 'cash' ? cashTendered.value : undefined,
    changeAmount: selectedMethod.value === 'cash' ? Math.max(0, cashTendered.value - amount) : undefined,
    referenceNumber: referenceNumber.value || undefined
  }

  payments.value.push(payment)

  // Reset for next payment
  cashTendered.value = 0
  referenceNumber.value = ''
  splitAmount.value = 0
}

function removeSplitPayment(index: number) {
  payments.value.splice(index, 1)
}

function handleComplete() {
  if (!canComplete.value) return

  let finalPayments: PaymentEntry[] = []

  // Include points payment if applied
  if (pointsPaymentApplied.value) {
    finalPayments.push({
      method: 'points' as PaymentMethod,
      amount: pointsPaymentAmount.value,
      referenceNumber: `${pointsRedeemed.value} pts`
    })
  }

  if (isSplitPayment.value) {
    // Add non-points split payments
    finalPayments.push(...payments.value.filter(p => p.method !== ('points' as PaymentMethod)))
  } else if (remainingAmount.value > 0) {
    const payment: PaymentEntry = {
      method: selectedMethod.value,
      amount: remainingAmount.value,
      tendered: selectedMethod.value === 'cash' ? cashTendered.value : undefined,
      changeAmount: selectedMethod.value === 'cash' ? change.value : undefined,
      referenceNumber: referenceNumber.value || undefined
    }
    finalPayments.push(payment)
  }

  emit('complete', finalPayments)
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function getMethodLabel(method: PaymentMethod): string {
  if (method === 'credit') return 'Charge (Utang)'
  const found = allPaymentMethods.find(m => m.value === method)
  return found?.label || method
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :modal="true"
    :closable="false"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0, borderRadius: 0 }"
    :pt="{
      header: { style: 'display: none' },
      content: { style: 'padding: 0; flex: 1; overflow: hidden' },
      footer: { style: 'display: none' }
    }"
    @hide="handleCancel"
  >
    <div class="flex h-full">

      <!-- ========== LEFT PANEL — Summary ========== -->
      <div class="w-[38%] flex flex-col relative text-white" style="background-color: var(--p-primary-color)">

        <!-- Close button -->
        <button
          @click="handleCancel"
          class="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10"
        >
          <i class="pi pi-times text-lg"></i>
        </button>

        <!-- Store details -->
        <div class="px-6 pt-6 pb-5 border-b border-white/15">
          <div class="text-2xl font-extrabold text-white leading-tight">{{ businessInfo.name }}</div>
          <div v-if="businessInfo.branchName" class="text-base text-white/80 mt-1">{{ businessInfo.branchName }}</div>
          <div class="text-base text-white/80 mt-1.5">{{ businessInfo.address }}</div>
          <div class="flex flex-wrap gap-x-4 mt-2.5 text-sm text-white/70">
            <span v-if="businessInfo.tin">TIN: {{ businessInfo.tin }}</span>
            <span>Terminal: {{ authStore.terminalId }}</span>
          </div>
        </div>

        <!-- Top section -->
        <div class="flex-1 flex flex-col items-center justify-center px-8">
          <div class="text-xs uppercase tracking-[0.2em] text-white/80 mb-1">Total Amount</div>
          <div class="text-5xl font-extrabold tabular-nums">{{ formattedTotal }}</div>

          <template v-if="pointsPaymentApplied">
            <div class="mt-3 text-sm text-white/70">
              Points Discount: <span class="text-white/90 font-semibold">-{{ vatService.formatCurrency(pointsPaymentAmount) }}</span>
            </div>
            <div class="text-lg font-bold mt-1">
              Pay: {{ vatService.formatCurrency(effectiveTotal) }}
            </div>
          </template>

          <!-- Change display -->
          <div v-if="selectedMethod === 'cash' && change > 0"
               class="mt-8 w-full max-w-xs p-5 rounded-2xl text-center bg-emerald-500/90"
               style="backdrop-filter: blur(4px)">
            <div class="text-xs uppercase tracking-widest text-emerald-100 mb-1">Change</div>
            <div class="text-4xl font-extrabold tabular-nums text-white">{{ formattedChange }}</div>
          </div>
        </div>

        <!-- Split payment progress (bottom of left panel) -->
        <div v-if="isSplitPayment" class="px-6 pb-6">
          <div v-if="paidAmount > 0" class="mb-4">
            <div class="flex justify-between text-sm text-white/70 mb-1.5">
              <span>Paid</span>
              <span>Remaining</span>
            </div>
            <div class="flex justify-between text-lg font-bold">
              <span>{{ formattedPaid }}</span>
              <span class="text-amber-200">{{ formattedRemaining }}</span>
            </div>
            <!-- Progress bar -->
            <div class="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                class="h-full rounded-full bg-white/80 transition-all duration-300"
                :style="{ width: Math.min(100, (paidAmount / effectiveTotal) * 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Split entries list -->
          <div v-if="payments.length > 0" class="space-y-2">
            <div class="text-xs uppercase tracking-widest text-white/60 mb-1">Payments Added</div>
            <div
              v-for="(payment, index) in payments"
              :key="index"
              class="flex justify-between items-center px-3 py-2 rounded-lg bg-white/10"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ getMethodLabel(payment.method) }}</span>
                <span v-if="payment.referenceNumber" class="text-xs text-white/50">
                  {{ payment.referenceNumber }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold tabular-nums">{{ vatService.formatCurrency(payment.amount) }}</span>
                <button
                  class="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  @click="removeSplitPayment(index)"
                >
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== RIGHT PANEL — Input ========== -->
      <div class="w-[62%] flex flex-col bg-white">
        <div class="flex-1 overflow-y-auto p-8">

          <!-- Points Redemption Trigger -->
          <div v-if="hasRedeemablePoints && !pointsPaymentApplied" class="mb-5">
            <button
              class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-purple-300 bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-100 transition-colors cursor-pointer"
              @click="showPointsRedemption = true"
            >
              <i class="pi pi-star"></i>
              Redeem Points ({{ customerPoints.toLocaleString() }} pts)
            </button>
          </div>

          <!-- Points Payment Applied -->
          <div v-if="pointsPaymentApplied" class="mb-5 p-3 rounded-xl bg-purple-50 border border-purple-200">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <i class="pi pi-star text-purple-500"></i>
                <span class="font-medium text-purple-800">{{ pointsRedeemed }} points redeemed</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-purple-600">-{{ vatService.formatCurrency(pointsPaymentAmount) }}</span>
                <button
                  class="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  @click="removePointsPayment"
                >
                  <i class="pi pi-times text-sm"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Split Payment Toggle -->
          <label class="flex items-center gap-2.5 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="isSplitPayment"
              class="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span class="text-sm text-neutral-600">Split payment across multiple methods</span>
          </label>

          <!-- Payment Method Selection — Pill Buttons -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2">Payment Method</label>
            <div class="grid gap-2.5" :class="paymentMethods.length <= 4 ? 'grid-cols-4' : 'grid-cols-4'">
              <button
                v-for="m in paymentMethods"
                :key="m.value"
                @click="selectedMethod = m.value"
                :class="[
                  'flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all text-sm font-semibold cursor-pointer',
                  selectedMethod === m.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                ]"
              >
                <img v-if="m.svgIcon" :src="m.svgIcon" :alt="m.label" class="w-6 h-6" />
                <i v-else :class="m.icon" class="text-xl"></i>
                {{ m.label }}
              </button>
            </div>
          </div>

          <!-- Credit (Utang) Button -->
          <div v-if="showCreditOption" class="mb-6">
            <button
              v-if="creditAllowed"
              @click="selectedMethod = 'credit'"
              :class="[
                'w-full flex items-center justify-between py-4 px-5 rounded-xl border-2 transition-all text-sm font-semibold cursor-pointer',
                selectedMethod === 'credit'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                  : 'border-orange-200 bg-white text-orange-600 hover:border-orange-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span>Charge (Utang)</span>
              </div>
              <span class="text-xs font-normal opacity-80">₱{{ creditAvailable.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} available</span>
            </button>
            <div v-else class="w-full flex items-center justify-between py-4 px-5 rounded-xl border-2 border-neutral-200 bg-neutral-50 text-neutral-400 text-sm">
              <div class="flex items-center gap-2">
                <i class="pi pi-wallet text-xl"></i>
                <span class="font-semibold">Charge (Utang)</span>
              </div>
              <span class="text-xs">
                {{ !hasCustomer ? 'Assign a customer first' : creditLimitValue <= 0 ? 'No credit limit set' : 'No available credit' }}
              </span>
            </div>
          </div>

          <!-- Split Amount (if split payment) -->
          <div v-if="isSplitPayment" class="mb-5">
            <label class="block text-sm font-medium text-neutral-700 mb-2">Amount for this payment</label>
            <AmountInput
              v-model="splitAmount"
              :min="0"
              :max="remainingAmount"
              class="w-full"
              placeholder="Enter amount"
            />
          </div>

          <!-- Credit (Utang) Summary -->
          <div v-if="selectedMethod === 'credit'" class="p-4 rounded-xl bg-orange-50 border border-orange-200">
            <div class="text-sm text-orange-600 mb-2 font-medium">Charge to Account Summary</div>
            <div class="flex justify-between mb-1">
              <span class="text-sm text-neutral-600">Available Credit:</span>
              <span class="font-semibold">₱{{ creditAvailable.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between mb-1">
              <span class="text-sm text-neutral-600">Charge Amount:</span>
              <span class="font-semibold text-orange-700">₱{{ (isSplitPayment ? (splitAmount || 0) : remainingAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div v-if="(isSplitPayment ? (splitAmount || 0) : remainingAmount) > creditAvailable" class="mt-2 text-sm text-red-600">
              <i class="pi pi-exclamation-triangle mr-1"></i>
              Amount exceeds available credit
            </div>
          </div>

          <!-- Cash Payment (hidden in split mode — the split amount input is used instead) -->
          <div v-else-if="selectedMethod === 'cash' && !isSplitPayment">
            <label class="block text-sm font-medium text-neutral-700 mb-2">Cash Tendered</label>
            <AmountInput
              v-model="cashTendered"
              :min="0"
              class="w-full cash-tendered-input"
              inputClass="!text-4xl !font-extrabold !text-center !py-4 tabular-nums"
              placeholder="Enter amount"
            />

            <!-- Denomination Buttons -->
            <div class="grid grid-cols-4 gap-2.5 mt-4">
              <button
                v-for="denom in denominations"
                :key="denom.label"
                @click="addDenomination(denom)"
                class="py-3.5 px-2 rounded-xl bg-neutral-100 text-neutral-700 text-base font-bold hover:bg-neutral-200 active:bg-neutral-300 transition-colors cursor-pointer"
              >
                {{ denom.label }}
              </button>
              <button
                @click="clearCash"
                class="py-3.5 px-2 rounded-xl bg-red-50 text-red-600 text-base font-bold hover:bg-red-100 active:bg-red-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <!-- Card/E-Wallet Payment -->
          <div v-else>
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              {{ selectedMethod === 'card' ? 'Approval Code / Last 4 Digits' : 'Reference Number' }}
            </label>
            <InputText
              v-model="referenceNumber"
              class="w-full"
              :placeholder="selectedMethod === 'card' ? 'Enter approval code' : 'Enter reference number'"
              autofocus
            />
          </div>

          <!-- Split Payment: Add Button -->
          <div v-if="isSplitPayment" class="mt-5">
            <button
              @click="addSplitPayment"
              :disabled="!splitAmount || splitAmount <= 0 || (selectedMethod !== 'cash' && selectedMethod !== 'credit' && !referenceNumber)"
              class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-neutral-300 bg-white text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <i class="pi pi-plus text-xs"></i>
              Add Payment
            </button>
          </div>

          <!-- Validation Message -->
          <div
            v-if="!canComplete && (cashTendered > 0 || referenceNumber)"
            class="mt-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm"
          >
            <i class="pi pi-exclamation-triangle mr-1.5"></i>
            <template v-if="selectedMethod === 'cash'">
              Cash tendered is less than the total amount
            </template>
            <template v-else>
              Please enter a reference number
            </template>
          </div>
        </div>

        <!-- Footer buttons — pinned to bottom of right panel -->
        <div class="px-8 py-5 border-t border-neutral-200 flex justify-end gap-3">
          <button
            @click="handleCancel"
            class="px-6 py-3 rounded-xl border border-neutral-300 bg-white text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="handleComplete"
            :disabled="!canComplete"
            class="px-8 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <i class="pi pi-check"></i>
            {{ isSplitPayment ? 'Complete Payment' : 'Process Payment' }}
          </button>
        </div>
      </div>

    </div>
  </Dialog>

  <!-- Points Redemption Dialog -->
  <PointsRedemption
    v-if="cartStore.customerId"
    v-model:visible="showPointsRedemption"
    :customerId="cartStore.customerId"
    @redeem="handlePointsRedeem"
    @cancel="showPointsRedemption = false"
  />
</template>

<style scoped>
</style>
