<script setup lang="ts">
/**
 * Batch / expiry tracking for a product's variant.
 *
 * Expiry alerts are derived from the `batches` table, but nothing in the app
 * ever created a batch — the form, list, and composable existed but were never
 * mounted, so the dashboard's expiry alerts could never fire. This card is the
 * entry point for that data.
 *
 * Laid out as a touch list rather than a data table: the app runs on Android
 * tablets, where a six-column table is unusable in portrait.
 */
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import BatchForm, { type BatchFormData } from './BatchForm.vue'
import { useBatches } from '@/composables/useBatches'
import { useInventoryStore } from '@/stores/inventory'
import type { Batch, DisplayBatch } from '@/types/inventory'

// useBatches binds to the variant id at setup, so the parent must key this
// component by variantId to switch variants.
const props = defineProps<{
  variantId: string
  variantName: string
}>()

const emit = defineEmits<{
  /** Raised after stock-affecting changes so the parent can refresh totals. */
  changed: []
}>()

const toast = useToast()
const confirm = useConfirm()
const inventoryStore = useInventoryStore()

const showForm = ref(false)
const editingBatch = ref<DisplayBatch | null>(null)
const isSaving = ref(false)

const {
  batches,
  isLoading,
  error,
  expiredBatches,
  expiringSoonBatches,
  fetchBatches,
  createBatch,
  updateBatch,
  deleteBatch
} = useBatches(props.variantId)

onMounted(fetchBatches)

const hasBatches = computed(() => batches.value.length > 0)

/**
 * BatchForm reads the database shape; the composable hands back display models.
 * Map rather than cast so a field rename cannot silently blank the edit form.
 */
const editingBatchRecord = computed<Batch | null>(() => {
  const batch = editingBatch.value
  if (!batch) return null
  return {
    id: batch.id,
    variant_id: batch.variantId,
    batch_number: batch.batchNumber,
    expiry_date: batch.expiryDate,
    manufacture_date: batch.manufactureDate,
    received_date: batch.receivedDate,
    supplier_id: batch.supplierId,
    notes: batch.notes,
    created_at: batch.createdAt,
    synced_at: null
  }
})

const trackedCount = computed(() => batches.value.filter(b => b.expiryDate).length)

/** Sort worst-first so anything expiring is at the top of the list. */
const sortedBatches = computed(() => {
  return [...batches.value].sort((a, b) => {
    if (a.daysUntilExpiry === null) return 1
    if (b.daysUntilExpiry === null) return -1
    return a.daysUntilExpiry - b.daysUntilExpiry
  })
})

function expiryStatus(batch: DisplayBatch): { label: string; severity: 'danger' | 'warn' | 'success' | 'secondary' } {
  if (!batch.expiryDate || batch.daysUntilExpiry === null) {
    return { label: 'No expiry set', severity: 'secondary' }
  }
  const days = batch.daysUntilExpiry
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, severity: 'danger' }
  if (days === 0) return { label: 'Expires today', severity: 'danger' }
  if (days <= 7) return { label: `${days}d left`, severity: 'danger' }
  if (days <= 30) return { label: `${days}d left`, severity: 'warn' }
  return { label: `${days}d left`, severity: 'success' }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function handleAdd() {
  editingBatch.value = null
  showForm.value = true
}

function handleEdit(batch: DisplayBatch) {
  editingBatch.value = batch
  showForm.value = true
}

/**
 * Nulls are passed through rather than dropped so clearing a date in the form
 * actually clears it on the record.
 */
function toBatchInput(data: BatchFormData) {
  return {
    batch_number: data.batch_number,
    expiry_date: data.expiry_date,
    manufacture_date: data.manufacture_date,
    received_date: data.received_date,
    supplier_id: data.supplier_id,
    notes: data.notes
  }
}

async function handleSave(data: BatchFormData) {
  isSaving.value = true
  try {
    const saved = editingBatch.value
      ? await updateBatch(editingBatch.value.id, toBatchInput(data))
      : await createBatch({ ...toBatchInput(data), initial_quantity: data.initial_quantity })

    if (!saved) {
      toast.add({
        severity: 'error',
        summary: 'Not Saved',
        detail: error.value || 'Could not save the batch.',
        life: 5000
      })
      return
    }

    showForm.value = false
    toast.add({
      severity: 'success',
      summary: editingBatch.value ? 'Batch Updated' : 'Batch Added',
      detail: `${data.batch_number} saved.`,
      life: 3000
    })

    await refreshAlerts()
    emit('changed')
  } finally {
    isSaving.value = false
  }
}

