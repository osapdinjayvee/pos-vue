/**
 * Connectivity Service
 * Platform-aware network monitoring:
 * - Web/Electron: navigator.onLine + API ping
 * - Capacitor native: @capacitor/network plugin for reliable state detection
 */

import { ref, readonly } from 'vue'
import { getApiBaseUrl } from '@/config/sync'
import { detectPlatform } from '@/db/platform'

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const lastOnlineAt = ref<string | null>(isOnline.value ? new Date().toISOString() : null)
const lastCheckedAt = ref<string | null>(null)

type ConnectivityCallback = () => void

const onOnlineCallbacks: ConnectivityCallback[] = []
const onOfflineCallbacks: ConnectivityCallback[] = []

let networkListenerHandle: any = null

function handleOnline(): void {
  isOnline.value = true
  lastOnlineAt.value = new Date().toISOString()
  for (const cb of onOnlineCallbacks) {
    try { cb() } catch (e) { console.error('[ConnectivityService] onOnline callback error:', e) }
  }
}

function handleOffline(): void {
  isOnline.value = false
  for (const cb of onOfflineCallbacks) {
    try { cb() } catch (e) { console.error('[ConnectivityService] onOffline callback error:', e) }
  }
}

/**
 * Initialize connectivity listeners
 * Uses @capacitor/network on native, navigator events on web
 */
async function initialize(): Promise<void> {
  const platform = detectPlatform()

  if (platform === 'capacitor') {
    try {
      const { Network } = await import('@capacitor/network')

      // Get initial status
      const status = await Network.getStatus()
      isOnline.value = status.connected
      if (status.connected) {
        lastOnlineAt.value = new Date().toISOString()
      }

      // Listen for changes
      networkListenerHandle = await Network.addListener('networkStatusChange', (status) => {
        const wasOnline = isOnline.value
        if (status.connected && !wasOnline) {
          handleOnline()
        } else if (!status.connected && wasOnline) {
          handleOffline()
        }
      })

      console.log(`[ConnectivityService] Capacitor Network plugin initialized (connected: ${status.connected}, type: ${status.connectionType})`)
    } catch (e) {
      console.warn('[ConnectivityService] Capacitor Network plugin failed, falling back to navigator:', e)
      initWebListeners()
    }
  } else {
    initWebListeners()
  }
}

function initWebListeners(): void {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  console.log('[ConnectivityService] Web navigator listeners initialized')
}

/**
 * Clean up connectivity listeners
 */
async function destroy(): Promise<void> {
  if (networkListenerHandle) {
    await networkListenerHandle.remove()
    networkListenerHandle = null
  }

  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
}

/**
 * Perform an active connectivity check by pinging the API.
 * On Capacitor, also checks native network status first.
 */
async function checkConnectivity(): Promise<boolean> {
  const platform = detectPlatform()

  // On Capacitor, check native network status first
  if (platform === 'capacitor') {
    try {
      const { Network } = await import('@capacitor/network')
      const status = await Network.getStatus()
      if (!status.connected) {
        isOnline.value = false
        lastCheckedAt.value = new Date().toISOString()
        return false
      }
    } catch {
      // Fall through to ping check
    }
  } else {
    // If browser reports offline, trust it
    if (!navigator.onLine) {
      isOnline.value = false
      lastCheckedAt.value = new Date().toISOString()
      return false
    }
  }

  // Active ping check (fetch works natively on all platforms — Capacitor patches it)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${getApiBaseUrl()}/ping`, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeout)
    const online = response.ok

    lastCheckedAt.value = new Date().toISOString()

    if (online && !isOnline.value) {
      handleOnline()
    } else if (!online && isOnline.value) {
      handleOffline()
    }

    return online
  } catch {
    lastCheckedAt.value = new Date().toISOString()
    if (platform === 'capacitor') {
      return isOnline.value
    }
    isOnline.value = navigator.onLine
    return navigator.onLine
  }
}

/**
 * Register a callback for when connectivity is restored
 */
function onOnline(callback: ConnectivityCallback): () => void {
  onOnlineCallbacks.push(callback)
  return () => {
    const idx = onOnlineCallbacks.indexOf(callback)
    if (idx >= 0) onOnlineCallbacks.splice(idx, 1)
  }
}

/**
 * Register a callback for when connectivity is lost
 */
function onOffline(callback: ConnectivityCallback): () => void {
  onOfflineCallbacks.push(callback)
  return () => {
    const idx = onOfflineCallbacks.indexOf(callback)
    if (idx >= 0) onOfflineCallbacks.splice(idx, 1)
  }
}

export const connectivityService = {
  isOnline: readonly(isOnline),
  lastOnlineAt: readonly(lastOnlineAt),
  lastCheckedAt: readonly(lastCheckedAt),
  initialize,
  destroy,
  checkConnectivity,
  onOnline,
  onOffline
}

export default connectivityService
