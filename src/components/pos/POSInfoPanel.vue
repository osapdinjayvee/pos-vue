<script setup lang="ts">
import { vatService } from '@/services/vatService'
import logoImg from '@/assets/img/logo.png'

const appName = import.meta.env.VITE_APP_NAME || 'Zoomin POS'

const props = defineProps<{
  hasTransaction: boolean
  grandTotal: number
  subtotal: number
  discountTotal: number
  storeName?: string
  branchName?: string
  address?: string
  terminalId?: string
  businessDate?: string
}>()

function fmt(n: number): string {
  return vatService.formatCurrency(n)
}
</script>

<template>
  <div class="pos-info-panel" :class="{ 'has-txn': hasTransaction }">
    <!-- No transaction: idle display -->
    <template v-if="!hasTransaction">
      <div class="idle-display">
        <div class="idle-icon">
          <img :src="logoImg" alt="Logo" class="idle-logo-img" />
        </div>
        <div class="idle-title">{{ storeName || appName }}</div>
        <div v-if="branchName" class="idle-detail">{{ branchName }}</div>
        <div class="idle-meta">
          <span v-if="terminalId"><i class="pi pi-desktop"></i> {{ terminalId }}</span>
        </div>
        <div class="idle-hint">Scan a product to begin</div>
      </div>
    </template>

    <!-- Has transaction: big total -->
    <template v-else>
      <div class="total-display">
        <div class="total-label">AMOUNT DUE</div>
        <div class="total-amount">{{ fmt(grandTotal) }}</div>
        <div class="total-items">
          <span v-if="discountTotal > 0" class="total-discount">
            <i class="pi pi-tag"></i> -{{ fmt(discountTotal) }} discount
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pos-info-panel {
  padding: 1.5rem 1.25rem;
  text-align: center;
  flex-shrink: 0;
  background: var(--app-surface-50);
  border-bottom: 1px solid var(--app-surface-200);
}

.pos-info-panel.has-txn {
  background: var(--p-surface-900);
  border-bottom: none;
}

/* Idle */
.idle-display {
  padding: 1rem 0;
}

.idle-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 12px;
  background: var(--p-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.idle-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.idle-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-text-color);
  margin-bottom: 0.25rem;
}

.idle-detail {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.idle-meta {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.idle-meta i {
  font-size: 0.7rem;
  margin-right: 0.25rem;
}

.idle-hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--p-surface-400);
  font-style: italic;
}

/* Total display (dark bg) */
.total-display {
  padding: 0.5rem 0;
}

.total-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.total-amount {
  font-size: 3.25rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.total-items {
  margin-top: 0.75rem;
  font-size: 0.8rem;
}

.total-discount {
  color: var(--p-green-400);
}

.total-discount i {
  font-size: 0.7rem;
  margin-right: 0.25rem;
}
</style>
