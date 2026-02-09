<script setup lang="ts">
import Button from 'primevue/button'

const emit = defineEmits<{
  next: []
  back: []
}>()
</script>

<template>
  <div class="flex flex-col h-screen px-4">
    <div class="flex-1 flex flex-col items-center justify-center text-center gap-6 overflow-y-auto pb-24">
      <div class="w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center">
        <i class="pi pi-shop text-primary" style="font-size: 5rem"></i>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold text-surface-900">Welcome to POS System</h2>
        <p class="text-surface-500 text-lg max-w-md">
          Let's get your point-of-sale system set up. This wizard will guide you through:
        </p>
      </div>

      <div class="flex flex-col gap-3 text-left max-w-sm w-full">
        <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-100">
          <i class="pi pi-key text-primary text-lg"></i>
          <span class="text-surface-700">License verification</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-100">
          <i class="pi pi-building text-primary text-lg"></i>
          <span class="text-surface-700">Business information (BIR-compliant)</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-100">
          <i class="pi pi-user text-primary text-lg"></i>
          <span class="text-surface-700">Admin & cashier accounts</span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-100">
          <i class="pi pi-file text-primary text-lg"></i>
          <span class="text-surface-700">Terms & conditions</span>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-surface-50 flex justify-end px-4 py-4">
      <Button
        label="Get Started"
        icon="pi pi-arrow-right"
        iconPos="right"
        class="!h-14 !text-base !font-bold"
        @click="emit('next')"
      />
    </div>
  </div>
</template>
