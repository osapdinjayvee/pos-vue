<script setup lang="ts">
import Dialog from 'primevue/dialog'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-drawer': []
  'cash-drop': []
  'cash-in': []
}>()

const actions = [
  { id: 'open-drawer', label: 'Open Drawer', description: 'Open cash drawer (no-sale)', icon: 'pi pi-box' },
  { id: 'cash-drop', label: 'Cash Drop', description: 'Remove cash from drawer', icon: 'pi pi-minus-circle' },
  { id: 'cash-in', label: 'Cash In', description: 'Add cash to drawer', icon: 'pi pi-plus-circle' }
] as const

function handleAction(id: typeof actions[number]['id']) {
  emit('update:visible', false)
  ;(emit as any)(id)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Cash Drawer"
    :style="{ width: '380px' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-1">
      <button
        v-for="action in actions"
        :key="action.id"
        class="cash-action-row"
        @click="handleAction(action.id)"
      >
        <div class="cash-action-icon">
          <i :class="action.icon"></i>
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold text-neutral-800 m-0">{{ action.label }}</p>
          <p class="text-xs text-neutral-400 m-0 mt-0.5">{{ action.description }}</p>
        </div>
        <i class="pi pi-chevron-right text-xs text-neutral-300"></i>
      </button>
    </div>
  </Dialog>
</template>

<style scoped>
.cash-action-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 0.75rem;
  border-radius: 0.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
  width: 100%;
}
.cash-action-row:hover {
  background-color: var(--p-primary-50);
}
.cash-action-row:active {
  background-color: var(--p-primary-100);
  transform: scale(0.98);
}

.cash-action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: var(--p-primary-50);
  color: var(--p-primary-500);
  font-size: 1.125rem;
  flex-shrink: 0;
}
</style>
