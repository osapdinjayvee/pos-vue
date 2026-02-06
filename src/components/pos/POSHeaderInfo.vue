<script setup lang="ts">
defineProps<{
  transactionNumber?: string | null
  customerName?: string | null
  cashierName?: string | null
  baggerName?: string | null
}>()
</script>

<template>
  <div class="pos-header-info">
    <div class="pos-header-left">
      <div class="pos-header-field">
        <span class="pos-header-label">Txn No:</span>
        <span class="pos-header-value">{{ transactionNumber || '—' }}</span>
      </div>
      <div class="pos-header-field">
        <span class="pos-header-label">Customer:</span>
        <span :class="['pos-header-value', { 'text-400': !customerName }]">
          {{ customerName || 'Walk-in Customer' }}
        </span>
      </div>
    </div>
    <div class="pos-header-right">
      <div class="pos-header-field">
        <span class="pos-header-label">Cashier:</span>
        <span class="pos-header-value">{{ cashierName || '—' }}</span>
      </div>
      <div class="pos-header-field">
        <span class="pos-header-label">Bagger:</span>
        <span :class="['pos-header-value', { 'text-400': !baggerName }]">
          {{ baggerName || '—' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pos-header-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 2rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-200);
  background: var(--p-surface-50);
  font-size: 0.875rem;
}

.pos-header-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pos-header-label {
  color: var(--p-text-muted-color);
  font-weight: 500;
  white-space: nowrap;
}

.pos-header-value {
  font-weight: 600;
  color: var(--p-text-color);
}
</style>
