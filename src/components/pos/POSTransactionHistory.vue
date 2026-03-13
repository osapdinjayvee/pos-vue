<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import { transactionRepository } from '@/repositories/transactionRepository'
import { transactionItemRepository } from '@/repositories/transactionItemRepository'
import { paymentRepository } from '@/repositories/paymentRepository'
import { useTransactionStore } from '@/stores/transaction'
import { vatService } from '@/services/vatService'
import { PaymentMethodLabels } from '@/types/payment'
import type { Transaction, TransactionItem } from '@/types/transaction'
import type { Payment } from '@/types/payment'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'return': [orNumber: string]
}>()

const transactionStore = useTransactionStore()

// Filter state
const filterDate = ref<Date>(new Date())
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Voided', value: 'voided' },
  { label: 'Returns', value: 'returns' }
]

// Transaction list
const transactions = ref<Transaction[]>([])
const isLoading = ref(false)

// Selected transaction detail
const selectedTxId = ref<string | null>(null)
const selectedTx = ref<Transaction | null>(null)
const selectedItems = ref<Array<TransactionItem & { product_name: string; variant_name?: string }>>([])
const selectedPayments = ref<Payment[]>([])
const isLoadingDetail = ref(false)

// Void state
const showVoidForm = ref(false)
const supervisorPin = ref('')
const voidReason = ref('')
const isVoiding = ref(false)
const voidError = ref<string | null>(null)
const SUPERVISOR_PIN = '1234'

// Return transaction helpers
function isReturnTransaction(tx: Transaction): boolean {
  return tx.notes?.startsWith('RETURN from OR#') || tx.total_amount < 0
}

