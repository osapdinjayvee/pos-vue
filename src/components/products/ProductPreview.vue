<script setup lang="ts">
import Tag from 'primevue/tag'
import type { DisplayProduct, ProductStatus } from '@/types'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  product: Partial<DisplayProduct>
}>()

const emit = defineEmits<{
  'image-click': []
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
    <div class="preview-card">
      <div
        class="preview-image"
        :class="{ 'has-image': product.image }"
        @click="emit('image-click')"
      >
        <div v-if="!product.image" class="preview-placeholder">
          <i class="pi pi-camera"></i>
          <span>Click to upload</span>
        </div>
        <template v-else>
          <img :src="product.image" :alt="product.name" />
          <div class="image-overlay">
            <i class="pi pi-pencil"></i>
          </div>
        </template>
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
  height: 100%;
}

.preview-card {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 12px;
  overflow: hidden;
}

.preview-image {
  position: relative;
  background: var(--app-surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.preview-image:hover {
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 2px var(--p-primary-100);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-surface-400);
  transition: color 0.2s ease;
}

.preview-placeholder i {
  font-size: 2rem;
}

.preview-placeholder span {
  font-size: 0.875rem;
  font-weight: 500;
}

.preview-image:hover .preview-placeholder {
  color: var(--p-primary-color);
}

.preview-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
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

.preview-image.has-image:hover .image-overlay {
  opacity: 1;
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
  border-top: 1px solid var(--app-surface-100);
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
