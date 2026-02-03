<script setup lang="ts">
import StatsCard from '@/components/dashboard/StatsCard.vue'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import PaymentChart from '@/components/dashboard/PaymentChart.vue'
import RecentOrders from '@/components/dashboard/RecentOrders.vue'
import TopProducts from '@/components/dashboard/TopProducts.vue'
import { statsData } from '@/data/mockData'
</script>

<template>
  <div class="dashboard-grid">
    <div class="stats-row">
      <StatsCard v-for="stat in statsData" :key="stat.label" :data="stat" />
    </div>

    <div class="charts-row">
      <RevenueChart />
      <PaymentChart />
    </div>

    <div class="data-row">
      <SalesChart />
      <TopProducts />
    </div>

    <div class="full-width-row">
      <RecentOrders />
    </div>
  </div>
</template>
