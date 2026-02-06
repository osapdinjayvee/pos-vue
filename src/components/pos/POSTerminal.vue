<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import POSTransactionHeader from './POSTransactionHeader.vue'
import POSCartSummary from './POSCartSummary.vue'
import POSStoreHeader from './POSStoreHeader.vue'
import POSActionTiles from './POSActionTiles.vue'
import POSBarcodeInput from './POSBarcodeInput.vue'
import POSFooterBar from './POSFooterBar.vue'
import ProductBrowseDrawer from './ProductBrowseDrawer.vue'
import PaymentDialog from './PaymentDialog.vue'
import DiscountDialog from './DiscountDialog.vue'
import VoidDialog from './VoidDialog.vue'
import HoldRecallDialog from './HoldRecallDialog.vue'
import ReturnDialog from './ReturnDialog.vue'
import ManagerOverrideDialog from './ManagerOverrideDialog.vue'
import ShiftDialog from './ShiftDialog.vue'
import CustomerRegistration from '@/components/crm/CustomerRegistration.vue'
import { useCartStore } from '@/stores/cart'
import { useTransactionStore } from '@/stores/transaction'
import { useProductStore } from '@/stores/product'
import { useCashDrawerStore } from '@/stores/cashDrawer'
import { useAuthStore } from '@/stores/auth'
import { useShiftStore } from '@/stores/shift'
import { useORNumber } from '@/composables/useORNumber'
import { connectivityService } from '@/services/connectivityService'
import { vatService } from '@/services/vatService'
import { tierService } from '@/services/tierService'
import type { Product, ProductVariant } from '@/types'
import type { Customer } from '@/types/order'
import type { CartItem } from '@/types/transaction'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const cartStore = useCartStore()
const transactionStore = useTransactionStore()
const productStore = useProductStore()
const cashDrawerStore = useCashDrawerStore()
const authStore = useAuthStore()
const shiftStore = useShiftStore()
const { isSeriesExhausted, isSeriesCritical, requestServerAllocation, checkStatus } = useORNumber()

const { items, totals, isEmpty, hasDiscount, discount, customerId } = storeToRefs(cartStore)
const { isProcessing, lastORNumber, lastWarning } = storeToRefs(transactionStore)

// Dialog states
const showPaymentDialog = ref(false)
const showDiscountDialog = ref(false)
const showClearConfirm = ref(false)
const showSuccessDialog = ref(false)
const showVoidDialog = ref(false)
const showProductBrowse = ref(false)
const browseInitialQuery = ref('')
const showHoldRecall = ref(false)
const holdRecallMode = ref<'hold' | 'recall'>('hold')
const showReturn = ref(false)
const showManagerOverride = ref(false)
const managerOverrideSupervisorId = ref<string | null>(null)
let managerOverrideTimeout: number | null = null

// Shift dialog
const showShiftDialog = ref(false)
const shiftDialogMode = ref<'start' | 'end'>('start')

// Customer state
const selectedCustomer = ref<Customer | null>(null)
const showRegistration = ref(false)

// Cart highlight
const lastAddedItemId = ref<string | null>(null)
let highlightTimeout: number | null = null

// Component refs
const barcodeInputRef = ref<InstanceType<typeof POSBarcodeInput> | null>(null)

// Computed
const hasTransaction = computed(() => !isEmpty.value)

const posStatus = computed(() => {
  if (!connectivityService.isOnline.value) return 'OFFLINE'
  if (showPaymentDialog.value) return 'PAYMENT'
  if (showVoidDialog.value) return 'VOIDING'
  if (hasTransaction.value) return 'IN PROGRESS'
  return 'READY'
})

// Customer handlers
async function handleCustomerSelected(customer: Customer | null) {
  selectedCustomer.value = customer
  cartStore.setCustomer(customer?.id ?? null)
  await applyTierDiscount(customer)
}

async function handleCustomerRegistered(customer: Customer) {
  selectedCustomer.value = customer
  cartStore.setCustomer(customer.id)
  showRegistration.value = false
  await applyTierDiscount(customer)
}

