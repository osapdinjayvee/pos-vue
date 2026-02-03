<script setup lang="ts">
import Button from 'primevue/button'
import { topProducts } from '@/data/mockData'

const formatCurrency = (value: number) => {
  return '$' + value.toLocaleString()
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3 class="chart-card-title">Top Selling Products</h3>
      <Button label="View All" link size="small" />
    </div>
    <div class="products-list">
      <div v-for="product in topProducts" :key="product.id" class="product-item">
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
  </div>
</template>
