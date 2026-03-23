<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Toolbar from 'primevue/toolbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Paginator from 'primevue/paginator'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import { toDisplayStockMovement, MovementTypeLabels } from '@/types/inventory'
import type { DisplayStockMovement, MovementType } from '@/types/inventory'
import { formatCurrency } from '@/utils/format'
import { exportToCsv } from '@/utils/exportCsv'
import type { ExportColumn } from '@/utils/exportCsv'
import { toLocalDateStr } from '@/utils/dateHelpers'

const toast = useToast()

// Filter state
const searchQuery = ref('')
const selectedType = ref<MovementType | null>(null)
const dateFrom = ref<Date | null>(null)
const dateTo = ref<Date | null>(null)

// Table state
const movements = ref<DisplayStockMovement[]>([])
const isLoading = ref(false)
const totalRecords = ref(0)
const first = ref(0)
const rows = ref(25)

// Movement type options
const typeOptions = computed(() => [
  { label: 'All Types', value: null },
  ...Object.entries(MovementTypeLabels).map(([value, label]) => ({ label, value }))
])

const movementTypeSeverity: Record<MovementType, string> = {
  receive: 'success',
  sale: 'info',
  adjustment: 'warn',
  transfer_in: 'success',
  transfer_out: 'info',
  return: 'secondary',
  void: 'danger',
  void_restore: 'success'
}

async function loadMovements() {
  isLoading.value = true
  try {
    const result = await stockMovementRepository.getFilteredWithDetails({
      movementType: selectedType.value || undefined,
      search: searchQuery.value.trim() || undefined,
      dateFrom: dateFrom.value ? toLocalDateStr(dateFrom.value) : undefined,
      dateTo: dateTo.value ? toLocalDateStr(dateTo.value) : undefined,
      limit: rows.value,
      offset: first.value
    })

    movements.value = result.data.map(m => toDisplayStockMovement(
      m,
      m.variant_name,
      m.product_name,
      m.batch_number
    ))
    totalRecords.value = result.total
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load movements', life: 3000 })
  } finally {
    isLoading.value = false
  }
}

function onPageChange(event: { first: number; rows: number }) {
  first.value = event.first
  rows.value = event.rows
  loadMovements()
}

function resetFilters() {
  searchQuery.value = ''
  selectedType.value = null
  dateFrom.value = null
  dateTo.value = null
  first.value = 0
  loadMovements()
}

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    first.value = 0
    loadMovements()
  }, 400)
})

