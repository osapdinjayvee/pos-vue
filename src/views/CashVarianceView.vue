<script setup lang="ts">
import VarianceReport from '@/components/cash-drawer/VarianceReport.vue'
</script>

<template>
  <div class="view-container">
    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Cash Variance Report</h1>
          <p class="text-muted">Analyze cash drawer variances by period and cashier</p>
        </div>
      </div>
    </div>
    <VarianceReport />
  </div>
</template>