async function applyTierDiscount(customer: Customer | null) {
  if (discount.value?.type === 'percentage' && discount.value?.code === 'tier_discount') {
    cartStore.removeDiscount()
  }
  if (!customer?.tier_id) return
  try {
    const tier = await tierService.getTierForCustomer(customer.id)
    if (tier && tier.discount_rate > 0 && !hasDiscount.value) {
      const pct = tier.discount_rate * 100
      cartStore.applyPercentageDiscount(pct, 'tier_discount')
    }
  } catch {
    // Non-blocking
  }
}

watch(customerId, (val) => {
  if (!val) selectedCustomer.value = null
})

// Barcode / product handling
function handleBarcodeInput(value: string) {
  const isBarcode = /^\d{8,13}$/.test(value.trim())
  if (isBarcode) {
    handleBarcodeScan(value.trim())
  } else {
    browseInitialQuery.value = value.trim()
    showProductBrowse.value = true
  }
}

async function handleBarcodeScan(barcode: string) {
  try {
    const result = await productStore.findByBarcode(barcode)
    if (result) {
      addToCart(result.product, result.variant)
      playBeep()
    } else {
      toast.add({ severity: 'warn', summary: 'Product Not Found', detail: `No product found with barcode: ${barcode}`, life: 3000 })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Lookup Error', detail: 'Failed to lookup barcode', life: 3000 })
  }
}

function addToCart(product: Product, variant?: ProductVariant) {
  cartStore.addItem(product, variant)

  const itemId = cartStore.items[cartStore.items.length - 1]?.id
  if (itemId) {
    lastAddedItemId.value = itemId
    if (highlightTimeout) clearTimeout(highlightTimeout)
    highlightTimeout = window.setTimeout(() => { lastAddedItemId.value = null }, 2000)
  }

  toast.add({
    severity: 'success',
    summary: 'Added to Cart',
    detail: variant ? `${product.name} - ${variant.name}` : product.name,
    life: 2000
  })
}

function handleProductSelectFromDrawer(product: Product, variant?: ProductVariant) {
  addToCart(product, variant)
  focusBarcodeInput()
}

function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 1000
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
  } catch {
    // Audio not supported
  }
}

// Cart item actions
function handleIncrement(item: CartItem) {
  cartStore.incrementItemQuantity(item.id)
}

function handleDecrement(item: CartItem) {
  if (item.quantity <= 1) {
    confirmRemoveItem(item)
  } else {
    cartStore.decrementItemQuantity(item.id)
  }
}

function confirmRemoveItem(item: CartItem) {
  confirm.require({
    message: `Remove "${item.productName}" from the cart?`,
    header: 'Remove Item',
    icon: 'pi pi-trash',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => cartStore.removeItem(item.id)
  })
}

function handleRemoveDiscount() {
  cartStore.removeDiscount()
}

// Action tile dispatcher
function handleActionTile(action: string) {
  switch (action) {
    case 'tender': handleCheckout(); break
    case 'discount': handleApplyDiscount(); break
    case 'browse':
      browseInitialQuery.value = ''
      showProductBrowse.value = true
      break
    case 'hold':
      holdRecallMode.value = 'hold'
      showHoldRecall.value = true
      break
    case 'recall':
      holdRecallMode.value = 'recall'
      showHoldRecall.value = true
      break
    case 'void': showVoidDialog.value = true; break
    case 'price-check':
      browseInitialQuery.value = ''
      showProductBrowse.value = true
      break
    case 'return':
      showReturn.value = true
      break
    case 'cash-drawer':
      router.push('/cash-variance')
      break
    case 'x-read':
      router.push('/reports/x-reading')
      break
    case 'z-read':
      router.push('/reports/z-reading')
      break
    case 'manager-override':
      showManagerOverride.value = true
      break
    case 'end-shift':
      handleEndShift()
      break
    case 'start-shift':
      handleStartShift()
      break
    case 'clear-cart': handleClearCart(); break
    case 'reprint': handlePrintReceipt(); break
    case 'calculator':
      toast.add({ severity: 'info', summary: 'Coming Soon', detail: 'Calculator feature is coming soon', life: 3000 })
      break
  }
}

