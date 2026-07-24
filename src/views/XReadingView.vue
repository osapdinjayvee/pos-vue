<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import XReadingDisplay from '@/components/reports/XReadingDisplay.vue'
import { useReports } from '@/composables/useReports'
import { useShift } from '@/composables/useShift'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatXCounter, getSyncStatusLabel, getSyncStatusSeverity } from '@/utils/reportFormatter'
import type { DisplayXReading } from '@/types/xReading'

const router = useRouter()
const toast = useToast()
const {
  xReadings,
  currentXReading,
  isLoading,
  isGenerating,
  error,
  generateXReading,
  loadXReadings,
  exportXReadingsCSV,
  printReport
} = useReports()

const shift = useShift()
const authStore = useAuthStore()

const showReadingDialog = ref(false)
const selectedReading = ref<DisplayXReading | null>(null)

const canGenerate = computed(() => !!shift.currentShift.value?.id && !!authStore.currentUser?.id)

onMounted(() => {
  loadXReadings()
})

async function handleGenerate() {
  const shiftId = shift.currentShift.value?.id
  const cashierId = authStore.currentUser?.id

  if (!shiftId || !cashierId) {
    toast.add({
      severity: 'warn',
      summary: 'No Active Shift',
      detail: 'X-Reading can only be generated during an active shift',
      life: 4000
    })
    return
  }

  const result = await generateXReading(shiftId, cashierId)

  if (result) {
    selectedReading.value = result
    showReadingDialog.value = true
    toast.add({
      severity: 'success',
      summary: 'X-Reading Generated',
      detail: `X-Reading #${result.xCounter} has been generated`,
      life: 3000
    })
  } else if (error.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000
    })
  }
}

function handleViewReading(reading: DisplayXReading) {
  selectedReading.value = reading
  showReadingDialog.value = true
}

async function handleExportCSV() {
  const result = await exportXReadingsCSV()
  if (!result.success) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: result.error || 'Could not save the CSV file.',
      life: 5000
    })
    return
  }

  toast.add({
    severity: 'info',
    summary: 'Export',
    detail: 'X-Readings exported to CSV',
    life: 2000
  })
}

function handlePrint() {
  printReport()
}

function goBack() {
  router.push('/reports')
}
</script>

<template>
  <div class="xreading-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div>
          <h1>X-Reading Reports</h1>
          <p class="text-muted">Shift snapshot reports</p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :disabled="xReadings.length === 0"
          @click="handleExportCSV"
        />
        <Button
          label="Generate X-Reading"
          icon="pi pi-plus"
          :loading="isGenerating"
          :disabled="!canGenerate"
          @click="handleGenerate"
          v-tooltip.bottom="!canGenerate ? 'Requires an active shift' : ''"
        />
      </div>
    </div>

    <div class="view-content">
      <div v-if="isLoading" class="loading-state">
        <ProgressSpinner />
        <p>Loading X-Readings...</p>
      </div>

      <div v-else-if="xReadings.length === 0" class="empty-state">
        <i class="pi pi-file" style="font-size: 3rem; color: var(--app-surface-300)"></i>
        <h3>No X-Readings Yet</h3>
        <p>Generate your first X-Reading during an active shift</p>
        <Button
          label="Generate X-Reading"
          icon="pi pi-plus"
          :loading="isGenerating"
          :disabled="!canGenerate"
          @click="handleGenerate"
        />
      </div>

      <DataTable
        v-else
        :value="xReadings"
        :paginator="xReadings.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        stripedRows
        removableSort
        class="report-table"
      >
        <Column field="xCounter" header="X-Counter" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="counter-badge">{{ formatXCounter(data.xCounter) }}</span>
          </template>
        </Column>
        <Column field="formattedDate" header="Date" sortable />
        <Column field="formattedTime" header="Time" />
        <Column field="cashierName" header="Cashier" />
        <Column field="grossSales" header="Gross Sales" sortable>
          <template #body="{ data }">
            <span class="amount">{{ formatCurrency(data.grossSales) }}</span>
          </template>
        </Column>
        <Column field="netSales" header="Net Sales" sortable>
          <template #body="{ data }">
            <span class="amount">{{ formatCurrency(data.netSales) }}</span>
          </template>
        </Column>
        <Column field="transactionCount" header="Transactions" sortable style="width: 120px" />
        <Column field="syncStatus" header="Status" style="width: 120px">
          <template #body="{ data }">
            <Tag
              :value="getSyncStatusLabel(data.syncStatus)"
              :severity="getSyncStatusSeverity(data.syncStatus)"
            />
          </template>
        </Column>
        <Column header="Actions" style="width: 80px">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              severity="info"
              @click="handleViewReading(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- X-Reading Detail Dialog -->
    <Dialog
      v-model:visible="showReadingDialog"
      :header="selectedReading ? `X-Reading #${selectedReading.xCounter}` : 'X-Reading'"
      modal
      :style="{ width: '600px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <XReadingDisplay v-if="selectedReading" :reading="selectedReading" />
      <template #footer>
        <Button label="Print" icon="pi pi-print" severity="secondary" outlined @click="handlePrint" />
        <Button label="Close" @click="showReadingDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.xreading-view {
  padding: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-left h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-surface-900);
}

.header-left .text-muted {
  color: var(--p-surface-500);
  margin: 0;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.view-content {
  background: var(--app-surface-0);
  border-radius: 12px;
  border: 1px solid var(--app-surface-200);
  padding: 1.5rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 0.75rem;
  text-align: center;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-surface-700);
}

.empty-state p {
  margin: 0;
  color: var(--p-surface-500);
  font-size: 0.875rem;
}

.counter-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.813rem;
  font-weight: 600;
  color: var(--p-blue-600);
}

.amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

@media (max-width: 767.98px) {
  .xreading-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .p-button {
    flex: 1;
  }

  .view-content {
    padding: 0.75rem;
  }
}
</style>
