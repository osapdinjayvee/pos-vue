<script setup lang="ts">
import { ref, computed } from 'vue'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import type { InventoryDiscrepancy } from '@/services/inventorySyncService'

const props = defineProps<{
  discrepancies: InventoryDiscrepancy[]
  visible: boolean
}>()

const emit = defineEmits<{
  dismiss: []
  review: [productId: string]
}>()

const dialogVisible = ref(false)

const discrepancyCount = computed(() => props.discrepancies.length)
const negativeCount = computed(() => props.discrepancies.filter((d) => d.is_negative).length)

function showDetails() {
  dialogVisible.value = true
}

function hideDetails() {
  dialogVisible.value = false
}

function handleReview(productId: string) {
  emit('review', productId)
  dialogVisible.value = false
}

function handleDismiss() {
  emit('dismiss')
}

function getSeverityForDifference(difference: number): 'danger' | 'warn' | 'success' {
  if (difference < 0) return 'danger'
  if (difference > 0) return 'warn'
  return 'success'
}
</script>

<template>
  <div v-if="visible && discrepancies.length > 0" class="inventory-reconciliation-alert">
    <Message severity="warn" :closable="true" @close="handleDismiss">
      <template #default>
        <div class="alert-content">
          <span>
            <strong>{{ discrepancyCount }}</strong> product{{ discrepancyCount !== 1 ? 's' : '' }}
            {{ discrepancyCount !== 1 ? 'have' : 'has' }} inventory discrepancies after sync.
            <span v-if="negativeCount > 0" class="negative-warning">
              {{ negativeCount }} with negative stock.
            </span>
          </span>
          <Button
            label="View Details"
            icon="pi pi-search"
            severity="warn"
            size="small"
            text
            @click="showDetails"
          />
        </div>
      </template>
    </Message>

    <Dialog
      v-model:visible="dialogVisible"
      header="Inventory Discrepancies"
      :modal="true"
      :style="{ width: '50rem' }"
      :breakpoints="{ '960px': '80vw', '640px': '95vw' }"
      @hide="hideDetails"
    >
      <p class="dialog-description">
        The following products have quantity differences between local and server inventory.
        Review each item and take corrective action if needed.
      </p>

      <DataTable
        :value="discrepancies"
        :paginator="discrepancies.length > 10"
        :rows="10"
        stripedRows
        size="small"
        class="discrepancy-table"
      >
        <Column field="product_name" header="Product" sortable>
          <template #body="{ data }">
            <span class="product-name">{{ data.product_name }}</span>
          </template>
        </Column>
        <Column field="local_qty" header="Local Qty" sortable style="text-align: right; width: 8rem">
          <template #body="{ data }">
            <span :class="{ 'negative-qty': data.local_qty < 0 }">
              {{ data.local_qty }}
            </span>
          </template>
        </Column>
        <Column field="server_qty" header="Server Qty" sortable style="text-align: right; width: 8rem">
          <template #body="{ data }">
            {{ data.server_qty }}
          </template>
        </Column>
        <Column field="difference" header="Difference" sortable style="text-align: right; width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="data.difference > 0 ? `+${data.difference}` : `${data.difference}`"
              :severity="getSeverityForDifference(data.difference)"
            />
          </template>
        </Column>
        <Column header="Status" style="width: 10rem">
          <template #body="{ data }">
            <Tag v-if="data.is_negative" value="Negative Stock" severity="danger" />
            <Tag v-else-if="Math.abs(data.difference) > 10" value="Large Variance" severity="warn" />
            <Tag v-else value="Minor Variance" severity="info" />
          </template>
        </Column>
        <Column header="Action" style="width: 6rem">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              severity="info"
              size="small"
              text
              rounded
              @click="handleReview(data.product_id)"
              v-tooltip.top="'Review product'"
            />
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <div class="dialog-footer">
          <span class="footer-summary">
            {{ discrepancyCount }} discrepanc{{ discrepancyCount !== 1 ? 'ies' : 'y' }}
            <span v-if="negativeCount > 0">
              ({{ negativeCount }} negative)
            </span>
          </span>
          <Button label="Close" severity="secondary" @click="hideDetails" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.alert-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
}

.negative-warning {
  color: var(--p-red-500);
  font-weight: 600;
}

.dialog-description {
  margin: 0 0 1rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.product-name {
  font-weight: 500;
}

.negative-qty {
  color: var(--p-red-500);
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.footer-summary {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}
</style>