// Cart actions
function handleCheckout() {
  if (isEmpty.value) return
  showPaymentDialog.value = true
}

function handleApplyDiscount() {
  if (isEmpty.value) return
  showDiscountDialog.value = true
}

function handleClearCart() {
  showClearConfirm.value = true
}

function confirmClearCart() {
  cartStore.clearCart()
  showClearConfirm.value = false
  toast.add({ severity: 'info', summary: 'Cart Cleared', detail: 'All items have been removed', life: 2000 })
}

// OR availability check
async function checkORAvailability(): Promise<boolean> {
  const status = await checkStatus()
  if (!status.hasActiveSeries) {
    return await showORExhaustionDialog()
  }
  return true
}

function showORExhaustionDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    confirm.require({
      message: 'OR number range exhausted. Please connect to the server to allocate a new range.',
      header: 'OR Number Unavailable',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Retry',
      rejectLabel: 'Cancel',
      acceptClass: 'p-button-warning',
      accept: async () => {
        if (connectivityService.isOnline.value) {
          toast.add({ severity: 'info', summary: 'Requesting new OR range...', life: 2000 })
          const allocation = await requestServerAllocation()
          if (allocation) {
            toast.add({ severity: 'success', summary: 'New OR range allocated', life: 3000 })
            resolve(true)
            return
          }
        }
        toast.add({ severity: 'error', summary: 'Allocation Failed', detail: 'Could not allocate a new OR range.', life: 5000 })
        resolve(false)
      },
      reject: () => resolve(false)
    })
  })
}

// Payment handling
async function handlePaymentComplete(payments: any[]) {
  if (!cashDrawerStore.hasOpenSession) {
    toast.add({ severity: 'warn', summary: 'Opening Count Required', detail: 'Please complete the opening count first.', life: 5000 })
    return
  }

  showPaymentDialog.value = false

  const hadCustomer = !!cartStore.customerId
  const cartTotal = cartStore.totals.grandTotal

  const result = await transactionStore.processTransaction(payments)

  if (result.success) {
    showSuccessDialog.value = true

    if (hadCustomer && cartTotal > 0) {
      const pointsEarned = Math.floor(cartTotal * 0.01)
      if (pointsEarned > 0) {
        toast.add({ severity: 'success', summary: 'Loyalty Points Earned', detail: `Customer earned ${pointsEarned} loyalty point${pointsEarned !== 1 ? 's' : ''}`, life: 4000 })
      }
    }

    if (result.warning) {
      toast.add({ severity: 'warn', summary: 'OR Series Warning', detail: result.warning, life: 5000 })
    }
  } else {
    const orError = result.error || ''
    if (orError.includes('No active OR series') || orError.includes('OR series exhausted')) {
      const canProceed = await showORExhaustionDialog()
      if (canProceed) showPaymentDialog.value = true
    } else {
      toast.add({ severity: 'error', summary: 'Transaction Failed', detail: result.error || 'Unknown error', life: 5000 })
    }
  }
}

function handleDiscountApplied() {
  showDiscountDialog.value = false
  toast.add({ severity: 'success', summary: 'Discount Applied', life: 2000 })
}

function handleVoided() {
  showVoidDialog.value = false
  toast.add({ severity: 'success', summary: 'Transaction Voided', life: 3000 })
}

async function handlePrintReceipt() {
  const result = await transactionStore.printLastReceipt()
  if (!result.success) {
    toast.add({ severity: 'error', summary: 'Print Error', detail: result.error, life: 3000 })
  }
}

function handleNewTransaction() {
  showSuccessDialog.value = false
  focusBarcodeInput()
}

// Hold/Recall handlers
function handleHeld() {
  toast.add({ severity: 'success', summary: 'Transaction Held', detail: 'Transaction has been suspended', life: 2000 })
  focusBarcodeInput()
}

function handleRecalled() {
  toast.add({ severity: 'success', summary: 'Transaction Recalled', detail: 'Held transaction has been restored', life: 2000 })
  focusBarcodeInput()
}

// Return handler
function handleReturnProcessed() {
  showReturn.value = false
  toast.add({ severity: 'success', summary: 'Return Items Added', detail: 'Return items added to cart. Proceed to tender to complete the refund.', life: 4000 })
  focusBarcodeInput()
}

