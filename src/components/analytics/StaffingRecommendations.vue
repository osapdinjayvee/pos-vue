<script setup lang="ts">
/**
 * StaffingRecommendations (T027)
 * DataTable showing staffing suggestions based on average hourly transaction volume.
 */
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import type { StaffingRecommendation } from '@/types/analytics'

defineProps<{
  recommendations: StaffingRecommendation[]
  loading?: boolean
}>()

function getSeverity(level: 'low' | 'medium' | 'high'): 'success' | 'warn' | 'danger' {
  switch (level) {
    case 'low':
      return 'success'
    case 'medium':
      return 'warn'
    case 'high':
      return 'danger'
  }
}

function getLevelLabel(level: 'low' | 'medium' | 'high'): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Staffing Recommendations</h3>
    </div>

    <div v-if="loading" style="display: flex; flex-direction: column; gap: 0.5rem;">
      <Skeleton v-for="i in 5" :key="i" height="2.5rem" width="100%" />
    </div>

    <DataTable
      v-else
      :value="recommendations"
      :rows="24"
      :paginator="false"
      scrollable
      scrollHeight="400px"
      stripedRows
      size="small"
      tableStyle="min-width: 100%"
    >
      <template #empty>
        <div style="text-align: center; padding: 2rem; color: var(--p-text-muted-color);">
          No staffing data available
        </div>
      </template>

      <Column field="hourLabel" header="Hour" style="min-width: 100px">
        <template #body="{ data }">
          <span style="font-weight: 500;">{{ data.hourLabel }}</span>
        </template>
      </Column>

      <Column field="avgTransactions" header="Avg Transactions" style="min-width: 130px">
        <template #body="{ data }">
          {{ data.avgTransactions.toFixed(1) }}
        </template>
      </Column>

      <Column field="suggestedStaff" header="Suggested Staff" style="min-width: 120px">
        <template #body="{ data }">
          <span style="font-weight: 600;">{{ data.suggestedStaff }}</span>
        </template>
      </Column>

      <Column field="peakLevel" header="Peak Level" style="min-width: 100px">
        <template #body="{ data }">
          <Tag
            :value="getLevelLabel(data.peakLevel)"
            :severity="getSeverity(data.peakLevel)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
