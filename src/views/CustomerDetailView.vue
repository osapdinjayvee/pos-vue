<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import CustomerProfile from '@/components/crm/CustomerProfile.vue'
import CustomerHistory from '@/components/crm/CustomerHistory.vue'
import LoyaltyPointsDisplay from '@/components/crm/LoyaltyPointsDisplay.vue'
import PointsHistory from '@/components/crm/PointsHistory.vue'
import TierProgress from '@/components/crm/TierProgress.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import { useCustomers } from '@/composables/useCustomers'
import { toDisplayCustomer } from '@/types/order'
import type { CustomerInput } from '@/types/order'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchCustomerDetail, customerDetail, detailLoading, updateCustomer } = useCustomers()

const customerId = computed(() => route.params.id as string)
const showEditForm = ref(false)
const editLoading = ref(false)

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
        <TabView>
          <TabPanel header="History">
            <CustomerHistory
              :customerId="customerId"
              @view-transaction="(id) => router.push({ name: 'transaction-detail', params: { id } })"
            />
          </TabPanel>
          <TabPanel header="Loyalty">
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
          <TabPanel header="Info">
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
        </TabView>
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

@media (max-width: 767.98px) {
  .customer-detail-view {
    padding: 1rem;
  }
}
</style>