function parseReturnNotes(notes: string): { originalOR: string; reason: string; approvedBy: string } | null {
  const match = notes?.match(/^RETURN from OR# (.+?) \| Reason: (.+?) \| Approved by: (.+)$/)
  if (!match) return null
  return { originalOR: match[1]!, reason: match[2]!, approvedBy: match[3]! }
}

// Filtered transactions
const filteredTransactions = computed(() => {
  let list = transactions.value

  if (statusFilter.value === 'returns') {
    list = list.filter(t => isReturnTransaction(t))
  } else if (statusFilter.value !== 'all') {
    list = list.filter(t => t.status === statusFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(t =>
      t.or_number.toLowerCase().includes(q) ||
      (t.customer_id && t.customer_id.toLowerCase().includes(q))
    )
  }

  return list
})

// Watch dialog open
watch(() => props.visible, async (val) => {
  if (val) {
    filterDate.value = new Date()
    searchQuery.value = ''
    statusFilter.value = 'all'
    selectedTxId.value = null
    selectedTx.value = null
    selectedItems.value = []
    selectedPayments.value = []
    showVoidForm.value = false
    await loadTransactions()
  }
})

// Watch filter changes
watch([filterDate], () => {
  if (props.visible) loadTransactions()
})

async function loadTransactions() {
  isLoading.value = true
  try {
    const date = filterDate.value
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const localDate = `${y}-${m}-${d}`
    transactions.value = await transactionRepository.findByLocalDateRange(localDate, localDate)
  } catch {
    transactions.value = []
  } finally {
    isLoading.value = false
  }
}

async function selectTransaction(tx: Transaction) {
  if (selectedTxId.value === tx.id) return
  selectedTxId.value = tx.id
  selectedTx.value = tx
  showVoidForm.value = false
  voidError.value = null
  isLoadingDetail.value = true
  try {
    const [items, payments] = await Promise.all([
      transactionItemRepository.getTransactionItemsWithProducts(tx.id),
      paymentRepository.findByTransaction(tx.id)
    ])
    selectedItems.value = items
    selectedPayments.value = payments
  } catch {
    selectedItems.value = []
    selectedPayments.value = []
  } finally {
    isLoadingDetail.value = false
  }
}

async function handleReprint() {
  if (!selectedTx.value) return
  const result = await transactionStore.printReceipt(selectedTx.value.id)
  if (!result.success) {
    // Toast would be nice here but we don't have direct access; the caller handles it
  }
}

async function handlePreview() {
  if (!selectedTx.value) return
  await transactionStore.previewReceipt(selectedTx.value.id)
}

function startVoid() {
  showVoidForm.value = true
  supervisorPin.value = ''
  voidReason.value = ''
  voidError.value = null
}

function cancelVoid() {
  showVoidForm.value = false
  voidError.value = null
}

async function handleVoid() {
  if (!selectedTx.value) return

  if (!supervisorPin.value) {
    voidError.value = 'Please enter supervisor PIN'
    return
  }
  if (!voidReason.value.trim()) {
    voidError.value = 'Please enter a reason for voiding'
    return
  }
  if (supervisorPin.value !== SUPERVISOR_PIN) {
    voidError.value = 'Invalid supervisor PIN'
    return
  }

  isVoiding.value = true
  voidError.value = null

  try {
    const result = await transactionStore.voidTransaction(
      selectedTx.value.id,
      voidReason.value,
      'supervisor'
    )

    if (result.success) {
      showVoidForm.value = false
      // Refresh list and detail
      await loadTransactions()
      // Update the selected transaction status locally
      if (selectedTx.value) {
        selectedTx.value = { ...selectedTx.value, status: 'voided' }
      }
    } else {
      voidError.value = result.error || 'Failed to void transaction'
    }
  } catch (e) {
    voidError.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    isVoiding.value = false
  }
}

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function parseLocalDate(dateStr: string): Date {
  // Local timestamps (no Z suffix) must not be parsed by new Date() which treats them as UTC
  if (dateStr.endsWith('Z')) return new Date(dateStr)
  // Parse as local: "2026-03-13T14:30:00" → new Date(2026, 2, 13, 14, 30, 0)
  const [datePart, timePart] = dateStr.split('T')
  if (!timePart) return new Date(dateStr)
  const [y, m, d] = datePart!.split('-').map(Number)
  const [h, min, s] = timePart.split(':').map(n => parseInt(n!))
  return new Date(y!, m! - 1, d!, h!, min!, s || 0)
}

function formatTime(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateTime(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

const copiedORNumber = ref(false)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

function copyORNumber(orNumber: string, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  try {
    navigator.clipboard.writeText(orNumber)
  } catch {
    // Fallback: textarea copy
    const ta = document.createElement('textarea')
    ta.value = orNumber
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copiedORNumber.value = true
  if (copyTimeout) clearTimeout(copyTimeout)
  copyTimeout = setTimeout(() => { copiedORNumber.value = false }, 1500)
}

function statusSeverity(status: string): 'success' | 'danger' | 'secondary' {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'secondary'
}

function paymentMethodLabel(method: string): string {
  return PaymentMethodLabels[method as keyof typeof PaymentMethodLabels] || method
}

function taxTypeLabel(taxType: string): string {
  if (taxType === 'vatable') return 'VAT'
  if (taxType === 'exempt') return 'Exempt'
  if (taxType === 'zero_rated') return 'Zero'
  return taxType
}

function taxTypeSeverity(taxType: string): 'info' | 'warn' | 'secondary' {
  if (taxType === 'vatable') return 'info'
  if (taxType === 'exempt') return 'warn'
  return 'secondary'
}

function handleReturn() {
  if (!selectedTx.value) return
  emit('return', selectedTx.value.or_number)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :maximizable="false"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200)' } }"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <i class="pi pi-list text-lg text-[var(--p-primary-500)]"></i>
        <span class="text-lg font-bold text-neutral-800">Transaction History</span>
        <kbd class="ml-2 text-[10px] bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400 font-mono">F7</kbd>
      </div>
    </template>

    <div class="flex flex-1 overflow-hidden">
      <!-- LEFT: Transaction List -->
      <div class="w-full lg:w-[420px] xl:w-[480px] flex flex-col border-r border-neutral-100 shrink-0">
        <!-- Filter bar -->
        <div class="p-3 border-b border-neutral-100 bg-neutral-50/50 shrink-0 flex flex-col gap-2">
          <div class="flex gap-2">
            <DatePicker
              v-model="filterDate"
              dateFormat="M dd, yy"
              :showIcon="true"
              :showButtonBar="true"
              class="flex-1"
              inputClass="!text-sm"
            />
            <Select
              v-model="statusFilter"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              class="w-[130px]"
            />
          </div>
          <div class="relative">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm"></i>
            <InputText
              v-model="searchQuery"
              placeholder="Search OR number..."
              class="w-full !pl-9 !text-sm"
            />
          </div>
        </div>

        <!-- Transaction list -->
        <div class="flex-1 overflow-y-auto txh-scroll">
          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-16">
            <i class="pi pi-spinner pi-spin text-2xl text-neutral-300"></i>
          </div>

          <!-- Results -->
          <div v-else-if="filteredTransactions.length > 0" class="divide-y divide-neutral-100">
            <div
              v-for="tx in filteredTransactions"
              :key="tx.id"
              class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--p-primary-50)]"
              :class="{ 'bg-[var(--p-primary-50)] ring-1 ring-inset ring-[var(--p-primary-200)]': selectedTxId === tx.id }"
              @click="selectTransaction(tx)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-neutral-800 tabular-nums">{{ tx.or_number }}</span>
                  <Tag :value="tx.status" :severity="statusSeverity(tx.status)" class="!text-[10px] !px-1.5 !py-0 uppercase" />
                  <Tag v-if="isReturnTransaction(tx)" value="Return" severity="warn" class="!text-[10px] !px-1.5 !py-0" />
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-neutral-400">{{ formatTime(tx.created_at) }}</span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-sm font-bold tabular-nums" :class="tx.status === 'voided' ? 'text-red-400 line-through' : 'text-neutral-900'">
                  {{ formatCurrency(tx.total_amount) }}
                </span>
              </div>
              <i class="pi pi-chevron-right text-xs text-neutral-300 shrink-0"></i>
            </div>
          </div>

          <!-- Empty -->
          <div v-else class="flex flex-col items-center justify-center py-16 text-center px-4">
            <div class="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <i class="pi pi-receipt text-xl text-neutral-300"></i>
            </div>
            <p class="text-sm font-semibold text-neutral-400 m-0 mb-1">No transactions found</p>
            <p class="text-xs text-neutral-300 m-0">Try changing the date or filters</p>
          </div>
        </div>

        <!-- Summary bar -->
        <div class="shrink-0 px-4 py-2 border-t border-neutral-100 bg-white text-xs text-neutral-400 flex items-center justify-between">
          <span>{{ filteredTransactions.length }} transaction{{ filteredTransactions.length !== 1 ? 's' : '' }}</span>
          <span class="font-semibold tabular-nums">
            Total: {{ formatCurrency(filteredTransactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.total_amount, 0)) }}
          </span>
        </div>
      </div>

      <!-- RIGHT: Transaction Detail -->
      <div class="flex-1 flex flex-col overflow-hidden bg-white">
        <!-- Loading detail -->
        <div v-if="isLoadingDetail" class="flex-1 flex items-center justify-center">
          <i class="pi pi-spinner pi-spin text-2xl text-neutral-300"></i>
        </div>

        <!-- Detail content -->
        <div v-else-if="selectedTx" class="flex-1 overflow-y-auto txh-scroll">
          <div class="p-4 lg:p-6 max-w-3xl mx-auto">
            <!-- Header -->
            <div class="flex items-start justify-between mb-6">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xl font-bold text-neutral-900 m-0">{{ selectedTx.or_number }}</h3>
                  <button
                    type="button"
                    class="flex items-center justify-center w-7 h-7 rounded-lg border-none cursor-pointer transition-all"
                    :class="copiedORNumber ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600'"
                    @click.stop.prevent="copyORNumber(selectedTx.or_number, $event)"
                    :title="copiedORNumber ? 'Copied!' : 'Copy OR number'"
                  >
                    <i class="text-xs" :class="copiedORNumber ? 'pi pi-check' : 'pi pi-copy'"></i>
                  </button>
                </div>
                <p class="text-sm text-neutral-400 m-0">{{ formatDateTime(selectedTx.created_at) }}</p>
              </div>
              <Tag :value="selectedTx.status" :severity="statusSeverity(selectedTx.status)" class="!text-xs uppercase" />
            </div>

            <!-- Items -->
            <div class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Items</h4>
              <div class="bg-neutral-50 rounded-xl overflow-hidden divide-y divide-neutral-100">
                <div v-for="item in selectedItems" :key="item.id" class="flex items-center gap-3 px-4 py-3">
                  <span class="flex items-center justify-center min-w-[1.75rem] h-7 rounded bg-[var(--p-primary-100)] text-[var(--p-primary-700)] text-xs font-bold shrink-0">
                    {{ item.quantity }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-neutral-800 m-0 truncate">{{ item.product_name }}</p>
                    <p v-if="item.variant_name" class="text-xs text-neutral-400 m-0">{{ item.variant_name }}</p>
                    <p v-if="item.discount > 0" class="text-xs text-emerald-600 m-0 flex items-center gap-1">
                      <i class="pi pi-tag text-[10px]"></i>
                      <span v-if="item.discount_name">{{ item.discount_name }}</span>
                      <span>-{{ formatCurrency(item.discount) }}</span>
                    </p>
                  </div>
                  <Tag :value="taxTypeLabel(item.tax_type)" :severity="taxTypeSeverity(item.tax_type)" class="!text-[9px] !px-1 !py-0 shrink-0" />
                  <div class="text-right shrink-0">
                    <span class="text-sm font-bold text-neutral-900 tabular-nums">{{ formatCurrency(item.line_total) }}</span>
                    <p v-if="item.quantity > 1" class="text-xs text-neutral-400 m-0 tabular-nums">@ {{ formatCurrency(item.unit_price) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payments -->
            <div class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Payments</h4>
              <div class="bg-neutral-50 rounded-xl overflow-hidden divide-y divide-neutral-100">
                <div v-for="pay in selectedPayments" :key="pay.id" class="flex items-center justify-between px-4 py-3">
                  <div class="flex items-center gap-2">
                    <i class="pi text-sm text-neutral-500" :class="{
                      'pi-wallet': pay.method === 'cash',
                      'pi-credit-card': pay.method === 'card',
                      'pi-mobile': ['gcash', 'maya', 'other_ewallet'].includes(pay.method),
                      'pi-star': pay.method === 'points'
                    }"></i>
                    <span class="text-sm font-semibold text-neutral-700">{{ paymentMethodLabel(pay.method) }}</span>
                    <span v-if="pay.reference_number" class="text-xs text-neutral-400">Ref: {{ pay.reference_number }}</span>
                    <span v-if="pay.card_last_four" class="text-xs text-neutral-400">****{{ pay.card_last_four }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-bold text-neutral-900 tabular-nums">{{ formatCurrency(pay.amount) }}</span>
                    <p v-if="pay.tendered && pay.tendered > pay.amount" class="text-xs text-neutral-400 m-0 tabular-nums">
                      Tendered: {{ formatCurrency(pay.tendered) }}
                    </p>
                    <p v-if="pay.change_amount && pay.change_amount > 0" class="text-xs text-emerald-500 m-0 tabular-nums">
                      Change: {{ formatCurrency(pay.change_amount) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Summary</h4>
              <div class="bg-neutral-50 rounded-xl p-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-500">Subtotal</span>
                  <span class="font-semibold text-neutral-700 tabular-nums">{{ formatCurrency(selectedTx.subtotal) }}</span>
                </div>
                <div v-if="selectedTx.discount_total > 0" class="flex justify-between text-sm">
                  <span class="text-neutral-500">Discount</span>
                  <span class="font-semibold text-emerald-600 tabular-nums">-{{ formatCurrency(selectedTx.discount_total) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-500">VATable Sales</span>
                  <span class="tabular-nums text-neutral-600">{{ formatCurrency(selectedTx.vatable_sales) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-neutral-500">VAT (12%)</span>
                  <span class="tabular-nums text-neutral-600">{{ formatCurrency(selectedTx.vat_amount) }}</span>
                </div>
                <div v-if="selectedTx.vat_exempt_sales > 0" class="flex justify-between text-sm">
                  <span class="text-neutral-500">VAT Exempt</span>
                  <span class="tabular-nums text-neutral-600">{{ formatCurrency(selectedTx.vat_exempt_sales) }}</span>
                </div>
                <div v-if="selectedTx.zero_rated_sales > 0" class="flex justify-between text-sm">
                  <span class="text-neutral-500">Zero Rated</span>
                  <span class="tabular-nums text-neutral-600">{{ formatCurrency(selectedTx.zero_rated_sales) }}</span>
                </div>
                <div class="border-t border-neutral-200 pt-2 flex justify-between">
                  <span class="text-base font-bold text-neutral-800">Total</span>
                  <span class="text-base font-bold tabular-nums" :class="selectedTx.status === 'voided' ? 'text-red-500 line-through' : 'text-neutral-900'">
                    {{ formatCurrency(selectedTx.total_amount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Discount info -->
            <div v-if="selectedTx.discount_type" class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Discount Info</h4>
              <div class="bg-emerald-50 rounded-xl p-4 space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="text-emerald-700">Type</span>
                  <span class="font-semibold text-emerald-800 capitalize">{{ selectedTx.discount_type.replace('_', ' ') }}</span>
                </div>
                <div v-if="selectedTx.discount_id_number" class="flex justify-between text-sm">
                  <span class="text-emerald-700">ID Number</span>
                  <span class="font-semibold text-emerald-800">{{ selectedTx.discount_id_number }}</span>
                </div>
                <div v-if="selectedTx.discount_id_name" class="flex justify-between text-sm">
                  <span class="text-emerald-700">ID Name</span>
                  <span class="font-semibold text-emerald-800">{{ selectedTx.discount_id_name }}</span>
                </div>
              </div>
            </div>

            <!-- Return info -->
            <div v-if="selectedTx && isReturnTransaction(selectedTx) && selectedTx.notes" class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-3">Return Info</h4>
              <div class="bg-orange-50 rounded-xl p-4 space-y-1 border border-orange-200">
                <template v-if="parseReturnNotes(selectedTx.notes)">
                  <div class="flex justify-between text-sm">
                    <span class="text-orange-700">Original OR#</span>
                    <span class="font-semibold text-orange-800">{{ parseReturnNotes(selectedTx.notes)!.originalOR }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-orange-700">Reason</span>
                    <span class="font-semibold text-orange-800">{{ parseReturnNotes(selectedTx.notes)!.reason }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-orange-700">Approved By</span>
                    <span class="font-semibold text-orange-800">{{ parseReturnNotes(selectedTx.notes)!.approvedBy }}</span>
                  </div>
                </template>
                <div v-else class="text-sm text-orange-700">
                  <i class="pi pi-replay text-xs mr-1"></i> This is a return transaction
                </div>
              </div>
            </div>

            <!-- Void form -->
            <div v-if="showVoidForm" class="mb-6">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Void Transaction</h4>
              <div class="bg-red-50 rounded-xl p-4">
                <Message severity="warn" :closable="false" class="mb-3">
                  <div class="text-xs">This action cannot be undone. The transaction will be marked as voided.</div>
                </Message>

                <div class="mb-3">
                  <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Supervisor PIN *</label>
                  <Password
                    v-model="supervisorPin"
                    :feedback="false"
                    toggleMask
                    class="w-full"
                    placeholder="Enter supervisor PIN"
                    inputClass="w-full"
                  />
                </div>

                <div class="mb-3">
                  <label class="block text-xs font-semibold text-neutral-600 mb-1.5">Reason *</label>
                  <Textarea
                    v-model="voidReason"
                    rows="2"
                    class="w-full"
                    placeholder="Enter reason for voiding"
                  />
                </div>

                <Message v-if="voidError" severity="error" class="mb-3">
                  {{ voidError }}
                </Message>

                <div class="flex gap-2">
                  <Button label="Cancel" severity="secondary" size="small" outlined class="flex-1" @click="cancelVoid" :disabled="isVoiding" />
                  <Button label="Confirm Void" severity="danger" size="small" icon="pi pi-ban" class="flex-1" @click="handleVoid" :loading="isVoiding" :disabled="!supervisorPin || !voidReason" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div class="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <i class="pi pi-receipt text-2xl text-neutral-300"></i>
          </div>
          <p class="text-sm font-semibold text-neutral-400 m-0 mb-1">Select a transaction</p>
          <p class="text-xs text-neutral-300 m-0">Click on a transaction to view its details</p>
        </div>

        <!-- Action bar -->
        <div v-if="selectedTx" class="shrink-0 px-4 py-3 border-t border-neutral-100 bg-white flex items-center gap-2">
          <Button
            label="Reprint"
            icon="pi pi-print"
            severity="secondary"
            outlined
            size="small"
            @click="handleReprint"
          />
          <Button
            label="Preview"
            icon="pi pi-eye"
            severity="secondary"
            outlined
            size="small"
            @click="handlePreview"
          />
          <div class="flex-1"></div>
          <Button
            v-if="selectedTx.status === 'completed' && !isReturnTransaction(selectedTx) && !showVoidForm"
            label="Return"
            icon="pi pi-replay"
            severity="warn"
            size="small"
            @click="handleReturn"
          />
          <Button
            v-if="selectedTx.status === 'completed' && !showVoidForm"
            label="Void"
            icon="pi pi-ban"
            severity="danger"
            size="small"
            @click="startVoid"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.txh-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(229 229 229) transparent;
}
.txh-scroll::-webkit-scrollbar {
  width: 4px;
}
.txh-scroll::-webkit-scrollbar-thumb {
  background: rgb(229 229 229);
  border-radius: 4px;
}
</style>
