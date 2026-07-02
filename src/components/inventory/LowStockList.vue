<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import LowStockAlert from './LowStockAlert.vue'
import { useInventoryStore } from '@/stores/inventory'
import type { DisplayStockAlert } from '@/types/inventory'

const emit = defineEmits<{
  'view-product': [alert: DisplayStockAlert]
  'add-stock': [alert: DisplayStockAlert]
}>()

const inventoryStore = useInventoryStore()

const activeTab = ref('0')

const stockAlerts = computed(() => inventoryStore.lowStockAlerts)
const expiryAlerts = computed(() => inventoryStore.expiryAlerts)
const allAlerts = computed(() => inventoryStore.alerts)
const alertCounts = computed(() => inventoryStore.alertCounts)
const isLoading = computed(() => inventoryStore.isLoading)

const outOfStockCount = computed(() => alertCounts.value.out_of_stock || 0)
const lowStockCount = computed(() => alertCounts.value.low_stock || 0)
const expiringCount = computed(() => alertCounts.value.expiring_soon || 0)
const expiredCount = computed(() => alertCounts.value.expired || 0)

const totalStockIssues = computed(() => outOfStockCount.value + lowStockCount.value)
const totalExpiryIssues = computed(() => expiringCount.value + expiredCount.value)

onMounted(() => {
  inventoryStore.fetchAlerts()
})

async function handleAcknowledge(alert: DisplayStockAlert) {
  await inventoryStore.acknowledgeAlert(alert.id, 'current-user') // TODO: Get real user ID
}

function handleViewProduct(alert: DisplayStockAlert) {
  emit('view-product', alert)
}

function handleAddStock(alert: DisplayStockAlert) {
  emit('add-stock', alert)
}

function refreshAlerts() {
  inventoryStore.fetchAlerts()
}
</script>

<template>
  <Card class="low-stock-card">
    <template #title>
      <div class="card-header">
        <div class="header-title">
          <i class="pi pi-exclamation-triangle" />
          <span>Inventory Alerts</span>
          <Badge
            v-if="allAlerts.length > 0"
            :value="allAlerts.length"
            severity="danger"
          />
        </div>
        <Button
          icon="pi pi-refresh"
          text
          rounded
          size="small"
          @click="refreshAlerts"
          :loading="isLoading"
        />
      </div>
    </template>

    <template #content>
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="0">
            <div class="tab-header">
              <span>Stock Issues</span>
              <Badge
                v-if="totalStockIssues > 0"
                :value="totalStockIssues"
                :severity="outOfStockCount > 0 ? 'danger' : 'warn'"
              />
            </div>
          </Tab>
          <Tab value="1">
            <div class="tab-header">
              <span>Expiry Issues</span>
              <Badge
                v-if="totalExpiryIssues > 0"
                :value="totalExpiryIssues"
                :severity="expiredCount > 0 ? 'danger' : 'warn'"
              />
            </div>
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0">
            <div v-if="stockAlerts.length === 0" class="empty-state">
              <i class="pi pi-check-circle" />
              <p>No stock issues</p>
            </div>

            <div v-else class="alerts-list">
              <LowStockAlert
                v-for="alert in stockAlerts"
                :key="alert.id"
                :alert="alert"
                @acknowledge="handleAcknowledge"
                @view-product="handleViewProduct"
                @add-stock="handleAddStock"
              />
            </div>
          </TabPanel>

          <TabPanel value="1">
            <div v-if="expiryAlerts.length === 0" class="empty-state">
              <i class="pi pi-check-circle" />
              <p>No expiry issues</p>
            </div>

            <div v-else class="alerts-list">
              <LowStockAlert
                v-for="alert in expiryAlerts"
                :key="alert.id"
                :alert="alert"
                @acknowledge="handleAcknowledge"
                @view-product="handleViewProduct"
                @add-stock="handleAddStock"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <div v-if="allAlerts.length > 0" class="summary-bar">
        <div class="summary-item danger" v-if="outOfStockCount > 0">
          <i class="pi pi-times-circle" />
          <span>{{ outOfStockCount }} out of stock</span>
        </div>
        <div class="summary-item warning" v-if="lowStockCount > 0">
          <i class="pi pi-exclamation-triangle" />
          <span>{{ lowStockCount }} low stock</span>
        </div>
        <div class="summary-item danger" v-if="expiredCount > 0">
          <i class="pi pi-clock" />
          <span>{{ expiredCount }} expired</span>
        </div>
        <div class="summary-item warning" v-if="expiringCount > 0">
          <i class="pi pi-clock" />
          <span>{{ expiringCount }} expiring soon</span>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.low-stock-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-title i {
  color: var(--p-orange-500);
}

.tab-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2.5rem;
  color: var(--p-green-500);
  margin-bottom: 0.5rem;
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--app-surface-200);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
}

.summary-item.danger {
  color: var(--p-red-600);
}

.summary-item.warning {
  color: var(--p-orange-600);
}

.summary-item i {
  font-size: 0.875rem;
}
</style>
