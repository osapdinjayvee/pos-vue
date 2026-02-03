<script setup lang="ts">
import Tag from 'primevue/tag'
import type { Product, ProductStatus } from '@/types'

const props = defineProps<{
  product: Partial<Product>
}>()

const getStatusSeverity = (status?: ProductStatus) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warn'
    case 'out-of-stock':
      return 'danger'
    default:
      return 'info'
  }
}

const getStatusLabel = (status?: ProductStatus) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'out-of-stock':
      return 'Out of Stock'
    default:
      return 'Draft'
  }
}

const formatCurrency = (value?: number) => {
  if (!value) return '$0.00'
  return '$' + value.toFixed(2)
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="product-preview">
    <h4 class="preview-title">Product Preview</h4>
    <div class="preview-card">
      <div class="preview-image">
        <div v-if="!product.image" class="preview-placeholder">
          {{ getInitials(product.name) }}
        </div>
        <img v-else :src="product.image" :alt="product.name" />
        <Tag
          :value="getStatusLabel(product.status)"
          :severity="getStatusSeverity(product.status)"
          class="preview-status"
        />
      </div>
      <div class="preview-content">
        <span class="preview-category">{{ product.category || 'No Category' }}</span>
        <h3 class="preview-name">{{ product.name || 'Product Name' }}</h3>
        <p class="preview-sku">SKU: {{ product.sku || '---' }}</p>
        <p class="preview-description">
          {{ product.description || 'Product description will appear here...' }}
        </p>
        <div class="preview-details">
          <span class="preview-price">{{ formatCurrency(product.price) }}</span>
          <span class="preview-stock">
            {{ product.stock ?? 0 }} in stock
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-preview {
  background: var(--p-surface-50);
  border-radius: 12px;
  padding: 1.5rem;
  height: 100%;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  margin: 0 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  overflow: hidden;
}

.preview-image {
  position: relative;
  aspect-ratio: 1;
  background: var(--p-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  font-size: 3rem;
  font-weight: 600;
  color: var(--p-surface-400);
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-status {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}

.preview-content {
  padding: 1rem;
}

.preview-category {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0.25rem 0 0.5rem;
  line-height: 1.3;
}

.preview-sku {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin: 0 0 0.75rem;
}

.preview-description {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin: 0 0 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-100);
}

.preview-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.preview-stock {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}
</style>
