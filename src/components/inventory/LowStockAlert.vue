<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { DisplayStockAlert, AlertType } from '@/types/inventory'

const props = defineProps<{
  alert: DisplayStockAlert
}>()

const emit = defineEmits<{
  acknowledge: [alert: DisplayStockAlert]
  'view-product': [alert: DisplayStockAlert]
  'add-stock': [alert: DisplayStockAlert]
}>()

const alertIcon = computed(() => {
  switch (props.alert.alertType) {
    case 'out_of_stock': return 'pi pi-exclamation-circle'
    case 'low_stock': return 'pi pi-exclamation-triangle'
    case 'expiring_soon': return 'pi pi-clock'
    case 'expired': return 'pi pi-times-circle'
    default: return 'pi pi-info-circle'
  }
})

const alertSeverity = computed(() => {
  switch (props.alert.alertType) {
    case 'out_of_stock': return 'danger'
    case 'expired': return 'danger'
    case 'low_stock': return 'warn'
    case 'expiring_soon': return 'warn'
    default: return 'info'
  }
})

const alertMessage = computed(() => {
  switch (props.alert.alertType) {
    case 'out_of_stock':
      return 'Out of stock'
    case 'low_stock':
      return `Low stock: ${props.alert.currentValue} units (threshold: ${props.alert.threshold})`
    case 'expiring_soon':
      return `Expiring in ${Math.abs(props.alert.currentValue)} days`
    case 'expired':
      return 'Expired'
    default:
      return props.alert.alertTypeLabel
  }
})
</script>

<template>
  <div class="alert-item" :class="[`severity-${alertSeverity}`]">
    <div class="alert-icon">
      <i :class="alertIcon" />
    </div>

    <div class="alert-content">
      <div class="alert-header">
        <span class="product-name">{{ alert.productName }}</span>
        <Tag :value="alert.alertTypeLabel" :severity="alertSeverity" />
      </div>
      <div class="alert-details">
        <span class="variant-info">{{ alert.variantName }} ({{ alert.variantSku || 'No SKU' }})</span>
        <span class="alert-message">{{ alertMessage }}</span>
      </div>
    </div>

    <div class="alert-actions">
      <Button
        v-if="alert.alertType === 'low_stock' || alert.alertType === 'out_of_stock'"
        icon="pi pi-plus"
        severity="success"
        text
        rounded
        size="small"
        @click="emit('add-stock', alert)"
        v-tooltip="'Add Stock'"
      />
      <Button
        icon="pi pi-eye"
        severity="secondary"
        text
        rounded
        size="small"
        @click="emit('view-product', alert)"
        v-tooltip="'View Product'"
      />
      <Button
        v-if="!alert.acknowledged"
        icon="pi pi-check"
        severity="secondary"
        text
        rounded
        size="small"
        @click="emit('acknowledge', alert)"
        v-tooltip="'Acknowledge'"
      />
    </div>
  </div>
</template>

<style scoped>
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem;
  border-radius: 8px;
  background: var(--p-surface-50);
  border-left: 4px solid transparent;
}

.alert-item.severity-danger {
  border-left-color: var(--p-red-500);
  background: var(--p-red-50);
}

.alert-item.severity-warn {
  border-left-color: var(--p-orange-500);
  background: var(--p-orange-50);
}

.alert-item.severity-info {
  border-left-color: var(--p-blue-500);
  background: var(--p-blue-50);
}

.alert-icon {
  font-size: 1.25rem;
  padding-top: 0.125rem;
}

.severity-danger .alert-icon {
  color: var(--p-red-500);
}

.severity-warn .alert-icon {
  color: var(--p-orange-500);
}

.severity-info .alert-icon {
  color: var(--p-blue-500);
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.product-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.alert-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.variant-info {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.alert-message {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.alert-actions {
  display: flex;
  gap: 0.25rem;
}
</style>