// Manager override handler
function handleManagerAuthorized(supervisorId: string) {
  managerOverrideSupervisorId.value = supervisorId
  toast.add({ severity: 'success', summary: 'Manager Override Granted', detail: 'Elevated permissions active for 5 minutes', life: 3000 })

  // Auto-clear after 5 minutes
  if (managerOverrideTimeout) clearTimeout(managerOverrideTimeout)
  managerOverrideTimeout = window.setTimeout(() => {
    managerOverrideSupervisorId.value = null
    toast.add({ severity: 'info', summary: 'Override Expired', detail: 'Manager override has expired', life: 3000 })
  }, 5 * 60 * 1000)
}

// Start shift handler
function handleStartShift() {
  shiftDialogMode.value = 'start'
  showShiftDialog.value = true
}

// End shift handler
function handleEndShift() {
  if (!isEmpty.value) {
    confirm.require({
      message: 'You have items in the cart. Ending your shift will clear the cart. Continue?',
      header: 'End Shift',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Continue',
      rejectLabel: 'Cancel',
      acceptClass: 'p-button-danger',
      accept: () => {
        cartStore.clearCart()
        shiftDialogMode.value = 'end'
        showShiftDialog.value = true
      }
    })
  } else {
    shiftDialogMode.value = 'end'
    showShiftDialog.value = true
  }
}

function handleShiftStarted() {
  toast.add({ severity: 'success', summary: 'Shift Started', detail: 'Your shift has been started and the drawer is open', life: 3000 })
  focusBarcodeInput()
}

function handleShiftEnded() {
  toast.add({ severity: 'success', summary: 'Shift Ended', detail: 'Your shift has been closed', life: 3000 })
  router.push('/')
}

function focusBarcodeInput() {
  barcodeInputRef.value?.focus()
}

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function rowHighlightClass(data: CartItem): string | undefined {
  return data.id === lastAddedItemId.value ? 'pos-row-highlight' : undefined
}

