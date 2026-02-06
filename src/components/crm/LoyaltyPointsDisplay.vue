<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Tag from 'primevue/tag'
import { useLoyalty } from '@/composables/useLoyalty'
import { customerRepository } from '@/repositories/customerRepository'
import type { LoyaltyTransaction } from '@/types/loyalty'

// ---------------------
// Props
// ---------------------

const props = defineProps<{
  customerId: string
}>()

// ---------------------
// Composable
// ---------------------

const { loadConfig, getPointsHistory, config, isActive, redeemRate } = useLoyalty()

// ---------------------
// Local state
// ---------------------

const points = ref(0)
const history = ref<LoyaltyTransaction[]>([])
const loading = ref(false)

// ---------------------
// Currency formatting
// ---------------------

function formatCurrency(value: number): string {
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// ---------------------
// Points PHP equivalent
// ---------------------

function pointsPhpEquivalent(): string {
  return formatCurrency(points.value * redeemRate.value)
}

// ---------------------
// Date formatting
// ---------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ---------------------
// Transaction type helpers
// ---------------------

interface TransactionTypeStyle {
  icon: string
  color: string
  prefix: string
}

const typeStyleMap: Record<LoyaltyTransaction['type'], TransactionTypeStyle> = {
  earn: { icon: 'pi pi-plus-circle', color: 'var(--p-green-500)', prefix: '+' },
  redeem: { icon: 'pi pi-minus-circle', color: 'var(--p-blue-500)', prefix: '-' },
  expire: { icon: 'pi pi-clock', color: 'var(--p-orange-500)', prefix: '-' },
  adjustment: { icon: 'pi pi-refresh', color: 'var(--p-surface-500)', prefix: '' }
}

function getTypeStyle(type: LoyaltyTransaction['type']): TransactionTypeStyle {
  return typeStyleMap[type] ?? typeStyleMap.adjustment
}

function formatPoints(tx: LoyaltyTransaction): string {
  const style = getTypeStyle(tx.type)
  if (tx.type === 'adjustment') {
    return tx.points >= 0 ? `+${tx.points}` : `${tx.points}`
  }
  return `${style.prefix}${Math.abs(tx.points)}`
}

// ---------------------
// Data loading
// ---------------------

async function loadData() {
  loading.value = true
  try {
    await loadConfig()

    const customer = await customerRepository.findById(props.customerId)
    points.value = customer?.loyalty_points ?? 0

    const allHistory = await getPointsHistory(props.customerId)
    history.value = (allHistory as LoyaltyTransaction[]).slice(0, 5)
  } catch (e) {
    console.error('Failed to load loyalty data:', e)
    points.value = 0
    history.value = []
  } finally {
    loading.value = false
  }
}

// ---------------------
// Lifecycle
// ---------------------

onMounted(() => {
  loadData()
})

watch(() => props.customerId, () => {
  loadData()
})

// ---------------------
// Exposed methods
// ---------------------

async function refresh() {
  await loadData()
}

defineExpose({ refresh })
</script>

<template>
  <div class="loyalty-points-display">
    <!-- Points Balance Card -->
    <div class="points-balance-card">
      <div class="balance-status">
        <Tag
          :value="isActive ? 'Active' : 'Inactive'"
          :severity="isActive ? 'success' : 'danger'"
          rounded
        />
      </div>
      <div class="balance-points">
        <span class="balance-number">{{ points.toLocaleString('en-PH') }}</span>
        <span class="balance-pts">pts</span>
      </div>
      <span class="balance-equivalent">{{ pointsPhpEquivalent() }} equivalent</span>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity">
      <h4 class="section-title">Recent Activity</h4>

      <div v-if="loading" class="activity-loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading...</span>
      </div>

      <div v-else-if="history.length === 0" class="activity-empty">
        <i class="pi pi-history"></i>
        <p>No loyalty activity yet</p>
      </div>

      <ul v-else class="activity-list">
        <li
          v-for="tx in history"
          :key="tx.id"
          class="activity-row"
        >
          <div class="activity-icon">
            <i
              :class="getTypeStyle(tx.type).icon"
              :style="{ color: getTypeStyle(tx.type).color }"
            ></i>
          </div>
          <div class="activity-details">
            <span class="activity-reason">{{ tx.reason || tx.type.charAt(0).toUpperCase() + tx.type.slice(1) }}</span>
            <span class="activity-date">{{ formatDate(tx.created_at) }}</span>
          </div>
          <span
            class="activity-points"
            :style="{ color: getTypeStyle(tx.type).color }"
          >
            {{ formatPoints(tx) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.loyalty-points-display {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Points Balance Card */
.points-balance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.5rem 1rem;
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 12px;
  text-align: center;
}

.balance-status {
  margin-bottom: 0.25rem;
}

.balance-points {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.balance-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--p-primary-color);
  line-height: 1;
}

.balance-pts {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-primary-color);
  opacity: 0.7;
}

.balance-equivalent {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Recent Activity */
.recent-activity {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--p-text-color);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.activity-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1rem;
  color: var(--p-text-muted-color);
}

.activity-empty i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.activity-empty p {
  margin: 0;
  font-size: 0.875rem;
}

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--p-surface-100);
}

.activity-row:last-child {
  border-bottom: none;
}

.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--p-surface-50);
  flex-shrink: 0;
}

.activity-icon i {
  font-size: 0.9375rem;
}

.activity-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.activity-reason {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-date {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.activity-points {
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .balance-number {
    font-size: 2rem;
  }

  .points-balance-card {
    padding: 1.25rem 0.75rem;
  }
}
</style>
