<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Panel from 'primevue/panel'
import { useToast } from 'primevue/usetoast'
import EISSubmissionFilters from '@/components/eis/EISSubmissionFilters.vue'
import EISSubmissionTable from '@/components/eis/EISSubmissionTable.vue'
import EISBatchHistory from '@/components/eis/EISBatchHistory.vue'
import EISErrorDetail from '@/components/eis/EISErrorDetail.vue'
import EISAlertBanner from '@/components/eis/EISAlertBanner.vue'
import { useEIS } from '@/composables/useEIS'
import { eisSubmissionRepository } from '@/repositories/eisSubmissionRepository'
import type { EISSubmission, EISSubmissionStatus } from '@/types/eis'
import { toLocalDateStr } from '@/utils/dateHelpers'

const toast = useToast()
const {
  statusCounts,
  recentBatches,
  isProcessing,
  loadDashboard,
  processBatch,
  retryFailed
} = useEIS()

const loading = ref(false)
const filteredSubmissions = ref<EISSubmission[]>([])
const selectedSubmission = ref<EISSubmission | null>(null)
const showErrorDetail = ref(false)

const totalCount = computed(() =>
  statusCounts.value.pending + statusCounts.value.submitted + statusCounts.value.failed + statusCounts.value.rejected
)

async function loadSubmissions(filters?: { dateFrom: string | null; dateTo: string | null; status: string; search: string }) {
  loading.value = true
  try {
    let submissions: EISSubmission[]

    if (filters?.dateFrom && filters?.dateTo) {
      submissions = await eisSubmissionRepository.getForDateRange(filters.dateFrom, filters.dateTo)
    } else {
      // Load recent
      const pending = await eisSubmissionRepository.getByStatus('pending', 100)
      const submitted = await eisSubmissionRepository.getByStatus('submitted', 100)
      const failed = await eisSubmissionRepository.getRecentFailed(50)
      submissions = [...pending, ...submitted, ...failed]
    }

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      submissions = submissions.filter((s) => s.status === filters.status)
    }

    // Apply search filter
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      submissions = submissions.filter(
        (s) => s.or_number.toLowerCase().includes(q) || (s.bir_reference && s.bir_reference.toLowerCase().includes(q))
      )
    }

    filteredSubmissions.value = submissions.sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch (e) {
    console.error('[EISSubmissionsView] Load failed:', e)
  } finally {
    loading.value = false
  }
}

async function handleRetry(id: string) {
  try {
    await eisSubmissionRepository.updateStatus(id, 'pending')
    toast.add({ severity: 'success', summary: 'Queued', detail: 'Submission re-queued for retry.', life: 3000 })
    await loadSubmissions()
    await loadDashboard()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retry.', life: 3000 })
  }
}

async function handleRetryAll() {
  const count = await retryFailed()
  toast.add({ severity: 'info', summary: 'Retry All', detail: `${count} submissions re-queued.`, life: 3000 })
  await loadSubmissions()
}

function handleViewDetail(submission: EISSubmission) {
  selectedSubmission.value = submission
  showErrorDetail.value = true
}

async function handleExport() {
  const submitted = filteredSubmissions.value.filter((s) => s.status === 'submitted')
  if (submitted.length === 0) {
    toast.add({ severity: 'warn', summary: 'No Data', detail: 'No submitted records to export.', life: 3000 })
    return
  }

  const headers = ['OR Number', 'Date', 'Status', 'BIR Reference', 'Attempts']
  const rows = filteredSubmissions.value.map((s) =>
    [s.or_number, s.created_at, s.status, s.bir_reference || '', s.attempts].join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eis-submissions-${toLocalDateStr()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ severity: 'success', summary: 'Exported', detail: `${filteredSubmissions.value.length} rows.`, life: 3000 })
}

onMounted(async () => {
  await loadDashboard()
  await loadSubmissions()
})
</script>

<template>
  <div class="eis-submissions-view">
    <EISAlertBanner />

    <div class="summary-cards">
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Total</span>
            <span class="stat-value">{{ totalCount }}</span>
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Pending</span>
            <Tag :value="String(statusCounts.pending)" severity="info" />
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Submitted</span>
            <Tag :value="String(statusCounts.submitted)" severity="success" />
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Failed</span>
            <Tag :value="String(statusCounts.failed)" :severity="statusCounts.failed > 0 ? 'warn' : 'secondary'" />
          </div>
        </template>
      </Card>
      <Card class="summary-card">
        <template #content>
          <div class="card-stat">
            <span class="stat-label">Rejected</span>
            <Tag :value="String(statusCounts.rejected)" :severity="statusCounts.rejected > 0 ? 'danger' : 'secondary'" />
          </div>
        </template>
      </Card>
    </div>

    <div class="filters-section mt-4">
      <EISSubmissionFilters
        @filter-change="loadSubmissions"
        @export="handleExport"
        @retry-all="handleRetryAll"
      />
    </div>

    <div class="table-section mt-4">
      <EISSubmissionTable
        :submissions="filteredSubmissions"
        :loading="loading"
        @retry="handleRetry"
        @view-detail="handleViewDetail"
      />
    </div>

    <Panel header="Batch History" :collapsed="true" toggleable class="mt-4">
      <EISBatchHistory :batches="recentBatches" />
    </Panel>

    <EISErrorDetail
      :submission="selectedSubmission"
      :visible="showErrorDetail"
      @close="showErrorDetail = false"
      @retry="handleRetry"
    />
  </div>
</template>

<style scoped>
.eis-submissions-view {
  padding: 1.5rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.card-stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}
</style>
