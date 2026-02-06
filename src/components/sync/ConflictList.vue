<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import type { ConflictLog } from '@/types/conflict'
import { CONFLICT_RESOLUTION_RULES } from '@/types/conflict'

defineProps<{
  items: ConflictLog[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'view': [item: ConflictLog]
  'resolve': [item: ConflictLog]
}>()

function resolutionSeverity(resolution: string): 'success' | 'info' | 'warn' | 'danger' | undefined {
  switch (resolution) {
    case 'server': return 'info'
    case 'local': return 'warn'
    case 'merged': return 'success'
    case 'manual': return 'danger'
    default: return undefined
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

/**
 * Get the recommended resolution label based on CONFLICT_RESOLUTION_RULES
 */
function getRecommendedResolution(entityType: string): string {
  const rule = CONFLICT_RESOLUTION_RULES[entityType]
  if (!rule) return 'Last-write-wins'

  switch (rule.strategy) {
    case 'server_wins': return 'Server version (auto-applied)'
    case 'local_wins': return 'Local version (auto-applied)'
    case 'merge': return `Merge (${rule.mergeFields?.join(', ') || 'fields'})`
    case 'append_only': return 'Append only'
    case 'sum_movements': return 'Sum movements'
    case 'manual': return 'Manual review needed'
    default: return 'Last-write-wins'
  }
}

/**
 * Get severity for the recommended resolution tag
 */
function recommendedSeverity(entityType: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined {
  const rule = CONFLICT_RESOLUTION_RULES[entityType]
  if (!rule) return 'secondary'

  switch (rule.strategy) {
    case 'server_wins': return 'info'
    case 'local_wins': return 'warn'
    case 'merge': return 'success'
    case 'manual': return 'danger'
    case 'sum_movements': return 'success'
    case 'append_only': return 'info'
    default: return 'secondary'
  }
}

/**
 * Get a summary of differing fields for product conflicts
 */
function getFieldDiffSummary(item: ConflictLog): string | null {
  if (item.entity_type !== 'product') return null

  try {
    const local = JSON.parse(item.local_version) as Record<string, unknown>
    const server = JSON.parse(item.server_version) as Record<string, unknown>

    const changedFields: string[] = []
    const fieldsToCheck = ['name', 'price', 'cost', 'sku', 'barcode', 'category_id', 'status', 'tax_type']

    for (const field of fieldsToCheck) {
      if (JSON.stringify(local[field]) !== JSON.stringify(server[field])) {
        changedFields.push(field)
      }
    }

    return changedFields.length > 0 ? changedFields.join(', ') : null
  } catch {
    return null
  }
}
</script>

<template>
  <DataTable
    :value="items"
    :loading="loading"
    paginator
    :rows="20"
    :rowsPerPageOptions="[10, 20, 50]"
    stripedRows
    size="small"
    sortField="created_at"
    :sortOrder="-1"
  >
    <template #empty>
      <div class="empty-state">
        <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500)"></i>
        <p>No conflicts detected</p>
      </div>
    </template>

    <Column field="entity_type" header="Entity Type" :sortable="true" style="width: 110px">
      <template #body="{ data }">
        <Tag :value="data.entity_type" severity="secondary" />
      </template>
    </Column>

    <Column field="entity_id" header="Entity ID" :sortable="true" style="width: 180px">
      <template #body="{ data }">
        <code>{{ data.entity_id.substring(0, 16) }}...</code>
      </template>
    </Column>

    <Column header="Recommended" style="width: 200px">
      <template #body="{ data }">
        <div class="recommended-cell">
          <Tag
            :value="getRecommendedResolution(data.entity_type)"
            :severity="recommendedSeverity(data.entity_type)"
            class="recommended-tag"
          />
          <span v-if="getFieldDiffSummary(data)" class="field-diff-summary">
            Changed: {{ getFieldDiffSummary(data) }}
          </span>
        </div>
      </template>
    </Column>

    <Column field="resolution" header="Resolution" :sortable="true" style="width: 110px">
      <template #body="{ data }">
        <Tag :value="data.resolution" :severity="resolutionSeverity(data.resolution)" />
      </template>
    </Column>

    <Column field="resolved_by" header="Resolved By" style="width: 100px">
      <template #body="{ data }">
        {{ data.resolved_by || '-' }}
      </template>
    </Column>

    <Column field="created_at" header="Detected" :sortable="true" style="width: 150px">
      <template #body="{ data }">
        {{ formatDate(data.created_at) }}
      </template>
    </Column>

    <Column field="resolved_at" header="Resolved" :sortable="true" style="width: 150px">
      <template #body="{ data }">
        <span v-if="data.resolved_at">{{ formatDate(data.resolved_at) }}</span>
        <Tag v-else value="Pending" severity="warn" />
      </template>
    </Column>

    <Column header="Actions" style="width: 100px">
      <template #body="{ data }">
        <div class="row-actions">
          <Button
            icon="pi pi-eye"
            text
            rounded
            size="small"
            v-tooltip="'View Details'"
            @click="emit('view', data)"
          />
          <Button
            v-if="!data.resolved_at"
            icon="pi pi-pencil"
            severity="warn"
            text
            rounded
            size="small"
            v-tooltip="'Resolve'"
            @click="emit('resolve', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
}

.row-actions {
  display: flex;
  gap: 0.25rem;
}

.recommended-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recommended-tag {
  font-size: 0.75rem;
}

.field-diff-summary {
  font-size: 0.7rem;
  color: var(--p-text-secondary-color);
  font-style: italic;
}
</style>
