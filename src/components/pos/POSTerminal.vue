<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import POSTransactionHeader from './POSTransactionHeader.vue'
import POSCartSummary from './POSCartSummary.vue'
import POSStoreHeader from './POSStoreHeader.vue'
import POSIdleDisplay from './POSIdleDisplay.vue'
import POSActionTiles from './POSActionTiles.vue'
import POSBarcodeInput from './POSBarcodeInput.vue'
import POSFooterBar from './POSFooterBar.vue'
import ProductBrowseDrawer from './ProductBrowseDrawer.vue'
import PaymentDialog from './PaymentDialog.vue'
import DiscountDialog from './DiscountDialog.vue'
import DiscountSelectionDialog from './DiscountSelectionDialog.vue'
import VoidDialog from './VoidDialog.vue'
import HoldRecallDialog from './HoldRecallDialog.vue'
import ReturnDialog from './ReturnDialog.vue'
import ManagerOverrideDialog from './ManagerOverrideDialog.vue'
import ShiftDialog from './ShiftDialog.vue'
import POSCustomerDialog from './POSCustomerDialog.vue'
import POSCalculator from './POSCalculator.vue'
import POSPriceCheck from './POSPriceCheck.vue'
import POSTransactionHistory from './POSTransactionHistory.vue'
import POSCashDrawerDialog from './POSCashDrawerDialog.vue'
import XReadingDisplay from '@/components/reports/XReadingDisplay.vue'
import ZReadingDisplay from '@/components/reports/ZReadingDisplay.vue'
import CashDrop from '@/components/cash-drawer/CashDrop.vue'
import CashPaidIn from '@/components/cash-drawer/CashPaidIn.vue'
import { useCartStore } from '@/stores/cart'
import { useTransactionStore } from '@/stores/transaction'
import { useProductStore } from '@/stores/product'
import { useCashDrawerStore } from '@/stores/cashDrawer'
import { useAuthStore } from '@/stores/auth'
import { useShiftStore } from '@/stores/shift'
import { useSettingsStore } from '@/stores/settings'
import { useShift } from '@/composables/useShift'
import { useCashDrawer } from '@/composables/useCashDrawer'
import { drawerHardwareService } from '@/services/drawerHardwareService'
import { useORNumber } from '@/composables/useORNumber'
import { useReports } from '@/composables/useReports'
import { connectivityService } from '@/services/connectivityService'
import { vatService } from '@/services/vatService'
import { discountManagementService } from '@/services/discountManagementService'
import { tierService } from '@/services/tierService'
import type { Product, ProductVariant } from '@/types'
import type { Customer } from '@/types/order'
import type { CartItem } from '@/types/transaction'
import type { EligibleDiscount } from '@/types/discount'
import type { DisplayXReading } from '@/types/xReading'
import type { DisplayZReading } from '@/types/zReading'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const cartStore = useCartStore()
const transactionStore = useTransactionStore()
const productStore = useProductStore()
const cashDrawerStore = useCashDrawerStore()
const authStore = useAuthStore()
const shiftStore = useShiftStore()
const settingsStore = useSettingsStore()
const { currentShift } = useShift()
const { isSeriesExhausted, isSeriesCritical, requestServerAllocation, checkStatus } = useORNumber()
const reports = useReports()

const { items, totals, isEmpty, hasDiscount, discount, customerId } = storeToRefs(cartStore)
const { isProcessing, lastORNumber, lastWarning } = storeToRefs(transactionStore)

// Item detail dialog
const showItemDetail = ref(false)
const selectedItem = ref<CartItem | null>(null)
const editQty = ref(1)

function openItemDetail(item: CartItem) {
  selectedItem.value = item
  editQty.value = item.quantity
  showItemDetail.value = true
}

async function applyItemQty() {
  if (!selectedItem.value) return
  if (editQty.value < 1) editQty.value = 1

  // Check stock before applying new quantity
  const item = selectedItem.value
  const product = await productStore.fetchById(item.productId)
  if (product && editQty.value > product.stock) {
    showOutOfStockDialog(`Only ${product.stock} unit(s) of "${item.productName}" available.`)
    editQty.value = product.stock > 0 ? product.stock : 1
    return
  }

  cartStore.updateItemQuantity(selectedItem.value.id, editQty.value)
  showItemDetail.value = false
}

function removeSelectedItem() {
  if (!selectedItem.value) return
  const item = selectedItem.value
  confirm.require({
    message: `Remove "${item.productName}" from the cart?`,
    header: 'Remove Item',
    icon: 'pi pi-trash',
    acceptLabel: 'Remove',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: () => {
      cartStore.removeItem(item.id)
      showItemDetail.value = false
    }
  })
}

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
const showCalculator = ref(false)
const showPriceCheck = ref(false)
const showTransactionHistory = ref(false)
const returnInitialOR = ref('')
const showManagerOverride = ref(false)
const managerOverrideSupervisorId = ref<string | null>(null)
let managerOverrideTimeout: number | null = null

