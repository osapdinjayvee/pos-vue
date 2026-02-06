<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import type { ConflictDetail, ConflictResolutionType } from '@/types/conflict'
import { CONFLICT_RESOLUTION_RULES } from '@/types/conflict'

const props = defineProps<{
  visible: boolean
  detail: ConflictDetail | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'resolve': [resolution: 'local' | 'server' | 'merged', conflictId: string]
}>()

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '<null>'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function handleResolve(resolution: 'local' | 'server' | 'merged') {
  if (props.detail) {
    emit('resolve', resolution, props.detail.conflict.id)
  }
}

/**
 * Get the recommended resolution based on CONFLICT_RESOLUTION_RULES
 */
const recommendation = computed(() => {
  if (!props.detail) return null

  const entityType = props.detail.conflict.entity_type
  const rule = CONFLICT_RESOLUTION_RULES[entityType]

  if (!rule) {
    return {
      resolution: 'server' as ConflictResolutionType,
      label: 'Server Version (Last-Write-Wins)',
      explanation: `No specific rule configured for "${entityType}" entities. The default last-write-wins strategy recommends accepting the server version.`,
      severity: 'info' as const
    }
  }

  switch (rule.strategy) {
    case 'server_wins':
      return {
        resolution: 'server' as ConflictResolutionType,
        label: 'Server Version',
        explanation: `${capitalize(entityType)} conflicts are configured to use "server wins" strategy. The server (HQ) version is authoritative for ${entityType} data to maintain consistency across all terminals.`,
        severity: 'info' as const
      }
    case 'local_wins':
      return {
        resolution: 'local' as ConflictResolutionType,
        label: 'Local Version',
        explanation: `${capitalize(entityType)} conflicts are configured to use "local wins" strategy. The local terminal version takes precedence.`,
        severity: 'warn' as const
      }
    case 'merge':
      return {
        resolution: 'merged' as ConflictResolutionType,
        label: 'Merge',
        explanation: `${capitalize(entityType)} conflicts use a "merge" strategy. Server data is used as the base, with local values preserved for: ${rule.mergeFields?.join(', ') || 'specified fields'}. This ensures no customer data is lost during sync.`,
        severity: 'success' as const
      }
    case 'sum_movements':
      return {
        resolution: 'merged' as ConflictResolutionType,
        label: 'Sum Movements',
        explanation: `${capitalize(entityType)} conflicts use "sum movements" strategy. Quantities from both local and server are summed to reflect all stock movements across terminals.`,
        severity: 'success' as const
      }
    case 'append_only':
      return {
        resolution: 'server' as ConflictResolutionType,
        label: 'Append Only (Server Authoritative)',
        explanation: `${capitalize(entityType)} records are append-only. Both versions are preserved, with the server version authoritative for existing records.`,
        severity: 'info' as const
      }
    case 'manual':
      return {
        resolution: 'manual' as ConflictResolutionType,
        label: 'Manual Review Required',
        explanation: `${capitalize(entityType)} conflicts require manual review. Please examine the differences carefully and choose the appropriate version.`,
        severity: 'warn' as const
      }
    default:
      return {
        resolution: 'server' as ConflictResolutionType,
        label: 'Server Version (Default)',
        explanation: 'No matching strategy found. Defaulting to server version.',
        severity: 'info' as const
      }
  }
})

/**
 * Timestamp comparison
 */
const timestampComparison = computed(() => {
  if (!props.detail) return null

  const localUpdatedAt = props.detail.localData.updated_at as string | undefined
  const serverUpdatedAt = props.detail.serverData.updated_at as string | undefined

  if (!localUpdatedAt && !serverUpdatedAt) return null

  const localDate = localUpdatedAt ? new Date(localUpdatedAt) : null
  const serverDate = serverUpdatedAt ? new Date(serverUpdatedAt) : null

  let newerVersion: 'local' | 'server' | 'same' = 'same'
  if (localDate && serverDate) {
    if (localDate > serverDate) newerVersion = 'local'
    else if (serverDate > localDate) newerVersion = 'server'
  } else if (localDate && !serverDate) {
    newerVersion = 'local'
  } else if (!localDate && serverDate) {
    newerVersion = 'server'
  }

  return {
    localUpdatedAt: localDate ? localDate.toLocaleString() : 'Unknown',
    serverUpdatedAt: serverDate ? serverDate.toLocaleString() : 'Unknown',
    newerVersion
  }
})

