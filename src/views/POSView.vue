<script setup lang="ts">
import { onMounted } from 'vue'
import { useORSeriesStore } from '@/stores/orSeries'
import { useProductStore } from '@/stores/product'
import POSTerminal from '@/components/pos/POSTerminal.vue'

const orSeriesStore = useORSeriesStore()
const productStore = useProductStore()

onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    orSeriesStore.loadActiveSeries()
  ])

  const status = await orSeriesStore.checkActiveSeriesStatus()
  if (!status.hasActiveSeries) {
    console.warn('No active OR series configured')
  }
})
</script>

<template>
  <div class="pos-view">
    <POSTerminal />
  </div>
</template>

<style scoped>
.pos-view {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--p-surface-ground);
}
</style>