// Cash drawer dialogs
const showCashDrawerDialog = ref(false)
const showCashDrop = ref(false)
const showCashPaidIn = ref(false)

// Shift dialog
const showShiftDialog = ref(false)
const shiftDialogMode = ref<'start' | 'end'>('start')

// Customer state
const selectedCustomer = ref<Customer | null>(null)
const showCustomerDialog = ref(false)

// Discount selection dialog
const showDiscountSelection = ref(false)
const discountSelectionProductName = ref('')
const discountSelectionItemId = ref('')
const eligibleDiscountsForItem = ref<EligibleDiscount[]>([])

// Shift ended success dialog
const showShiftEndedSuccess = ref(false)

// X/Z Reading dialogs
const showXReadingResult = ref(false)
const showZReadingResult = ref(false)
const showZReadingConfirm = ref(false)
const xReadingResult = ref<DisplayXReading | null>(null)
const zReadingResult = ref<DisplayZReading | null>(null)
const isGeneratingReading = ref(false)

// Cart highlight
const lastAddedItemId = ref<string | null>(null)
let highlightTimeout: number | null = null

// Component refs
const barcodeInputRef = ref<InstanceType<typeof POSBarcodeInput> | null>(null)

// Computed
const hasTransaction = computed(() => !isEmpty.value)
const hasOpenShift = computed(() => shiftStore.hasOpenShift)

const posStatus = computed(() => {
  if (!hasOpenShift.value) return 'NO SHIFT'
  if (!connectivityService.isOnline.value) return 'OFFLINE'
  if (showPaymentDialog.value) return 'PAYMENT'
  if (showVoidDialog.value) return 'VOIDING'
  if (hasTransaction.value) return 'IN PROGRESS'
  return 'READY'
})

// Customer handlers
async function handleCustomerDialogSelected(customer: Customer) {
  selectedCustomer.value = customer
  cartStore.setCustomer(customer.id)
  await applyTierDiscount(customer)
}

