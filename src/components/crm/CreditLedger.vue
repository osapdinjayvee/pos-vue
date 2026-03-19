<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import { creditLedgerRepository } from '@/repositories/creditLedgerRepository'
import { transactionService } from '@/services/transactionService'
import type { CreditLedgerEntry } from '@/types/credit'
import type { Transaction, TransactionItem } from '@/types/transaction'
import { PaymentMethodLabels } from '@/types/payment'

const props = defineProps<{
  customerId: string
}>()

const entries = ref<CreditLedgerEntry[]>([])
const loading = ref(false)

// Transaction detail dialog
const showDetail = ref(false)
const detailLoading = ref(false)
const detailTransaction = ref<Transaction | null>(null)
const detailItems = ref<TransactionItem[]>([])
const detailPayments = ref<any[]>([])

async function load() {
  loading.value = true
  try {
    entries.value = await creditLedgerRepository.findByCustomer(props.customerId, { limit: 50 })
  } finally {
    loading.value = false
  }
}

async function openTransactionDetail(transactionId: string) {
  showDetail.value = true
  detailLoading.value = true
  detailTransaction.value = null
  detailItems.value = []
  detailPayments.value = []
  try {
    const result = await transactionService.getTransactionDetails(transactionId)
    detailTransaction.value = result.transaction
    detailItems.value = result.items
    detailPayments.value = result.payments
  } finally {
    detailLoading.value = false
  }
}

function handleRowClick(entry: CreditLedgerEntry) {
  if (entry.transaction_id) {
    openTransactionDetail(entry.transaction_id)
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(amount: number | undefined | null): string {
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getPaymentLabel(method: string): string {
  return (PaymentMethodLabels as Record<string, string>)[method] || method
}

onMounted(load)

defineExpose({ refresh: load })
</script>

<template>
  <DataTable
    :value="entries"
    :loading="loading"
    stripedRows
    size="small"
    :paginator="entries.length > 10"
    :rows="10"
    emptyMessage="No credit history yet"
  >
    <Column field="created_at" header="Date" :sortable="true" style="min-width: 150px">
      <template #body="{ data }">
        {{ formatDate(data.created_at) }}
      </template>
    </Column>
    <Column field="type" header="Type" style="min-width: 100px">
      <template #body="{ data }">
        <Tag
          :value="data.type === 'charge' ? 'Charge' : 'Payment'"
          :severity="data.type === 'charge' ? 'danger' : 'success'"
        />
      </template>
    </Column>
    <Column field="amount" header="Amount" style="min-width: 100px">
      <template #body="{ data }">
        <span :class="data.type === 'charge' ? 'text-red-600' : 'text-green-600'" class="font-semibold">
          {{ data.type === 'charge' ? '+' : '-' }}{{ formatCurrency(data.amount) }}
        </span>
      </template>
    </Column>
    <Column field="running_balance" header="Balance" style="min-width: 100px">
      <template #body="{ data }">
        {{ formatCurrency(data.running_balance) }}
      </template>
    </Column>
    <Column header="Details" style="min-width: 120px">
      <template #body="{ data }">
        <button
          v-if="data.transaction_id"
          class="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
          @click="handleRowClick(data)"
        >
          View Transaction
        </button>
        <span v-else class="text-sm text-surface-400">
          {{ data.payment_method ? getPaymentLabel(data.payment_method) : '-' }}
        </span>
      </template>
    </Column>
  </DataTable>

  <!-- Transaction Detail Dialog -->
  <Dialog
    v-model:visible="showDetail"
    header="Transaction Details"
    modal
    :style="{ width: '36rem' }"
  >
    <div v-if="detailLoading" class="flex items-center justify-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
    </div>

    <div v-else-if="!detailTransaction" class="text-center py-8 text-surface-400">
      Transaction not found
    </div>

    <div v-else class="flex flex-col gap-4">
      <!-- Header Info -->
      <div class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200">
        <div>
          <div class="text-xs text-surface-500 uppercase">OR Number</div>
          <div class="font-semibold">{{ detailTransaction.or_number }}</div>
        </div>
        <div>
          <div class="text-xs text-surface-500 uppercase">Date</div>
          <div class="font-semibold">{{ formatDate(detailTransaction.created_at) }}</div>
        </div>
        <div>
          <div class="text-xs text-surface-500 uppercase">Status</div>
          <Tag
            :value="detailTransaction.status"
            :severity="detailTransaction.status === 'completed' ? 'success' : detailTransaction.status === 'voided' ? 'danger' : 'secondary'"
          />
        </div>
        <div>
          <div class="text-xs text-surface-500 uppercase">Total</div>
          <div class="font-bold text-lg">{{ formatCurrency(detailTransaction.total_amount) }}</div>
        </div>
      </div>

      <!-- Items -->
      <div>
        <h4 class="text-sm font-semibold text-surface-600 uppercase mb-2">Items</h4>
        <div class="border border-surface-200 rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-50">
              <tr>
                <th class="text-left px-3 py-2 font-medium text-surface-600">Item</th>
                <th class="text-center px-3 py-2 font-medium text-surface-600">Qty</th>
                <th class="text-right px-3 py-2 font-medium text-surface-600">Price</th>
                <th class="text-right px-3 py-2 font-medium text-surface-600">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in detailItems" :key="item.id" class="border-t border-surface-100">
                <td class="px-3 py-2">
                  {{ item.product_name }}
                  <span v-if="item.variant_name" class="text-surface-400 text-xs"> ({{ item.variant_name }})</span>
                </td>
                <td class="text-center px-3 py-2">{{ item.quantity }}</td>
                <td class="text-right px-3 py-2">{{ formatCurrency(item.unit_price) }}</td>
                <td class="text-right px-3 py-2 font-semibold">{{ formatCurrency(item.line_total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payments -->
      <div>
        <h4 class="text-sm font-semibold text-surface-600 uppercase mb-2">Payments</h4>
        <div class="space-y-1">
          <div
            v-for="payment in detailPayments"
            :key="payment.id"
            class="flex justify-between items-center px-3 py-2 rounded-lg bg-surface-50"
          >
            <span class="font-medium">{{ getPaymentLabel(payment.payment_method || payment.method) }}</span>
            <span class="font-semibold">{{ formatCurrency(payment.amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="border-t border-surface-200 pt-3 space-y-1">
        <div class="flex justify-between text-sm">
          <span class="text-surface-500">Subtotal</span>
          <span>{{ formatCurrency(detailTransaction.subtotal) }}</span>
        </div>
        <div v-if="detailTransaction.discount_total" class="flex justify-between text-sm">
          <span class="text-surface-500">Discount</span>
          <span class="text-red-600">-{{ formatCurrency(detailTransaction.discount_total) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-surface-500">VAT</span>
          <span>{{ formatCurrency(detailTransaction.vat_amount) }}</span>
        </div>
        <div class="flex justify-between font-bold text-base pt-1 border-t border-surface-200">
          <span>Total</span>
          <span>{{ formatCurrency(detailTransaction.total_amount) }}</span>
        </div>
      </div>
    </div>
  </Dialog>
</template>
