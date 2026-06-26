<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Password from 'primevue/password'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { transactionRepository } from '@/repositories/transactionRepository'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { transactionItemRepository } from '@/repositories/transactionItemRepository'
import { paymentRepository } from '@/repositories/paymentRepository'
import { useTransactionStore } from '@/stores/transaction'
import { vatService } from '@/services/vatService'
import { PaymentMethodLabels } from '@/types/payment'
import type { Transaction, TransactionItem } from '@/types/transaction'
import type { Payment } from '@/types/payment'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const transactionStore = useTransactionStore()

// Date range filter — use start of today (midnight) to avoid timezone display issues
const today = new Date()
today.setHours(0, 0, 0, 0)
const dateRange = ref<Date[]>([new Date(today), new Date(today)])
const searchQuery = ref('')
const statusFilter = ref<string>('all')

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Voided', value: 'voided' },
  { label: 'Returns', value: 'returns' }
]

// Data
const transactions = ref<Transaction[]>([])
const isLoading = ref(false)
const expandedRows = ref<Record<string, boolean>>({})

// Expanded row detail data cache
const detailCache = ref<Record<string, {
  items: Array<TransactionItem & { product_name: string; variant_name?: string }>
  payments: Payment[]
}>>({})
const loadingDetails = ref<Record<string, boolean>>({})

// Void state
const voidingTxId = ref<string | null>(null)
const supervisorPin = ref('')
const voidReason = ref('')
const isVoiding = ref(false)
const voidError = ref<string | null>(null)
const SUPERVISOR_PIN = '1234'

// Helpers
function isReturnTransaction(tx: Transaction): boolean {
  return (tx.notes?.startsWith('RETURN from OR#') ?? false) || tx.total_amount < 0
}

function parseReturnNotes(notes: string | null): { originalOR: string; reason: string; approvedBy: string } | null {
  if (!notes) return null
  const match = notes.match(/^RETURN from OR# (.+?) \| Reason: (.+?) \| Approved by: (.+)$/)
  if (!match || !match[1] || !match[2] || !match[3]) return null
  return { originalOR: match[1], reason: match[2], approvedBy: match[3] }
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
    list = list.filter(t => t.or_number.toLowerCase().includes(q))
  }

  return list
})

const summaryTotal = computed(() => {
  return filteredTransactions.value
    .filter(t => t.status === 'completed')
    .reduce((s, t) => s + t.total_amount, 0)
})

// Load transactions
async function loadTransactions() {
  isLoading.value = true
  try {
    const [start, end] = dateRange.value
    if (!start || !end) return
    const startDate = toLocalDateStr(start)
    const endDate = toLocalDateStr(end)
    transactions.value = await transactionRepository.findByLocalDateRange(startDate, endDate)
    // Clear caches
    detailCache.value = {}
    expandedRows.value = {}
  } catch {
    transactions.value = []
  } finally {
    isLoading.value = false
  }
}

// Load detail on row expand
async function onRowExpand(event: { data: Transaction }) {
  const txId = event.data.id
  if (detailCache.value[txId]) return

  loadingDetails.value[txId] = true
  try {
    const [items, payments] = await Promise.all([
      transactionItemRepository.getTransactionItemsWithProducts(txId),
      paymentRepository.findByTransaction(txId)
    ])
    detailCache.value[txId] = { items, payments }
  } catch {
    detailCache.value[txId] = { items: [], payments: [] }
  } finally {
    loadingDetails.value[txId] = false
  }
}

// Format helpers
function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function formatDateTime(dateStr: string): string {
  // If timestamp has Z suffix, new Date() correctly parses as UTC and
  // toLocaleString converts to local. If no Z, parse manually to avoid
  // new Date() treating it as UTC.
  if (dateStr.endsWith('Z')) {
    return new Date(dateStr).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }
  const [datePart, timePart] = dateStr.split('T')
  if (!datePart) return dateStr
  const [year, month, day] = datePart.split('-').map(Number)
  let hours = 0, minutes = 0, seconds = 0
  if (timePart) {
    const parts = timePart.replace(/\.\d+$/, '').split(':').map(Number)
    hours = parts[0] || 0
    minutes = parts[1] || 0
    seconds = parts[2] || 0
  }
  const d = new Date(year!, month! - 1, day!, hours, minutes, seconds)
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
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

// Actions
async function handleReprint(tx: Transaction) {
  const result = await transactionStore.printReceipt(tx.id)
  if (result.success) {
    toast.add({ severity: 'success', summary: 'Receipt Sent', detail: 'Receipt sent to printer.', life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'Print Failed', detail: result.error || 'Could not print receipt.', life: 5000 })
  }
}

async function handlePreview(tx: Transaction) {
  await transactionStore.previewReceipt(tx.id)
}

// Void flow
function startVoid(tx: Transaction) {
  voidingTxId.value = tx.id
  supervisorPin.value = ''
  voidReason.value = ''
  voidError.value = null
}

function cancelVoid() {
  voidingTxId.value = null
  voidError.value = null
}

async function confirmVoid(tx: Transaction) {
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
    const result = await transactionStore.voidTransaction(tx.id, voidReason.value, 'supervisor')
    if (result.success) {
      voidingTxId.value = null
      toast.add({ severity: 'success', summary: 'Transaction Voided', detail: `${tx.or_number} has been voided.`, life: 3000 })
      await loadTransactions()
    } else {
      voidError.value = result.error || 'Failed to void transaction'
    }
  } catch (e) {
    voidError.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    isVoiding.value = false
  }
}

