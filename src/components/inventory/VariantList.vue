<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
import type { DisplayVariant } from '@/types/inventory'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  variants: DisplayVariant[]
  basePrice: number
  baseCost: number
  loading?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  add: []
  edit: [variant: DisplayVariant]
  delete: [variant: DisplayVariant]
  'add-stock': [variant: DisplayVariant]
}>()

const totalStock = computed(() => {
  return props.variants.reduce((sum, v) => sum + v.currentStock, 0)
})

function getEffectivePrice(variant: DisplayVariant): number {
  return variant.priceOverride ?? props.basePrice
}

function getEffectiveCost(variant: DisplayVariant): number {
  return variant.costOverride ?? props.baseCost
}

function getStockSeverity(stock: number): string {
  if (stock === 0) return 'danger'
  if (stock <= 10) return 'warn'
  return 'success'
}

function formatAttributes(attributes: Record<string, string>): string[] {
  return Object.entries(attributes).map(([k, v]) => `${k}: ${v}`)
}
</script>

<template>
  <div class="variant-list" :class="{ 'readonly-mode': readonly }">
    <div v-if="!readonly" class="list-header">
      <div class="header-info">
        <h4>Product Variants</h4>
        <span class="total-stock">Total Stock: <strong>{{ totalStock }}</strong></span>
      </div>
      <Button
        label="Add Variant"
        icon="pi pi-plus"
        size="small"
        @click="emit('add')"
        :disabled="loading"
      />
    </div>

    <!-- Card layout for mobile/readonly -->
    <div v-if="readonly" class="variant-cards">
      <div v-for="variant in variants" :key="variant.id" class="variant-card">
        <div class="variant-card-header">
          <span class="variant-name">{{ variant.name }}</span>
          <Tag
            :value="variant.currentStock.toString()"
            :severity="getStockSeverity(variant.currentStock)"
          />
        </div>
        <div class="variant-card-body">
          <div class="variant-info-row">
            <span class="info-label">Price</span>
            <span class="info-value">
              {{ formatCurrency(getEffectivePrice(variant)) }}
              <small v-if="variant.priceOverride !== null" class="override-badge">Override</small>
            </span>
          </div>
          <div v-if="variant.sku" class="variant-info-row">
            <span class="info-label">SKU</span>
            <span class="info-value mono">{{ variant.sku }}</span>
          </div>
          <div v-if="variant.barcode" class="variant-info-row">
            <span class="info-label">Barcode</span>
            <span class="info-value mono">{{ variant.barcode }}</span>
          </div>
          <div v-if="Object.keys(variant.attributes).length > 0" class="variant-info-row">
            <span class="info-label">Attributes</span>
            <div class="variant-attributes">
              <Chip
                v-for="attr in formatAttributes(variant.attributes)"
                :key="attr"
                :label="attr"
                class="attr-chip"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="variants.length === 0" class="empty-state compact">
        <i class="pi pi-box" />
        <p>No variants</p>
      </div>
    </div>

    <!-- Table layout for edit mode -->
    <DataTable
      v-else
      :value="variants"
      :loading="loading"
      stripedRows
      size="small"
      class="variant-table"
    >
      <Column field="name" header="Variant">
        <template #body="{ data }">
          <div class="variant-cell">
            <span class="variant-name">{{ data.name }}</span>
            <div v-if="Object.keys(data.attributes).length > 0" class="variant-attributes">
              <Chip
                v-for="attr in formatAttributes(data.attributes)"
                :key="attr"
                :label="attr"
                class="attr-chip"
              />
            </div>
          </div>
        </template>
      </Column>

      <Column field="sku" header="SKU" class="hide-on-mobile">
        <template #body="{ data }">
          <span class="sku-cell">{{ data.sku || '-' }}</span>
        </template>
      </Column>

      <Column field="barcode" header="Barcode" class="hide-on-tablet">
        <template #body="{ data }">
          <span class="barcode-cell">{{ data.barcode || '-' }}</span>
        </template>
      </Column>

      <Column header="Price">
        <template #body="{ data }">
          <div class="price-cell">
            <span>{{ formatCurrency(getEffectivePrice(data)) }}</span>
            <small v-if="data.priceOverride !== null" class="override-badge">Override</small>
          </div>
        </template>
      </Column>

      <Column field="currentStock" header="Stock">
        <template #body="{ data }">
          <Tag
            :value="data.currentStock.toString()"
            :severity="getStockSeverity(data.currentStock)"
          />
        </template>
      </Column>

      <Column header="Actions" headerStyle="width: 8rem">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-plus"
              text
              rounded
              severity="success"
              size="small"
              @click="emit('add-stock', data)"
              v-tooltip="'Add Stock'"
            />
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              size="small"
              @click="emit('edit', data)"
              v-tooltip="'Edit'"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              size="small"
              @click="emit('delete', data)"
              v-tooltip="'Delete'"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-box" />
          <p>No variants yet</p>
          <Button
            label="Add First Variant"
            icon="pi pi-plus"
            size="small"
            @click="emit('add')"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.variant-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-info h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.total-stock {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.total-stock strong {
  color: var(--p-text-color);
}

.variant-table {
  font-size: 0.875rem;
}

.variant-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.variant-name {
  font-weight: 500;
}

.variant-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.attr-chip {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
}

.sku-cell,
.barcode-cell {
  font-family: monospace;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.price-cell {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.override-badge {
  font-size: 0.6875rem;
  color: var(--p-primary-color);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-state.compact {
  padding: 1rem;
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-state.compact i {
  font-size: 1.5rem;
}

.empty-state p {
  margin: 0 0 1rem 0;
}

.empty-state.compact p {
  margin-bottom: 0;
  font-size: 0.875rem;
}

/* Card layout for readonly/mobile */
.variant-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.variant-card {
  background: var(--app-surface-50);
  border: 1px solid var(--app-surface-200);
  border-radius: 8px;
  overflow: hidden;
}

.variant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--app-surface-100);
  border-bottom: 1px solid var(--app-surface-200);
}

.variant-card-header .variant-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.variant-card-body {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variant-info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  font-size: 0.875rem;
}

.info-label {
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.info-value {
  text-align: right;
  color: var(--p-text-color);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
}

.info-value.mono {
  font-family: monospace;
  font-size: 0.8125rem;
}

.variant-info-row .variant-attributes {
  justify-content: flex-end;
}

/* Hide columns on smaller screens (table mode) */
@media (max-width: 1024px) {
  .variant-table :deep(.hide-on-tablet) {
    display: none;
  }
}

@media (max-width: 768px) {
  .variant-table :deep(.hide-on-mobile) {
    display: none;
  }

  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-info {
    justify-content: space-between;
  }

  .action-buttons {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .variant-card-header {
    padding: 0.5rem 0.75rem;
  }

  .variant-card-body {
    padding: 0.5rem 0.75rem;
  }

  .variant-card-header .variant-name {
    font-size: 0.875rem;
  }

  .variant-info-row {
    font-size: 0.8125rem;
  }
}
</style>
