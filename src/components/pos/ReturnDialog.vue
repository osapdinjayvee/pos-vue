<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { useTransactionStore } from '@/stores/transaction'
import { useCartStore } from '@/stores/cart'
import { authService } from '@/services/authService'
import { vatService } from '@/services/vatService'
import type { Transaction, TransactionItem } from '@/types/transaction'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'processed'): void
}>()

const transactionStore = useTransactionStore()
const cartStore = useCartStore()

// Step management
const step = ref<'search' | 'select' | 'confirm'>('search')

// Search state
const orNumber = ref('')
const isSearching = ref(false)
const searchError = ref<string | null>(null)
const foundTransaction = ref<Transaction | null>(null)
const transactionItems = ref<TransactionItem[]>([])

// Selection state
interface ReturnItem {
  item: TransactionItem
  selected: boolean
  returnQty: number
}
const returnItems = ref<ReturnItem[]>([])

// Confirm state
const returnReason = ref('')
const supervisorUsername = ref('')
const supervisorPin = ref('')
const isProcessing = ref(false)
const confirmError = ref<string | null>(null)

// Computed
const selectedItems = computed(() => returnItems.value.filter(r => r.selected && r.returnQty > 0))

const returnTotal = computed(() => {
  return selectedItems.value.reduce((sum, r) => {
    return sum + (r.item.unit_price * r.returnQty)
  }, 0)
})

const canProceedToConfirm = computed(() => selectedItems.value.length > 0)

const canProcessReturn = computed(() =>
  returnReason.value.trim().length > 0 &&
  supervisorUsername.value.trim().length > 0 &&
  supervisorPin.value.length > 0
)

// Watchers
watch(() => props.visible, (visible) => {
  if (visible) {
    resetAll()
  }
})

// Actions
function resetAll() {
  step.value = 'search'
  orNumber.value = ''
  isSearching.value = false
  searchError.value = null
  foundTransaction.value = null
  transactionItems.value = []
  returnItems.value = []
  returnReason.value = ''
  supervisorUsername.value = ''
  supervisorPin.value = ''
  isProcessing.value = false
  confirmError.value = null
}

async function handleSearch() {
  const query = orNumber.value.trim()
  if (!query) {
    searchError.value = 'Please enter an OR number'
    return
  }

  isSearching.value = true
  searchError.value = null

  try {
    const tx = await transactionStore.searchTransactionByOR(query)

    if (!tx) {
      searchError.value = `No transaction found for OR# ${query}`
      return
    }

    if (tx.status === 'voided') {
      searchError.value = 'This transaction has been voided and cannot be returned'
      return
    }

    foundTransaction.value = tx

    // Load items
    const details = await transactionStore.loadTransactionDetails(tx.id)
    transactionItems.value = transactionStore.currentTransactionItems

    // Build return items
    returnItems.value = transactionItems.value.map(item => ({
      item,
      selected: false,
      returnQty: item.quantity
    }))

    step.value = 'select'
  } catch (e) {
    searchError.value = e instanceof Error ? e.message : 'Error searching transaction'
  } finally {
    isSearching.value = false
  }
}

function goToConfirm() {
  if (!canProceedToConfirm.value) return
  confirmError.value = null
  step.value = 'confirm'
}

function goBackToSelect() {
  step.value = 'select'
  confirmError.value = null
}

function goBackToSearch() {
  step.value = 'search'
}