const discountLabel = computed(() => {
  if (!discount.value) return ''
  if (discount.value.type === 'senior_citizen') return 'Senior Citizen (20%)'
  if (discount.value.type === 'pwd') return 'PWD (20%)'
  if (discount.value.percentage) return `${discount.value.percentage}% off`
  return 'Discount'
})

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'F2') { event.preventDefault(); focusBarcodeInput() }
  if (event.key === 'F4') { event.preventDefault(); browseInitialQuery.value = ''; showProductBrowse.value = true }
  if (event.key === 'F5') { event.preventDefault(); handleCheckout() }
  if (event.key === 'F6') { event.preventDefault(); handleApplyDiscount() }
  if (event.key === 'F9') { event.preventDefault(); handleCheckout() }
  if (event.key === 'Escape') { event.preventDefault(); if (showProductBrowse.value) showProductBrowse.value = false }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  focusBarcodeInput()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (highlightTimeout) clearTimeout(highlightTimeout)
  if (managerOverrideTimeout) clearTimeout(managerOverrideTimeout)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-neutral-100 overflow-hidden">
    <Toast />
    <ConfirmDialog />

    <!-- MAIN 50/50 GRID -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">

      <!-- LEFT COLUMN: Transaction + Cart + Totals -->
      <div class="flex flex-col overflow-hidden bg-white border-r border-neutral-200">
        <!-- Row 1: Transaction No + Customer Name -->
        <POSTransactionHeader
          :cashierName="transactionStore.cashierName || '—'"
          :transactionNumber="lastORNumber || '—'"
          :customerName="selectedCustomer?.name || 'Walk-in'"
          @add-customer="showRegistration = true"
        />

        <!-- Cart DataTable (scrollable) -->
        <div class="flex-1 min-h-0 flex flex-col">
          <DataTable
            v-if="hasTransaction"
            :value="items"
            scrollable
            scrollHeight="flex"
            :rowClass="rowHighlightClass"
            size="small"
            class="pos-datatable flex-1"
          >
            <Column header="#" :style="{ width: '3rem', textAlign: 'center' }">
              <template #body="{ index }">
                <span class="text-xs text-neutral-400 font-medium">{{ index + 1 }}</span>
              </template>
            </Column>
            <Column header="Qty" :style="{ width: '7.5rem' }">
              <template #body="{ data }">
                <div class="inline-flex items-center bg-neutral-100 rounded-lg overflow-hidden" @click.stop>
                  <button
                    class="flex items-center justify-center w-7 h-7 border-none bg-transparent cursor-pointer text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 transition-colors"
                    @click="handleDecrement(data)"
                  >
                    <i class="pi pi-minus text-[10px]"></i>
                  </button>
                  <span class="min-w-[1.75rem] text-center font-bold text-sm text-neutral-900">{{ data.quantity }}</span>
                  <button
                    class="flex items-center justify-center w-7 h-7 border-none bg-transparent cursor-pointer text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 transition-colors"
                    @click="handleIncrement(data)"
                  >
                    <i class="pi pi-plus text-[10px]"></i>
                  </button>
                </div>
              </template>
            </Column>
            <Column header="Item" field="productName">
              <template #body="{ data }">
                <div>
                  <div class="font-semibold text-sm text-neutral-900">{{ data.productName }}</div>
                  <div v-if="data.variantName" class="text-xs text-neutral-500 mt-px">{{ data.variantName }}</div>
                </div>
              </template>
            </Column>
            <Column header="Price" :style="{ width: '7rem', textAlign: 'right' }">
              <template #body="{ data }">
                <span class="text-neutral-500 text-sm">{{ formatCurrency(data.unitPrice) }}</span>
              </template>
            </Column>
            <Column header="Total" :style="{ width: '8rem', textAlign: 'right' }">
              <template #body="{ data }">
                <span class="font-bold text-sm text-neutral-900">{{ formatCurrency(data.lineTotal) }}</span>
              </template>
            </Column>
            <Column :style="{ width: '3rem', textAlign: 'center' }">
              <template #body="{ data }">
                <button
                  class="flex items-center justify-center w-7 h-7 rounded-full border-none bg-transparent text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                  @click.stop="confirmRemoveItem(data)"
                >
                  <i class="pi pi-trash text-xs"></i>
                </button>
              </template>
            </Column>
          </DataTable>

          <!-- Empty state -->
          <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div class="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
              <i class="pi pi-shopping-cart text-3xl text-neutral-400"></i>
            </div>
            <p class="text-lg font-semibold text-neutral-500 m-0 mb-2">No Items</p>
            <p class="text-sm text-neutral-400 m-0">
              Scan a barcode or press
              <kbd class="bg-neutral-200 border border-neutral-300 rounded px-1 font-mono text-xs">F4</kbd>
              to browse products
            </p>
          </div>
        </div>

        <!-- Discount banner -->
        <div v-if="hasDiscount" class="flex items-center gap-2 px-4 py-2 bg-green-50 border-t border-green-200 text-green-700 text-sm">
          <i class="pi pi-tag"></i>
          <span class="font-medium">{{ discountLabel }}</span>
          <span v-if="discount?.idNumber" class="text-xs"> &mdash; ID: {{ discount.idNumber }}</span>
          <Button icon="pi pi-times" text rounded size="small" class="!ml-auto" @click="handleRemoveDiscount" />
        </div>

        <!-- Summary -->
        <POSCartSummary />
      </div>

      <!-- RIGHT COLUMN: Store Header + Actions + Barcode -->
      <div class="flex flex-col overflow-hidden bg-neutral-50">
        <!-- Store Header -->
        <POSStoreHeader
          :hasTransaction="hasTransaction"
          :grandTotal="totals.grandTotal"
          :subtotal="totals.subtotal"
          :discountTotal="totals.discountTotal"
          storeName="POS Terminal"
          address="123 Main Street, Brgy. Sample, City, Philippines"
          :terminalId="authStore.terminalId"
        />

        <!-- Action Tiles Grid -->
        <POSActionTiles
          :hasTransaction="hasTransaction"
          :hasDiscount="hasDiscount"
          :hasOpenShift="shiftStore.hasOpenShift"
          @action="handleActionTile"
        />

        <!-- Barcode Input (pinned bottom) -->
        <POSBarcodeInput
          ref="barcodeInputRef"
          :hasTransaction="hasTransaction"
          @scan="handleBarcodeInput"
          @browse="showProductBrowse = true"
          @action="handleActionTile"
        />
      </div>
    </div>

    <!-- FOOTER BAR -->
    <POSFooterBar
      :status="posStatus"
      :cashierName="transactionStore.cashierName"
      :terminalId="authStore.terminalId"
    />

    <!-- OVERLAYS -->
    <ProductBrowseDrawer
      :visible="showProductBrowse"
      :initialQuery="browseInitialQuery"
      @update:visible="showProductBrowse = $event"
      @select="handleProductSelectFromDrawer"
    />

    <PaymentDialog
      v-model:visible="showPaymentDialog"
      @complete="handlePaymentComplete"
      @cancel="showPaymentDialog = false"
    />

    <DiscountDialog
      v-model:visible="showDiscountDialog"
      @applied="handleDiscountApplied"
      @cancel="showDiscountDialog = false"
    />

    <VoidDialog
      :visible="showVoidDialog"
      :transaction="null"
      @update:visible="showVoidDialog = $event"
      @voided="handleVoided"
      @cancel="showVoidDialog = false"
    />

    <CustomerRegistration
      :visible="showRegistration"
      @update:visible="showRegistration = $event"
      @registered="handleCustomerRegistered"
    />

    <HoldRecallDialog
      :visible="showHoldRecall"
      :mode="holdRecallMode"
      @update:visible="showHoldRecall = $event"
      @held="handleHeld"
      @recalled="handleRecalled"
    />

    <ReturnDialog
      :visible="showReturn"
      @update:visible="showReturn = $event"
      @processed="handleReturnProcessed"
    />

    <ManagerOverrideDialog
      :visible="showManagerOverride"
      @update:visible="showManagerOverride = $event"
      @authorized="handleManagerAuthorized"
      @cancel="showManagerOverride = false"
    />

    <ShiftDialog
      :visible="showShiftDialog"
      :mode="shiftDialogMode"
      @update:visible="showShiftDialog = $event"
      @shift-started="handleShiftStarted"
      @shift-ended="handleShiftEnded"
    />

    <Dialog v-model:visible="showClearConfirm" header="Clear Cart" :modal="true" :closable="false" :style="{ width: '400px' }">
      <p>Are you sure you want to clear all items from the cart?</p>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showClearConfirm = false" />
        <Button label="Clear Cart" severity="danger" @click="confirmClearCart" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showSuccessDialog" header="Transaction Complete" :modal="true" :closable="false" :style="{ width: '450px' }">
      <div class="text-center py-4">
        <i class="pi pi-check-circle text-green-500 text-6xl mb-3"></i>
        <h3 class="mt-0 mb-2">Payment Successful!</h3>
        <p class="text-lg font-semibold">OR#: {{ lastORNumber }}</p>
        <p v-if="lastWarning" class="text-orange-500 text-sm mt-3">
          <i class="pi pi-exclamation-triangle mr-2"></i>{{ lastWarning }}
        </p>
      </div>
      <template #footer>
        <Button label="Print Receipt" icon="pi pi-print" severity="secondary" @click="handlePrintReceipt" />
        <Button label="New Transaction" icon="pi pi-plus" @click="handleNewTransaction" autofocus />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* DataTable deep overrides — can't be done with Tailwind */
:deep(.pos-datatable .p-datatable-table-container) {
  flex: 1;
}

:deep(.pos-datatable .p-datatable-header-cell) {
  background: rgb(245 245 245);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(115 115 115);
  padding: 0.625rem 0.75rem;
}

:deep(.pos-datatable .p-datatable-body-cell) {
  padding: 0.5rem 0.75rem;
  border-color: rgb(245 245 245);
}

/* Row flash highlight */
:deep(.pos-row-highlight) {
  animation: row-flash 2s ease-out;
}

@keyframes row-flash {
  0% { background-color: rgb(219 234 254); }
  100% { background-color: transparent; }
}
</style>
