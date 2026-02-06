<script setup lang="ts">
import { ref, watch } from 'vue'
import InputText from 'primevue/inputtext'

const props = defineProps<{
  cashierName: string
  baggerName: string
}>()

const emit = defineEmits<{
  (e: 'update:baggerName', name: string): void
}>()

const localBagger = ref(props.baggerName)

watch(() => props.baggerName, (val) => {
  localBagger.value = val
})

watch(localBagger, (val) => {
  emit('update:baggerName', val)
})
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b border-neutral-200 bg-neutral-50">
    <div>
      <label class="text-xs text-neutral-500">Cashier</label>
      <div class="text-sm sm:text-base font-semibold text-neutral-900">{{ cashierName || '—' }}</div>
    </div>
    <div>
      <label class="text-xs text-neutral-500">Bagger</label>
      <InputText v-model="localBagger" placeholder="Enter bagger name" class="w-full h-10 sm:h-12 text-sm" />
    </div>
  </div>
</template>
