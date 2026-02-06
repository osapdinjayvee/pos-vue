<script setup lang="ts">
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import type { DisplayProduct, ProductStatus } from '@/types'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  product: DisplayProduct
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  view: [product: DisplayProduct]
  edit: [product: DisplayProduct]
  delete: [product: DisplayProduct]
}>()

const getStatusSeverity = (status: ProductStatus) => {
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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const hasDiscount = (product: DisplayProduct) => {
  return product.cost && product.price > product.cost * 1.5
}

const getDiscountPercent = (product: DisplayProduct) => {
  if (!product.cost || product.cost === 0) return 0
  return Math.round(((product.price - product.cost) / product.price) * 100)
}
</script>

<template>
  <div class="product-card" :class="{ selected }">
    <div class="product-card-header">
      <Checkbox
        :modelValue="selected"
        :binary="true"
        @update:modelValue="emit('select', product.id)"
      />
      <div class="product-card-actions">
        <Button
          icon="pi pi-pencil"
          text
          rounded
          size="small"
          severity="secondary"
          @click="emit('edit', product)"
        />
        <Button
          icon="pi pi-trash"
          text
          rounded
          size="small"
          severity="danger"
          @click="emit('delete', product)"
        />
      </div>
    </div>
    <div class="product-card-image" @click="emit('view', product)">
      <div v-if="!product.image" class="product-card-placeholder">
        {{ getInitials(product.name) }}
      </div>
      <img v-else :src="product.image" :alt="product.name" />
      <Tag
        v-if="hasDiscount(product)"
        :value="`-${getDiscountPercent(product)}%`"
        severity="danger"
        class="product-card-discount"
      />
    </div>
    <div class="product-card-content" @click="emit('view', product)">
      <span class="product-card-category">{{ product.category }}</span>
      <h3 class="product-card-name">{{ product.name }}</h3>
      <span class="product-card-sku">{{ product.sku }}</span>
      <div class="product-card-meta">
        <span class="product-card-price">{{ formatCurrency(product.price) }}</span>
        <Tag
          :value="product.stock > 0 ? product.stock.toString() : 'Out'"
          :severity="getStatusSeverity(product.status)"
          class="product-card-stock-tag"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.product-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.product-card.selected {
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 1px var(--p-primary-color);
}

.product-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.product-card-header :deep(.p-checkbox) {
  background: var(--p-surface-0);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.product-card-actions {
  display: flex;
  gap: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.product-card:hover .product-card-actions {
  opacity: 1;
}

.product-card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 1;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
}

.product-card-placeholder {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-surface-400);
}

.product-card-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-card-discount {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  font-size: 0.875rem;
}

.product-card-content {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.product-card-category {
  font-size: 0.875rem;
  color: var(--p-primary-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 500;
}

.product-card-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card-sku {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.product-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.375rem;
}

.product-card-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.product-card-stock-tag {
  font-size: 0.875rem;
}
</style>
