<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useOfflineStatus } from '@/composables/useOfflineStatus'
import { useSyncStore } from '@/stores/sync'

defineProps<{
  status: string
  cashierName?: string
  terminalId?: string
}>()

const { isOnline } = useOfflineStatus()
const syncStore = useSyncStore()

const currentTime = ref(formatTime())
let clockInterval: number | null = null

function formatTime(): string {
  return new Date().toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

function statusClasses(status: string): string {
  switch (status) {
    case 'READY': return 'text-green-400 bg-green-400/15'
    case 'IN PROGRESS': return 'text-blue-400 bg-blue-400/15'
    case 'PAYMENT': return 'text-violet-400 bg-violet-400/15'
    case 'VOIDING': return 'text-yellow-400 bg-yellow-400/15'
    case 'OFFLINE': return 'text-red-400 bg-red-400/15'
    case 'NO SHIFT': return 'text-amber-400 bg-amber-400/15'
    default: return 'text-green-400 bg-green-400/15'
  }
}

onMounted(() => {
  clockInterval = window.setInterval(() => {
    currentTime.value = formatTime()
  }, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
  <div class="flex justify-between items-center h-9 px-4 bg-neutral-900 shrink-0 relative">
    <!-- Left: clock + online -->
    <div class="flex items-center gap-2 text-xs">
      <span class="font-mono text-white/80">{{ currentTime }}</span>
      <span
        :class="[
          'w-2 h-2 rounded-full',
          isOnline ? 'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]' : 'bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]'
        ]"
      ></span>
      <span class="text-white/50">{{ isOnline ? 'Online' : 'Offline' }}</span>
    </div>

    <!-- Center: status badge -->
    <span
      :class="[
        'absolute left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full',
        statusClasses(status)
      ]"
    >
      {{ status }}
    </span>

    <!-- Right: cashier / terminal / sync -->
    <div class="flex items-center gap-1.5 text-xs text-white/50">
      <span>{{ cashierName || '—' }}</span>
      <span class="text-white/20">/</span>
      <span>{{ terminalId || '—' }}</span>
      <span class="text-white/20">|</span>
      <span>Sync: {{ syncStore.pendingCount }}</span>
    </div>
  </div>
</template>
