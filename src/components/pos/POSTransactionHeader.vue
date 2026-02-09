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
  <div class="flex items-center gap-4 px-4 py-2.5 border-b border-neutral-100 bg-white shrink-0">
    <div class="flex items-center gap-2 text-xs text-neutral-400">
      <i class="pi pi-user text-[10px]"></i>
      <span class="font-medium text-neutral-600">{{ cashierName }}</span>
    </div>
    <div class="w-px h-4 bg-neutral-200"></div>
    <div class="flex items-center gap-2 text-xs text-neutral-400">
      <i class="pi pi-hashtag text-[10px]"></i>
      <span class="font-medium text-neutral-600">{{ transactionNumber }}</span>
    </div>
    <a
      class="ml-auto flex items-center gap-2 text-xs cursor-pointer transition-colors group"
      @click="emit('add-customer')"
    >
      <i class="pi pi-id-card text-[10px] text-neutral-400 group-hover:text-[var(--p-primary-500)]"></i>
      <span
        v-if="customerName === 'Walk-in'"
        class="font-medium text-[var(--p-primary-500)] hover:text-[var(--p-primary-600)]"
      >+ Add Customer</span>
      <span
        v-else
        class="font-medium text-neutral-600 group-hover:text-[var(--p-primary-500)]"
      >{{ customerName }} <i class="pi pi-pencil text-[9px] text-neutral-300 group-hover:text-[var(--p-primary-400)]"></i></span>
    </a>
  </div>
</template>
