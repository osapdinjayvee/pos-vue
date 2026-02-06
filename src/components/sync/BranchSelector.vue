<script setup lang="ts">
import { computed } from 'vue'
import Select from 'primevue/select'
import type { Branch } from '@/types/sync'

const props = defineProps<{
  modelValue: string | null
  branches: Branch[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const options = computed(() => [
  { label: 'All Branches', value: null },
  ...props.branches.map((b) => ({
    label: `${b.name} (${b.code})`,
    value: b.id
  }))
])

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <Select
    v-model="selected"
    :options="options"
    optionLabel="label"
    optionValue="value"
    placeholder="Select Branch"
    class="branch-selector"
  />
</template>

<style scoped>
.branch-selector {
  min-width: 220px;
}
</style>