// Watch date range changes
watch(dateRange, () => {
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    loadTransactions()
  }
})

onMounted(() => {
  loadTransactions()
})
</script>

<template>
  <div class="transactions-page">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Transactions</h1>
          <p class="text-muted">{{ filteredTransactions.length }} transactions &middot; {{ formatCurrency(summaryTotal) }} total</p>
        </div>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          dateFormat="M dd, yy"
          :showIcon="true"
          :showButtonBar="true"
          :manualInput="false"
          placeholder="Select date range"
          class="date-range-picker"
        />
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          class="filter-select"
        />
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search OR number..." />
        </IconField>
      </div>
    </div>

    <div class="table-container">
      <DataTable
        v-model:expandedRows="expandedRows"
        :value="filteredTransactions"
        :loading="isLoading"
        dataKey="id"
        stripedRows
        responsiveLayout="scroll"
        :paginator="filteredTransactions.length > 15"
        :rows="15"
        :rowsPerPageOptions="[15, 30, 50]"
        @row-expand="onRowExpand"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-receipt"></i>
            <p>No transactions found</p>
            <span class="empty-hint">Try changing the date range or filters</span>
          </div>
        </template>

        <Column expander style="width: 3rem" />

        <Column field="or_number" header="OR Number" sortable>
          <template #body="{ data }">
            <div class="or-cell">
              <span class="or-number">{{ data.or_number }}</span>
              <Tag v-if="isReturnTransaction(data)" value="Return" severity="warn" class="return-tag" />
            </div>
          </template>
        </Column>

        <Column field="created_at" header="Date/Time" sortable style="width: 200px">
          <template #body="{ data }">
            <span class="datetime">{{ formatDateTime(data.created_at) }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" sortable style="width: 110px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="statusSeverity(data.status)" class="status-tag" />
          </template>
        </Column>

        <Column field="total_amount" header="Total" sortable style="width: 140px">
          <template #body="{ data }">
            <span class="total-amount" :class="{ 'voided': data.status === 'voided' }">
              {{ formatCurrency(data.total_amount) }}
            </span>
          </template>
        </Column>

        <Column header="Actions" style="width: 160px">
          <template #body="{ data }">
            <div class="table-actions">
              <Button
                icon="pi pi-eye"
                text
                rounded
                severity="secondary"
                @click="router.push({ name: 'transaction-detail', params: { id: data.id } })"
                v-tooltip.top="'View Details'"
              />
            </div>
          </template>
        </Column>

        <!-- Row expansion template -->
        <template #expansion="{ data }">
          <div class="expansion-content">
            <!-- Loading state -->
            <div v-if="loadingDetails[data.id]" class="expansion-loading">
              <i class="pi pi-spinner pi-spin"></i>
              <span>Loading details...</span>
            </div>

            <template v-else-if="detailCache[data.id]">
              <div class="detail-grid">
                <!-- Items -->
                <div class="detail-card">
                  <h4 class="detail-title">Items</h4>
                  <div class="detail-list">
                    <div v-for="item in detailCache[data.id]!.items" :key="item.id" class="detail-item">
                      <span class="item-qty">{{ item.quantity }}x</span>
                      <div class="item-info">
                        <span class="item-name">{{ item.product_name }}</span>
                        <span v-if="item.variant_name" class="item-variant">{{ item.variant_name }}</span>
                      </div>
                      <Tag :value="taxTypeLabel(item.tax_type)" :severity="taxTypeSeverity(item.tax_type)" class="item-tax-tag" />
                      <span class="item-total">{{ formatCurrency(item.line_total) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Payments -->
                <div class="detail-card">
                  <h4 class="detail-title">Payments</h4>
                  <div class="detail-list">
                    <div v-for="pay in detailCache[data.id]!.payments" :key="pay.id" class="detail-payment">
                      <div class="pay-method">
                        <i class="pi text-sm" :class="{
                          'pi-wallet': pay.method === 'cash',
                          'pi-credit-card': pay.method === 'card',
                          'pi-mobile': ['gcash', 'maya', 'other_ewallet'].includes(pay.method),
                          'pi-star': pay.method === 'points'
                        }"></i>
                        <span>{{ paymentMethodLabel(pay.method) }}</span>
                        <span v-if="pay.reference_number" class="pay-ref">Ref: {{ pay.reference_number }}</span>
                      </div>
                      <div class="pay-amounts">
                        <span class="pay-amount">{{ formatCurrency(pay.amount) }}</span>
                        <span v-if="pay.tendered && pay.tendered > pay.amount" class="pay-tendered">
                          Tendered: {{ formatCurrency(pay.tendered) }}
                        </span>
                        <span v-if="pay.change_amount && pay.change_amount > 0" class="pay-change">
                          Change: {{ formatCurrency(pay.change_amount) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- VAT Breakdown -->
                <div class="detail-card">
                  <h4 class="detail-title">Summary</h4>
                  <div class="summary-rows">
                    <div class="summary-row">
                      <span>Subtotal</span>
                      <span class="summary-value">{{ formatCurrency(data.subtotal) }}</span>
                    </div>
                    <div v-if="data.discount_total > 0" class="summary-row">
                      <span>Discount</span>
                      <span class="summary-value discount">-{{ formatCurrency(data.discount_total) }}</span>
                    </div>
                    <div class="summary-row">
                      <span>VATable Sales</span>
                      <span class="summary-value">{{ formatCurrency(data.vatable_sales) }}</span>
                    </div>
                    <div class="summary-row">
                      <span>VAT (12%)</span>
                      <span class="summary-value">{{ formatCurrency(data.vat_amount) }}</span>
                    </div>
                    <div v-if="data.vat_exempt_sales > 0" class="summary-row">
                      <span>VAT Exempt</span>
                      <span class="summary-value">{{ formatCurrency(data.vat_exempt_sales) }}</span>
                    </div>
                    <div v-if="data.zero_rated_sales > 0" class="summary-row">
                      <span>Zero Rated</span>
                      <span class="summary-value">{{ formatCurrency(data.zero_rated_sales) }}</span>
                    </div>
                    <div class="summary-row summary-total">
                      <span>Total</span>
                      <span class="summary-value" :class="{ 'voided': data.status === 'voided' }">
                        {{ formatCurrency(data.total_amount) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Discount Info -->
                <div v-if="data.discount_type" class="detail-card detail-card--discount">
                  <h4 class="detail-title">Discount Info</h4>
                  <div class="summary-rows">
                    <div class="summary-row">
                      <span>Type</span>
                      <span class="summary-value capitalize">{{ data.discount_type.replace('_', ' ') }}</span>
                    </div>
                    <div v-if="data.discount_id_number" class="summary-row">
                      <span>ID Number</span>
                      <span class="summary-value">{{ data.discount_id_number }}</span>
                    </div>
                    <div v-if="data.discount_id_name" class="summary-row">
                      <span>ID Name</span>
                      <span class="summary-value">{{ data.discount_id_name }}</span>
                    </div>
                  </div>
                </div>

                <!-- Return Info -->
                <div v-if="isReturnTransaction(data) && data.notes" class="detail-card detail-card--return">
                  <h4 class="detail-title detail-title--return">Return Info</h4>
                  <div class="summary-rows">
                    <template v-if="parseReturnNotes(data.notes)">
                      <div class="summary-row">
                        <span>Original OR#</span>
                        <span class="summary-value">{{ parseReturnNotes(data.notes)!.originalOR }}</span>
                      </div>
                      <div class="summary-row">
                        <span>Reason</span>
                        <span class="summary-value">{{ parseReturnNotes(data.notes)!.reason }}</span>
                      </div>
                      <div class="summary-row">
                        <span>Approved By</span>
                        <span class="summary-value">{{ parseReturnNotes(data.notes)!.approvedBy }}</span>
                      </div>
                    </template>
                    <div v-else class="return-note">
                      <i class="pi pi-replay"></i> This is a return transaction
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expansion action bar -->
              <div class="expansion-actions">
                <Button
                  label="Reprint"
                  icon="pi pi-print"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="handleReprint(data)"
                />
                <Button
                  label="Preview"
                  icon="pi pi-eye"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="handlePreview(data)"
                />
                <div class="flex-1"></div>
                <Button
                  v-if="data.status === 'completed' && voidingTxId !== data.id"
                  label="Void"
                  icon="pi pi-ban"
                  severity="danger"
                  size="small"
                  @click="startVoid(data)"
                />
              </div>

              <!-- Inline void form -->
              <div v-if="voidingTxId === data.id" class="void-form">
                <h4 class="detail-title detail-title--danger">Void Transaction</h4>
                <Message severity="warn" :closable="false" class="void-warning">
                  <span class="text-xs">This action cannot be undone. The transaction will be marked as voided.</span>
                </Message>

                <div class="void-fields">
                  <div class="void-field">
                    <label>Supervisor PIN *</label>
                    <Password
                      v-model="supervisorPin"
                      :feedback="false"
                      toggleMask
                      placeholder="Enter supervisor PIN"
                      inputClass="w-full"
                      class="w-full"
                    />
                  </div>
                  <div class="void-field">
                    <label>Reason *</label>
                    <Textarea
                      v-model="voidReason"
                      rows="2"
                      class="w-full"
                      placeholder="Enter reason for voiding"
                    />
                  </div>
                </div>

                <Message v-if="voidError" severity="error" class="void-error">
                  {{ voidError }}
                </Message>

                <div class="void-actions">
                  <Button label="Cancel" severity="secondary" size="small" outlined @click="cancelVoid" :disabled="isVoiding" />
                  <Button
                    label="Confirm Void"
                    severity="danger"
                    size="small"
                    icon="pi pi-ban"
                    @click="confirmVoid(data)"
                    :loading="isVoiding"
                    :disabled="!supervisorPin || !voidReason"
                  />
                </div>
              </div>
            </template>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.transactions-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.date-range-picker {
  min-width: 260px;
}

.filter-select {
  min-width: 140px;
}

/* OR Number cell */
.or-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.or-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--p-text-color);
}

.return-tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
}

/* Date/time */
.datetime {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Items count */
.items-count {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Status tag */
.status-tag {
  text-transform: capitalize;
  font-size: 0.75rem;
}

/* Total amount */
.total-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
}

.total-amount.voided {
  color: var(--p-red-500);
  text-decoration: line-through;
}

/* Expansion content */
.expansion-content {
  padding: 1rem 1.5rem 1.5rem;
  background: var(--p-surface-50);
}

.expansion-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  padding: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-card {
  background: var(--p-surface-0);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--p-surface-200);
}

.detail-card--discount {
  background: color-mix(in srgb, var(--p-green-50) 50%, var(--p-surface-0));
  border-color: var(--p-green-200);
}

.detail-card--return {
  background: color-mix(in srgb, var(--p-orange-50) 50%, var(--p-surface-0));
  border-color: var(--p-orange-200);
}

.detail-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  margin: 0 0 0.75rem 0;
}

.detail-title--return {
  color: var(--p-orange-500);
}

.detail-title--danger {
  color: var(--p-red-500);
}

/* Items list */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-qty {
  min-width: 2rem;
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--p-primary-color);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-variant {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.item-tax-tag {
  font-size: 0.6rem;
  padding: 0.05rem 0.3rem;
}

.item-total {
  font-weight: 600;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
}

/* Payments */
.detail-payment {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.pay-method {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.pay-ref {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.pay-amounts {
  text-align: right;
}

.pay-amount {
  font-weight: 600;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
}

.pay-tendered,
.pay-change {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.pay-change {
  color: var(--p-green-500);
}

/* Summary rows */
.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.summary-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
}

.summary-value.discount {
  color: var(--p-green-600);
}

.summary-value.voided {
  color: var(--p-red-500);
  text-decoration: line-through;
}

.summary-value.capitalize {
  text-transform: capitalize;
}

.summary-total {
  border-top: 1px solid var(--p-surface-200);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.summary-total .summary-value {
  font-weight: 700;
  font-size: 1rem;
}

.return-note {
  font-size: 0.875rem;
  color: var(--p-orange-600);
}

/* Expansion actions */
.expansion-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-200);
}

/* Void form */
.void-form {
  margin-top: 1rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--p-red-50) 50%, var(--p-surface-0));
  border: 1px solid var(--p-red-200);
  border-radius: 10px;
}

.void-warning {
  margin-bottom: 0.75rem;
}

.void-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.void-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin-bottom: 0.375rem;
}

.void-error {
  margin-bottom: 0.75rem;
}

.void-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

@media (max-width: 879.98px) {
  .transactions-page {
    gap: 1rem;
  }

  .header-left h1 {
    font-size: 1rem;
  }

  .header-actions :deep(.p-button-label) {
    display: none;
  }

  .date-range-picker {
    min-width: 200px;
  }

  .filter-select {
    min-width: 110px;
  }

  .expansion-content {
    padding: 0.75rem;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
