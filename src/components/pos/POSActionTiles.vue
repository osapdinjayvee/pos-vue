<script setup lang="ts">
const props = defineProps<{
  hasTransaction: boolean
  hasDiscount: boolean
  hasOpenShift?: boolean
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
  severity?: 'primary' | 'danger'
  needsTransaction?: boolean
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

const tiles: ActionTile[] = [
  { id: 'discount', label: 'Discount', icon: 'pi pi-percentage', shortcut: 'F6', needsTransaction: true },
  { id: 'browse', label: 'Browse', icon: 'pi pi-search', shortcut: 'F4' },
  { id: 'return', label: 'Return', icon: 'pi pi-undo' },
  { id: 'hold', label: 'Suspend', icon: 'pi pi-pause', needsTransaction: true },
  { id: 'recall', label: 'Recall', icon: 'pi pi-replay' },
  { id: 'price-check', label: 'Price Check', icon: 'pi pi-info-circle' },
  { id: 'manager-override', label: 'Manager', icon: 'pi pi-shield' },
  { id: 'cash-drawer', label: 'Cash Drawer', icon: 'pi pi-money-bill' },
  { id: 'clear-cart', label: 'Clear Cart', icon: 'pi pi-trash', severity: 'danger', needsTransaction: true },
  { id: 'reprint', label: 'Reprint', icon: 'pi pi-print' },
  { id: 'end-shift', label: 'End Shift', altLabel: 'Start Shift', icon: 'pi pi-sign-out', altIcon: 'pi pi-sign-in' },
  { id: 'calculator', label: 'Calculator', icon: 'pi pi-calculator' }
]

function isDisabled(tile: ActionTile): boolean {
  if (tile.needsTransaction && !props.hasTransaction) return true
  return false
}
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 p-3 sm:p-4 flex-1 overflow-y-auto content-start">
    <button
      v-for="tile in tiles"
      :key="tile.id"
      :class="[
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all relative text-white',
        'min-h-[72px] sm:min-h-[88px] lg:min-h-[96px]',
        tile.severity === 'danger' ? 'bg-red-600 border-red-600 hover:bg-red-700' : '',
        !tile.severity || tile.severity === 'primary' ? 'border-transparent hover:brightness-110' : '',
        isDisabled(tile) ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95'
      ]"
      :style="tile.severity !== 'danger' ? { backgroundColor: 'var(--p-primary-color)' } : undefined"
      :disabled="isDisabled(tile)"
      @click="emit('action', getTileAction(tile))"
    >
      <i :class="getTileIcon(tile)" style="font-size: 1.5rem"></i>
      <span class="text-xs sm:text-sm font-semibold">{{ getTileLabel(tile) }}</span>
      <kbd v-if="tile.shortcut" class="absolute top-1 right-1 text-[10px] bg-white/20 rounded px-1">{{ tile.shortcut }}</kbd>
    </button>
  </div>
</template>