function handleCustomerDialogRemoved() {
  selectedCustomer.value = null
  cartStore.setCustomer(null)
  if (discount.value?.type === 'percentage' && discount.value?.code === 'tier_discount') {
    cartStore.removeDiscount()
  }
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

/** Parse optional qty prefix: 2*<code>, 2@<code>, 2/<code> */
function parseQtyPrefix(value: string): { qty: number; code: string } {
  const m = value.match(/^(\d+)[*@/](.+)$/)
  if (m) {
    const qty = parseInt(m[1]!, 10)
    return { qty: qty > 0 ? qty : 1, code: m[2]!.trim() }
  }
  return { qty: 1, code: value }
}

async function handleBarcodeInput(value: string) {
  if (!hasOpenShift.value) {
    toast.add({ severity: 'warn', summary: 'No Active Shift', detail: 'Please start a shift before adding products', life: 3000 })
    handleStartShift()
    return
  }

  const { qty, code } = parseQtyPrefix(value.trim())

  // Try barcode / SKU lookup first
  try {
    const result = await productStore.findByBarcode(code)
    if (result) {
      addToCart(result.product, result.variant, qty)
      playBeep()
      return
    }
  } catch {
    // fall through to browse
  }

  // Not found — open browse with the input as search query
  browseInitialQuery.value = code
  showProductBrowse.value = true
}

// Out of stock dialog
const showStockDialog = ref(false)
const stockDialogMessage = ref('')
let stockDialogTimer: ReturnType<typeof setTimeout> | null = null

function showOutOfStockDialog(message: string) {
  stockDialogMessage.value = message
  showStockDialog.value = true
  if (stockDialogTimer) clearTimeout(stockDialogTimer)
  stockDialogTimer = setTimeout(() => { showStockDialog.value = false }, 3000)
}

// Get quantity of a product already in the cart
function getCartQuantity(productId: string, variantId?: string): number {
  return cartStore.items
    .filter(i => i.productId === productId && i.variantId === (variantId || undefined))
    .reduce((sum, i) => sum + i.quantity, 0)
}

function addToCart(product: Product, variant?: ProductVariant, quantity: number = 1) {
  if (!hasOpenShift.value) {
    toast.add({ severity: 'warn', summary: 'No Active Shift', detail: 'Please start a shift before adding products', life: 3000 })
    handleStartShift()
    return
  }

  // Block selling products with zero or insufficient stock
  const availableStock = product.stock - getCartQuantity(product.id, variant?.id)
  if (availableStock <= 0) {
    showOutOfStockDialog(`"${product.name}" has no available stock.`)
    return
  }
  if (quantity > availableStock) {
    showOutOfStockDialog(`Only ${availableStock} unit(s) of "${product.name}" available.`)
    return
  }

  cartStore.addItem(product, variant, quantity)

  const itemId = cartStore.items[cartStore.items.length - 1]?.id
  if (itemId) {
    lastAddedItemId.value = itemId
    if (highlightTimeout) clearTimeout(highlightTimeout)
    highlightTimeout = window.setTimeout(() => { lastAddedItemId.value = null }, 2000)
  }

  const qtyLabel = quantity > 1 ? ` x${quantity}` : ''
  toast.add({
    severity: 'success',
    summary: 'Added to Cart',
    detail: (variant ? `${product.name} - ${variant.name}` : product.name) + qtyLabel,
    life: 2000
  })

  // Check for eligible promo discounts
  if (itemId) {
    checkPromoDiscounts(product, itemId)
  }
}

async function checkPromoDiscounts(product: Product, itemId: string) {
  try {
    const item = cartStore.items.find(i => i.id === itemId)
    if (!item) return

    const lineSubtotal = item.unitPrice * item.quantity
    const eligible = await discountManagementService.getEligibleDiscounts(
      product.id,
      product.category_id || null,
      lineSubtotal
    )

    if (eligible.length === 0) return

    // If exactly 1 auto-apply discount -> apply silently
    const autoApply = eligible.filter(e => e.isAutoApply)
    if (autoApply.length === 1 && eligible.length === 1) {
      cartStore.setItemPromoDiscount(itemId, autoApply[0]!)
      toast.add({
        severity: 'info',
        summary: 'Discount Applied',
        detail: `${autoApply[0]!.discount.name} applied automatically`,
        life: 3000
      })
      return
    }

    // Multiple eligible or mixed auto/manual -> show selection dialog
    discountSelectionItemId.value = itemId
    discountSelectionProductName.value = product.name
    eligibleDiscountsForItem.value = eligible
    showDiscountSelection.value = true
  } catch (e) {
    // Non-blocking - don't fail the add-to-cart
    console.error('[POSTerminal] Discount eligibility check failed:', e)
  }
}

function handleDiscountSelected(eligible: EligibleDiscount | null) {
  showDiscountSelection.value = false
  if (discountSelectionItemId.value) {
    cartStore.setItemPromoDiscount(discountSelectionItemId.value, eligible)
    if (eligible) {
      toast.add({
        severity: 'info',
        summary: 'Discount Applied',
        detail: `${eligible.discount.name} applied`,
        life: 3000
      })
    }
  }
}

function handleProductSelectFromDrawer(product: Product, variant?: ProductVariant) {
  addToCart(product, variant)
  // Return to the terminal after selecting an item
  showProductBrowse.value = false
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
async function handleIncrement(item: CartItem) {
  const product = await productStore.fetchById(item.productId)
  if (product) {
    const inCart = getCartQuantity(item.productId, item.variantId)
    if (inCart >= product.stock) {
      showOutOfStockDialog(`Only ${product.stock} unit(s) of "${item.productName}" available.`)
      return
    }
  }
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
    case 'void':
      if (!hasTransaction.value) {
        toast.add({ severity: 'warn', summary: 'No Transaction', detail: 'No items in cart to void', life: 3000 })
        return
      }
      confirm.require({
        message: 'Are you sure you want to void the current transaction? All items in the cart will be removed.',
        header: 'Void Transaction',
        icon: 'pi pi-ban',
        acceptClass: '!bg-red-600 !border-red-600',
        acceptLabel: 'Void',
        rejectLabel: 'Cancel',
        accept: () => {
          cartStore.clearCart()
          toast.add({ severity: 'success', summary: 'Transaction Voided', detail: 'Cart has been cleared', life: 3000 })
        }
      })
      break
    case 'price-check':
      showPriceCheck.value = true
      break
    case 'return':
      showReturn.value = true
      break
    case 'cash-drawer':
      showCashDrawerDialog.value = true
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
    case 'transactions': showTransactionHistory.value = true; break
    case 'x-reading': handleXReading(); break
    case 'z-reading': handleZReadingPrompt(); break
    case 'calculator':
      showCalculator.value = true
      break
    case 'back-office': router.push('/'); break
    case 'logout': handleLogout(); break
  }
}

// X/Z Reading actions
async function handleXReading() {
  const shiftId = currentShift.value?.id
  const cashierId = authStore.currentUser?.id
  if (!shiftId || !cashierId) return

  isGeneratingReading.value = true
  xReadingResult.value = null

  try {
    const result = await reports.generateXReading(shiftId, cashierId)
    if (result) {
      xReadingResult.value = result
      showXReadingResult.value = true
      toast.add({ severity: 'success', summary: 'X-Reading Generated', detail: `X-Reading #${result.xCounter}`, life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: reports.error.value || 'Failed to generate X-Reading', life: 5000 })
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err instanceof Error ? err.message : 'Failed to generate X-Reading', life: 5000 })
  } finally {
    isGeneratingReading.value = false
  }
}

