<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Cash Drawer Status</span>
        <Tag
          v-if="currentSession"
          :value="currentSession.status === 'open' ? 'Open' : 'Closed'"
          :severity="currentSession.status === 'open' ? 'success' : 'secondary'"
        />
      </div>
    </template>
    <template #content>
      <div v-if="hasOpenSession && currentSession" class="drawer-status">
        <div class="status-grid">
          <div class="status-item">
            <label>Opening Amount</label>
            <div class="amount">{{ formatCurrency(currentSession.opening_amount) }}</div>
          </div>

          <div class="status-item">
            <label>Expected Cash</label>
            <div class="amount">{{ formatCurrency(expectedCash) }}</div>
          </div>

          <div class="status-item">
            <label>Total Drops</label>
            <div class="amount negative">{{ formatCurrency(totalDrops) }}</div>
          </div>

          <div class="status-item">
            <label>Total Paid-Ins</label>
            <div class="amount positive">{{ formatCurrency(totalPaidIns) }}</div>
          </div>

          <div class="status-item full-width">
            <label>Shift Time</label>
            <div class="time">{{ elapsedTime }}</div>
          </div>
        </div>

        <!-- Negative Expected Cash Warning (T039) -->
        <div v-if="expectedCash < 0" class="negative-cash-warning">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Expected cash is negative — this may indicate a recording error</span>
        </div>

        <!-- Operations History -->
        <div v-if="dropOperations.length > 0" class="operations-section">
          <h4>Cash Drops</h4>
          <div class="operations-list">
            <div v-for="op in dropOperations" :key="op.id" class="operation-item">
              <div class="op-info">
                <span class="op-amount negative">-{{ formatCurrency(op.amount || 0) }}</span>
                <span class="op-reason">{{ op.reason }}</span>
              </div>
              <span class="op-time">{{ formatTime(op.created_at) }}</span>
            </div>
          </div>
          <div class="operations-total">
            Total Drops: <strong class="negative">{{ formatCurrency(totalDrops) }}</strong>
          </div>
        </div>

        <div v-if="paidInOperations.length > 0" class="operations-section">
          <h4>Cash Paid-Ins</h4>
          <div class="operations-list">
            <div v-for="op in paidInOperations" :key="op.id" class="operation-item">
              <div class="op-info">
                <span class="op-amount positive">+{{ formatCurrency(op.amount || 0) }}</span>
                <span class="op-reason">{{ op.reason }}</span>
              </div>
              <span class="op-time">{{ formatTime(op.created_at) }}</span>
            </div>
          </div>
          <div class="operations-total">
            Total Paid-Ins: <strong class="positive">{{ formatCurrency(totalPaidIns) }}</strong>
          </div>
        </div>

        <div class="action-buttons">
          <Button
            label="Cash Drop"
            icon="pi pi-arrow-down"
            severity="warning"
            @click="emit('cash-drop')"
            :loading="isLoading"
          />
          <Button
            label="Cash Paid-In"
            icon="pi pi-arrow-up"
            severity="info"
            @click="emit('cash-paid-in')"
            :loading="isLoading"
          />
          <Button
            label="No Sale / Open Drawer"
            icon="pi pi-unlock"
            severity="secondary"
            outlined
            @click="emit('no-sale')"
            :loading="isLoading"
          />
          <Button
            label="Close Drawer"
            icon="pi pi-lock"
            severity="danger"
            @click="emit('close-drawer')"
            :loading="isLoading"
          />
        </div>
      </div>

      <div v-else class="no-session">
        <i class="pi pi-inbox" style="font-size: 3rem; color: var(--text-color-secondary);"></i>
        <p>No active cash drawer session</p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useCashDrawer } from '@/composables/useCashDrawer';

const emit = defineEmits<{
  'cash-drop': [];
  'cash-paid-in': [];
  'no-sale': [];
  'close-drawer': [];
}>();

const {
  currentSession,
  operations,
  hasOpenSession,
  expectedCash,
  totalDrops,
  totalPaidIns,
  isLoading,
  refreshExpectedCash
} = useCashDrawer();

const dropOperations = computed(() =>
  operations.value.filter(op => op.type === 'drop')
);

const paidInOperations = computed(() =>
  operations.value.filter(op => op.type === 'paid_in')
);

const elapsedTime = ref('00:00:00');
let intervalId: NodeJS.Timeout | null = null;

const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
};

const calculateElapsedTime = () => {
  if (!currentSession.value?.opened_at) {
    elapsedTime.value = '00:00:00';
    return;
  }

  const openedAt = new Date(currentSession.value.opened_at);
  const now = new Date();
  const diffMs = now.getTime() - openedAt.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  elapsedTime.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const startTimer = () => {
  calculateElapsedTime();
  intervalId = setInterval(calculateElapsedTime, 60000); // Update every minute
};

const stopTimer = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

onMounted(() => {
  if (hasOpenSession.value) {
    startTimer();
    refreshExpectedCash();
  }
});

onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.drawer-status {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
}

.status-item.full-width {
  grid-column: 1 / -1;
}

.status-item label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.status-item .amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.status-item .amount.positive {
  color: var(--green-500);
}

.status-item .amount.negative {
  color: var(--red-500);
}

.status-item .time {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
  font-family: 'Courier New', monospace;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.action-buttons .p-button {
  flex: 1;
  min-width: 150px;
}

.negative-cash-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: var(--border-radius);
  color: var(--orange-800);
  font-size: 0.875rem;
}

.negative-cash-warning i {
  color: var(--orange-500);
  font-size: 1.125rem;
}

.operations-section {
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.operations-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  color: var(--text-color);
}

.operations-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.operation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 4px;
  font-size: 0.875rem;
}

.op-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.op-amount {
  font-weight: 600;
  min-width: 100px;
}

.op-reason {
  color: var(--text-color-secondary);
}

.op-time {
  color: var(--text-color-secondary);
  font-size: 0.8125rem;
}

.operations-total {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--surface-border);
  text-align: right;
  font-size: 0.875rem;
}

.positive {
  color: var(--green-500);
}

.negative {
  color: var(--red-500);
}

.no-session {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  gap: 1rem;
}

.no-session p {
  font-size: 1.125rem;
  color: var(--text-color-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .p-button {
    width: 100%;
  }
}
</style>
