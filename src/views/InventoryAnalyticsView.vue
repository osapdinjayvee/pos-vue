<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import InventoryOverviewCards from '@/components/analytics/InventoryOverviewCards.vue'
import ExpiryAnalyticsTable from '@/components/analytics/ExpiryAnalyticsTable.vue'
import ReorderSuggestionsTable from '@/components/analytics/ReorderSuggestionsTable.vue'
import ABCAnalysisChart from '@/components/analytics/ABCAnalysisChart.vue'
import { inventoryAnalyticsService } from '@/services/inventoryAnalyticsService'
import type {
  InventoryOverview,
  ExpiryItem,
  ReorderSuggestion,
  ABCClassification
} from '@/types/analytics'

const toast = useToast()

// State
const loadingOverview = ref(false)
const loadingExpiry = ref(false)
const loadingReorder = ref(false)
const loadingAbc = ref(false)

const overview = ref<InventoryOverview | null>(null)
const expiryItems = ref<ExpiryItem[]>([])
const reorderSuggestions = ref<ReorderSuggestion[]>([])
const abcClassifications = ref<ABCClassification[]>([])

// ABC date range filter — default to last 30 days
const abcDateRange = ref<Date[]>([
  new Date(new Date().setDate(new Date().getDate() - 30)),
  new Date()
])

// Load overview stats
async function loadOverview() {
  loadingOverview.value = true
  try {
    overview.value = await inventoryAnalyticsService.getInventoryOverview()
  } catch (e) {
    console.error('Failed to load inventory overview:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load inventory overview',
      life: 3000
    })
  } finally {
    loadingOverview.value = false
  }
}

// Load expiry analytics
async function loadExpiry() {
  loadingExpiry.value = true
  try {
    expiryItems.value = await inventoryAnalyticsService.getExpiryAnalytics(undefined, 30)
  } catch (e) {
    console.error('Failed to load expiry analytics:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load expiry analytics',
      life: 3000
    })
  } finally {
    loadingExpiry.value = false
  }
}

// Load reorder suggestions
async function loadReorder() {
  loadingReorder.value = true
  try {
    reorderSuggestions.value = await inventoryAnalyticsService.getReorderSuggestions()
  } catch (e) {
    console.error('Failed to load reorder suggestions:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load reorder suggestions',
      life: 3000
    })
  } finally {
    loadingReorder.value = false
  }
}

// Load ABC analysis
async function loadAbcAnalysis() {
  if (!abcDateRange.value[0] || !abcDateRange.value[1]) return

  loadingAbc.value = true
  try {
    const dateFrom = abcDateRange.value[0].toISOString().split('T')[0]
    const dateTo = abcDateRange.value[1].toISOString().split('T')[0]
    abcClassifications.value = await inventoryAnalyticsService.getAbcAnalysis(dateFrom, dateTo)
  } catch (e) {
    console.error('Failed to load ABC analysis:', e)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load ABC analysis',
      life: 3000
    })
  } finally {
    loadingAbc.value = false
  }
}

// Handle stock-in action from reorder table
function handleStockIn(suggestion: ReorderSuggestion) {
  toast.add({
    severity: 'info',
    summary: 'Stock In',
    detail: `Creating stock-in for ${suggestion.productName} (qty: ${suggestion.suggestedQty})`,
    life: 3000
  })
  // TODO: Navigate to stock-in form or open dialog
}

// Handle ABC date range change
function handleAbcDateChange() {
  if (abcDateRange.value[0] && abcDateRange.value[1]) {
    loadAbcAnalysis()
  }
}

// Load all data on mount
onMounted(() => {
  loadOverview()
  loadExpiry()
  loadReorder()
  loadAbcAnalysis()
})
</script>

<template>
  <div class="inventory-analytics-view">
    <Toast />

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <h1>Inventory Analytics</h1>
        <p class="text-muted">Monitor stock health, expiry risk, and product performance</p>
      </div>
      <div class="header-actions">
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="() => { loadOverview(); loadExpiry(); loadReorder(); loadAbcAnalysis(); }"
        />
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Overview Cards -->
      <div class="full-width-row">
        <InventoryOverviewCards
          :overview="overview"
          :loading="loadingOverview"
        />
      </div>

      <!-- Expiry + Reorder Row -->
      <div class="data-row">
        <ExpiryAnalyticsTable
          :items="expiryItems"
          :loading="loadingExpiry"
        />
        <ReorderSuggestionsTable
          :suggestions="reorderSuggestions"
          :loading="loadingReorder"
          @create-stock-in="handleStockIn"
        />
      </div>

      <!-- ABC Analysis -->
      <div class="full-width-row">
        <div class="abc-section">
          <div class="abc-header">
            <h3 class="abc-title">ABC Analysis</h3>
            <div class="abc-filters">
              <DatePicker
                v-model="abcDateRange"
                selectionMode="range"
                placeholder="Select date range"
                dateFormat="yy-mm-dd"
                showIcon
                showButtonBar
                class="abc-date-picker"
                @update:modelValue="handleAbcDateChange"
              />
              <Button
                label="Apply"
                icon="pi pi-search"
                size="small"
                @click="loadAbcAnalysis"
              />
            </div>
          </div>
          <ABCAnalysisChart
            :classifications="abcClassifications"
            :loading="loadingAbc"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-analytics-view {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.abc-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.abc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.abc-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0;
}

.abc-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.abc-date-picker {
  width: 260px;
}

@media (max-width: 767.98px) {
  .abc-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .abc-filters {
    width: 100%;
    flex-direction: column;
  }

  .abc-date-picker {
    width: 100%;
  }
}
</style>
