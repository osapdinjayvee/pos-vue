<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  hasTransaction: boolean
}>()

const emit = defineEmits<{
  (e: 'scan', value: string): void
  (e: 'browse'): void
  (e: 'action', actionId: string): void
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    const val = inputValue.value.trim()
    if (val) {
      emit('scan', val)
      inputValue.value = ''
    } else {
      emit('browse')
    }
  }
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="mt-auto shrink-0 border-t border-neutral-200">
    <!-- Barcode input -->
    <div class="p-3 sm:p-4 bg-neutral-100">
      <div class="relative">
        <i class="pi pi-barcode absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg"></i>
        <input
          ref="inputRef"
          v-model="inputValue"
          class="w-full h-12 sm:h-14 pl-10 pr-4 text-base sm:text-lg font-medium rounded-xl border border-neutral-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
          placeholder="Scan barcode or type SKU..."
          @keydown="handleKeydown"
        />
      </div>
    </div>

    <!-- Void (1/4) | Hold (1/4) | Tender (2/4) -->
    <div class="flex">
      <button
        class="w-1/4 h-12 sm:h-14 flex items-center justify-center gap-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
        :class="{ '!opacity-35 !cursor-not-allowed': !hasTransaction }"
        :disabled="!hasTransaction"
        @click="emit('action', 'void')"
      >
        <i class="pi pi-ban"></i> Void
      </button>
      <button
        class="w-1/4 h-12 sm:h-14 flex items-center justify-center gap-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all cursor-pointer"
        :class="{ '!opacity-35 !cursor-not-allowed': !hasTransaction }"
        :disabled="!hasTransaction"
        @click="emit('action', 'hold')"
      >
        <i class="pi pi-pause"></i> Hold
      </button>
      <button
        class="w-2/4 h-12 sm:h-14 flex items-center justify-center gap-2 text-base font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all cursor-pointer"
        :class="{ '!opacity-35 !cursor-not-allowed': !hasTransaction }"
        :disabled="!hasTransaction"
        @click="emit('action', 'tender')"
      >
        <i class="pi pi-money-bill"></i> Tender
      </button>
    </div>
  </div>
</template>
