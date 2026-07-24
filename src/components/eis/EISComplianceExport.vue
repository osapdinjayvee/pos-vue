<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import { eisService } from '@/services/eisService'
import { saveCsvFile } from '@/utils/fileDownload'

const router = useRouter()
const toast = useToast()
const selectedMonth = ref(new Date())
const previewCount = ref(0)
const isExporting = ref(false)
const eisEnabled = ref(true)

onMounted(async () => {
  eisEnabled.value = await eisService.isEnabled()
})

async function updatePreview() {
  const { dateFrom, dateTo } = getDateRange(selectedMonth.value)
  const submissions = await eisSubmissionRepository.getForDateRange(dateFrom, dateTo)
  previewCount.value = submissions.filter((s) => s.status === 'submitted').length
}

function getDateRange(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  return {
    dateFrom: new Date(year, month, 1).toISOString(),
    dateTo: new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  }
}

async function exportReport() {
  isExporting.value = true
  try {
    const { dateFrom, dateTo } = getDateRange(selectedMonth.value)
    const submissions = await eisSubmissionRepository.getForDateRange(dateFrom, dateTo)
    const submitted = submissions.filter((s) => s.status === 'submitted')

    if (submitted.length === 0) {
      toast.add({ severity: 'warn', summary: 'No Data', detail: 'No submitted records for this period.', life: 3000 })
      return
    }

    // Build CSV
    const headers = ['Date', 'OR Number', 'TIN', 'Branch Code', 'Gross Sales', 'VAT Amount', 'Vatable Sales', 'VAT Exempt', 'Zero Rated', 'Net Sales', 'Machine ID', 'PTU Number', 'Status', 'BIR Reference']
    const rows = submitted.map((s) => {
      let p: any = {}
      try { p = JSON.parse(s.payload) } catch { /* skip */ }
      return [
        s.created_at ? s.created_at.split('T')[0] : '',
        s.or_number,
        p.tin || '',
        p.branch_code || '',
        p.gross_sales || 0,
        p.vat_amount || 0,
        p.vatable_sales || 0,
        p.vat_exempt_sales || 0,
        p.zero_rated_sales || 0,
        p.net_sales || 0,
        p.machine_id || '',
        p.ptu_number || '',
        s.status,
        s.bir_reference || ''
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const monthStr = `${selectedMonth.value.getFullYear()}-${String(selectedMonth.value.getMonth() + 1).padStart(2, '0')}`
    const result = await saveCsvFile(csv, `EIS-Compliance-${monthStr}`)

    if (!result.success) {
      toast.add({ severity: 'error', summary: 'Export Failed', detail: result.error || 'Could not save the CSV file.', life: 4000 })
      return
    }

    toast.add({ severity: 'success', summary: 'Exported', detail: `${submitted.length} records exported.`, life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Export Failed', detail: 'Could not generate report.', life: 4000 })
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="eis-compliance-export">
    <Message v-if="!eisEnabled" severity="warn" class="mb-4" :closable="false">
      <div class="eis-warning">
        <span>EIS integration is not enabled. Configure it in <strong>Settings → EIS</strong> tab to start submitting transactions to BIR.</span>
        <Button label="Go to Settings" icon="pi pi-cog" severity="warn" size="small" class="mt-2" @click="router.push('/settings')" />
      </div>
    </Message>

    <template v-if="eisEnabled">
    <Message severity="info" class="mb-4">
      Export EIS compliance data in CSV format for BIR filing.
    </Message>

    <div class="export-form">
      <div class="form-group">
        <label>Month</label>
        <DatePicker
          v-model="selectedMonth"
          view="month"
          dateFormat="MM yy"
          showIcon
          class="month-picker"
          @update:modelValue="updatePreview"
        />
      </div>

      <div v-if="previewCount > 0" class="preview-count mt-3">
        <i class="pi pi-file"></i> {{ previewCount }} submitted records available for export
      </div>
      <div v-else class="preview-count mt-3 muted">
        <i class="pi pi-info-circle"></i> Select a month and click Generate to preview
      </div>

      <div class="action-buttons mt-4">
        <Button label="Preview Count" icon="pi pi-search" severity="secondary" @click="updatePreview" />
        <Button label="Generate CSV Report" icon="pi pi-download" :loading="isExporting" @click="exportReport" />
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.export-form {
  max-width: 400px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.month-picker {
  width: 250px;
}

.preview-count {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.muted {
  color: var(--p-text-muted-color);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.eis-warning {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>
