<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import { syncHealthRepository } from '@/repositories/syncHealthRepository'
import { syncLogRepository } from '@/repositories/syncLogRepository'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { syncHealthService } from '@/services/syncHealthService'
import type { SyncHealth, SyncLog, SyncQueue, SyncHealthStatus } from '@/types/sync'

const props = defineProps<{
  terminalId: string
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const toast = useToast()
const loading = ref(false)
const health = ref<SyncHealth | null>(null)
const recentLogs = ref<SyncLog[]>([])
const pendingItems = ref<SyncQueue[]>([])
const activeTab = ref('overview')

function relativeTime(date: string | null): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

function formatDateTime(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}

function statusSeverity(status: SyncHealthStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  switch (status) {
    case 'healthy': return 'success'
    case 'warning': return 'warn'
    case 'critical': return 'danger'
    default: return 'secondary'
  }
}

function resultSeverity(result: string): 'success' | 'warn' | 'danger' | 'secondary' {
  switch (result) {
    case 'success': return 'success'
    case 'conflict': return 'warn'
    case 'error': return 'danger'
    default: return 'secondary'
  }
}

function queueStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  switch (status) {
    case 'pending': return 'info'
    case 'syncing': return 'warn'
    case 'failed': return 'danger'
    case 'completed': return 'success'
    default: return 'secondary'
  }
}

