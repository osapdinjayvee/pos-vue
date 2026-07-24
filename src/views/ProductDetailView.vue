<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import Paginator from 'primevue/paginator'
import { useToast } from 'primevue/usetoast'
import type { DisplayProduct, ProductStatus } from '@/types'
import { toDisplayProduct } from '@/types'
import { useProductStore } from '@/stores/product'
import { formatCurrency } from '@/utils/format'
import StockMovementDialog from '@/components/inventory/StockMovementDialog.vue'
import StockMovementHistory from '@/components/inventory/StockMovementHistory.vue'
import { variantRepository } from '@/repositories/variantRepository'
import { priceHistoryRepository, type DisplayPriceHistory } from '@/repositories/priceHistoryRepository'
import { inventoryService } from '@/services/inventoryService'
import type { DisplayVariant } from '@/types/inventory'
import { toDisplayVariant } from '@/types/inventory'
import VariantList from '@/components/inventory/VariantList.vue'
import ProductBatchesCard from '@/components/inventory/ProductBatchesCard.vue'
import ConfirmDialog from 'primevue/confirmdialog'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const productStore = useProductStore()

const product = ref<DisplayProduct | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isUploadingImage = ref(false)
const defaultVariantId = ref<string | null>(null)
const showStockDialog = ref(false)
const stockHistoryRef = ref<InstanceType<typeof StockMovementHistory> | null>(null)
const priceHistory = ref<DisplayPriceHistory[]>([])
const variants = ref<DisplayVariant[]>([])
const variantsLoading = ref(false)

// Pagination state
const priceHistoryPage = ref(0)
const priceHistoryRows = 5

// Paginated price history
const paginatedPriceHistory = computed(() => {
  const start = priceHistoryPage.value
  const end = start + priceHistoryRows
  return priceHistory.value.slice(start, end)
})

const onPriceHistoryPageChange = (event: { first: number; rows: number }) => {
  priceHistoryPage.value = event.first
}

onMounted(async () => {
  const productId = route.params.id as string
  const found = await productStore.fetchById(productId)
  if (found) {
    product.value = toDisplayProduct(found)

    // Fetch the default variant for stock management
    const variant = await variantRepository.getDefaultVariant(productId)
    if (variant) {
      defaultVariantId.value = variant.id
    }

    // Fetch all variants for this product
    await loadVariants(productId)

    // Fetch price history
    priceHistory.value = await priceHistoryRepository.getDisplayHistory(productId)
  } else {
    router.push('/products')
  }
})

// Load variants for a product
async function loadVariants(productId: string) {
  variantsLoading.value = true
  try {
    const dbVariants = await variantRepository.findByProductId(productId)
    // Get stock for each variant
    const variantIds = dbVariants.map(v => v.id)
    const stocks = await inventoryService.getStockMultiple(variantIds)

    variants.value = dbVariants.map(v => toDisplayVariant(v, stocks[v.id] || 0))
  } catch (error) {
    console.error('Error loading variants:', error)
    variants.value = []
  } finally {
    variantsLoading.value = false
  }
}

// Whether product has variants (including the default variant)
const hasVariants = computed(() => variants.value.length > 0)

// Whether product has multiple variants (more than just the default)
const hasMultipleVariants = computed(() => variants.value.length > 1)

// Total stock across all variants
const totalVariantStock = computed(() => {
  return variants.value.reduce((sum, v) => sum + v.currentStock, 0)
})

const triggerImageUpload = () => {
  fileInput.value?.click()
}

const onImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !product.value) return

  // Validate file size (1MB max)
  if (file.size > 1000000) {
    toast.add({
      severity: 'error',
      summary: 'File Too Large',
      detail: 'Image must be less than 1MB',
      life: 3000
    })
    return
  }

  isUploadingImage.value = true

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageData = e.target?.result as string

      // Update product in database
      const updated = await productStore.update(product.value!.id, { image: imageData })
      if (updated) {
        product.value!.image = imageData
        toast.add({
          severity: 'success',
          summary: 'Image Updated',
          detail: 'Product image has been updated',
          life: 3000
        })
      }
      isUploadingImage.value = false
    }
    reader.readAsDataURL(file)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Upload Failed',
      detail: 'Failed to upload image',
      life: 3000
    })
    isUploadingImage.value = false
  }

  // Reset input
  input.value = ''
}

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
  if (!product.value?.cost || product.value.cost === 0) return 0
  return ((product.value.price - product.value.cost) / product.value.price) * 100
})

