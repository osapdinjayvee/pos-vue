<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import db from '@/db/database'
import { formatCurrency } from '@/utils/format'

interface InventoryStats {
  totalProducts: number
  totalUnits: number
  inventoryValue: number    // stock × cost
  retailValue: number       // stock × price
  expectedProfit: number    // retailValue - inventoryValue
  profitMargin: number      // (expectedProfit / retailValue) × 100
  lowStockCount: number
  outOfStockCount: number
}

const stats = ref<InventoryStats | null>(null)
const isLoading = ref(true)

async function loadStats() {
  isLoading.value = true
  try {
    const result = await db.getOne<{
      total_products: number
      total_units: number
      inventory_value: number
      retail_value: number
      low_stock: number
      out_of_stock: number
    }>(
      `SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(stock), 0) as total_units,
        COALESCE(SUM(stock * cost), 0) as inventory_value,
        COALESCE(SUM(stock * price), 0) as retail_value,
        COALESCE(SUM(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 ELSE 0 END), 0) as low_stock,
        COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0) as out_of_stock
       FROM products
       WHERE status != 'inactive'`
    )

    if (result) {
      const inventoryValue = result.inventory_value
      const retailValue = result.retail_value
      const expectedProfit = retailValue - inventoryValue

      stats.value = {
        totalProducts: result.total_products,
        totalUnits: result.total_units,
        inventoryValue,
        retailValue,
        expectedProfit,
        profitMargin: retailValue > 0 ? (expectedProfit / retailValue) * 100 : 0,
        lowStockCount: result.low_stock,
        outOfStockCount: result.out_of_stock
      }
    }
  } catch (e) {
    console.error('[InventoryValueWidget] Failed to load stats:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <Card class="inventory-value-card">
    <template #title>
      <div class="widget-header">
        <span>Inventory Value</span>
        <i class="pi pi-box widget-icon"></i>
      </div>
    </template>
    <template #content>
      <div v-if="isLoading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
      </div>

      <div v-else-if="stats" class="stats-grid">
        <!-- Primary: Inventory Cost Value -->
        <div class="stat-primary">
          <div class="stat-value primary-value">{{ formatCurrency(stats.inventoryValue) }}</div>
          <div class="stat-label">Total Inventory Value (at cost)</div>
        </div>

        <!-- Secondary: Retail Value -->
        <div class="stat-primary">
          <div class="stat-value retail-value">{{ formatCurrency(stats.retailValue) }}</div>
          <div class="stat-label">Retail Value (at selling price)</div>
        </div>

        <!-- Profit -->
        <div class="stat-highlight">
          <div class="profit-row">
            <div>
              <div class="stat-value profit-value">{{ formatCurrency(stats.expectedProfit) }}</div>
              <div class="stat-label">Expected Profit</div>
            </div>
            <div class="margin-badge">
              <span class="margin-value">{{ stats.profitMargin.toFixed(1) }}%</span>
              <span class="margin-label">margin</span>
            </div>
          </div>
        </div>

        <!-- Secondary stats -->
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-item-value">{{ stats.totalProducts }}</div>
            <div class="stat-item-label">Products</div>
          </div>
          <div class="stat-item">
            <div class="stat-item-value">{{ stats.totalUnits.toLocaleString() }}</div>
            <div class="stat-item-label">Total Units</div>
          </div>
          <div class="stat-item">
            <div class="stat-item-value warn">{{ stats.lowStockCount }}</div>
            <div class="stat-item-label">Low Stock</div>
          </div>
          <div class="stat-item">
            <div class="stat-item-value danger">{{ stats.outOfStockCount }}</div>
            <div class="stat-item-label">Out of Stock</div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.inventory-value-card {
  height: 100%;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.widget-icon {
  font-size: 1.25rem;
  color: var(--p-text-muted-color);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
  font-size: 1.5rem;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-primary {
  padding: 0.75rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.primary-value {
  color: var(--p-blue-600);
}

.retail-value {
  color: var(--p-text-color);
}

.profit-value {
  color: var(--p-green-600);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
}

.stat-highlight {
  padding: 0.75rem;
  background: var(--p-green-50);
  border: 1px solid var(--p-green-200);
  border-radius: 8px;
}

.profit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.margin-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--p-green-100);
  border-radius: 8px;
}

.margin-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--p-green-700);
}

.margin-label {
  font-size: 0.6875rem;
  color: var(--p-green-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
}

.stat-item {
  text-align: center;
  padding: 0.5rem 0.25rem;
}

.stat-item-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.stat-item-value.warn {
  color: var(--p-orange-500);
}

.stat-item-value.danger {
  color: var(--p-red-500);
}

.stat-item-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-top: 0.125rem;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 1.25rem;
  }

  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