watch([selectedType, dateFrom, dateTo], () => {
  first.value = 0
  loadMovements()
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatQuantity(quantity: number): string {
  if (quantity > 0) return `+${quantity}`
  return quantity.toString()
}

function getQuantityClass(quantity: number): string {
  return quantity > 0 ? 'qty-positive' : 'qty-negative'
}

function handleExport() {
  const columns: ExportColumn[] = [
    { field: 'createdAt', header: 'Date', formatter: (v) => formatDate(v) },
    { field: 'productName', header: 'Product' },
    { field: 'variantName', header: 'Variant' },
    { field: 'movementTypeLabel', header: 'Type' },
    { field: 'quantity', header: 'Quantity' },
    { field: 'unitCost', header: 'Unit Cost', formatter: (v) => v?.toFixed(2) ?? '' },
    { field: 'reason', header: 'Notes' },
    { field: 'referenceId', header: 'Reference' }
  ]

  const dateStr = toLocalDateStr()
  exportToCsv(movements.value, `stock-movements-${dateStr}`, columns)

  toast.add({
    severity: 'success',
    summary: 'Export Complete',
    detail: `Exported ${movements.value.length} movements`,
    life: 3000
  })
}

// Summary stats
const summaryStats = computed(() => {
  const stats = {
    total: totalRecords.value,
    displayed: movements.value.length
  }
  return stats
})

onMounted(loadMovements)
</script>

<template>
  <div class="movements-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Product Movements</h1>
          <p class="text-muted">Track all stock movements across products</p>
        </div>
      </div>
    </div>

    <!-- Filters Toolbar -->
    <Toolbar class="movements-toolbar">
      <template #start>
        <div class="filter-group">
          <Select
            v-model="selectedType"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Types"
            class="type-filter"
          />
          <DatePicker
            v-model="dateFrom"
            placeholder="From date"
            dateFormat="yy-mm-dd"
            showIcon
            :showOnFocus="false"
            class="date-filter"
          />
          <DatePicker
            v-model="dateTo"
            placeholder="To date"
            dateFormat="yy-mm-dd"
            showIcon
            :showOnFocus="false"
            class="date-filter"
          />
          <Button
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            rounded
            @click="resetFilters"
            v-tooltip.top="'Clear Filters'"
          />
        </div>
      </template>

      <template #end>
        <div class="toolbar-end">
          <span class="p-input-icon-left search-wrapper">
            <i class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search name, SKU, barcode..."
              class="search-input"
            />
          </span>
          <Button
            label="Export"
            icon="pi pi-download"
            severity="secondary"
            outlined
            @click="handleExport"
            :disabled="movements.length === 0"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Content -->
    <div class="movements-content">
      <!-- Loading State -->
      <div v-if="isLoading && movements.length === 0" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Loading movements...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="movements.length === 0" class="empty-state">
        <i class="pi pi-inbox"></i>
        <h3>No movements found</h3>
        <p v-if="searchQuery || selectedType || dateFrom || dateTo">Try adjusting your filters</p>
        <p v-else>Stock movements will appear here as transactions are processed</p>
      </div>

      <!-- Data Table -->
      <div v-else class="table-container flex-table">
        <DataTable
          :value="movements"
          :loading="isLoading"
          dataKey="id"
          stripedRows
          class="movements-table"
        >
          <Column field="createdAt" header="Date" style="min-width: 160px">
            <template #body="{ data }">
              <span class="date-cell">{{ formatDate(data.createdAt) }}</span>
            </template>
          </Column>

          <Column header="Product" style="min-width: 220px">
            <template #body="{ data }">
              <div class="product-cell">
                <span class="product-name">{{ data.productName }}</span>
                <span v-if="data.variantName && data.variantName !== 'Default'" class="variant-name">
                  {{ data.variantName }}
                </span>
              </div>
            </template>
          </Column>

          <Column field="movementType" header="Type" style="min-width: 130px">
            <template #body="{ data }">
              <Tag
                :value="data.movementTypeLabel"
                :severity="movementTypeSeverity[data.movementType as MovementType]"
              />
            </template>
          </Column>

          <Column field="quantity" header="Qty" style="min-width: 80px">
            <template #body="{ data }">
              <span :class="['qty-cell', getQuantityClass(data.quantity)]">
                {{ formatQuantity(data.quantity) }}
              </span>
            </template>
          </Column>

          <Column field="unitCost" header="Unit Cost" style="min-width: 100px">
            <template #body="{ data }">
              <span v-if="data.unitCost !== null && data.unitCost !== undefined">
                {{ formatCurrency(data.unitCost) }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column field="referenceId" header="Reference" style="min-width: 130px">
            <template #body="{ data }">
              <span v-if="data.referenceId" class="reference-cell">
                {{ data.referenceId }}
              </span>
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <Column field="reason" header="Notes" style="min-width: 180px">
            <template #body="{ data }">
              <span v-if="data.reason" class="reason-cell">{{ data.reason }}</span>
              <span v-else-if="data.batchNumber" class="batch-cell">Batch: {{ data.batchNumber }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </Column>

          <template #empty>
            <div class="empty-table">
              <i class="pi pi-inbox"></i>
              <p>No movements found</p>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- Pagination -->
      <div v-if="totalRecords > 0 && !isLoading" class="table-pagination">
        <span class="record-count">
          Showing {{ first + 1 }}-{{ Math.min(first + rows, totalRecords) }} of {{ totalRecords }} movements
        </span>
        <Paginator
          :first="first"
          :rows="rows"
          :totalRecords="totalRecords"
          :rowsPerPageOptions="[25, 50, 100]"
          @page="onPageChange"
          class="movements-paginator"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.movements-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.view-header {
  margin-bottom: 1rem;
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  margin: 0;
  font-size: 0.875rem;
}

/* Toolbar */
.movements-toolbar {
  margin-bottom: 1rem;
  border-radius: 12px;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.type-filter {
  width: 160px;
}

.date-filter {
  width: 150px;
}

.toolbar-end {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-wrapper {
  position: relative;
}

.search-wrapper i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--p-text-muted-color);
}

.search-input {
  padding-left: 2.25rem;
  width: 200px;
}

/* Content */
.movements-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--p-text-muted-color);
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
}


.movements-table {
  min-width: 100%;
  font-size: 0.875rem;
}

.empty-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-table i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.date-cell {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.product-cell {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 500;
  color: var(--p-text-color);
}

.variant-name {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.qty-cell {
  font-weight: 600;
  font-size: 0.9375rem;
}

.qty-positive {
  color: var(--p-green-600);
}

.qty-negative {
  color: var(--p-red-600);
}

.reference-cell {
  font-size: 0.8125rem;
  font-family: monospace;
  color: var(--p-text-muted-color);
}

.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-cell {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}

.record-count {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Responsive */
@media (max-width: 1024px) {
  .filter-group {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .movements-toolbar {
    border-radius: 8px;
  }

  .toolbar-end :deep(.p-button-label) {
    display: none;
  }

  .search-input {
    width: 150px;
  }

  .type-filter {
    width: 140px;
  }

  .date-filter {
    width: 130px;
  }

  .table-pagination {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
