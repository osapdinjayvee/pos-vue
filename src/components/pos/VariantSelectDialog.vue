<script setup lang="ts">
/**
 * Variant picker for the POS browse drawer.
 *
 * QA asked for "another card that can select the variant of the selected item".
 * The variants were previously listed inline inside the product tile, where on
 * a tablet grid each row is a few millimetres tall with a truncated name — hard
 * to read and easy to mis-tap. Selecting the product now opens this sheet with
 * full-width rows instead.
 */
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { vatService } from '@/services/vatService'
import type { Product, ProductVariant } from '@/types'

/** `variants` arrives already filtered and ordered by utils/variants. */
const props = defineProps<{
  visible: boolean
  product: Product | null
  variants: ProductVariant[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [product: Product, variant: ProductVariant]
}>()

function priceFor(variant: ProductVariant): string {
  return vatService.formatCurrency(variant.price_override ?? props.product?.price ?? 0)
}

function handleSelect(variant: ProductVariant) {
  if (!props.product) return
  emit('select', props.product, variant)
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    :header="product?.name || 'Select Variant'"
    :style="{ width: '440px' }"
    :breakpoints="{ '640px': '100vw' }"
    :dismissable-mask="true"
  >
    <p class="variant-hint">Choose a variant to add to the order.</p>

    <ul class="variant-list">
      <li v-for="variant in variants" :key="variant.id">
        <button type="button" class="variant-row" @click="handleSelect(variant)">
          <span class="variant-row__name">{{ variant.name }}</span>
          <span class="variant-row__price">{{ priceFor(variant) }}</span>
          <i class="pi pi-chevron-right variant-row__chevron"></i>
        </button>
      </li>
    </ul>

    <template #footer>
      <Button label="Cancel" severity="secondary" outlined class="w-full" @click="handleClose" />
    </template>
  </Dialog>
</template>

<style scoped>
.variant-hint {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.variant-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

/* Full-width rows sized for a thumb — the whole point of this sheet. */
.variant-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--app-surface-200);
  border-radius: 10px;
  background: var(--app-surface-0);
  color: var(--p-text-color);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.variant-row:active {
  background: var(--app-surface-100);
  border-color: var(--p-primary-color);
}

.variant-row__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.variant-row__price {
  font-weight: 700;
  color: var(--p-primary-color);
  white-space: nowrap;
}

.variant-row__chevron {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.w-full {
  width: 100%;
}
</style>
