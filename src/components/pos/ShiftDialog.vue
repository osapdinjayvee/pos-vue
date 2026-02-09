<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import SupervisorAuthDialog from '@/components/auth/SupervisorAuthDialog.vue'
import XReadingDisplay from '@/components/reports/XReadingDisplay.vue'
import ZReadingDisplay from '@/components/reports/ZReadingDisplay.vue'
import { useShift } from '@/composables/useShift'
import { useCashDrawer } from '@/composables/useCashDrawer'
import { useReports } from '@/composables/useReports'
import { useAuthStore } from '@/stores/auth'
import { transactionRepository } from '@/repositories/transactionRepository'
import { vatService } from '@/services/vatService'
import type { Transaction } from '@/types/transaction'
import type { DisplayXReading } from '@/types/xReading'
import type { DisplayZReading } from '@/types/zReading'

interface Props {
  visible: boolean
  mode: 'start' | 'end'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'shift-started': []
  'shift-ended': []
}>()

const authStore = useAuthStore()
const shift = useShift()
const drawer = useCashDrawer()
const reports = useReports()

// Form state
const cashAmount = ref<number>(0)
const varianceReason = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

// Philippine denomination buttons (bills + coins)
const denominations = [
  { label: '₱1,000', value: 1000 },
  { label: '₱500', value: 500 },
  { label: '₱200', value: 200 },
  { label: '₱100', value: 100 },
  { label: '₱50', value: 50 },
  { label: '₱20', value: 20 },
  { label: '₱10', value: 10 },
  { label: '₱5', value: 5 },
  { label: '₱1', value: 1 },
  { label: '25¢', value: 0.25 }
]

function addDenomination(amount: number) {
  cashAmount.value = Math.round((cashAmount.value + amount) * 100) / 100
}

function clearCashAmount() {
  cashAmount.value = 0
}

// Shift summary data
const shiftTransactions = ref<Transaction[]>([])
const isLoadingSummary = ref(false)

// X/Z Reading dialog state
const showXReadingDialog = ref(false)
const showZReadingDialog = ref(false)
const showZReadingConfirm = ref(false)
const xReadingResult = ref<DisplayXReading | null>(null)
const zReadingResult = ref<DisplayZReading | null>(null)
const isGeneratingReading = ref(false)
const readingError = ref('')

// Supervisor override
const showSupervisorAuth = ref(false)

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isConfirmDisabled = computed(() =>
  cashAmount.value <= 0 || isSubmitting.value
)

// End-shift computed
const actualCash = computed(() => cashAmount.value || 0)
const expectedCash = computed(() => drawer.expectedCash.value)
const variance = computed(() => actualCash.value - expectedCash.value)
const showVarianceReason = computed(() =>
  props.mode === 'end' && Math.abs(variance.value) > (drawer.varianceThreshold.value || 100)
)

const varianceSeverity = computed(() => {
  const v = variance.value
  if (Math.abs(v) <= 1) return 'success'
  if (Math.abs(v) <= (drawer.varianceThreshold.value || 100)) return 'warn'
  return 'danger'
})

// Shift summary computeds
const completedTransactions = computed(() =>
  shiftTransactions.value.filter(t => t.status === 'completed')
)

const voidedTransactions = computed(() =>
  shiftTransactions.value.filter(t => t.status === 'voided')
)

const totalSales = computed(() =>
  completedTransactions.value.reduce((sum, t) => sum + t.total_amount, 0)
)

const totalDiscounts = computed(() =>
  completedTransactions.value.reduce((sum, t) => sum + t.discount_total, 0)
)

const totalVat = computed(() =>
  completedTransactions.value.reduce((sum, t) => sum + t.vat_amount, 0)
)

const voidedAmount = computed(() =>
  voidedTransactions.value.reduce((sum, t) => sum + t.total_amount, 0)
)

const breakdown = computed(() => drawer.expectedCashBreakdown.value)

// Reset form when dialog opens
watch(() => props.visible, async (visible) => {
  if (visible) {
    cashAmount.value = 0
    varianceReason.value = ''
    errorMessage.value = ''
    isSubmitting.value = false
    shiftTransactions.value = []

    if (props.mode === 'end') {
      await drawer.refreshExpectedCash()
      await loadShiftSummary()
    }
  }
})

