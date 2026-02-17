<script setup lang="ts">
/**
 * CustomReportsView (T049)
 * Full page for the custom report builder.
 * Combines SavedReportsList, ReportBuilder form, ReportResultsTable,
 * and CSV export functionality.
 */
import { ref } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import ReportBuilder from '@/components/analytics/ReportBuilder.vue'
import ReportResultsTable from '@/components/analytics/ReportResultsTable.vue'
import SavedReportsList from '@/components/analytics/SavedReportsList.vue'
import { customReportService } from '@/services/customReportService'
import { reportExportService } from '@/services/reportExportService'
import { savedReportRepository } from '@/repositories/savedReportRepository'
import type { ReportConfig, ReportResult } from '@/types/analytics'
import { toLocalDateStr } from '@/utils/dateHelpers'

const toast = useToast()

const reportResult = ref<ReportResult | null>(null)
const loading = ref(false)
const activeConfig = ref<ReportConfig | null>(null)
const savedReportsRef = ref<InstanceType<typeof SavedReportsList> | null>(null)

/**
 * Generate a report from the given configuration.
 */
async function handleGenerate(config: ReportConfig) {
  loading.value = true
  activeConfig.value = config
  try {
    reportResult.value = await customReportService.buildReport(config)
    if (reportResult.value.data.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'No Data',
        detail: 'No records found for the selected criteria.',
        life: 3000
      })
    }
  } catch (err: any) {
    console.error('[CustomReportsView] Report generation failed:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to generate report.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

/**
 * Save a report configuration.
 */
async function handleSave(config: ReportConfig & { name: string }) {
  try {
    await savedReportRepository.create({
      name: config.name,
      type: 'custom',
      config: {
        dimensions: config.dimensions,
        measures: config.measures,
        dateFrom: config.dateFrom,
        dateTo: config.dateTo,
        branchId: config.branchId
      }
    })
    toast.add({
      severity: 'success',
      summary: 'Report Saved',
      detail: `"${config.name}" has been saved.`,
      life: 3000
    })
    // Refresh saved reports list
    savedReportsRef.value?.fetchReports()
  } catch (err: any) {
    console.error('[CustomReportsView] Save failed:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to save report.',
      life: 5000
    })
  }
}

/**
 * Load a saved report configuration into the builder.
 */
function handleLoadSaved(configJson: string) {
  try {
    const config: ReportConfig = JSON.parse(configJson)
    activeConfig.value = config
    toast.add({
      severity: 'info',
      summary: 'Report Loaded',
      detail: 'Saved report configuration has been loaded. Click "Generate Report" to run it.',
      life: 3000
    })
  } catch (err) {
    console.error('[CustomReportsView] Failed to parse saved config:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load saved report configuration.',
      life: 5000
    })
  }
}

/**
 * Delete a saved report.
 */
async function handleDeleteSaved(id: string) {
  try {
    await savedReportRepository.delete(id)
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Saved report has been deleted.',
      life: 3000
    })
    savedReportsRef.value?.fetchReports()
  } catch (err: any) {
    console.error('[CustomReportsView] Delete failed:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || 'Failed to delete report.',
      life: 5000
    })
  }
}

/**
 * Export current report results to CSV.
 */
function handleExportCsv() {
  if (!reportResult.value || !reportResult.value.data.length) return

  const filename = `custom-report-${toLocalDateStr()}`
  reportExportService.exportToCsv(
    reportResult.value.data,
    reportResult.value.columns,
    filename
  )

  toast.add({
    severity: 'success',
    summary: 'Exported',
    detail: 'Report exported to CSV.',
    life: 3000
  })
}
</script>

<template>
  <div class="custom-reports-page">
    <Toast />
    <ConfirmDialog />

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <h1>Custom Reports</h1>
        <p class="text-muted">Build and save custom analytics reports</p>
      </div>
      <div class="header-actions">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          :disabled="!reportResult || !reportResult.data.length"
          @click="handleExportCsv"
        />
      </div>
    </div>

    <!-- Content grid -->
    <div class="dashboard-grid">
      <!-- Saved reports + builder row -->
      <div class="data-row">
        <SavedReportsList
          ref="savedReportsRef"
          @load="handleLoadSaved"
          @delete="handleDeleteSaved"
        />
        <ReportBuilder
          :config="activeConfig"
          @generate="handleGenerate"
          @save="handleSave"
        />
      </div>

      <!-- Results table -->
      <div class="full-width-row">
        <ReportResultsTable
          :result="reportResult"
          :loading="loading"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-reports-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

@media (max-width: 768px) {
  .data-row {
    grid-template-columns: 1fr !important;
  }
}
</style>
