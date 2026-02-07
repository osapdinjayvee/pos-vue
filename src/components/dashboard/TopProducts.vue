<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import db from '@/db/database'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
  dateFrom: string
  dateTo: string
}>()

interface TopProduct {
  name: string
  category: string
  sold: number
  revenue: number
}

const products = ref<TopProduct[]>([])

async function loadData() {
  const rows = await db.query<{ name: string; category: string; sold: number; revenue: number }>(
    `SELECT ti.product_name as name,
            COALESCE(c.name, 'Uncategorized') as category,
            SUM(ti.quantity) as sold,
            SUM(ti.line_total) as revenue
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     LEFT JOIN products p ON p.id = ti.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE date(t.created_at) >= ? AND date(t.created_at) <= ?
       AND t.status = 'completed'
     GROUP BY ti.product_id
     ORDER BY revenue DESC
     LIMIT 5`,
    [props.dateFrom, props.dateTo]
  )
  products.value = rows
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

onMounted(loadData)
watch(() => [props.dateFrom, props.dateTo], loadData)
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Top Selling Products</h3>
    </div>
    <div v-if="products.length" class="products-list">
      <div v-for="product in products" :key="product.name" class="product-item">
        <div class="product-avatar">
          {{ getInitials(product.name) }}
        </div>
        <div class="product-info">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-category">{{ product.category }}</div>
        </div>
        <div class="product-stats">
          <div class="product-revenue">{{ formatCurrency(product.revenue) }}</div>
          <div class="product-sold">{{ product.sold }} sold</div>
        </div>
      </div>
    </div>
    <div v-else style="padding:2rem;text-align:center;color:var(--p-text-muted-color)">
      No product data for this period
    </div>
  </div>
</template>