const profit = computed(() => {
  if (!product.value) return 0
  return product.value.price - (product.value.cost || 0)
})

const stockStatus = computed(() => {
  if (!product.value) return { label: 'Unknown', severity: 'info' as const }
  if (product.value.stock === 0) return { label: 'Out of Stock', severity: 'danger' as const }
  if (product.value.stock < 10) return { label: 'Low Stock', severity: 'warn' as const }
  if (product.value.stock < 50) return { label: 'Medium Stock', severity: 'info' as const }
  return { label: 'In Stock', severity: 'success' as const }
})

const daysUntilExpiry = computed(() => {
  if (!product.value?.expirationDate) return null
  const today = new Date()
  const expDate = new Date(product.value.expirationDate)
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const expiryStatus = computed(() => {
  if (daysUntilExpiry.value === null) return null
  if (daysUntilExpiry.value < 0) return { label: 'Expired', severity: 'danger' as const }
  if (daysUntilExpiry.value <= 7) return { label: 'Expiring Soon', severity: 'danger' as const }
  if (daysUntilExpiry.value <= 30) return { label: 'Near Expiry', severity: 'warn' as const }
  return { label: 'Good', severity: 'success' as const }
})



const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goBack = () => {
  router.push('/products')
}

const editProduct = () => {
  if (product.value) {
    router.push(`/products/${product.value.id}/edit`)
  }
}

const onMovementRecorded = async (_newStock: number) => {
  // Re-fetch from the DB so the displayed stock matches the authoritative
  // products.stock used by the inventory list/dashboard (the movement-derived
  // value can drift from products.stock for single-variant products).
  const productId = route.params.id as string
  const refreshed = await productStore.fetchById(productId)
  if (refreshed && product.value) {
    product.value.stock = refreshed.stock
    product.value.status = refreshed.status
  }
  // Refresh variant stock totals and the stock history
  await loadVariants(productId)
  stockHistoryRef.value?.refresh()
}

/**
 * Adding a batch with an initial quantity records a stock receive, so the
 * displayed totals and history need the same refresh as a manual movement.
 */
const handleBatchesChanged = async () => {
  await onMovementRecorded(0)
}
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <input
    ref="fileInput"
    type="file"
    accept="image/*"
    style="display: none"
    @change="onImageSelect"
  />
  <div class="product-detail-page" v-if="product">
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
          <h1>{{ product.name }}</h1>
          <span class="header-sku">SKU: {{ product.sku }}</span>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Edit"
          icon="pi pi-pencil"
          @click="editProduct"
        />
      </div>
    </div>

    <!-- Content Grid -->
    <div class="detail-grid">
      <!-- Left Column -->
      <div class="detail-column">
        <!-- Product Overview Card -->
        <Card class="detail-card">
          <template #content>
            <div class="overview-section">
              <div
                class="product-image-large"
                :class="{ 'has-image': product.image, 'uploading': isUploadingImage }"
                @click="triggerImageUpload"
              >
                <div v-if="!product.image" class="image-placeholder">
                  <div class="upload-prompt">
                    <i class="pi pi-camera"></i>
                    <span>Click to upload</span>
                  </div>
                </div>
                <template v-else>
                  <img :src="product.image" :alt="product.name" />
                  <div class="image-overlay">
                    <i class="pi pi-pencil"></i>
                  </div>
                </template>
                <div v-if="isUploadingImage" class="upload-loading">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
              </div>
              <div class="product-overview">
                <Tag
                  :value="product.category"
                  severity="secondary"
                  class="category-tag"
                />
                <Tag
                  :value="getStatusLabel(product.status)"
                  :severity="getStatusSeverity(product.status)"
                />
                <p class="product-description">{{ product.description || 'No description available.' }}</p>
                <div class="product-codes">
                  <div class="code-item">
                    <span class="code-label">Barcode</span>
                    <span class="code-value">{{ product.barcode || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Price History Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-history"></i>
              Price History
            </div>
          </template>
          <template #content>
            <div v-if="priceHistory.length === 0" class="empty-history">
              <i class="pi pi-info-circle"></i>
              <span>No price changes recorded yet</span>
            </div>
            <template v-else>
              <div class="history-list">
                <div v-for="item in paginatedPriceHistory" :key="item.id" class="history-item price-history-row">
                  <span class="history-date">{{ formatDateTime(item.createdAt) }}</span>
                  <div class="price-values">
                    <span class="old-value">{{ formatCurrency(item.oldPrice || 0) }}</span>
                    <i class="pi pi-arrow-right"></i>
                    <span class="new-value">{{ formatCurrency(item.newPrice) }}</span>
                  </div>
                  <Tag
                    v-if="item.priceChange !== 0"
                    :value="`${item.priceChange > 0 ? '+' : ''}${formatCurrency(item.priceChange)}`"
                    :severity="item.priceChange > 0 ? 'danger' : 'success'"
                    class="change-tag"
                  />
                  <span class="history-reason" v-if="item.reason">{{ item.reason }}</span>
                </div>
              </div>
              <Paginator
                v-if="priceHistory.length > priceHistoryRows"
                :first="priceHistoryPage"
                :rows="priceHistoryRows"
                :totalRecords="priceHistory.length"
                @page="onPriceHistoryPageChange"
                class="history-paginator"
              />
            </template>
          </template>
        </Card>

        <!-- Stock History Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-list"></i>
              Stock History
            </div>
          </template>
          <template #content>
            <StockMovementHistory
              v-if="defaultVariantId"
              ref="stockHistoryRef"
              :variant-id="defaultVariantId"
              :limit="10"
            />
            <div v-else class="empty-history">
              <i class="pi pi-info-circle"></i>
              <span>No stock history available</span>
            </div>
          </template>
        </Card>

        <!-- Batches & Expiry Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-calendar-clock"></i>
              Batches &amp; Expiry
            </div>
          </template>
          <template #content>
            <!-- Keyed by variant: useBatches binds its variant id at setup. -->
            <ProductBatchesCard
              v-if="defaultVariantId"
              :key="defaultVariantId"
              :variant-id="defaultVariantId"
              :variant-name="product.name"
              @changed="handleBatchesChanged"
            />
            <div v-else class="empty-history">
              <i class="pi pi-info-circle"></i>
              <span>Expiry tracking unavailable for this product</span>
            </div>
          </template>
        </Card>
      </div>

      <!-- Right Column -->
      <div class="detail-column">
        <!-- Pricing Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-dollar"></i>
              Pricing
            </div>
          </template>
          <template #content>
            <div class="stats-grid">
              <div class="stat-item highlight">
                <span class="stat-label">Selling Price</span>
                <span class="stat-value large">{{ formatCurrency(product.price) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Cost Price</span>
                <span class="stat-value">{{ formatCurrency(product.cost) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Profit</span>
                <span class="stat-value" :class="profit >= 0 ? 'text-green' : 'text-red'">
                  {{ formatCurrency(profit) }}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Margin</span>
                <span class="stat-value" :class="profitMargin >= 20 ? 'text-green' : 'text-red'">
                  {{ profitMargin.toFixed(1) }}%
                </span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Inventory Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title-with-action">
              <div class="card-title">
                <i class="pi pi-box"></i>
                Inventory
              </div>
              <Button
                v-if="defaultVariantId"
                label="Adjust Stock"
                icon="pi pi-plus-minus"
                size="small"
                outlined
                @click="showStockDialog = true"
              />
            </div>
          </template>
          <template #content>
            <div class="stats-grid">
              <div class="stat-item full-width">
                <span class="stat-label">{{ hasMultipleVariants ? 'Total Stock (All Variants)' : 'Current Stock' }}</span>
                <div class="stat-value-row">
                  <span class="stat-value large">{{ hasMultipleVariants ? totalVariantStock : product.stock }}</span>
                  <span class="stat-unit">units</span>
                  <Tag
                    :value="stockStatus.label"
                    :severity="stockStatus.severity"
                  />
                </div>
              </div>
              <div v-if="product.expirationDate" class="stat-item full-width">
                <span class="stat-label">Expiration Date</span>
                <div class="stat-value-row">
                  <span class="stat-value">{{ formatDate(product.expirationDate) }}</span>
                  <Tag
                    v-if="expiryStatus"
                    :value="expiryStatus.label"
                    :severity="expiryStatus.severity"
                  />
                  <span class="days-info" v-if="daysUntilExpiry !== null">
                    ({{ Math.abs(daysUntilExpiry) }} days {{ daysUntilExpiry >= 0 ? 'left' : 'ago' }})
                  </span>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Variants Card (shown when product has variants) -->
        <Card v-if="hasVariants" class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-tags"></i>
              Product Variants
            </div>
          </template>
          <template #content>
            <VariantList
              :variants="variants"
              :base-price="product?.price || 0"
              :base-cost="product?.cost || 0"
              :loading="variantsLoading"
              readonly
            />
          </template>
        </Card>

        <!-- Sales Performance Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-chart-line"></i>
              Sales Performance
            </div>
          </template>
          <template #content>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Total Sold</span>
                <span class="stat-value">{{ product.sold }} <small>units</small></span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total Revenue</span>
                <span class="stat-value">{{ formatCurrency(product.revenue) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Avg. per Day</span>
                <span class="stat-value">{{ (product.sold / 30).toFixed(1) }} <small>units</small></span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Est. Profit</span>
                <span class="stat-value text-green">{{ formatCurrency(product.sold * profit) }}</span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Dates Card -->
        <Card class="detail-card">
          <template #title>
            <div class="card-title">
              <i class="pi pi-calendar"></i>
              Dates
            </div>
          </template>
          <template #content>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Created</span>
                <span class="stat-value">{{ formatDate(product.createdAt) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Last Updated</span>
                <span class="stat-value">{{ formatDate(product.updatedAt) }}</span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Stock Movement Dialog -->
    <StockMovementDialog
      v-if="defaultVariantId && product"
      v-model:visible="showStockDialog"
      :variant-id="defaultVariantId"
      variant-name="Default"
      :product-id="product.id"
      :product-name="product.name"
      :current-stock="product.stock"
      @movement-recorded="onMovementRecorded"
    />
  </div>
</template>

<style scoped>
.product-detail-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

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

.header-info h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.header-sku {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
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
  overflow-x: auto;
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

.card-title-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.overview-section {
  display: flex;
  gap: 1.5rem;
}

.product-image-large {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.product-image-large:hover {
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 2px var(--p-primary-100);
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-surface-400);
  transition: color 0.2s ease;
}

.upload-prompt i {
  font-size: 2.5rem;
}

.upload-prompt span {
  font-size: 0.875rem;
  font-weight: 500;
}

.product-image-large:hover .upload-prompt {
  color: var(--p-primary-color);
}

.product-image-large img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-overlay i {
  color: white;
  font-size: 0.875rem;
}

.product-image-large.has-image:hover .image-overlay {
  opacity: 1;
}

.upload-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-loading i {
  font-size: 2rem;
  color: var(--p-primary-color);
}

.product-overview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-tag {
  align-self: flex-start;
}

.product-description {
  margin: 0;
  color: var(--p-text-color);
  line-height: 1.6;
}

.product-codes {
  margin-top: auto;
}

.code-item {
  display: flex;
  gap: 0.5rem;
}

.code-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.code-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-item.full-width {
  grid-column: span 2;
}

.stat-item.highlight {
  background: var(--app-surface-50);
  padding: 1rem;
  border-radius: 8px;
  grid-column: span 2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.stat-value.large {
  font-size: 1.5rem;
}

.stat-value small {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}

.stat-value-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-unit {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.days-info {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.text-green {
  color: var(--p-green-500);
}

.text-red {
  color: var(--p-red-500);
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
  padding: 0.75rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  font-size: 0.875rem;
}

.history-date {
  color: var(--p-text-muted-color);
  min-width: 90px;
}

.history-value {
  font-weight: 600;
  color: var(--p-text-color);
  flex: 1;
}

.history-action {
  color: var(--p-text-color);
  min-width: 80px;
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

.empty-history {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.price-history-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.price-values {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-reason {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  margin-left: auto;
}

.old-value {
  color: var(--p-text-muted-color);
  text-decoration: line-through;
  font-size: 0.875rem;
}

.new-value {
  font-weight: 600;
  color: var(--p-text-color);
  font-size: 0.875rem;
}

.price-values .pi-arrow-right {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.change-tag {
  font-size: 0.75rem;
}

.empty-history i {
  font-size: 1rem;
}

.history-paginator {
  margin-top: 0.75rem;
  padding: 0;
  background: transparent;
  border: none;
}

.history-paginator :deep(.p-paginator-pages) {
  gap: 0.25rem;
}

.history-paginator :deep(.p-paginator-page),
.history-paginator :deep(.p-paginator-first),
.history-paginator :deep(.p-paginator-prev),
.history-paginator :deep(.p-paginator-next),
.history-paginator :deep(.p-paginator-last) {
  min-width: 2rem;
  height: 2rem;
  font-size: 0.875rem;
}

/* Large Tablet / Small Desktop - Two column with smaller right column */
@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: 1fr 340px;
  }
}

/* Tablet - Single column */
@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .overview-section {
    flex-direction: column;
  }

  .product-image-large {
    width: 100%;
    height: 200px;
  }

  .product-image-large.has-image .image-overlay {
    opacity: 1;
  }
}

/* Tablet Portrait */
@media (max-width: 768px) {
  .product-detail-page {
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

  .header-info h1 {
    font-size: 1.25rem;
  }

  .detail-card {
    border-radius: 8px;
  }

  .detail-card :deep(.p-card-body) {
    padding: 1rem;
  }

  .detail-card :deep(.p-card-title) {
    font-size: 0.9rem;
  }

  .history-item {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .history-date {
    min-width: auto;
    width: 100%;
    font-size: 0.75rem;
  }

  .price-history-row {
    gap: 0.5rem;
  }

  .history-reason {
    width: 100%;
    margin-left: 0;
    margin-top: 0.25rem;
  }

  .card-title-with-action {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .card-title-with-action .card-title {
    flex: 1;
    min-width: 150px;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .product-detail-page {
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

  .header-info h1 {
    font-size: 1.125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-sku {
    font-size: 0.75rem;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions :deep(.p-button) {
    flex: 1;
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

  .overview-section {
    gap: 1rem;
  }

  .product-image-large {
    height: 160px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-item.highlight,
  .stat-item.full-width {
    grid-column: span 1;
  }

  .stat-item.highlight {
    padding: 0.75rem;
  }

  .stat-value.large {
    font-size: 1.25rem;
  }

  .history-item {
    padding: 0.5rem;
    font-size: 0.8125rem;
  }

  .price-values {
    flex-wrap: wrap;
  }

  .old-value,
  .new-value {
    font-size: 0.8125rem;
  }

  .empty-history {
    padding: 0.75rem;
    font-size: 0.8125rem;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .card-title-with-action :deep(.p-button) {
    padding: 0.5rem 0.75rem;
  }

  .card-title-with-action :deep(.p-button-label) {
    font-size: 0.8125rem;
  }
}

/* Small Mobile */
@media (max-width: 400px) {
  .detail-page-header {
    padding: 0.5rem;
  }

  .header-info h1 {
    font-size: 1rem;
  }

  .header-actions :deep(.p-button-label) {
    display: none;
  }

  .header-actions :deep(.p-button) {
    padding: 0.5rem;
  }

  .product-image-large {
    height: 140px;
  }

  .upload-prompt i {
    font-size: 2rem;
  }

  .upload-prompt span {
    font-size: 0.75rem;
  }

  .stat-label {
    font-size: 0.7rem;
  }

  .stat-value {
    font-size: 0.9rem;
  }

  .stat-value.large {
    font-size: 1.125rem;
  }
}
</style>