function handleZReadingPrompt() {
  showZReadingConfirm.value = true
}

async function confirmZReading() {
  showZReadingConfirm.value = false
  const supervisorId = authStore.currentUser?.id
  if (!supervisorId) return

  isGeneratingReading.value = true
  zReadingResult.value = null

  try {
    const result = await reports.generateZReading(supervisorId)
    if (result.success && result.zReading) {
      zReadingResult.value = result.zReading
      showZReadingResult.value = true
      toast.add({ severity: 'success', summary: 'Z-Reading Generated', detail: `Z-Reading #${result.zReading.zCounter}`, life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Error', detail: result.error || 'Failed to generate Z-Reading', life: 5000 })
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err instanceof Error ? err.message : 'Failed to generate Z-Reading', life: 5000 })
  } finally {
    isGeneratingReading.value = false
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
function handleReturnFromHistory(orNumber: string) {
  returnInitialOR.value = orNumber
  showTransactionHistory.value = false
  showReturn.value = true
}

function handleReturnProcessed() {
  showReturn.value = false
  returnInitialOR.value = ''
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

// Cash drawer handlers
async function handleOpenDrawer() {
  const { doNoSale } = useCashDrawer()
  const hwResult = await drawerHardwareService.openDrawer()
  await doNoSale(authStore.currentUser?.id || 'cashier')
  if (hwResult.success) {
    toast.add({ severity: 'success', summary: 'Drawer Opened', life: 2000 })
  } else {
    toast.add({ severity: 'info', summary: 'No-Sale Logged', detail: hwResult.error || 'No hardware connected', life: 3000 })
  }
  focusBarcodeInput()
}

function handleCashDropCompleted() {
  showCashDrop.value = false
  toast.add({ severity: 'success', summary: 'Cash Drop Recorded', life: 3000 })
  focusBarcodeInput()
}

function handleCashPaidInCompleted() {
  showCashPaidIn.value = false
  toast.add({ severity: 'success', summary: 'Cash Paid-In Recorded', life: 3000 })
  focusBarcodeInput()
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

async function handleShiftStarted() {
  const shiftId = currentShift.value?.id
  if (shiftId) {
    transactionStore.startShift(shiftId)
    // Ensure drawer session is loaded from DB into the store
    await cashDrawerStore.loadSession(shiftId)
  }
  toast.add({ severity: 'success', summary: 'Shift Started', detail: 'Your shift has been started and the drawer is open', life: 3000 })
  focusBarcodeInput()
}

function handleShiftEnded() {
  transactionStore.endShift()
  showShiftEndedSuccess.value = true
}

async function handleShiftEndedLogout() {
  showShiftEndedSuccess.value = false
  await authStore.logout()
  router.push('/login')
}

function handleLogout() {
  if (hasOpenShift.value) {
    confirm.require({
      message: 'You have an active shift. You must end your shift before logging out.',
      header: 'End Shift Required',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'End Shift',
      rejectLabel: 'Cancel',
      acceptClass: 'p-button-warning',
      accept: () => {
        cartStore.clearCart()
        shiftDialogMode.value = 'end'
        showShiftDialog.value = true
      }
    })
  } else {
    confirm.require({
      message: 'Are you sure you want to logout?',
      header: 'Logout',
      icon: 'pi pi-power-off',
      acceptLabel: 'Logout',
      rejectLabel: 'Cancel',
      acceptClass: 'p-button-danger',
      accept: async () => {
        await authStore.logout()
        router.push('/login')
      }
    })
  }
}

function focusBarcodeInput() {
  barcodeInputRef.value?.focus()
}

function handlePrint() {
  window.print()
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
  if (event.key === 'F7') { event.preventDefault(); showTransactionHistory.value = true }
  if (event.key === 'F9') { event.preventDefault(); handleCheckout() }
  if (event.key === 'Escape') { event.preventDefault(); if (showProductBrowse.value) showProductBrowse.value = false }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)

  // Load shift from DB to ensure in-memory state is accurate
  await shiftStore.loadCurrentShift()

  // Sync shift ID and drawer session into stores if a shift is already open
  if (shiftStore.hasOpenShift && shiftStore.shiftId) {
    transactionStore.startShift(shiftStore.shiftId)
    await cashDrawerStore.loadSession(shiftStore.shiftId)
  }

  // Auto-prompt shift dialog if no open shift
  if (!shiftStore.hasOpenShift) {
    shiftDialogMode.value = 'start'
    showShiftDialog.value = true
  } else {
    focusBarcodeInput()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (highlightTimeout) clearTimeout(highlightTimeout)
  if (managerOverrideTimeout) clearTimeout(managerOverrideTimeout)
})
</script>

<template>
  <div class="h-full w-full flex flex-col bg-neutral-100 overflow-hidden">
    <Toast />
    <ConfirmDialog />

    <!-- MAIN 50/50 GRID -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">

      <!-- LEFT COLUMN: Transaction + Cart + Totals -->
      <div class="flex flex-col overflow-hidden bg-white border-r border-neutral-100">
        <!-- Row 1: Transaction No + Customer Name -->
        <POSTransactionHeader
          :cashierName="transactionStore.cashierName || '—'"
          :transactionNumber="lastORNumber || '—'"
          :customerName="selectedCustomer?.name || 'Walk-in'"
          @add-customer="showCustomerDialog = true"
        />

        <!-- Cart header -->
        <div v-if="hasTransaction" class="flex items-center justify-between px-4 py-2 bg-neutral-50/80 border-b border-neutral-100 shrink-0">
          <span class="text-sm font-semibold uppercase tracking-wider text-neutral-400">{{ totals.itemCount }} item{{ totals.itemCount !== 1 ? 's' : '' }} in cart</span>
        </div>

        <!-- Cart Items (scrollable) -->
        <div class="flex-1 min-h-0 overflow-y-auto pos-cart-scroll">
          <div v-if="hasTransaction" class="divide-y divide-neutral-100/60">
            <div
              v-for="item in items"
              :key="item.id"
              class="pos-cart-item"
              :class="{ 'pos-row-highlight': item.id === lastAddedItemId }"
              @click="openItemDetail(item)"
            >
              <!-- Product image -->
              <div class="w-12 h-12 rounded-lg bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center">
                <img v-if="item.image" :src="item.image" :alt="item.productName" class="w-full h-full object-cover" />
                <i v-else class="pi pi-box text-lg text-neutral-300"></i>
              </div>

              <!-- Item info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-800 m-0 truncate leading-snug">{{ item.productName }}</p>
                <p class="text-xs text-neutral-400 m-0 mt-0.5 tabular-nums">
                  {{ item.quantity }} @ {{ formatCurrency(item.unitPrice) }}
                  <span v-if="item.variantName" class="text-neutral-300 mx-0.5">&middot;</span>
                  <span v-if="item.variantName">{{ item.variantName }}</span>
                </p>
                <p v-if="item.discountName" class="text-xs text-emerald-500 m-0 mt-0.5 truncate">
                  <i class="pi pi-tag text-[10px] mr-0.5"></i>{{ item.discountName }} (-{{ formatCurrency(item.discount || 0) }})
                </p>
                <p v-if="item.isWholesale" class="text-xs text-blue-500 m-0 mt-0.5 tabular-nums">
                  <i class="pi pi-box text-[10px] mr-0.5"></i>Wholesale
                  <span v-if="item.originalPrice" class="line-through text-blue-300 ml-1">{{ formatCurrency(item.originalPrice) }}</span>
                </p>
              </div>

              <!-- Amount -->
              <span class="text-sm font-bold text-neutral-900 tabular-nums shrink-0">{{ formatCurrency(item.lineTotal) }}</span>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="flex-1 flex flex-col items-center justify-center text-center h-full">
            <!-- No shift -->
            <template v-if="!hasOpenShift">
              <div class="p-12">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 mx-auto">
                  <i class="pi pi-exclamation-triangle text-2xl text-amber-400"></i>
                </div>
                <p class="text-sm font-semibold text-neutral-500 m-0 mb-1">No Active Shift</p>
                <p class="text-xs text-neutral-400 m-0 mb-4">Start a shift to begin scanning products</p>
                <button
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm border-none cursor-pointer transition-colors active:scale-95"
                  @click="handleStartShift"
                >
                  <i class="pi pi-sign-in"></i> Start Shift
                </button>
              </div>
            </template>
            <!-- Shift active: store branding display -->
            <template v-else>
              <POSIdleDisplay
                :storeName="settingsStore.businessInfo.name"
                :address="settingsStore.businessInfo.address"
                :tin="settingsStore.businessInfo.tin"
                :accreditationNo="settingsStore.businessInfo.accreditationNumber"
                :terminalId="authStore.terminalId"
                :logoUrl="settingsStore.businessInfo.logoUrl"
                :tagline="settingsStore.receiptSettings.headerLine1 || settingsStore.receiptSettings.headerLine2"
                :slideshowImages="settingsStore.slideshowImages"
                :showStoreName="settingsStore.displaySettings.showStoreName"
                :showLogo="settingsStore.displaySettings.showLogo"
                :showAddress="settingsStore.displaySettings.showAddress"
                :showTin="settingsStore.displaySettings.showTin"
                :showTerminal="settingsStore.displaySettings.showTerminal"
                :showTime="settingsStore.displaySettings.showTime"
                :timeFormat="settingsStore.displaySettings.timeFormat"
                :dateFormat="settingsStore.displaySettings.dateFormat"
                :slideshowInterval="settingsStore.displaySettings.slideshowInterval"
              />
            </template>
          </div>
        </div>

        <!-- Discount banner -->
        <div v-if="hasDiscount" class="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-t border-emerald-100 shrink-0">
          <div class="flex items-center justify-center w-6 h-6 rounded bg-emerald-100">
            <i class="pi pi-tag text-xs text-emerald-600"></i>
          </div>
          <span class="font-semibold text-sm text-emerald-700">{{ discountLabel }}</span>
          <span v-if="discount?.idNumber" class="text-sm text-emerald-500">ID: {{ discount.idNumber }}</span>
          <button
            class="ml-auto flex items-center justify-center w-5 h-5 rounded border-none bg-transparent text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 cursor-pointer transition-colors"
            @click="handleRemoveDiscount"
          >
            <i class="pi pi-times text-[10px]"></i>
          </button>
        </div>

        <!-- Summary -->
        <POSCartSummary />
      </div>

      <!-- RIGHT COLUMN: Store Header + Actions + Barcode -->
      <div class="flex flex-col overflow-hidden bg-neutral-50">
        <!-- Store Header -->
        <POSStoreHeader
          :hasTransaction="hasTransaction"
          :hasOpenShift="hasOpenShift"
          :grandTotal="totals.grandTotal"
          :subtotal="totals.subtotal"
          :discountTotal="totals.discountTotal"
          :terminalId="authStore.terminalId"
          :cashierName="currentShift?.userName || transactionStore.cashierName || 'Cashier'"
        />

        <!-- Action Tiles Grid -->
        <POSActionTiles
          :hasTransaction="hasTransaction"
          :hasDiscount="hasDiscount"
          :hasOpenShift="shiftStore.hasOpenShift"
          :isAdmin="!authStore.isCashier"
          @action="handleActionTile"
        />

        <!-- Barcode Input (pinned bottom) -->
        <POSBarcodeInput
          ref="barcodeInputRef"
          :hasTransaction="hasTransaction"
          :disabled="!hasOpenShift"
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
      :transaction="transactionStore.lastCompletedTransaction"
      @update:visible="showVoidDialog = $event"
      @voided="handleVoided"
      @cancel="showVoidDialog = false"
    />

    <POSCustomerDialog
      :visible="showCustomerDialog"
      :currentCustomerId="customerId"
      @update:visible="showCustomerDialog = $event"
      @selected="handleCustomerDialogSelected"
      @removed="handleCustomerDialogRemoved"
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
      :initialOrNumber="returnInitialOR"
      @update:visible="showReturn = $event; if (!$event) returnInitialOR = ''"
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

    <POSCalculator
      :visible="showCalculator"
      @update:visible="showCalculator = $event"
    />

    <POSPriceCheck
      :visible="showPriceCheck"
      @update:visible="showPriceCheck = $event"
    />

    <POSTransactionHistory
      :visible="showTransactionHistory"
      @update:visible="showTransactionHistory = $event"
      @return="handleReturnFromHistory"
    />

    <DiscountSelectionDialog
      v-model:visible="showDiscountSelection"
      :productName="discountSelectionProductName"
      :eligibleDiscounts="eligibleDiscountsForItem"
      @select="handleDiscountSelected"
    />

    <POSCashDrawerDialog
      :visible="showCashDrawerDialog"
      @update:visible="showCashDrawerDialog = $event"
      @open-drawer="handleOpenDrawer"
      @cash-drop="showCashDrop = true"
      @cash-in="showCashPaidIn = true"
    />

    <CashDrop
      :visible="showCashDrop"
      @update:visible="showCashDrop = $event"
      @drop-completed="handleCashDropCompleted"
    />

    <CashPaidIn
      :visible="showCashPaidIn"
      @update:visible="showCashPaidIn = $event"
      @paid-in-completed="handleCashPaidInCompleted"
    />

    <Dialog v-model:visible="showClearConfirm" header="Clear Cart" :modal="true" :closable="false" :style="{ width: '400px' }">
      <p>Are you sure you want to clear all items from the cart?</p>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showClearConfirm = false" />
        <Button label="Clear Cart" severity="danger" @click="confirmClearCart" />
      </template>
    </Dialog>

    <!-- Item Detail Dialog -->
    <Dialog v-model:visible="showItemDetail" :header="selectedItem?.productName || 'Item'" :modal="true" :style="{ width: '360px' }" :pt="{ header: { class: 'pb-2' } }">
      <div v-if="selectedItem" class="flex flex-col gap-4">
        <!-- Product info -->
        <div class="bg-neutral-50 rounded-xl p-3">
          <p v-if="selectedItem.variantName" class="text-xs text-neutral-400 m-0 mb-1">{{ selectedItem.variantName }}</p>
          <div class="flex justify-between items-center">
            <span class="text-xs text-neutral-500">Unit Price</span>
            <span class="text-sm font-bold text-neutral-800 tabular-nums">{{ formatCurrency(selectedItem.unitPrice) }}</span>
          </div>
          <div class="flex justify-between items-center mt-1">
            <span class="text-xs text-neutral-500">Line Total</span>
            <span class="text-sm font-bold text-[var(--p-primary-500)] tabular-nums">{{ formatCurrency(selectedItem.unitPrice * editQty) }}</span>
          </div>
        </div>

        <!-- Qty adjuster -->
        <div>
          <label class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Quantity</label>
          <div class="flex items-center justify-center gap-3">
            <button class="pos-detail-qty-btn" @click="editQty = Math.max(1, editQty - 1)">
              <i class="pi pi-minus text-xs"></i>
            </button>
            <input
              v-model.number="editQty"
              type="number"
              min="1"
              max="9999"
              class="w-20 text-center text-2xl font-bold border border-neutral-200 rounded-xl py-2 outline-none focus:border-[var(--p-primary-400)] transition-colors tabular-nums bg-white text-neutral-900"
            />
            <button class="pos-detail-qty-btn" @click="editQty = Math.min(9999, editQty + 1)">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-2 w-full">
          <Button label="Remove" icon="pi pi-trash" severity="danger" outlined class="flex-1" @click="removeSelectedItem" />
          <Button label="Update" icon="pi pi-check" class="flex-[2]" @click="applyItemQty" />
        </div>
      </template>
    </Dialog>

    <!-- Success Overlay -->
    <Teleport to="body">
      <Transition name="success-overlay">
        <div v-if="showSuccessDialog" class="success-overlay" @click.self="handleNewTransaction">
          <div class="success-card">
            <!-- Animated checkmark -->
            <div class="success-check-wrap">
              <svg class="success-check-svg" viewBox="0 0 100 100">
                <circle class="success-circle" cx="50" cy="50" r="45" />
                <path class="success-tick" d="M30 52 L44 66 L72 36" />
              </svg>
            </div>

            <h2 class="success-title">Payment Successful!</h2>
            <p class="success-or">OR# {{ lastORNumber }}</p>

            <p v-if="lastWarning" class="success-warning">
              <i class="pi pi-exclamation-triangle"></i> {{ lastWarning }}
            </p>

            <div class="success-actions">
              <button class="success-btn success-btn-secondary" @click="handlePrintReceipt">
                <i class="pi pi-print"></i> Print Receipt
              </button>
              <button class="success-btn success-btn-primary" @click="handleNewTransaction" autofocus>
                <i class="pi pi-plus"></i> New Transaction
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Shift Ended Success Overlay -->
    <Teleport to="body">
      <Transition name="success-overlay">
        <div v-if="showShiftEndedSuccess" class="success-overlay">
          <div class="success-card">
            <div class="success-check-wrap">
              <svg class="success-check-svg" viewBox="0 0 100 100">
                <circle class="success-circle" cx="50" cy="50" r="45" />
                <path class="success-tick" d="M30 52 L44 66 L72 36" />
              </svg>
            </div>

            <h2 class="success-title">Shift Ended!</h2>
            <p class="success-or">Your shift has been closed successfully</p>

            <div class="success-actions">
              <button class="success-btn success-btn-logout" @click="handleShiftEndedLogout" autofocus>
                <i class="pi pi-power-off"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- X-Reading Result Dialog -->
    <Dialog
      v-model:visible="showXReadingResult"
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
          <Button label="Close" severity="secondary" outlined @click="showXReadingResult = false" class="flex-1 !h-14 !text-base !font-bold" />
          <Button label="Print" icon="pi pi-print" @click="handlePrint()" class="flex-1 !h-14 !text-base !font-bold" />
        </div>
      </div>
    </Dialog>

    <!-- Z-Reading Result Dialog -->
    <Dialog
      v-model:visible="showZReadingResult"
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
          <Button label="Close" severity="secondary" outlined @click="showZReadingResult = false" class="flex-1 !h-14 !text-base !font-bold" />
          <Button label="Print" icon="pi pi-print" @click="handlePrint()" class="flex-1 !h-14 !text-base !font-bold" />
        </div>
      </div>
    </Dialog>

    <!-- Z-Reading Confirmation Dialog -->
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
          <Button label="Cancel" severity="secondary" outlined @click="showZReadingConfirm = false" class="flex-1 !h-12" />
          <Button label="Generate Z-Reading" icon="pi pi-file-export" severity="warn" :loading="isGeneratingReading" @click="confirmZReading" class="flex-1 !h-12" />
        </div>
      </template>
    </Dialog>

    <!-- Out of Stock Dialog -->
    <Dialog v-model:visible="showStockDialog" header="Out of Stock" :modal="true" :closable="true" :style="{ width: '360px' }">
      <div class="flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
        <p class="text-lg">{{ stockDialogMessage }}</p>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
/* Cart scroll */
.pos-cart-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(229 229 229) transparent;
}
.pos-cart-scroll::-webkit-scrollbar {
  width: 4px;
}
.pos-cart-scroll::-webkit-scrollbar-thumb {
  background: rgb(229 229 229);
  border-radius: 4px;
}

/* Cart item row */
.pos-cart-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.pos-cart-item:hover {
  background-color: var(--p-primary-50);
}
.pos-cart-item:active {
  background-color: var(--p-primary-100);
}


/* Detail dialog qty button */
.pos-detail-qty-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  border: 1.5px solid var(--p-primary-300);
  background: transparent;
  color: var(--p-primary-500);
  cursor: pointer;
  transition: all 0.15s ease;
}
.pos-detail-qty-btn:hover {
  background: var(--p-primary-50);
  border-color: var(--p-primary-500);
}
.pos-detail-qty-btn:active {
  transform: scale(0.92);
  background: var(--p-primary-100);
}

/* Hide number input spinners */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

/* Row flash highlight on add */
.pos-row-highlight {
  animation: row-flash 1.8s ease-out;
}

@keyframes row-flash {
  0% { background-color: var(--p-primary-50); }
  100% { background-color: transparent; }
}

/* ========================
   Success Overlay
   ======================== */
.success-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  border-radius: 1.5rem;
  padding: 2.5rem 3rem 2rem;
  min-width: 380px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  animation: card-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.success-check-wrap {
  width: 110px;
  height: 110px;
  margin-bottom: 1.25rem;
}

.success-check-svg {
  width: 100%;
  height: 100%;
}

.success-circle {
  fill: none;
  stroke: #22c55e;
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 283;
  stroke-dashoffset: 283;
  animation: circle-draw 0.6s 0.15s ease-out forwards;
}

.success-tick {
  fill: none;
  stroke: #22c55e;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 80;
  stroke-dashoffset: 80;
  animation: tick-draw 0.45s 0.55s ease-out forwards;
}

.success-title {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: #18181b;
  animation: fade-up 0.35s 0.7s ease both;
}

.success-or {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #71717a;
  font-variant-numeric: tabular-nums;
  animation: fade-up 0.35s 0.8s ease both;
}

.success-warning {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  color: #f97316;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  animation: fade-up 0.35s 0.9s ease both;
}

.success-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.75rem;
  animation: fade-up 0.35s 0.95s ease both;
}

.success-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.875rem;
  border: none;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.success-btn:active {
  transform: scale(0.96);
}

.success-btn-secondary {
  background: #f4f4f5;
  color: #52525b;
}
.success-btn-secondary:hover {
  background: #e4e4e7;
}

.success-btn-primary {
  background: #22c55e;
  color: white;
}
.success-btn-primary:hover {
  background: #16a34a;
}

.success-btn-logout {
  background: #ef4444;
  color: white;
  min-width: 200px;
  justify-content: center;
  font-size: 1.0625rem;
  padding: 0.875rem 2rem;
}
.success-btn-logout:hover {
  background: #dc2626;
}

/* Keyframes */
@keyframes circle-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes tick-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes card-pop {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-up {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Vue transition for overlay */
.success-overlay-enter-active {
  transition: opacity 0.25s ease;
}
.success-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.success-overlay-enter-from,
.success-overlay-leave-to {
  opacity: 0;
}
</style>
