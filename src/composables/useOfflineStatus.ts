/**
 * useOfflineStatus Composable
 * Provides reactive online/offline status with callbacks
 */

import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { connectivityService } from '@/services/connectivityService'

export function useOfflineStatus() {
  const isOnline = ref(navigator.onLine)
  const lastOnline = ref<string | null>(null)

  let unsubOnline: (() => void) | null = null
  let unsubOffline: (() => void) | null = null

  const onOnlineCallbacks: Array<() => void> = []
  const onOfflineCallbacks: Array<() => void> = []

  onMounted(() => {
    // Sync with connectivity service
    isOnline.value = connectivityService.isOnline.value

    unsubOnline = connectivityService.onOnline(() => {
      isOnline.value = true
      lastOnline.value = new Date().toISOString()
      for (const cb of onOnlineCallbacks) {
        try { cb() } catch (e) { console.error('[useOfflineStatus] onOnline callback error:', e) }
      }
    })

    unsubOffline = connectivityService.onOffline(() => {
      isOnline.value = false
      for (const cb of onOfflineCallbacks) {
        try { cb() } catch (e) { console.error('[useOfflineStatus] onOffline callback error:', e) }
      }
    })
  })

  onUnmounted(() => {
    unsubOnline?.()
    unsubOffline?.()
  })

  function onOnline(callback: () => void): void {
    onOnlineCallbacks.push(callback)
  }

  function onOffline(callback: () => void): void {
    onOfflineCallbacks.push(callback)
  }

  return {
    isOnline: readonly(isOnline),
    lastOnline: readonly(lastOnline),
    onOnline,
    onOffline
  }
}

export default useOfflineStatus
