<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Timeline from 'primevue/timeline'
import type { DisplayProduct, ProductStatus } from '@/types'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  product: DisplayProduct | null
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  edit: [product: DisplayProduct]
}>()

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const getStatusSeverity = (status: ProductStatus) => {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'warn'
    case 'out-of-stock': return 'danger'
    default: return 'info'
  }
}

const getStatusLabel = (status: ProductStatus) => {
  switch (status) {
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'out-of-stock': return 'Out of Stock'
    default: return status
  }
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const profitMargin = computed(() => {
  if (!props.product?.cost || props.product.cost === 0) return 0
  return ((props.product.price - props.product.cost) / props.product.price) * 100
})

const profit = computed(() => {
  if (!props.product) return 0
  return props.product.price - (props.product.cost || 0)
})

const stockStatus = computed(() => {
  if (!props.product) return { label: 'Unknown', severity: 'info' }
  if (props.product.stock === 0) return { label: 'Out of Stock', severity: 'danger' }
  if (props.product.stock < 10) return { label: 'Low Stock', severity: 'warn' }
  if (props.product.stock < 50) return { label: 'Medium Stock', severity: 'info' }
  return { label: 'In Stock', severity: 'success' }
})

const daysUntilExpiry = computed(() => {
  if (!props.product?.expirationDate) return null
  const today = new Date()
  const expDate = new Date(props.product.expirationDate)
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const expiryStatus = computed(() => {
  if (daysUntilExpiry.value === null) return null
  if (daysUntilExpiry.value < 0) return { label: 'Expired', severity: 'danger' }
  if (daysUntilExpiry.value <= 7) return { label: 'Expiring Soon', severity: 'danger' }
  if (daysUntilExpiry.value <= 30) return { label: 'Near Expiry', severity: 'warn' }
  return { label: 'Good', severity: 'success' }
})

// Mock price history data
const priceHistory = computed(() => {
  if (!props.product) return []
  const basePrice = props.product.price
  return [
    { date: '2024-01-15', price: basePrice, change: 0 },
    { date: '2024-01-01', price: basePrice * 0.95, change: -5 },
    { date: '2023-12-15', price: basePrice * 0.90, change: -10 },
    { date: '2023-12-01', price: basePrice * 0.85, change: -15 },
  ]
})

// Mock stock history data
const stockHistory = computed(() => {
  if (!props.product) return []
  return [
    { date: '2024-01-15', action: 'Sale', quantity: -5, balance: props.product.stock },
    { date: '2024-01-14', action: 'Restock', quantity: 50, balance: props.product.stock + 5 },
    { date: '2024-01-13', action: 'Sale', quantity: -12, balance: props.product.stock - 45 },
    { date: '2024-01-12', action: 'Sale', quantity: -8, balance: props.product.stock - 33 },
    { date: '2024-01-10', action: 'Adjustment', quantity: -2, balance: props.product.stock - 25 },
  ]
})

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <Drawer
    v-model:visible="drawerVisible"
    position="right"
    :header="product?.name || 'Product Details'"
    class="product-detail-drawer"
    style="width: 480px"
  >
    <template v-if="product">
      <div class="product-detail-content">
        <!-- Product Header -->
        <div class="detail-header">
          <div class="detail-image">
            <div v-if="!product.image" class="detail-placeholder">
              {{ getInitials(product.name) }}
            </div>
            <img v-else :src="product.image" :alt="product.name" />
          </div>
          <div class="detail-title">
            <div class="detail-category">{{ product.category }}</div>
            <h2>{{ product.name }}</h2>
            <div class="detail-sku">SKU: {{ product.sku }}</div>
            <Tag
              :value="getStatusLabel(product.status)"
              :severity="getStatusSeverity(product.status)"
            />
          </div>
        </div>

        <Divider />

        <!-- Pricing Section -->
        <div class="detail-section">
          <h3><i class="pi pi-dollar"></i> Pricing</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Selling Price</span>
              <span class="detail-value price">{{ formatCurrency(product.price) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Cost Price</span>
              <span class="detail-value">{{ formatCurrency(product.cost) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Profit</span>
              <span class="detail-value" :class="profit >= 0 ? 'text-green' : 'text-red'">
                {{ formatCurrency(profit) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Margin</span>
              <span class="detail-value" :class="profitMargin >= 20 ? 'text-green' : 'text-red'">
                {{ profitMargin.toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Stock Section -->
        <div class="detail-section">
          <h3><i class="pi pi-box"></i> Inventory</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Current Stock</span>
              <span class="detail-value">
                {{ product.stock }} units
                <Tag
                  :value="stockStatus.label"
                  :severity="stockStatus.severity"
                  class="ml-2"
                />
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Barcode</span>
              <span class="detail-value">{{ product.barcode || 'N/A' }}</span>
            </div>
            <div v-if="product.expirationDate" class="detail-item full-width">
              <span class="detail-label">Expiration Date</span>
              <span class="detail-value">
                {{ formatDate(product.expirationDate) }}
                <Tag
                  v-if="expiryStatus"
                  :value="expiryStatus.label"
                  :severity="expiryStatus.severity"
                  class="ml-2"
                />
                <span v-if="daysUntilExpiry !== null" class="days-left">
                  ({{ daysUntilExpiry }} days {{ daysUntilExpiry >= 0 ? 'left' : 'ago' }})
                </span>
              </span>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Sales Performance Section -->
        <div class="detail-section">
          <h3><i class="pi pi-chart-line"></i> Sales Performance</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Total Sold</span>
              <span class="detail-value">{{ product.sold }} units</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Total Revenue</span>
              <span class="detail-value">{{ formatCurrency(product.revenue) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Avg. per Day</span>
              <span class="detail-value">{{ (product.sold / 30).toFixed(1) }} units</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Est. Profit</span>
              <span class="detail-value text-green">
                {{ formatCurrency(product.sold * profit) }}
              </span>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Price History -->
        <div class="detail-section">
          <h3><i class="pi pi-history"></i> Price History</h3>
          <div class="history-list">
            <div v-for="item in priceHistory" :key="item.date" class="history-item">
              <span class="history-date">{{ formatDate(item.date) }}</span>
              <span class="history-value">{{ formatCurrency(item.price) }}</span>
              <Tag
                v-if="item.change !== 0"
                :value="`${item.change > 0 ? '+' : ''}${item.change}%`"
                :severity="item.change > 0 ? 'success' : 'danger'"
                class="history-change"
              />
            </div>
          </div>
        </div>

        <Divider />

        <!-- Stock History -->
        <div class="detail-section">
          <h3><i class="pi pi-list"></i> Stock History</h3>
          <div class="history-list">
            <div v-for="(item, index) in stockHistory" :key="index" class="history-item">
              <span class="history-date">{{ formatDate(item.date) }}</span>
              <span class="history-action">{{ item.action }}</span>
              <span
                class="history-qty"
                :class="item.quantity > 0 ? 'text-green' : 'text-red'"
              >
                {{ item.quantity > 0 ? '+' : '' }}{{ item.quantity }}
              </span>
              <span class="history-balance">{{ item.balance }} units</span>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Description -->
        <div class="detail-section">
          <h3><i class="pi pi-info-circle"></i> Description</h3>
          <p class="detail-description">{{ product.description || 'No description available.' }}</p>
        </div>

        <Divider />

        <!-- Timestamps -->
        <div class="detail-section">
          <h3><i class="pi pi-calendar"></i> Dates</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Created</span>
              <span class="detail-value">{{ formatDate(product.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Updated</span>
              <span class="detail-value">{{ formatDate(product.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="detail-footer">
        <Button
          label="Edit Product"
          icon="pi pi-pencil"
          @click="product && emit('edit', product)"
        />
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.product-detail-content {
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.detail-placeholder {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-surface-400);
}

.detail-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.detail-title {
  flex: 1;
}

.detail-category {
  font-size: 0.75rem;
  color: var(--p-primary-color);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.detail-title h2 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.detail-sku {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.5rem;
}

.detail-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-section h3 i {
  color: var(--p-primary-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.full-width {
  grid-column: span 2;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.detail-value.price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-primary-color);
}

.text-green {
  color: var(--p-green-500);
}

.text-red {
  color: var(--p-red-500);
}

.ml-2 {
  margin-left: 0.5rem;
}

.days-left {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--app-surface-50);
  border-radius: 6px;
  font-size: 0.875rem;
}

.history-date {
  color: var(--p-text-muted-color);
  min-width: 80px;
}

.history-value {
  font-weight: 600;
  color: var(--p-text-color);
}

.history-action {
  color: var(--p-text-color);
  min-width: 70px;
}

.history-qty {
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.history-balance {
  color: var(--p-text-muted-color);
  margin-left: auto;
}

.history-change {
  margin-left: auto;
}

.detail-description {
  font-size: 0.875rem;
  color: var(--p-text-color);
  line-height: 1.6;
  margin: 0;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
