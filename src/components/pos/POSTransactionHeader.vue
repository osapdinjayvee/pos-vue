<script setup lang="ts">
defineProps<{
  cashierName: string
  transactionNumber: string
  customerName: string
}>()

const emit = defineEmits<{
  (e: 'add-customer'): void
}>()
</script>

<template>
  <div class="flex justify-between items-center px-3 sm:px-4 py-2 border-b border-neutral-200 text-sm text-neutral-600">
    <span>Cashier: {{ cashierName }}</span>
    <span>Txn: {{ transactionNumber }}</span>
    <span>
      Customer:
      <a
        v-if="customerName === 'Walk-in'"
        class="text-blue-600 hover:underline cursor-pointer"
        @click="emit('add-customer')"
      >Walk-in</a>
      <template v-else>{{ customerName }}</template>
    </span>
  </div>
</template>
