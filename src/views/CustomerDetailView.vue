<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import CustomerProfile from '@/components/crm/CustomerProfile.vue'
import CustomerHistory from '@/components/crm/CustomerHistory.vue'
import LoyaltyPointsDisplay from '@/components/crm/LoyaltyPointsDisplay.vue'
import PointsHistory from '@/components/crm/PointsHistory.vue'
import TierProgress from '@/components/crm/TierProgress.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import CreditLedger from '@/components/crm/CreditLedger.vue'
import CreditPaymentDialog from '@/components/crm/CreditPaymentDialog.vue'
import { useCustomers } from '@/composables/useCustomers'
import { creditService } from '@/services/creditService'
import { toDisplayCustomer } from '@/types/order'
import type { CustomerInput } from '@/types/order'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchCustomerDetail, customerDetail, detailLoading, updateCustomer } = useCustomers()

const customerId = computed(() => route.params.id as string)
const showEditForm = ref(false)
const editLoading = ref(false)
const showCreditPayment = ref(false)
const creditLedgerRef = ref<InstanceType<typeof CreditLedger> | null>(null)

const creditLimit = computed(() => customerDetail.value?.customer.credit_limit ?? 0)
const currentBalance = computed(() => customerDetail.value?.customer.current_balance ?? 0)
const availableCredit = computed(() => Math.max(0, creditLimit.value - currentBalance.value))

async function handleCreditPayment(data: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string }) {
  try {
    // Use a placeholder userId — in production this would come from auth
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    await creditService.receivePayment({
      customerId: customerId.value,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes
    }, authStore.currentUser?.id || 'system')
    toast.add({
      severity: 'success',
      summary: 'Payment Received',
      detail: `₱${data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} payment recorded`,
      life: 3000
    })
    showCreditPayment.value = false
    await loadDetail()
    creditLedgerRef.value?.refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to process payment',
      life: 5000
    })
  }
}

const displayCustomer = computed(() => {
  if (!customerDetail.value) return null
  return toDisplayCustomer(
    customerDetail.value.customer,
    customerDetail.value.stats.totalOrders,
    customerDetail.value.stats.totalSpent
  )
})

async function loadDetail() {
  if (!customerId.value) return
  await fetchCustomerDetail(customerId.value)
}

async function handleSaveCustomer(data: CustomerInput) {
  editLoading.value = true
  try {
    await updateCustomer(customerId.value, data)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Customer updated successfully',
      life: 3000
    })
    showEditForm.value = false
    await loadDetail()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to update customer',
      life: 5000
    })
  } finally {
    editLoading.value = false
  }
}

function goBack() {
  router.push({ name: 'customers' })
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="customer-detail-view">
    <Toast />

    <!-- Header -->
    <div class="detail-header">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Customers"
        severity="secondary"
        text
        @click="goBack"
      />
      <Button
        v-if="customerDetail"
        icon="pi pi-pencil"
        label="Edit"
        severity="secondary"
        outlined
        @click="showEditForm = true"
      />
    </div>

    <!-- Loading State -->
    <div v-if="detailLoading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
      <p>Loading customer details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="!customerDetail" class="error-state">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem;"></i>
      <p>Customer not found</p>
      <Button label="Go Back" @click="goBack" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Profile Card -->
      <CustomerProfile
        :customer="displayCustomer!"
        :tier="customerDetail.tier"
        :stats="customerDetail.stats"
      />

      <!-- Tabs -->
      <div class="detail-tabs">
        <Tabs value="history">
          <TabList>
            <Tab value="history">History</Tab>
            <Tab value="loyalty">Loyalty</Tab>
            <Tab value="credit">Credit</Tab>
            <Tab value="info">Info</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="history">
              <CustomerHistory :customerId="customerId" />
            </TabPanel>
            <TabPanel value="loyalty">
              <div class="loyalty-tab">
                <LoyaltyPointsDisplay :customerId="customerId" />
                <TierProgress
                  v-if="customerDetail.tier"
                  :currentSpend="customerDetail.customer.lifetime_spend || 0"
                  :currentTier="customerDetail.tier"
                  :nextTier="customerDetail.nextTier"
                />
                <PointsHistory :customerId="customerId" />
              </div>
            </TabPanel>
            <TabPanel value="credit">
              <div class="credit-tab">
                <!-- Credit Stats -->
                <div class="credit-stats">
                  <div class="stat-card">
                    <div class="stat-label">Credit Limit</div>
                    <div class="stat-value">₱{{ creditLimit.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
                  </div>
                  <div class="stat-card stat-danger">
                    <div class="stat-label">Outstanding Balance</div>
                    <div class="stat-value">₱{{ currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
                  </div>
                  <div class="stat-card stat-success">
                    <div class="stat-label">Available Credit</div>
                    <div class="stat-value">₱{{ availableCredit.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
                  </div>
                </div>

                <!-- Receive Payment Button -->
                <div v-if="currentBalance > 0" class="mb-4">
                  <Button
                    icon="pi pi-money-bill"
                    label="Receive Payment"
                    severity="success"
                    @click="showCreditPayment = true"
                  />
                </div>

                <!-- Credit Ledger -->
                <CreditLedger ref="creditLedgerRef" :customerId="customerId" />
              </div>
            </TabPanel>
            <TabPanel value="info">
              <div class="info-tab">
                <div v-if="customerDetail.customer.address" class="info-section">
                  <h4>Address</h4>
                  <p>{{ customerDetail.customer.address }}</p>
                  <p v-if="customerDetail.customer.city">{{ customerDetail.customer.city }}, {{ customerDetail.customer.postal_code || '' }}</p>
                  <p>{{ customerDetail.customer.country }}</p>
                </div>
                <div v-if="customerDetail.customer.tax_id" class="info-section">
                  <h4>Tax ID</h4>
                  <p>{{ customerDetail.customer.tax_id }}</p>
                </div>
                <div v-if="customerDetail.customer.notes" class="info-section">
                  <h4>Notes</h4>
                  <p>{{ customerDetail.customer.notes }}</p>
                </div>
                <div class="info-section">
                  <h4>Credit</h4>
                  <p>Credit Limit: ₱{{ customerDetail.customer.credit_limit.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</p>
                  <p>Current Balance: ₱{{ customerDetail.customer.current_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</p>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </template>

    <!-- Edit Form Dialog -->
    <CustomerForm
      v-if="customerDetail"
      v-model:visible="showEditForm"
      :customer="customerDetail.customer"
      :loading="editLoading"
      @save="handleSaveCustomer"
    />

    <!-- Credit Payment Dialog -->
    <CreditPaymentDialog
      v-if="customerDetail"
      v-model:visible="showCreditPayment"
      :customer="customerDetail.customer"
      @submit="handleCreditPayment"
    />
  </div>
</template>

<style scoped>
.customer-detail-view {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-tabs {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--p-text-muted-color);
}

.loyalty-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.info-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.info-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--p-text-muted-color);
}

.info-section p {
  margin: 0 0 0.25rem;
  color: var(--p-text-color);
}

.credit-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.credit-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat-card {
  padding: 1rem;
  border-radius: 8px;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
}

.stat-card.stat-danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-card.stat-success {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.stat-danger .stat-value {
  color: #dc2626;
}

.stat-success .stat-value {
  color: #16a34a;
}

@media (max-width: 767.98px) {
  .customer-detail-view {
    padding: 1rem;
  }
}
</style>