async function loadShiftSummary() {
  const shiftId = shift.currentShift.value?.id
  if (!shiftId) return

  isLoadingSummary.value = true
  try {
    shiftTransactions.value = await transactionRepository.findByShift(shiftId)
  } catch {
    shiftTransactions.value = []
  } finally {
    isLoadingSummary.value = false
  }
}

function fmt(n: number): string {
  return vatService.formatCurrency(n)
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

// Start Shift
async function handleStartShift() {
  if (cashAmount.value <= 0) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const openingCash = cashAmount.value
    const result = await shift.startShift(openingCash)

    if (!result.success) {
      errorMessage.value = result.error || 'Failed to start shift'
      return
    }

    const shiftId = shift.currentShift.value?.id
    const userId = authStore.currentUser?.id
    const terminalId = authStore.terminalId || 'POS-001'

    if (shiftId && userId) {
      const denominations = [{ denomination: 1, quantity: openingCash, subtotal: openingCash }]
      const drawerResult = await drawer.startShift(shiftId, userId, terminalId, denominations)

      if (!drawerResult.success) {
        errorMessage.value = drawerResult.error || 'Failed to open cash drawer'
        return
      }
    }

    dialogVisible.value = false
    emit('shift-started')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// End Shift
async function handleEndShift() {
  if (cashAmount.value <= 0) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const closingCash = cashAmount.value
    const denominations = [{ denomination: 1, quantity: closingCash, subtotal: closingCash }]
    const reason = showVarianceReason.value ? varianceReason.value : undefined

    const drawerResult = await drawer.endShift(denominations, reason)
    if (!drawerResult.success) {
      errorMessage.value = drawerResult.error || 'Failed to close drawer'
      return
    }

    const shiftResult = await shift.closeShift(closingCash, reason)
    if (!shiftResult.success) {
      errorMessage.value = shiftResult.error || 'Failed to close shift'
      return
    }

    dialogVisible.value = false
    emit('shift-ended')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

// Supervisor override
function handleCloseWithoutCount() {
  showSupervisorAuth.value = true
}

async function handleSupervisorAuthorized(supervisorId: string) {
  showSupervisorAuth.value = false
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const result = await shift.forceCloseShift(supervisorId)
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to force close shift'
      return
    }

    dialogVisible.value = false
    emit('shift-ended')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}

async function handleXReading() {
  const shiftId = shift.currentShift.value?.id
  const cashierId = authStore.currentUser?.id
  if (!shiftId || !cashierId) return

  isGeneratingReading.value = true
  readingError.value = ''
  xReadingResult.value = null

  try {
    const result = await reports.generateXReading(shiftId, cashierId)
    if (result) {
      xReadingResult.value = result
      showXReadingDialog.value = true
    } else {
      readingError.value = reports.error.value || 'Failed to generate X-Reading'
    }
  } catch (err) {
    readingError.value = err instanceof Error ? err.message : 'Failed to generate X-Reading'
  } finally {
    isGeneratingReading.value = false
  }
}

function handleZReading() {
  readingError.value = ''
  showZReadingConfirm.value = true
}

async function confirmZReading() {
  showZReadingConfirm.value = false
  const supervisorId = authStore.currentUser?.id
  if (!supervisorId) return

  isGeneratingReading.value = true
  readingError.value = ''
  zReadingResult.value = null

  try {
    const result = await reports.generateZReading(supervisorId)
    if (result.success && result.zReading) {
      zReadingResult.value = result.zReading
      showZReadingDialog.value = true
    } else {
      readingError.value = result.error || 'Failed to generate Z-Reading'
    }
  } catch (err) {
    readingError.value = err instanceof Error ? err.message : 'Failed to generate Z-Reading'
  } finally {
    isGeneratingReading.value = false
  }
}

function handleConfirm() {
  if (props.mode === 'start') handleStartShift()
  else handleEndShift()
}

function handlePrint() {
  window.print()
}

function handleCancel() {
  dialogVisible.value = false
}
</script>

<template>
  <!-- START SHIFT: full-screen dialog -->
  <Dialog
    v-if="mode === 'start'"
    v-model:visible="dialogVisible"
    modal
    :closable="!isSubmitting"
    :dismissable-mask="false"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200); background: var(--p-primary-color)' } }"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <i class="pi pi-sign-in text-lg text-white"></i>
        </div>
        <div>
          <h2 class="text-lg font-bold text-white m-0">Start Shift</h2>
          <p class="text-xs text-white/70 m-0">Enter opening cash to begin</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- LEFT COLUMN: Shift Info -->
          <div class="flex flex-col gap-4">
            <!-- CASHIER & TERMINAL INFO -->
            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div class="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <h3 class="text-sm font-semibold text-neutral-600 m-0 uppercase tracking-wide">
                  <i class="pi pi-user mr-2"></i>Shift Information
                </h3>
              </div>
              <div class="divide-y divide-neutral-100">
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Cashier</span>
                  <span class="text-sm font-bold text-neutral-800">{{ authStore.currentUser?.fullName || 'Unknown' }}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Role</span>
                  <Tag :value="authStore.currentUser?.roles?.[0]?.name || 'Cashier'" severity="info" class="!text-xs capitalize" />
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Terminal</span>
                  <span class="text-sm font-semibold text-neutral-800">{{ authStore.terminalId || 'POS-001' }}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Date</span>
                  <span class="text-sm font-semibold text-neutral-800">{{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Time</span>
                  <span class="text-sm font-semibold text-neutral-800">{{ new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
              </div>
            </div>

            <!-- REMINDERS -->
            <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 class="text-sm font-semibold text-blue-700 m-0 mb-3">
                <i class="pi pi-info-circle mr-2"></i>Reminders
              </h3>
              <ul class="m-0 pl-5 flex flex-col gap-2 text-sm text-blue-600">
                <li>Count the physical cash in the drawer before entering the amount</li>
                <li>Verify all bills and coins are accounted for</li>
                <li>Report any discrepancies to your supervisor</li>
                <li>Ensure the receipt printer is ready</li>
              </ul>
            </div>
          </div>

          <!-- RIGHT COLUMN: Opening Cash Input -->
          <div class="flex flex-col gap-4">
            <!-- CASH TOTAL DISPLAY -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-2">
                Opening Cash Amount
              </label>
              <div class="rounded-xl bg-neutral-100 border-2 border-neutral-200 px-4 py-3 text-center">
                <span class="text-3xl font-extrabold tabular-nums text-neutral-900">{{ fmt(cashAmount) }}</span>
              </div>
            </div>

            <!-- DENOMINATION BUTTONS -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-3">
                Tap to Add Cash
              </label>
              <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  v-for="denom in denominations"
                  :key="denom.value"
                  @click="addDenomination(denom.value)"
                  :disabled="isSubmitting"
                  class="h-14 rounded-xl bg-neutral-100 text-neutral-700 text-base font-bold hover:bg-neutral-200 active:scale-95 active:bg-neutral-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {{ denom.label }}
                </button>
                <button
                  @click="clearCashAmount"
                  :disabled="isSubmitting"
                  class="h-14 rounded-xl bg-red-50 text-red-600 text-base font-bold hover:bg-red-100 active:scale-95 active:bg-red-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- MANUAL OVERRIDE -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-2">
                Or enter manually
              </label>
              <InputNumber
                v-model="cashAmount"
                :min="0"
                :min-fraction-digits="2"
                :max-fraction-digits="2"
                mode="currency"
                currency="PHP"
                locale="en-PH"
                placeholder="0.00"
                :disabled="isSubmitting"
                class="w-full"
                :pt="{ input: { class: 'w-full text-sm' } }"
                @keydown.enter="handleConfirm"
              />
            </div>

            <!-- ERROR -->
            <div v-if="errorMessage" class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <i class="pi pi-exclamation-triangle text-red-500 shrink-0"></i>
              {{ errorMessage }}
            </div>
          </div>

        </div>
      </div>

      <!-- BOTTOM BAR -->
      <div class="shrink-0 px-4 py-3 border-t border-neutral-200 bg-white flex items-center gap-3 max-w-5xl mx-auto w-full">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="handleCancel"
          class="flex-1 !h-14 !text-base !font-bold"
        />
        <Button
          label="Start Shift"
          icon="pi pi-sign-in"
          :loading="isSubmitting"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
          class="flex-1 !h-14 !text-base !font-bold"
        />
      </div>
    </div>
  </Dialog>

  <!-- END SHIFT: full-screen dialog -->
  <Dialog
    v-else
    v-model:visible="dialogVisible"
    modal
    :closable="!isSubmitting"
    :dismissable-mask="false"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200); background: var(--p-red-600)' } }"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <i class="pi pi-sign-out text-lg text-white"></i>
        </div>
        <div>
          <h2 class="text-lg font-bold text-white m-0">End Shift</h2>
          <p class="text-xs text-white/70 m-0">
            {{ shift.currentShift.value?.userName || 'Cashier' }}
            &middot; Started {{ shift.currentShift.value ? fmtTime(shift.currentShift.value.startedAt) : '' }}
            &middot; {{ shift.shiftDuration.value }}
          </p>
        </div>
      </div>
    </template>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- LEFT COLUMN: Summary Info -->
          <div class="flex flex-col gap-4">
            <!-- SHIFT SUMMARY SECTION -->
            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div class="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <h3 class="text-sm font-semibold text-neutral-600 m-0 uppercase tracking-wide">
                  <i class="pi pi-chart-bar mr-2"></i>Shift Summary
                </h3>
              </div>
              <div class="divide-y divide-neutral-100">
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Transactions</span>
                  <span class="text-sm font-bold text-neutral-800">{{ completedTransactions.length }}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Total Sales</span>
                  <span class="text-sm font-bold text-neutral-800 tabular-nums">{{ fmt(totalSales) }}</span>
                </div>
                <div v-if="totalDiscounts > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Total Discounts</span>
                  <span class="text-sm font-semibold text-emerald-600 tabular-nums">-{{ fmt(totalDiscounts) }}</span>
                </div>
                <div v-if="totalVat > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Total VAT</span>
                  <span class="text-sm text-neutral-600 tabular-nums">{{ fmt(totalVat) }}</span>
                </div>
                <div v-if="voidedTransactions.length > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-red-500">Voided ({{ voidedTransactions.length }})</span>
                  <span class="text-sm font-semibold text-red-500 tabular-nums">{{ fmt(voidedAmount) }}</span>
                </div>
              </div>
            </div>

            <!-- CASH DRAWER BREAKDOWN -->
            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div class="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <h3 class="text-sm font-semibold text-neutral-600 m-0 uppercase tracking-wide">
                  <i class="pi pi-money-bill mr-2"></i>Cash Drawer Breakdown
                </h3>
              </div>
              <div class="divide-y divide-neutral-100">
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Opening Cash</span>
                  <span class="text-sm font-semibold text-neutral-800 tabular-nums">{{ fmt(breakdown?.openingAmount || shift.openingCash.value) }}</span>
                </div>
                <div class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Cash Sales</span>
                  <span class="text-sm font-semibold text-green-600 tabular-nums">+{{ fmt(breakdown?.cashSales || 0) }}</span>
                </div>
                <div v-if="(breakdown?.cashRefunds || 0) > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Cash Refunds</span>
                  <span class="text-sm font-semibold text-red-500 tabular-nums">-{{ fmt(breakdown?.cashRefunds || 0) }}</span>
                </div>
                <div v-if="drawer.totalPaidIns.value > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Cash Paid In</span>
                  <span class="text-sm font-semibold text-green-600 tabular-nums">+{{ fmt(drawer.totalPaidIns.value) }}</span>
                </div>
                <div v-if="drawer.totalDrops.value > 0" class="flex justify-between px-4 py-3">
                  <span class="text-sm text-neutral-500">Cash Drops</span>
                  <span class="text-sm font-semibold text-red-500 tabular-nums">-{{ fmt(drawer.totalDrops.value) }}</span>
                </div>
                <div class="flex justify-between px-4 py-3.5 bg-neutral-50">
                  <span class="text-sm font-bold text-neutral-700">Expected in Drawer</span>
                  <span class="text-base font-extrabold text-neutral-900 tabular-nums">{{ fmt(expectedCash) }}</span>
                </div>
              </div>
            </div>

            <!-- QUICK ACTIONS -->
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <Button
                  label="X-Reading"
                  icon="pi pi-file"
                  severity="secondary"
                  outlined
                  class="flex-1 !h-12"
                  :loading="isGeneratingReading"
                  @click="handleXReading"
                />
                <Button
                  label="Z-Reading"
                  icon="pi pi-file-export"
                  severity="secondary"
                  outlined
                  class="flex-1 !h-12"
                  :loading="isGeneratingReading"
                  @click="handleZReading"
                />
              </div>
              <div v-if="readingError" class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <i class="pi pi-exclamation-triangle text-red-500 shrink-0"></i>
                {{ readingError }}
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Closing Cash & Variance -->
          <div class="flex flex-col gap-4">
            <!-- CASH TOTAL DISPLAY -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-2">
                Closing Cash Count
              </label>
              <div class="rounded-xl bg-neutral-100 border-2 border-neutral-200 px-4 py-3 text-center">
                <span class="text-3xl font-extrabold tabular-nums text-neutral-900">{{ fmt(cashAmount) }}</span>
              </div>

              <!-- Variance display -->
              <div v-if="cashAmount > 0" class="mt-3 rounded-lg p-3"
                   :class="{
                     'bg-green-50 border border-green-200': varianceSeverity === 'success',
                     'bg-amber-50 border border-amber-200': varianceSeverity === 'warn',
                     'bg-red-50 border border-red-200': varianceSeverity === 'danger'
                   }">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium"
                        :class="{
                          'text-green-700': varianceSeverity === 'success',
                          'text-amber-700': varianceSeverity === 'warn',
                          'text-red-700': varianceSeverity === 'danger'
                        }">
                    Variance
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-bold tabular-nums"
                          :class="{
                            'text-green-700': varianceSeverity === 'success',
                            'text-amber-700': varianceSeverity === 'warn',
                            'text-red-700': varianceSeverity === 'danger'
                          }">
                      {{ variance >= 0 ? '+' : '' }}{{ fmt(variance) }}
                    </span>
                    <Tag
                      v-if="varianceSeverity === 'success'"
                      value="OK"
                      severity="success"
                      class="!text-xs"
                    />
                    <Tag
                      v-else-if="varianceSeverity === 'warn'"
                      value="Warning"
                      severity="warn"
                      class="!text-xs"
                    />
                    <Tag
                      v-else
                      :value="variance > 0 ? 'Over' : 'Short'"
                      severity="danger"
                      class="!text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- DENOMINATION BUTTONS -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-3">
                Tap to Add Cash
              </label>
              <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  v-for="denom in denominations"
                  :key="denom.value"
                  @click="addDenomination(denom.value)"
                  :disabled="isSubmitting"
                  class="h-14 rounded-xl bg-neutral-100 text-neutral-700 text-base font-bold hover:bg-neutral-200 active:scale-95 active:bg-neutral-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {{ denom.label }}
                </button>
                <button
                  @click="clearCashAmount"
                  :disabled="isSubmitting"
                  class="h-14 rounded-xl bg-red-50 text-red-600 text-base font-bold hover:bg-red-100 active:scale-95 active:bg-red-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- MANUAL OVERRIDE -->
            <div class="rounded-xl border border-neutral-200 bg-white p-4">
              <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-2">
                Or enter manually
              </label>
              <InputNumber
                v-model="cashAmount"
                :min="0"
                :min-fraction-digits="2"
                :max-fraction-digits="2"
                mode="currency"
                currency="PHP"
                locale="en-PH"
                placeholder="0.00"
                :disabled="isSubmitting"
                class="w-full"
                :pt="{ input: { class: 'w-full text-sm' } }"
                @keydown.enter="handleConfirm"
              />
            </div>

            <!-- VARIANCE REASON -->
            <div v-if="showVarianceReason" class="rounded-xl border border-red-200 bg-red-50 p-4">
              <label class="text-xs font-semibold text-red-600 uppercase tracking-wide block mb-2">
                Variance Reason <span class="text-red-500">*</span>
              </label>
              <Textarea
                v-model="varianceReason"
                rows="3"
                placeholder="Explain the reason for the variance..."
                :disabled="isSubmitting"
                class="w-full"
              />
            </div>

            <!-- ERROR -->
            <div v-if="errorMessage" class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <i class="pi pi-exclamation-triangle text-red-500 shrink-0"></i>
              {{ errorMessage }}
            </div>
          </div>

        </div>
      </div>

      <!-- BOTTOM BAR -->
      <div class="shrink-0 px-4 py-3 border-t border-neutral-200 bg-white flex items-center gap-3 max-w-5xl mx-auto w-full">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="handleCancel"
          class="flex-1 !h-14 !text-base !font-bold"
        />
        <Button
          label="Close Without Count"
          severity="warn"
          text
          :disabled="isSubmitting"
          @click="handleCloseWithoutCount"
          class="!h-14"
        />
        <Button
          label="End Shift"
          icon="pi pi-sign-out"
          severity="danger"
          :loading="isSubmitting"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
          class="flex-1 !h-14 !text-base !font-bold"
        />
      </div>
    </div>
  </Dialog>

  <!-- X-Reading Dialog -->
  <Dialog
    v-model:visible="showXReadingDialog"
    modal
    :dismissable-mask="true"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200); background: var(--p-primary-color)' } }"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <i class="pi pi-file text-lg text-white"></i>
        </div>
        <div>
          <h2 class="text-lg font-bold text-white m-0">X-Reading</h2>
          <p class="text-xs text-white/70 m-0">Interim shift reading</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="max-w-3xl mx-auto">
          <XReadingDisplay v-if="xReadingResult" :reading="xReadingResult" />
        </div>
      </div>
      <div class="shrink-0 px-4 py-3 border-t border-neutral-200 bg-white flex items-center gap-3 max-w-3xl mx-auto w-full">
        <Button
          label="Close"
          severity="secondary"
          outlined
          @click="showXReadingDialog = false"
          class="flex-1 !h-14 !text-base !font-bold"
        />
        <Button
          label="Print"
          icon="pi pi-print"
          @click="handlePrint"
          class="flex-1 !h-14 !text-base !font-bold"
        />
      </div>
    </div>
  </Dialog>

  <!-- Z-Reading Dialog -->
  <Dialog
    v-model:visible="showZReadingDialog"
    modal
    :dismissable-mask="true"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200); background: var(--p-orange-600)' } }"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <i class="pi pi-file-export text-lg text-white"></i>
        </div>
        <div>
          <h2 class="text-lg font-bold text-white m-0">Z-Reading</h2>
          <p class="text-xs text-white/70 m-0">End-of-day closing report</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="max-w-3xl mx-auto">
          <ZReadingDisplay v-if="zReadingResult" :reading="zReadingResult" />
        </div>
      </div>
      <div class="shrink-0 px-4 py-3 border-t border-neutral-200 bg-white flex items-center gap-3 max-w-3xl mx-auto w-full">
        <Button
          label="Close"
          severity="secondary"
          outlined
          @click="showZReadingDialog = false"
          class="flex-1 !h-14 !text-base !font-bold"
        />
        <Button
          label="Print"
          icon="pi pi-print"
          @click="handlePrint"
          class="flex-1 !h-14 !text-base !font-bold"
        />
      </div>
    </div>
  </Dialog>

  <!-- Z-Reading Confirmation -->
  <Dialog
    v-model:visible="showZReadingConfirm"
    modal
    :closable="true"
    :style="{ width: '28rem' }"
    :pt="{ header: { style: 'padding: 1rem 1.25rem 0.5rem; border: none' } }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <i class="pi pi-exclamation-triangle text-orange-600 text-lg"></i>
        </div>
        <h3 class="text-lg font-bold text-neutral-800 m-0">Generate Z-Reading?</h3>
      </div>
    </template>

    <div class="flex flex-col gap-3 px-1">
      <p class="text-sm text-neutral-700 m-0">
        This is an <strong>end-of-day closing report</strong> required by BIR. Please be aware:
      </p>
      <ul class="m-0 pl-5 flex flex-col gap-2 text-sm text-neutral-600">
        <li>The Z-Reading <strong>finalizes today's sales</strong> and cannot be undone</li>
        <li>The Z-counter will be permanently incremented</li>
        <li>Any transactions after this will be counted for the <strong>next business day</strong></li>
        <li>Only <strong>one Z-Reading per day</strong> is allowed</li>
      </ul>
      <div class="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mt-1">
        <i class="pi pi-info-circle shrink-0"></i>
        Make sure all transactions for today are completed before proceeding.
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2 w-full">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showZReadingConfirm = false"
          class="flex-1 !h-12"
        />
        <Button
          label="Generate Z-Reading"
          icon="pi pi-file-export"
          severity="warn"
          @click="confirmZReading"
          class="flex-1 !h-12"
        />
      </div>
    </template>
  </Dialog>

  <!-- Supervisor Auth for Close Without Count -->
  <SupervisorAuthDialog
    :visible="showSupervisorAuth"
    action="Close shift without cash count"
    required-permission="shift.force_close"
    @update:visible="showSupervisorAuth = $event"
    @authorized="handleSupervisorAuthorized"
    @cancelled="showSupervisorAuth = false"
  />
</template>
