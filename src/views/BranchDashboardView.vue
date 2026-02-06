<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import BranchSelector from '@/components/sync/BranchSelector.vue'
import BranchSummaryCard from '@/components/sync/BranchSummaryCard.vue'
import { useBranchDashboard } from '@/composables/useBranchDashboard'

const {
  branches,
  filteredSummaries,
  selectedBranch,
  isLoading,
  error,
  totalSales,
  totalTransactions,
  onlineBranches,
  offlineBranches,
  refreshDashboard,
  selectBranch
} = useBranchDashboard()

const selectedBranchId = ref<string | null>(null)

onMounted(async () => {
  await refreshDashboard()
})

function handleBranchChange(branchId: string | null) {
  selectedBranchId.value = branchId
  selectBranch(branchId)
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
</script>

<template>
  <div class="branch-dashboard">
    <div class="page-header">
      <h1>Branch Dashboard</h1>
      <div class="header-actions">
        <BranchSelector
          :modelValue="selectedBranchId"
          :branches="branches"
          @update:modelValue="handleBranchChange"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          severity="secondary"
          outlined
          :loading="isLoading"
          @click="refreshDashboard"
        />
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="summary-stats">
      <Card class="stat-card">
        <template #content>
          <div class="stat">
            <span class="stat-label">Total Sales Today</span>
            <span class="stat-value">{{ formatCurrency(totalSales) }}</span>
          </div>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <div class="stat">
            <span class="stat-label">Total Transactions</span>
            <span class="stat-value">{{ totalTransactions }}</span>
          </div>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <div class="stat">
            <span class="stat-label">Branches Online</span>
            <span class="stat-value">
              <Tag :value="String(onlineBranches)" severity="success" />
              <span v-if="offlineBranches > 0" style="margin-left: 0.5rem">
                <Tag :value="`${offlineBranches} offline`" severity="danger" />
              </span>
            </span>
          </div>
        </template>
      </Card>
    </div>

    <!-- Error state -->
    <Card v-if="error">
      <template #content>
        <div class="error-state">
          <i class="pi pi-exclamation-triangle"></i>
          <p>{{ error }}</p>
          <p class="error-hint">This dashboard requires an active connection to the cloud server.</p>
        </div>
      </template>
    </Card>

    <!-- Branch Cards Grid -->
    <div class="branch-grid" v-if="filteredSummaries.length > 0">
      <BranchSummaryCard
        v-for="summary in filteredSummaries"
        :key="summary.branch_id"
        :summary="summary"
      />
    </div>

    <Card v-else-if="!isLoading && !error">
      <template #content>
        <div class="empty-state">
          <i class="pi pi-building" style="font-size: 2rem; color: var(--p-text-muted-color)"></i>
          <p>No branch data available</p>
          <p class="empty-hint">Branch data is synced from the cloud server.</p>
        </div>
      </template>
    </Card>

    <!-- Comparison Table -->
    <Card v-if="filteredSummaries.length > 1" class="comparison-card">
      <template #title>Branch Comparison</template>
      <template #content>
        <DataTable :value="filteredSummaries" stripedRows size="small">
          <Column field="branch_name" header="Branch" :sortable="true" />
          <Column field="today_sales" header="Sales" :sortable="true">
            <template #body="{ data }">
              {{ formatCurrency(data.today_sales) }}
            </template>
          </Column>
          <Column field="today_transactions" header="Transactions" :sortable="true" />
          <Column field="today_average_ticket" header="Avg Ticket" :sortable="true">
            <template #body="{ data }">
              {{ formatCurrency(data.today_average_ticket) }}
            </template>
          </Column>
          <Column header="Status">
            <template #body="{ data }">
              <Tag
                :value="data.is_online ? 'Online' : 'Offline'"
                :severity="data.is_online ? 'success' : 'danger'"
              />
            </template>
          </Column>
          <Column field="pending_sync_count" header="Pending" :sortable="true">
            <template #body="{ data }">
              <Tag
                v-if="data.pending_sync_count > 0"
                :value="String(data.pending_sync_count)"
                severity="warn"
              />
              <span v-else>0</span>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.branch-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.branch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;
}

.error-state i {
  font-size: 2rem;
  color: var(--p-orange-500);
}

.empty-hint,
.error-hint {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.comparison-card {
  margin-top: 0.5rem;
}
</style>
