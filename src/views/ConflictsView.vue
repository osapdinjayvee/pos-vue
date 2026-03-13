<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Card from 'primevue/card'
import SelectButton from 'primevue/selectbutton'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ConflictStats from '@/components/sync/ConflictStats.vue'
import ConflictList from '@/components/sync/ConflictList.vue'
import ConflictResolutionHistory from '@/components/sync/ConflictResolutionHistory.vue'
import ConflictDetailDialog from '@/components/sync/ConflictDetail.vue'
import { useConflictResolution } from '@/composables/useConflictResolution'
import { useAuth } from '@/composables/useAuth'
import type { ConflictLog, ConflictResolutionType } from '@/types/conflict'

const toast = useToast()
const { currentUser } = useAuth()
const {
  conflicts,
  unresolvedConflicts,
  selectedConflict,
  stats,
  isLoading,
  loadConflicts,
  viewConflictDetails,
  resolveManually,
  clearSelection
} = useConflictResolution()

const showDetail = ref(false)
const activeTab = ref('unresolved')

// Entity type filter — built on Phase 4 foundation, added User
const entityTypeFilter = ref('All')
const entityTypeOptions = [
  { label: 'All', value: 'All' },
  { label: 'Product', value: 'product' },
  { label: 'Customer', value: 'customer' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'User', value: 'user' }
]

/**
 * Filter unresolved conflicts by entity type
 */
const filteredUnresolved = computed(() => {
  const items = unresolvedConflicts.value as ConflictLog[]
  if (entityTypeFilter.value === 'All') {
    return items
  }
  return items.filter(c => c.entity_type === entityTypeFilter.value)
})

/**
 * Filter all conflicts (for history tab) by entity type
 */
const filteredConflicts = computed(() => {
  const items = conflicts.value as ConflictLog[]
  if (entityTypeFilter.value === 'All') {
    return items
  }
  return items.filter(c => c.entity_type === entityTypeFilter.value)
})

onMounted(async () => {
  await loadConflicts()
})

function handleView(conflict: ConflictLog) {
  viewConflictDetails(conflict)
  showDetail.value = true
}

function handleResolve(conflict: ConflictLog) {
  viewConflictDetails(conflict)
  showDetail.value = true
}

async function handleResolution(resolution: 'local' | 'server' | 'merged', conflictId: string) {
  const userId = currentUser.value?.id || 'unknown'
  await resolveManually(conflictId, resolution as ConflictResolutionType, userId)
  showDetail.value = false
  toast.add({
    severity: 'success',
    summary: 'Conflict Resolved',
    detail: `Conflict resolved with ${resolution} version`,
    life: 3000
  })
}

function handleStatsFilter(filter: string) {
  switch (filter) {
    case 'unresolved':
      activeTab.value = 'unresolved'
      break
    case 'auto-resolved':
    case 'manual':
      activeTab.value = 'history'
      break
    case 'all':
    default:
      // Stay on current tab
      break
  }
}
</script>

<template>
  <Toast />

  <div class="conflicts-view">
    <div class="page-header">
      <h1>Sync Conflicts</h1>
    </div>

    <!-- Conflict Stats Summary Cards -->
    <ConflictStats :stats="stats" @filter="handleStatsFilter" />

    <!-- Entity Type Filter -->
    <div class="filter-bar">
      <span class="filter-label">Filter by type:</span>
      <SelectButton
        v-model="entityTypeFilter"
        :options="entityTypeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
      />
    </div>

    <!-- Tabs: Unresolved / History -->
    <Card>
      <template #content>
        <Tabs v-model:value="activeTab">
          <TabList>
            <Tab value="unresolved">
              Unresolved
              <span v-if="filteredUnresolved.length > 0" class="tab-badge">
                {{ filteredUnresolved.length }}
              </span>
            </Tab>
            <Tab value="history">History</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="unresolved">
              <ConflictList
                :items="filteredUnresolved"
                :loading="isLoading"
                @view="handleView"
                @resolve="handleResolve"
              />
            </TabPanel>
            <TabPanel value="history">
              <ConflictResolutionHistory
                :conflicts="filteredConflicts"
                :loading="isLoading"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </Card>

    <!-- Conflict Detail Dialog with Recommendation + Apply Recommended -->
    <ConflictDetailDialog
      v-model:visible="showDetail"
      :detail="(selectedConflict as any)"
      @resolve="handleResolution"
    />
  </div>
</template>

<style scoped>
.conflicts-view {
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

.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-secondary-color);
  white-space: nowrap;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  margin-left: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--p-red-500);
  color: white;
  border-radius: 10px;
}
</style>
