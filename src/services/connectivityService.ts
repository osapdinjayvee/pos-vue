/**
 * Connectivity Service
 * Monitors network status using navigator.onLine and optional API ping
 */

import { ref, readonly } from 'vue'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'

const isOnline = ref(navigator.onLine)
const lastOnlineAt = ref<string | null>(navigator.onLine ? new Date().toISOString() : null)
const lastCheckedAt = ref<string | null>(null)

type ConnectivityCallback = () => void

const onOnlineCallbacks: ConnectivityCallback[] = []
const onOfflineCallbacks: ConnectivityCallback[] = []

/**
 * Initialize connectivity listeners
 * Should be called once on app startup
 */
function initialize(): void {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

/**
 * Clean up connectivity listeners
 */
function destroy(): void {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
}

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
 * Perform an active connectivity check by pinging the API
 * Falls back to navigator.onLine if ping fails
 */
async function checkConnectivity(): Promise<boolean> {
  // If browser reports offline, trust it
  if (!navigator.onLine) {
    isOnline.value = false
    lastCheckedAt.value = new Date().toISOString()
    return false
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${DEFAULT_SYNC_CONFIG.apiBaseUrl}/ping`, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeout)
    lastCheckedAt.value = new Date().toISOString()

    const online = response.ok
    if (online && !isOnline.value) {
      handleOnline()
    } else if (!online && isOnline.value) {
      handleOffline()
    }

    return online
  } catch {
    lastCheckedAt.value = new Date().toISOString()
    // Network error - might be offline or server down
    // Keep current navigator.onLine state
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
