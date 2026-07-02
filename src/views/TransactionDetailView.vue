<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { transactionRepository } from '@/repositories/transactionRepository'
import { transactionItemRepository } from '@/repositories/transactionItemRepository'
import { paymentRepository } from '@/repositories/paymentRepository'
import { useTransactionStore } from '@/stores/transaction'
import { vatService } from '@/services/vatService'
import { PaymentMethodLabels } from '@/types/payment'
import type { Transaction, TransactionItem } from '@/types/transaction'
import type { Payment } from '@/types/payment'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const transactionStore = useTransactionStore()

const transaction = ref<Transaction | null>(null)
const items = ref<Array<TransactionItem & { product_name: string; variant_name?: string }>>([])
const payments = ref<Payment[]>([])
const isLoading = ref(true)
const isReprinting = ref(false)

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

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
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

function statusSeverity(status: string): 'success' | 'danger' | 'secondary' {
  if (status === 'completed') return 'success'
  if (status === 'voided') return 'danger'
  return 'secondary'
}

function paymentIcon(method: string): string {
  if (method === 'cash') return 'pi-wallet'
  if (method === 'card') return 'pi-credit-card'
  if (['gcash', 'maya', 'other_ewallet'].includes(method)) return 'pi-mobile'
  if (method === 'points') return 'pi-star'
  return 'pi-money-bill'
}