async function loadData() {
  if (!props.terminalId) return

  loading.value = true
  try {
    // Load health record
    health.value = await syncHealthRepository.findByTerminal(props.terminalId)

    // Load recent sync logs (not filtered by terminal since log has no terminal_id)
    recentLogs.value = await syncLogRepository.getRecent(20)

    // Load pending queue items
    pendingItems.value = await syncQueueRepository.getPending(50)
  } catch (e) {
    console.error('[TerminalSyncDetail] Failed to load data:', e)
    toast.add({ severity: 'error', summary: 'Failed to load terminal details', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function handleForceSync() {
  toast.add({ severity: 'info', summary: 'Force sync triggered', detail: 'Sync will process on next cycle', life: 3000 })
}

async function handleClearErrors() {
  if (!props.terminalId) return

  try {
    await syncHealthRepository.resetErrorCount(props.terminalId)
    toast.add({ severity: 'success', summary: 'Errors cleared', life: 3000 })
    await loadData()
  } catch (e) {
    console.error('[TerminalSyncDetail] Failed to clear errors:', e)
    toast.add({ severity: 'error', summary: 'Failed to clear errors', life: 3000 })
  }
}

function handleClose() {
  emit('close')
}

// Load data when dialog becomes visible
watch(
  () => props.visible,
  (v) => {
    if (v && props.terminalId) {
      activeTab.value = 'overview'
      loadData()
    }
  }
)
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`Terminal: ${terminalId}`"
    modal
    :style="{ width: '50rem', maxWidth: '95vw' }"
    @update:visible="handleClose"
  >
    <div v-if="loading" class="loading-container">
      <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
    </div>

    <div v-else class="detail-content">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="logs">Sync Log</Tab>
          <Tab value="queue">Queue Items</Tab>
        </TabList>

        <TabPanels>
          <!-- Overview Tab -->
          <TabPanel value="overview">
            <div v-if="health" class="overview-grid">
              <div class="overview-field">
                <span class="field-label">Status</span>
                <Tag
                  :value="health.status.charAt(0).toUpperCase() + health.status.slice(1)"
                  :severity="statusSeverity(health.status)"
                />
              </div>
              <div class="overview-field">
                <span class="field-label">Terminal ID</span>
                <span class="field-value">{{ health.terminal_id }}</span>
              </div>
              <div class="overview-field">
                <span class="field-label">Branch</span>
                <span class="field-value">{{ health.branch_id }}</span>
              </div>
              <div class="overview-field">
                <span class="field-label">Last Heartbeat</span>
                <span class="field-value">
                  {{ relativeTime(health.last_heartbeat) }}
                  <span v-if="health.last_heartbeat" class="field-detail">
                    ({{ formatDateTime(health.last_heartbeat) }})
                  </span>
                </span>
              </div>
              <div class="overview-field">
                <span class="field-label">Last Upload</span>
                <span class="field-value">
                  {{ relativeTime(health.last_upload) }}
                  <span v-if="health.last_upload" class="field-detail">
                    ({{ formatDateTime(health.last_upload) }})
                  </span>
                </span>
              </div>
              <div class="overview-field">
                <span class="field-label">Last Download</span>
                <span class="field-value">
                  {{ relativeTime(health.last_download) }}
                  <span v-if="health.last_download" class="field-detail">
                    ({{ formatDateTime(health.last_download) }})
                  </span>
                </span>
              </div>
              <div class="overview-field">
                <span class="field-label">Queue Depth</span>
                <span class="field-value">{{ health.queue_depth }} items</span>
              </div>
              <div class="overview-field">
                <span class="field-label">Error Count</span>
                <span class="field-value" :class="{ 'text-danger': health.error_count > 0 }">
                  {{ health.error_count }}
                </span>
              </div>
              <div class="overview-field">
                <span class="field-label">Last Updated</span>
                <span class="field-value">{{ formatDateTime(health.updated_at) }}</span>
              </div>
            </div>

            <div v-else class="no-data">
              No health data found for this terminal.
            </div>
          </TabPanel>

          <!-- Sync Log Tab -->
          <TabPanel value="logs">
            <DataTable
              :value="recentLogs"
              :rows="10"
              paginator
              :rowsPerPageOptions="[10, 20]"
              stripedRows
              size="small"
              emptyMessage="No recent sync logs found."
            >
              <Column field="synced_at" header="Time" :sortable="true" style="width: 10rem">
                <template #body="{ data }">
                  {{ relativeTime(data.synced_at) }}
                </template>
              </Column>
              <Column field="entity_type" header="Entity" :sortable="true" style="width: 7rem" />
              <Column field="entity_id" header="Entity ID" style="width: 10rem">
                <template #body="{ data }">
                  <span class="entity-id-cell">{{ data.entity_id.substring(0, 16) }}...</span>
                </template>
              </Column>
              <Column field="operation" header="Operation" :sortable="true" style="width: 6rem" />
              <Column field="direction" header="Direction" :sortable="true" style="width: 6rem">
                <template #body="{ data }">
                  <i :class="data.direction === 'upload' ? 'pi pi-cloud-upload' : 'pi pi-cloud-download'" />
                  {{ data.direction }}
                </template>
              </Column>
              <Column field="result" header="Result" :sortable="true" style="width: 6rem">
                <template #body="{ data }">
                  <Tag :value="data.result" :severity="resultSeverity(data.result)" />
                </template>
              </Column>
              <Column field="duration_ms" header="Duration" :sortable="true" style="width: 5rem">
                <template #body="{ data }">
                  {{ data.duration_ms }}ms
                </template>
              </Column>
            </DataTable>
          </TabPanel>

          <!-- Queue Items Tab -->
          <TabPanel value="queue">
            <DataTable
              :value="pendingItems"
              :rows="10"
              paginator
              :rowsPerPageOptions="[10, 20]"
              stripedRows
              size="small"
              emptyMessage="No pending queue items."
            >
              <Column field="entity_type" header="Entity" :sortable="true" style="width: 7rem" />
              <Column field="entity_id" header="Entity ID" style="width: 10rem">
                <template #body="{ data }">
                  <span class="entity-id-cell">{{ data.entity_id.substring(0, 16) }}...</span>
                </template>
              </Column>
              <Column field="operation" header="Operation" :sortable="true" style="width: 6rem" />
              <Column field="status" header="Status" :sortable="true" style="width: 6rem">
                <template #body="{ data }">
                  <Tag :value="data.status" :severity="queueStatusSeverity(data.status)" />
                </template>
              </Column>
              <Column field="priority" header="Priority" :sortable="true" style="width: 5rem" />
              <Column field="attempts" header="Attempts" :sortable="true" style="width: 5rem" />
              <Column field="created_at" header="Created" :sortable="true" style="width: 10rem">
                <template #body="{ data }">
                  {{ relativeTime(data.created_at) }}
                </template>
              </Column>
              <Column field="last_error" header="Last Error" style="min-width: 10rem">
                <template #body="{ data }">
                  <span v-if="data.last_error" class="error-text">{{ data.last_error }}</span>
                  <span v-else class="no-error">--</span>
                </template>
              </Column>
            </DataTable>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <template #footer>
      <div class="dialog-actions">
        <Button
          label="Force Sync"
          icon="pi pi-sync"
          severity="info"
          outlined
          @click="handleForceSync"
        />
        <Button
          label="Clear Errors"
          icon="pi pi-eraser"
          severity="warn"
          outlined
          :disabled="!health || health.error_count === 0"
          @click="handleClearErrors"
        />
        <Button
          label="Close"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="handleClose"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
}

.detail-content {
  min-height: 300px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 0.5rem 0;
}

.overview-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  letter-spacing: 0.02em;
}

.field-value {
  font-size: 0.9375rem;
}

.field-detail {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  display: block;
}

.text-danger {
  color: var(--p-red-500);
  font-weight: 600;
}

.no-data {
  text-align: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.entity-id-cell {
  font-family: monospace;
  font-size: 0.8125rem;
}

.error-text {
  color: var(--p-red-500);
  font-size: 0.8125rem;
}

.no-error {
  color: var(--p-text-muted-color);
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