/**
 * Merge preview for customer conflicts
 */
const mergePreview = computed(() => {
  if (!props.detail) return null

  const entityType = props.detail.conflict.entity_type
  const rule = CONFLICT_RESOLUTION_RULES[entityType]

  if (!rule || rule.strategy !== 'merge') return null

  // Build merge preview: server base + local merge fields
  const merged: Record<string, unknown> = { ...props.detail.serverData }
  if (rule.mergeFields) {
    for (const field of rule.mergeFields) {
      if (props.detail.localData[field] !== undefined && props.detail.localData[field] !== null) {
        merged[field] = props.detail.localData[field]
      }
    }
  }

  // Only show fields that differ
  const previewFields: { field: string; value: unknown; source: string }[] = []
  for (const diff of props.detail.differences) {
    const mergedValue = merged[diff.field]
    const source = rule.mergeFields?.includes(diff.field) ? 'local' : 'server'
    previewFields.push({
      field: diff.field,
      value: mergedValue,
      source
    })
  }

  return previewFields
})

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function applyRecommended() {
  if (!props.detail || !recommendation.value) return
  const res = recommendation.value.resolution
  if (res === 'manual') return // Cannot auto-apply manual
  handleResolve(res as 'local' | 'server' | 'merged')
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Conflict Details"
    :style="{ width: '800px' }"
    modal
  >
    <template v-if="detail">
      <!-- Conflict Info -->
      <div class="conflict-info">
        <div class="info-row">
          <span class="info-label">Entity Type:</span>
          <span class="entity-type">{{ detail.conflict.entity_type }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Entity ID:</span>
          <code>{{ detail.conflict.entity_id }}</code>
        </div>
        <div class="info-row">
          <span class="info-label">Resolution:</span>
          <Tag :value="detail.conflict.resolution" />
        </div>
        <div class="info-row">
          <span class="info-label">Detected:</span>
          <span>{{ new Date(detail.conflict.created_at).toLocaleString() }}</span>
        </div>
      </div>

      <!-- Timestamp Comparison -->
      <div v-if="timestampComparison" class="timestamp-comparison">
        <h4>Timestamp Comparison</h4>
        <div class="timestamp-grid">
          <div class="timestamp-item" :class="{ 'is-newer': timestampComparison.newerVersion === 'local' }">
            <i class="pi pi-desktop"></i>
            <div>
              <div class="timestamp-label">Local Version</div>
              <div class="timestamp-value">{{ timestampComparison.localUpdatedAt }}</div>
            </div>
            <Tag v-if="timestampComparison.newerVersion === 'local'" value="Newer" severity="warn" />
          </div>
          <div class="timestamp-item" :class="{ 'is-newer': timestampComparison.newerVersion === 'server' }">
            <i class="pi pi-cloud"></i>
            <div>
              <div class="timestamp-label">Server Version</div>
              <div class="timestamp-value">{{ timestampComparison.serverUpdatedAt }}</div>
            </div>
            <Tag v-if="timestampComparison.newerVersion === 'server'" value="Newer" severity="info" />
          </div>
        </div>
      </div>

      <!-- Field-by-Field Diff -->
      <h4>Differences ({{ detail.differences.length }} fields)</h4>

      <div class="diff-table">
        <div class="diff-header">
          <div class="diff-cell diff-field">Field</div>
          <div class="diff-cell diff-local">Local Value</div>
          <div class="diff-cell diff-server">Server Value</div>
        </div>
        <div
          v-for="diff in detail.differences"
          :key="diff.field"
          class="diff-row"
        >
          <div class="diff-cell diff-field">
            <strong>{{ diff.field }}</strong>
          </div>
          <div class="diff-cell diff-local">
            <code class="value-cell local-value">{{ formatValue(diff.localValue) }}</code>
          </div>
          <div class="diff-cell diff-server">
            <code class="value-cell server-value">{{ formatValue(diff.serverValue) }}</code>
          </div>
        </div>
        <div v-if="detail.differences.length === 0" class="diff-row">
          <div class="diff-cell" style="grid-column: 1 / -1; text-align: center; color: var(--p-text-muted-color);">
            No differences found
          </div>
        </div>
      </div>

      <!-- Resolution Recommendation -->
      <div v-if="recommendation" class="recommendation-section">
        <h4>Resolution Recommendation</h4>
        <Message :severity="recommendation.severity" :closable="false">
          <div class="recommendation-content">
            <div class="recommendation-header">
              <strong>Recommended: {{ recommendation.label }}</strong>
            </div>
            <p class="recommendation-text">{{ recommendation.explanation }}</p>
          </div>
        </Message>
      </div>

      <!-- Merge Preview for Customer Conflicts -->
      <div v-if="mergePreview && mergePreview.length > 0" class="merge-preview">
        <h4>Merge Preview</h4>
        <div class="merge-table">
          <div class="merge-header">
            <div class="merge-cell">Field</div>
            <div class="merge-cell">Merged Value</div>
            <div class="merge-cell">Source</div>
          </div>
          <div
            v-for="item in mergePreview"
            :key="item.field"
            class="merge-row"
          >
            <div class="merge-cell"><strong>{{ item.field }}</strong></div>
            <div class="merge-cell"><code>{{ formatValue(item.value) }}</code></div>
            <div class="merge-cell">
              <Tag
                :value="item.source"
                :severity="item.source === 'local' ? 'warn' : 'info'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Resolution Actions -->
      <div v-if="!detail.conflict.resolved_at" class="resolve-actions">
        <h4>Manual Resolution</h4>
        <div class="action-buttons">
          <Button
            v-if="recommendation && recommendation.resolution !== 'manual'"
            :label="`Apply Recommended (${recommendation.label})`"
            icon="pi pi-check-circle"
            severity="success"
            @click="applyRecommended"
          />
          <Button
            label="Keep Local Version"
            icon="pi pi-desktop"
            severity="warn"
            outlined
            @click="handleResolve('local')"
          />
          <Button
            label="Accept Server Version"
            icon="pi pi-cloud"
            severity="info"
            outlined
            @click="handleResolve('server')"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.conflict-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.info-label {
  font-weight: 600;
  min-width: 100px;
}

.entity-type {
  text-transform: capitalize;
}

/* Timestamp Comparison */
.timestamp-comparison {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  background: var(--p-surface-50);
}

.timestamp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.timestamp-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: var(--p-border-radius);
}

.timestamp-item.is-newer {
  background: var(--p-surface-100);
}

.timestamp-item i {
  font-size: 1.25rem;
  color: var(--p-text-muted-color);
}

.timestamp-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.timestamp-value {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Diff Table */
.diff-table {
  border: 1px solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  overflow: hidden;
  margin-bottom: 1rem;
}

.diff-header {
  display: grid;
  grid-template-columns: 150px 1fr 1fr;
  background: var(--p-surface-100);
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr;
  border-top: 1px solid var(--p-surface-200);
}

.diff-cell {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  overflow: hidden;
}

.diff-local {
  background: rgba(239, 68, 68, 0.04);
}

.diff-server {
  background: rgba(34, 197, 94, 0.04);
}

.value-cell {
  font-size: 0.8125rem;
  word-break: break-all;
  white-space: pre-wrap;
}

.local-value {
  color: var(--p-red-600);
}

.server-value {
  color: var(--p-green-600);
}

/* Recommendation Section */
.recommendation-section {
  margin-bottom: 1rem;
}

.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recommendation-header {
  font-size: 0.9375rem;
}

.recommendation-text {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

/* Merge Preview */
.merge-preview {
  margin-bottom: 1rem;
}

.merge-table {
  border: 1px solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  overflow: hidden;
}

.merge-header {
  display: grid;
  grid-template-columns: 150px 1fr 100px;
  background: var(--p-surface-100);
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.merge-row {
  display: grid;
  grid-template-columns: 150px 1fr 100px;
  border-top: 1px solid var(--p-surface-200);
}

.merge-cell {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

/* Resolve Actions */
.resolve-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

h4 {
  margin: 0.5rem 0;
}
</style>
