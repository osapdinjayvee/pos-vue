<script setup lang="ts">
const props = defineProps<{
  hasTransaction: boolean
  hasDiscount: boolean
  hasOpenShift?: boolean
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'action', actionId: string): void
}>()

interface ActionTile {
  id: string
  label: string
  altLabel?: string
  icon: string
  altIcon?: string
  shortcut?: string
  severity?: 'primary' | 'danger' | 'shift-start' | 'shift-end'
  needsTransaction?: boolean
  needsShift?: boolean
}

function getTileLabel(tile: ActionTile): string {
  if (tile.id === 'end-shift' && !props.hasOpenShift) return tile.altLabel || tile.label
  return tile.label
}

function getTileIcon(tile: ActionTile): string {
  if (tile.id === 'end-shift' && !props.hasOpenShift) return tile.altIcon || tile.icon
  return tile.icon
}

function getTileAction(tile: ActionTile): string {
  if (tile.id === 'end-shift' && !props.hasOpenShift) return 'start-shift'
  return tile.id
}

function getTileSeverity(tile: ActionTile): string {
  if (tile.id === 'end-shift') {
    return props.hasOpenShift ? 'shift-end' : 'shift-start'
  }
  return tile.severity || 'primary'
}

import { computed } from 'vue'

const tiles = computed<ActionTile[]>(() => {
  const list: ActionTile[] = [
    { id: 'discount', label: 'Discount', icon: 'pi pi-percentage', shortcut: 'F6', needsTransaction: true, needsShift: true },
    { id: 'browse', label: 'Browse', icon: 'pi pi-search', shortcut: 'F4', needsShift: true },
    { id: 'return', label: 'Return', icon: 'pi pi-undo', needsShift: true },
    { id: 'hold', label: 'Suspend', icon: 'pi pi-pause', needsTransaction: true, needsShift: true },
    { id: 'recall', label: 'Recall', icon: 'pi pi-replay', needsShift: true },
    { id: 'price-check', label: 'Price Check', icon: 'pi pi-info-circle' },
    { id: 'manager-override', label: 'Manager', icon: 'pi pi-shield' },
    { id: 'cash-drawer', label: 'Cash Drawer', icon: 'pi pi-money-bill', needsShift: true },
    { id: 'clear-cart', label: 'Clear Cart', icon: 'pi pi-trash', severity: 'danger', needsTransaction: true },
    { id: 'transactions', label: 'Transactions', icon: 'pi pi-list', shortcut: 'F7' },
    { id: 'x-reading', label: 'X-Reading', icon: 'pi pi-file', needsShift: true },
    { id: 'z-reading', label: 'Z-Reading', icon: 'pi pi-file-export' },
    { id: 'end-shift', label: 'End Shift', altLabel: 'Start Shift', icon: 'pi pi-sign-out', altIcon: 'pi pi-sign-in' },
    { id: 'calculator', label: 'Calculator', icon: 'pi pi-calculator' },
  ]

  if (props.isAdmin) {
    list.push({ id: 'back-office', label: 'Back Office', icon: 'pi pi-cog' })
  }

  list.push({ id: 'logout', label: 'Logout', icon: 'pi pi-power-off', severity: 'danger' })

  return list
})

function isDisabled(tile: ActionTile): boolean {
  if (tile.needsTransaction && !props.hasTransaction) return true
  if (tile.needsShift && !props.hasOpenShift) return true
  return false
}

function tileClasses(tile: ActionTile): string {
  const severity = getTileSeverity(tile)
  const disabled = isDisabled(tile)
  const base = 'flex flex-col items-center justify-center gap-1 rounded-xl border transition-all relative text-white'

  if (disabled) {
    const bg = severity === 'danger' ? 'bg-red-600 border-red-600' : 'border-transparent'
    return `${base} ${bg} opacity-35 cursor-not-allowed`
  }

  switch (severity) {
    case 'danger':
      return `${base} bg-red-600 border-red-600 hover:bg-red-700 cursor-pointer active:scale-95`
    case 'shift-start':
      return `${base} bg-amber-500 border-amber-500 hover:bg-amber-600 cursor-pointer active:scale-95 ring-2 ring-amber-300 ring-offset-1`
    case 'shift-end':
      return `${base} bg-emerald-600 border-emerald-600 hover:bg-emerald-700 cursor-pointer active:scale-95`
    default:
      return `${base} border-transparent hover:brightness-110 cursor-pointer active:scale-95`
  }
}

function tileStyle(tile: ActionTile): Record<string, string> | undefined {
  const severity = getTileSeverity(tile)
  if (severity === 'primary') return { backgroundColor: 'var(--p-primary-color)' }
  return undefined
}
</script>

<template>
  <div class="action-tiles-grid">
    <button
      v-for="tile in tiles"
      :key="tile.id"
      :class="tileClasses(tile)"
      :style="tileStyle(tile)"
      :disabled="isDisabled(tile)"
      @click="emit('action', getTileAction(tile))"
    >
      <i :class="getTileIcon(tile)" class="tile-icon"></i>
      <span class="tile-label">{{ getTileLabel(tile) }}</span>
      <kbd v-if="tile.shortcut" class="absolute top-1 right-1 text-[10px] bg-white/20 rounded px-1">{{ tile.shortcut }}</kbd>
    </button>
  </div>
</template>

<style scoped>
.action-tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
  padding: 0.5rem;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}

.tile-icon {
  font-size: 1.25rem;
}

.tile-label {
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

/* Mobile: 2 columns */
@media (max-width: 639px) {
  .action-tiles-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem;
    padding: 0.375rem;
  }

  .tile-icon { font-size: 1.125rem; }
  .tile-label { font-size: 0.625rem; }
}

/* Tablet+ */
@media (min-width: 640px) {
  .action-tiles-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    padding: 0.625rem;
  }

  .tile-icon { font-size: 1.375rem; }
  .tile-label { font-size: 0.75rem; }
}
</style>