function handleDelete(batch: DisplayBatch) {
  confirm.require({
    message: batch.currentQuantity > 0
      ? `"${batch.batchNumber}" still has ${batch.currentQuantity} in stock and cannot be deleted.`
      : `Delete batch "${batch.batchNumber}"?`,
    header: 'Delete Batch',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: async () => {
      const ok = await deleteBatch(batch.id)
      if (!ok) {
        toast.add({
          severity: 'error',
          summary: 'Not Deleted',
          detail: error.value || 'Could not delete the batch.',
          life: 5000
        })
        return
      }
      toast.add({ severity: 'success', summary: 'Deleted', detail: `${batch.batchNumber} removed.`, life: 3000 })
      await refreshAlerts()
      emit('changed')
    }
  })
}

/**
 * Re-run expiry detection so the dashboard reflects the change immediately
 * instead of waiting for the next alert fetch.
 */
async function refreshAlerts() {
  try {
    await inventoryStore.fetchAlerts()
  } catch {
    // A stale alert badge is not worth surfacing an error for.
  }
}
</script>

<template>
  <div class="batches-card">
    <!-- Summary -->
    <div v-if="hasBatches" class="batch-summary">
      <div class="summary-chip" :class="{ 'is-active': expiredBatches.length > 0 }">
        <i class="pi pi-times-circle"></i>
        <span>{{ expiredBatches.length }} expired</span>
      </div>
      <div class="summary-chip" :class="{ 'is-warning': expiringSoonBatches.length > 0 }">
        <i class="pi pi-clock"></i>
        <span>{{ expiringSoonBatches.length }} expiring soon</span>
      </div>
      <div class="summary-chip">
        <i class="pi pi-box"></i>
        <span>{{ trackedCount }} of {{ batches.length }} dated</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !hasBatches" class="batch-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading batches…</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!hasBatches" class="batch-state">
      <i class="pi pi-calendar-times"></i>
      <p class="batch-state__title">No batches yet</p>
      <p class="batch-state__hint">
        Add a batch with an expiry date to get expiring and expired alerts on the dashboard.
      </p>
    </div>

    <!-- List -->
    <ul v-else class="batch-list">
      <li v-for="batch in sortedBatches" :key="batch.id" class="batch-row">
        <div class="batch-row__main">
          <div class="batch-row__heading">
            <span class="batch-row__number">{{ batch.batchNumber }}</span>
            <Tag :value="expiryStatus(batch).label" :severity="expiryStatus(batch).severity" />
          </div>
          <div class="batch-row__meta">
            <span><i class="pi pi-box"></i> {{ batch.currentQuantity }} in stock</span>
            <span><i class="pi pi-calendar"></i> Expires {{ formatDate(batch.expiryDate) }}</span>
            <span v-if="batch.supplierName"><i class="pi pi-truck"></i> {{ batch.supplierName }}</span>
          </div>
        </div>

        <div class="batch-row__actions">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            outlined
            aria-label="Edit batch"
            @click="handleEdit(batch)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            outlined
            aria-label="Delete batch"
            @click="handleDelete(batch)"
          />
        </div>
      </li>
    </ul>

    <Button
      label="Add Batch"
      icon="pi pi-plus"
      class="add-batch-button"
      :disabled="isLoading"
      @click="handleAdd"
    />

    <BatchForm
      v-model:visible="showForm"
      :batch="editingBatchRecord"
      :variant-id="variantId"
      :variant-name="variantName"
      :loading="isSaving"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.batches-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.batch-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: var(--app-surface-100);
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-weight: 500;
}

.summary-chip.is-active {
  background: var(--p-red-50);
  color: var(--p-red-600);
}

.summary-chip.is-warning {
  background: var(--p-orange-50);
  color: var(--p-orange-600);
}

.batch-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.batch-state i {
  font-size: 1.75rem;
}

.batch-state__title {
  margin: 0.25rem 0 0;
  font-weight: 600;
  color: var(--p-text-color);
}

.batch-state__hint {
  margin: 0;
  max-width: 34ch;
  font-size: 0.875rem;
  line-height: 1.4;
}

.batch-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.batch-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--app-surface-200);
  border-radius: 8px;
  background: var(--app-surface-0);
}

.batch-row__main {
  flex: 1;
  min-width: 0;
}

.batch-row__heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.batch-row__number {
  font-weight: 600;
  word-break: break-all;
}

.batch-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.85rem;
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.batch-row__meta i {
  font-size: 0.75rem;
  margin-right: 0.2rem;
}

.batch-row__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* Comfortable thumb targets on the tablet. */
.batch-row__actions :deep(.p-button) {
  width: 2.75rem;
  height: 2.75rem;
}

.add-batch-button {
  width: 100%;
  justify-content: center;
  min-height: 2.75rem;
}

@media (max-width: 640px) {
  .batch-row {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-row__actions {
    justify-content: flex-end;
  }
}
</style>