function formatDateTime(dateStr: string): string {
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

// Actions
function goBack() {
  router.push('/orders')
}

async function handleReprint() {
  if (!transaction.value) return
  isReprinting.value = true
  try {
    const result = await transactionStore.printReceipt(transaction.value.id)
    if (result.success) {
      toast.add({ severity: 'success', summary: 'Receipt Sent', detail: 'Receipt sent to printer.', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Print Failed', detail: result.error || 'Could not print receipt.', life: 5000 })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Print Failed', detail: 'An unexpected error occurred.', life: 5000 })
  } finally {
    isReprinting.value = false
  }
}

async function handlePreview() {
  if (!transaction.value) return
  await transactionStore.previewReceipt(transaction.value.id)
}

// Load data
onMounted(async () => {
  const txId = route.params.id as string
  isLoading.value = true
  try {
    const [tx, txItems, txPayments] = await Promise.all([
      transactionRepository.findById(txId),
      transactionItemRepository.getTransactionItemsWithProducts(txId),
      paymentRepository.findByTransaction(txId)
    ])
    if (tx) {
      transaction.value = tx
      items.value = txItems
      payments.value = txPayments
    } else {
      toast.add({ severity: 'error', summary: 'Not Found', detail: 'Transaction not found.', life: 3000 })
      router.push('/orders')
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load transaction details.', life: 5000 })
    router.push('/orders')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <Toast />
  <div class="transaction-detail-page" v-if="!isLoading && transaction">
    <!-- Header -->
    <div class="detail-page-header">
      <div class="header-left">
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          severity="secondary"
          @click="goBack"
        />
        <div class="header-info">
          <div class="header-title-row">
            <h1>{{ transaction.or_number }}</h1>
            <Tag
              :value="transaction.status"
              :severity="statusSeverity(transaction.status)"
              class="status-tag"
            />
            <Tag
              v-if="isReturnTransaction(transaction)"
              value="Return"
              severity="warn"
              class="return-tag"
            />
          </div>
          <span class="header-meta">{{ formatDateTime(transaction.created_at) }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="header-total" :class="{ 'voided': transaction.status === 'voided' }">
          {{ formatCurrency(transaction.total_amount) }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="detail-grid">
      <!-- Left Column -->
      <div class="detail-column">
        <!-- Items Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-list"></i>
              Items ({{ items.length }})
            </div>
          </template>
          <template #content>
            <div v-if="items.length === 0" class="empty-section">
              No items found
            </div>
            <div v-else class="items-list">
              <div v-for="item in items" :key="item.id" class="item-row">
                <span class="item-qty">{{ item.quantity }}x</span>
                <div class="item-info">
                  <span class="item-name">{{ item.product_name }}</span>
                  <span v-if="item.variant_name" class="item-variant">{{ item.variant_name }}</span>
                </div>
                <Tag
                  :value="taxTypeLabel(item.tax_type)"
                  :severity="taxTypeSeverity(item.tax_type)"
                  class="item-tax-tag"
                />
                <span class="item-total">{{ formatCurrency(item.line_total) }}</span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Payments Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-wallet"></i>
              Payments ({{ payments.length }})
            </div>
          </template>
          <template #content>
            <div v-if="payments.length === 0" class="empty-section">
              No payments found
            </div>
            <div v-else class="payments-list">
              <div v-for="pay in payments" :key="pay.id" class="payment-row">
                <div class="pay-method">
                  <i class="pi" :class="paymentIcon(pay.method)"></i>
                  <span class="pay-label">{{ paymentMethodLabel(pay.method) }}</span>
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
          </template>
        </Card>
      </div>

      <!-- Right Column -->
      <div class="detail-column">
        <!-- Summary Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-calculator"></i>
              Summary
            </div>
          </template>
          <template #content>
            <div class="summary-rows">
              <div class="summary-row">
                <span>Subtotal</span>
                <span class="summary-value">{{ formatCurrency(transaction.subtotal) }}</span>
              </div>
              <div v-if="transaction.discount_total > 0" class="summary-row">
                <span>Discount</span>
                <span class="summary-value discount">-{{ formatCurrency(transaction.discount_total) }}</span>
              </div>
              <div class="summary-row">
                <span>VATable Sales</span>
                <span class="summary-value">{{ formatCurrency(transaction.vatable_sales) }}</span>
              </div>
              <div class="summary-row">
                <span>VAT (12%)</span>
                <span class="summary-value">{{ formatCurrency(transaction.vat_amount) }}</span>
              </div>
              <div v-if="transaction.vat_exempt_sales > 0" class="summary-row">
                <span>VAT Exempt</span>
                <span class="summary-value">{{ formatCurrency(transaction.vat_exempt_sales) }}</span>
              </div>
              <div v-if="transaction.zero_rated_sales > 0" class="summary-row">
                <span>Zero Rated</span>
                <span class="summary-value">{{ formatCurrency(transaction.zero_rated_sales) }}</span>
              </div>
              <div class="summary-row summary-total">
                <span>Total</span>
                <span class="summary-value" :class="{ 'voided': transaction.status === 'voided' }">
                  {{ formatCurrency(transaction.total_amount) }}
                </span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Discount Info Card -->
        <Card v-if="transaction.discount_type" class="detail-card detail-card--discount">
          <template #title>
            <div class="card-title">
              <i class="pi pi-percentage"></i>
              Discount Info
            </div>
          </template>
          <template #content>
            <div class="summary-rows">
              <div class="summary-row">
                <span>Type</span>
                <span class="summary-value capitalize">{{ transaction.discount_type.replace('_', ' ') }}</span>
              </div>
              <div v-if="transaction.discount_id_number" class="summary-row">
                <span>ID Number</span>
                <span class="summary-value">{{ transaction.discount_id_number }}</span>
              </div>
              <div v-if="transaction.discount_id_name" class="summary-row">
                <span>ID Name</span>
                <span class="summary-value">{{ transaction.discount_id_name }}</span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Return Info Card -->
        <Card
          v-if="isReturnTransaction(transaction) && transaction.notes"
          class="detail-card detail-card--return"
        >
          <template #title>
            <div class="card-title card-title--return">
              <i class="pi pi-replay"></i>
              Return Info
            </div>
          </template>
          <template #content>
            <div class="summary-rows">
              <template v-if="parseReturnNotes(transaction.notes)">
                <div class="summary-row">
                  <span>Original OR#</span>
                  <span class="summary-value">{{ parseReturnNotes(transaction.notes)!.originalOR }}</span>
                </div>
                <div class="summary-row">
                  <span>Reason</span>
                  <span class="summary-value">{{ parseReturnNotes(transaction.notes)!.reason }}</span>
                </div>
                <div class="summary-row">
                  <span>Approved By</span>
                  <span class="summary-value">{{ parseReturnNotes(transaction.notes)!.approvedBy }}</span>
                </div>
              </template>
              <div v-else class="return-note">
                <i class="pi pi-replay"></i> This is a return transaction
              </div>
            </div>
          </template>
        </Card>

        <!-- Actions Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-cog"></i>
              Actions
            </div>
          </template>
          <template #content>
            <div class="actions-list">
              <Button
                label="Reprint Receipt"
                icon="pi pi-print"
                severity="secondary"
                outlined
                class="action-btn"
                :loading="isReprinting"
                @click="handleReprint"
              />
              <Button
                label="Preview Receipt"
                icon="pi pi-eye"
                severity="secondary"
                outlined
                class="action-btn"
                @click="handlePreview"
              />
              <Button
                label="Back to Transactions"
                icon="pi pi-arrow-left"
                severity="secondary"
                text
                class="action-btn"
                @click="goBack"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else-if="isLoading" class="loading-state">
    <i class="pi pi-spinner pi-spin"></i>
    <span>Loading transaction details...</span>
  </div>
</template>

<style scoped>
.transaction-detail-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

/* Header */
.detail-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--app-surface-0);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title-row h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  font-family: monospace;
  color: var(--p-text-color);
}

.header-meta {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.header-right {
  display: flex;
  align-items: center;
}

.header-total {
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
}

.header-total.voided {
  color: var(--p-red-500);
  text-decoration: line-through;
}

.status-tag {
  text-transform: capitalize;
  font-size: 0.75rem;
}

.return-tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
}

/* Grid Layout */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  min-width: 0;
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  overflow: hidden;
}

/* Cards */
.detail-card {
  border-radius: 12px;
  min-width: 0;
  overflow: hidden;
}

.detail-card :deep(.p-card-body) {
  min-width: 0;
}

.detail-card :deep(.p-card-content) {
  min-width: 0;
}

.detail-card--discount {
  background: color-mix(in srgb, var(--p-green-50) 50%, var(--app-surface-0));
  border: 1px solid var(--p-green-200);
}

.detail-card--return {
  background: color-mix(in srgb, var(--p-orange-50) 50%, var(--app-surface-0));
  border: 1px solid var(--p-orange-200);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.card-title i {
  color: var(--p-primary-color);
}

.card-title--return i {
  color: var(--p-orange-500);
}

/* Items List */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.item-qty {
  min-width: 2.5rem;
  font-weight: 600;
  font-size: 0.875rem;
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
  flex-shrink: 0;
}

.item-total {
  font-weight: 600;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--p-text-color);
  flex-shrink: 0;
}

/* Payments List */
.payments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.payment-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.pay-method {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  flex-wrap: wrap;
}

.pay-method .pi {
  font-size: 0.875rem;
}

.pay-label {
  font-weight: 500;
}

.pay-ref {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  width: 100%;
}

.pay-amounts {
  text-align: right;
  flex-shrink: 0;
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

/* Summary Rows */
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
  border-top: 1px solid var(--app-surface-200);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.summary-total .summary-value {
  font-weight: 700;
  font-size: 1.125rem;
}

.return-note {
  font-size: 0.875rem;
  color: var(--p-orange-600);
}

/* Actions */
.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  width: 100%;
  justify-content: flex-start;
}

/* Empty / Loading */
.empty-section {
  padding: 1rem;
  text-align: center;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
  color: var(--p-text-muted-color);
  font-size: 1rem;
}

.loading-state i {
  font-size: 2rem;
  color: var(--p-primary-color);
}

/* Responsive: Tablet and below */
@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: 1fr 340px;
  }
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .transaction-detail-page {
    gap: 1rem;
  }

  .detail-grid {
    gap: 1rem;
  }

  .detail-column {
    gap: 1rem;
  }

  .detail-page-header {
    padding: 0.75rem 1rem;
    border-radius: 8px;
  }

  .header-title-row h1 {
    font-size: 1.25rem;
  }

  .header-total {
    font-size: 1.25rem;
  }

  .detail-card {
    border-radius: 8px;
  }

  .detail-card :deep(.p-card-body) {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .transaction-detail-page {
    gap: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .detail-page-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.75rem;
  }

  .header-left {
    width: 100%;
  }

  .header-info {
    flex: 1;
    min-width: 0;
  }

  .header-title-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .header-title-row h1 {
    font-size: 1.125rem;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .header-total {
    font-size: 1.5rem;
  }

  .detail-grid {
    gap: 0.75rem;
  }

  .detail-column {
    gap: 0.75rem;
  }

  .detail-card :deep(.p-card-body) {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .item-row {
    padding: 0.5rem;
  }

  .payment-row {
    padding: 0.5rem;
    flex-wrap: wrap;
  }
}

@media (max-width: 400px) {
  .detail-page-header {
    padding: 0.5rem;
  }

  .header-title-row h1 {
    font-size: 1rem;
  }

  .header-meta {
    font-size: 0.75rem;
  }

  .header-total {
    font-size: 1.25rem;
  }
}
</style>