async function handleProcessReturn() {
  if (!canProcessReturn.value || !foundTransaction.value) return

  isProcessing.value = true
  confirmError.value = null

  try {
    // Verify supervisor
    const authResult = await authService.verifySupervisorPin(
      supervisorUsername.value.trim(),
      supervisorPin.value,
      'sales.return'
    )

    if (!authResult.authorized) {
      confirmError.value = authResult.error || 'Authorization failed'
      return
    }

    // Clear current cart and add return items as negative quantities
    cartStore.clearCart()

    for (const ri of selectedItems.value) {
      const returnItem = {
        id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: ri.item.product_id,
        variantId: ri.item.variant_id || undefined,
        productName: `[RETURN] ${ri.item.product_name}`,
        variantName: ri.item.variant_name || undefined,
        sku: ri.item.sku || '',
        barcode: ri.item.barcode || '',
        unitPrice: -ri.item.unit_price,
        quantity: ri.returnQty,
        lineTotal: -(ri.item.unit_price * ri.returnQty),
        taxType: ri.item.tax_type,
        discount: 0
      }
      cartStore.items.push(returnItem)
    }

    cartStore.setNotes(
      `RETURN from OR# ${foundTransaction.value.or_number} | Reason: ${returnReason.value.trim()} | Approved by: ${supervisorUsername.value.trim()}`
    )

    emit('processed')
    close()
  } catch (e) {
    confirmError.value = e instanceof Error ? e.message : 'Error processing return'
  } finally {
    isProcessing.value = false
  }
}

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function close() {
  emit('update:visible', false)
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
  >
    <div class="flex h-full">
      <!-- LEFT PANEL — Info -->
      <div class="w-[38%] flex flex-col relative text-white" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%)">
        <button
          @click="close"
          class="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent z-10"
        >
          <i class="pi pi-times text-lg"></i>
        </button>

        <div class="flex-1 flex flex-col justify-center px-8">
          <div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
            <i class="pi pi-replay text-3xl"></i>
          </div>
          <h1 class="text-3xl font-bold m-0 mb-2">Return</h1>
          <p class="text-white/70 m-0 mb-8">Process a return for a completed transaction</p>

          <!-- Step indicator -->
          <div class="space-y-3">
            <div class="flex items-center gap-3" :class="step === 'search' ? 'text-white' : 'text-white/40'">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                :class="step === 'search' ? 'bg-white text-red-600' : 'bg-white/20'">1</div>
              <span class="text-sm font-medium">Search Transaction</span>
            </div>
            <div class="flex items-center gap-3" :class="step === 'select' ? 'text-white' : 'text-white/40'">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                :class="step === 'select' ? 'bg-white text-red-600' : 'bg-white/20'">2</div>
              <span class="text-sm font-medium">Select Items</span>
            </div>
            <div class="flex items-center gap-3" :class="step === 'confirm' ? 'text-white' : 'text-white/40'">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                :class="step === 'confirm' ? 'bg-white text-red-600' : 'bg-white/20'">3</div>
              <span class="text-sm font-medium">Confirm & Authorize</span>
            </div>
          </div>

          <!-- Return summary (when items selected) -->
          <div v-if="selectedItems.length > 0" class="mt-8 pt-6 border-t border-white/20">
            <p class="text-white/60 text-xs uppercase tracking-wider m-0 mb-2">Return Amount</p>
            <p class="text-3xl font-bold m-0">{{ formatCurrency(returnTotal) }}</p>
            <p class="text-white/60 text-sm m-0 mt-1">{{ selectedItems.length }} item{{ selectedItems.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL — Content -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white">
        <!-- Step 1: Search -->
        <div v-if="step === 'search'" class="flex-1 flex flex-col items-center justify-center p-8">
          <div class="w-full max-w-md">
            <h2 class="text-xl font-bold text-neutral-900 m-0 mb-1">Find Transaction</h2>
            <p class="text-sm text-neutral-500 m-0 mb-6">Enter the OR number to look up the original transaction</p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-neutral-700 mb-2">OR Number</label>
              <InputText
                v-model="orNumber"
                placeholder="e.g., OR-2024-000123"
                class="w-full"
                @keydown.enter="handleSearch"
                autofocus
              />
            </div>

            <Message v-if="searchError" severity="error" class="mb-4" :closable="false">{{ searchError }}</Message>

            <Button
              label="Search"
              icon="pi pi-search"
              class="w-full"
              @click="handleSearch"
              :loading="isSearching"
              :disabled="!orNumber.trim()"
            />
          </div>
        </div>

        <!-- Step 2: Select items -->
        <div v-if="step === 'select'" class="flex-1 flex flex-col overflow-hidden">
          <!-- Transaction header -->
          <div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-bold text-neutral-900 m-0">{{ foundTransaction?.or_number }}</h2>
                <p class="text-sm text-neutral-500 m-0 mt-0.5">{{ foundTransaction ? formatDate(foundTransaction.created_at) : '' }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-neutral-500 m-0">Original Total</p>
                <p class="text-lg font-bold text-neutral-900 m-0">{{ formatCurrency(foundTransaction?.total_amount || 0) }}</p>
              </div>
            </div>
          </div>

          <!-- Items list -->
          <div class="flex-1 overflow-auto p-6">
            <p class="text-sm text-neutral-500 m-0 mb-4">Select items to return and adjust quantities:</p>

            <div class="space-y-3">
              <div
                v-for="ri in returnItems"
                :key="ri.item.id"
                class="flex items-center gap-4 p-4 rounded-xl border transition-colors"
                :class="ri.selected ? 'border-red-200 bg-red-50/50' : 'border-neutral-200 bg-white'"
              >
                <Checkbox v-model="ri.selected" :binary="true" />

                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm text-neutral-900 m-0">{{ ri.item.product_name }}</p>
                  <p v-if="ri.item.variant_name" class="text-xs text-neutral-500 m-0 mt-0.5">{{ ri.item.variant_name }}</p>
                  <p class="text-xs text-neutral-400 m-0 mt-0.5">
                    {{ formatCurrency(ri.item.unit_price) }} each &middot; Purchased: {{ ri.item.quantity }}
                  </p>
                </div>

                <div v-if="ri.selected" class="flex items-center gap-2">
                  <label class="text-xs text-neutral-500">Qty:</label>
                  <InputNumber
                    v-model="ri.returnQty"
                    :min="1"
                    :max="ri.item.quantity"
                    showButtons
                    buttonLayout="horizontal"
                    :style="{ width: '8rem' }"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                    size="small"
                  />
                </div>

                <span class="font-bold text-sm min-w-[5rem] text-right" :class="ri.selected ? 'text-red-600' : 'text-neutral-400'">
                  {{ ri.selected ? formatCurrency(ri.item.unit_price * ri.returnQty) : '—' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            <Button label="Back" icon="pi pi-arrow-left" severity="secondary" text @click="goBackToSearch" />
            <Button
              label="Continue"
              icon="pi pi-arrow-right"
              iconPos="right"
              severity="danger"
              @click="goToConfirm"
              :disabled="!canProceedToConfirm"
            />
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-if="step === 'confirm'" class="flex-1 flex flex-col overflow-hidden">
          <div class="flex-1 overflow-auto p-8">
            <div class="max-w-md mx-auto">
              <h2 class="text-xl font-bold text-neutral-900 m-0 mb-1">Confirm Return</h2>
              <p class="text-sm text-neutral-500 m-0 mb-6">Provide a reason and supervisor authorization</p>

              <!-- Return summary -->
              <div class="bg-red-50 rounded-xl p-4 mb-6 border border-red-200">
                <h3 class="text-sm font-semibold text-red-800 m-0 mb-2">Return Summary</h3>
                <div v-for="ri in selectedItems" :key="ri.item.id" class="flex justify-between text-sm mb-1">
                  <span class="text-red-700">{{ ri.returnQty }}x {{ ri.item.product_name }}</span>
                  <span class="font-semibold text-red-700">{{ formatCurrency(ri.item.unit_price * ri.returnQty) }}</span>
                </div>
                <div class="flex justify-between text-base mt-3 pt-3 border-t border-red-200">
                  <span class="font-bold text-red-900">Refund Total</span>
                  <span class="font-bold text-red-900">{{ formatCurrency(returnTotal) }}</span>
                </div>
              </div>

              <!-- Return reason -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">Return Reason *</label>
                <Textarea
                  v-model="returnReason"
                  rows="3"
                  class="w-full"
                  placeholder="Enter reason for return..."
                />
              </div>

              <!-- Supervisor auth -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">Supervisor Username *</label>
                <InputText
                  v-model="supervisorUsername"
                  class="w-full"
                  placeholder="Supervisor username"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-2">Supervisor PIN *</label>
                <Password
                  v-model="supervisorPin"
                  :feedback="false"
                  toggleMask
                  class="w-full"
                  inputClass="w-full"
                  placeholder="Enter supervisor PIN"
                />
              </div>

              <Message v-if="confirmError" severity="error" class="mb-4" :closable="false">{{ confirmError }}</Message>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            <Button label="Back" icon="pi pi-arrow-left" severity="secondary" text @click="goBackToSelect" />
            <Button
              label="Process Return"
              icon="pi pi-check"
              severity="danger"
              @click="handleProcessReturn"
              :loading="isProcessing"
              :disabled="!canProcessReturn"
            />
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>
