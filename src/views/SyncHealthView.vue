<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import SyncHealthCard from '@/components/sync/SyncHealthCard.vue'
import SyncHealthAlerts from '@/components/sync/SyncHealthAlerts.vue'
import TerminalSyncDetail from '@/components/sync/TerminalSyncDetail.vue'
import { syncHealthService } from '@/services/syncHealthService'
import type { SyncHealth, SyncHealthStatus } from '@/types/sync'

const toast = useToast()
const loading = ref(false)
const terminals = ref<SyncHealth[]>([])
const alerts = ref<SyncHealth[]>([])

// Filter
const statusFilter = ref<string>('All')
const statusOptions = ['All', 'Healthy', 'Warning', 'Critical']

// Detail dialog
const selectedTerminalId = ref('')
const detailVisible = ref(false)

// Auto-refresh
let refreshTimer: ReturnType<typeof setInterval> | null = null

// Summary stats
const totalCount = computed(() => terminals.value.length)
const healthyCount = computed(() => terminals.value.filter(t => t.status === 'healthy').length)
const warningCount = computed(() => terminals.value.filter(t => t.status === 'warning').length)
const criticalCount = computed(() => terminals.value.filter(t => t.status === 'critical').length)

// Filtered terminals
const filteredTerminals = computed(() => {
  if (statusFilter.value === 'All') return terminals.value
  const filterStatus = statusFilter.value.toLowerCase() as SyncHealthStatus
  return terminals.value.filter(t => t.status === filterStatus)
})

async function loadData() {
  loading.value = true
  try {
    terminals.value = await syncHealthService.getTerminalStatuses()
    alerts.value = await syncHealthService.getAlerts()
  } catch (e) {
    console.error('[SyncHealthView] Failed to load data:', e)
    toast.add({ severity: 'error', summary: 'Failed to load sync health data', life: 3000 })
  } finally {
    loading.value = false
  }
}

function handleSelectTerminal(terminalId: string) {
  selectedTerminalId.value = terminalId
  detailVisible.value = true
}

function handleCloseDetail() {
  detailVisible.value = false
  selectedTerminalId.value = ''
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    loadData()
  }, 60000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(async () => {
  await loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <Toast />

  <div class="sync-health-view">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Sync Health</h1>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-row">
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <span class="stat-value">{{ totalCount }}</span>
            <span class="stat-label">Total Terminals</span>
          </div>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <span class="stat-value stat-healthy">{{ healthyCount }}</span>
            <span class="stat-label">
              <Tag value="Healthy" severity="success" />
            </span>
          </div>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <span class="stat-value stat-warning">{{ warningCount }}</span>
            <span class="stat-label">
              <Tag value="Warning" severity="warn" />
            </span>
          </div>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <span class="stat-value stat-critical">{{ criticalCount }}</span>
            <span class="stat-label">
              <Tag value="Critical" severity="danger" />
            </span>
          </div>
        </template>
      </Card>
    </div>

    <!-- Alerts Section -->
    <div class="section">
      <h2 class="section-title">Alerts</h2>
      <SyncHealthAlerts
        :alerts="alerts"
        :loading="loading"
        @view-terminal="handleSelectTerminal"
      />
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <h2 class="section-title">Terminals</h2>
      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        :allowEmpty="false"
      />
    </div>

    <!-- Terminals Grid -->
    <div v-if="loading && terminals.length === 0" class="loading-container">
      <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
    </div>

    <div v-else-if="filteredTerminals.length === 0" class="empty-state">
      <i class="pi pi-server" style="font-size: 2.5rem; color: var(--p-text-muted-color)"></i>
      <p>No terminals found{{ statusFilter !== 'All' ? ` with status "${statusFilter}"` : '' }}.</p>
    </div>

    <div v-else class="terminals-grid">
      <SyncHealthCard
        v-for="terminal in filteredTerminals"
        :key="terminal.terminal_id"
        :health="terminal"
        @select="handleSelectTerminal"
      />
    </div>

    <!-- Terminal Detail Dialog -->
    <TerminalSyncDetail
      :terminalId="selectedTerminalId"
      :visible="detailVisible"
      @close="handleCloseDetail"
    />
  </div>
</template>

<style scoped>
.sync-health-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card :deep(.p-card-body) {
  padding: 1rem;
}

.stat-card :deep(.p-card-content) {
  padding: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
}

.stat-healthy {
  color: var(--p-green-500);
}

.stat-warning {
  color: var(--p-yellow-500);
}

.stat-critical {
  color: var(--p-red-500);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Sections */
.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Terminals Grid */
.terminals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* Loading / Empty */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

/* Responsive */
@media (max-width: 1200px) {
  .terminals-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .terminals-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
