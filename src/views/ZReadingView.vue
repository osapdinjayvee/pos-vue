<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import ZReadingDisplay from '@/components/reports/ZReadingDisplay.vue'
import { useReports } from '@/composables/useReports'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatZCounter, getSyncStatusLabel, getSyncStatusSeverity } from '@/utils/reportFormatter'
import type { DisplayZReading } from '@/types/zReading'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const {
  zReadings,
  currentZReading,
  isLoading,
  isGenerating,
  error,
  generateZReading,
  loadZReadings,
  isZReadingGeneratedToday,
  exportZReadingsCSV,
  printReport
} = useReports()

const authStore = useAuthStore()

const showReadingDialog = ref(false)
const selectedReading = ref<DisplayZReading | null>(null)

onMounted(() => {
  loadZReadings()
})

async function handleGenerate() {
  // Check if already generated today
  const alreadyGenerated = await isZReadingGeneratedToday()

  if (alreadyGenerated) {
    confirm.require({
      message: 'A Z-Reading has already been generated for today. Do you want to generate a duplicate?',
      header: 'Duplicate Z-Reading',
      icon: 'pi pi-exclamation-triangle',
      rejectClass: 'p-button-secondary p-button-outlined',
      acceptClass: 'p-button-warning',
      acceptLabel: 'Generate Duplicate',
      rejectLabel: 'Cancel',
      accept: () => doGenerate(true)
    })
    return
  }

  doGenerate(false)
}

async function doGenerate(forceDuplicate: boolean) {
  const supervisorId = authStore.currentUser?.id
  if (!supervisorId) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No authenticated user found',
      life: 4000
    })
    return
  }

  const result = await generateZReading(supervisorId, forceDuplicate)

  if (result.success && result.zReading) {
    selectedReading.value = result.zReading
    showReadingDialog.value = true
    toast.add({
      severity: 'success',
      summary: 'Z-Reading Generated',
      detail: `Z-Reading #${result.zReading.zCounter} has been generated`,
      life: 3000
    })
    loadZReadings()
  } else if (!result.success) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: result.error || 'Failed to generate Z-Reading',
      life: 5000
    })
  }
}

function handleViewReading(reading: DisplayZReading) {
  selectedReading.value = reading
  showReadingDialog.value = true
}

function handleExportCSV() {
  exportZReadingsCSV()
  toast.add({
    severity: 'info',
    summary: 'Export',
    detail: 'Z-Readings exported to CSV',
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
  <div class="zreading-view">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div>
          <h1>Z-Reading Reports</h1>
          <p class="text-muted">End-of-day BIR-compliant closing reports</p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :disabled="zReadings.length === 0"
          @click="handleExportCSV"
        />
        <Button
          label="Generate Z-Reading"
          icon="pi pi-plus"
          severity="warn"
          :loading="isGenerating"
          @click="handleGenerate"
        />
      </div>
    </div>

    <div class="view-content">
      <div v-if="isLoading" class="loading-state">
        <ProgressSpinner />
        <p>Loading Z-Readings...</p>
      </div>

      <div v-else-if="zReadings.length === 0" class="empty-state">
        <i class="pi pi-file-check" style="font-size: 3rem; color: var(--app-surface-300)"></i>
        <h3>No Z-Readings Yet</h3>
        <p>Generate your first Z-Reading at end of business day</p>
        <Button
          label="Generate Z-Reading"
          icon="pi pi-plus"
          severity="warn"
          :loading="isGenerating"
          @click="handleGenerate"
        />
      </div>

      <DataTable
        v-else
        :value="zReadings"
        :paginator="zReadings.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        stripedRows
        removableSort
        class="report-table"
      >
        <Column field="zCounter" header="Z-Counter" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="counter-badge">{{ formatZCounter(data.zCounter) }}</span>
          </template>
        </Column>
        <Column field="formattedDate" header="Business Date" sortable />
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
        <Column field="vatAmount" header="VAT" sortable>
          <template #body="{ data }">
            <span class="amount">{{ formatCurrency(data.vatAmount) }}</span>
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

    <!-- Z-Reading Detail Dialog -->
    <Dialog
      v-model:visible="showReadingDialog"
      :header="selectedReading ? `Z-Reading #${selectedReading.zCounter}` : 'Z-Reading'"
      modal
      :style="{ width: '650px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <ZReadingDisplay v-if="selectedReading" :reading="selectedReading" />
      <template #footer>
        <Button label="Print" icon="pi pi-print" severity="secondary" outlined @click="handlePrint" />
        <Button label="Close" @click="showReadingDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.zreading-view {
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
  color: var(--p-orange-600);
}

.amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

@media (max-width: 767.98px) {
  .zreading-view {
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
