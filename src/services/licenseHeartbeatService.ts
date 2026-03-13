/**
 * License Heartbeat Service
 * Periodically pings the backend to check license status.
 * Non-blocking: never prevents POS usage, only updates a reactive status.
 */

import { ref, readonly } from 'vue'
import { httpClient } from '@/services/httpClient'
import { connectivityService } from '@/services/connectivityService'
import type { HeartbeatResponse } from '@/types/onboarding'

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'unknown' | 'offline'

const HEARTBEAT_INTERVAL = 60 * 60 * 1000 // 1 hour

const licenseStatus = ref<LicenseStatus>('unknown')

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let unsubOnline: (() => void) | null = null
let licenseKey: string | null = null
let deviceUid: string | null = null

async function sendHeartbeat(): Promise<void> {
  if (!licenseKey) return

  // Skip when offline
  if (!connectivityService.isOnline.value) {
    licenseStatus.value = 'offline'
    return
  }

  try {
    const response = await httpClient.post<HeartbeatResponse>(
      '/license/heartbeat',
      {
        license_key: licenseKey,
        device_uid: deviceUid
      }
    )

    const status = response.data.status
    licenseStatus.value = status

    // Persist to DB (non-blocking)
    try {
      const { onboardingRepository } = await import('@/repositories/onboardingRepository')
      await onboardingRepository.updateHeartbeatStatus(status, response.data.expiry_date)
    } catch {
      // DB write failure is non-critical
    }
  } catch (err) {
    console.warn('[LicenseHeartbeat] Heartbeat failed:', err)
    // Don't change status on network error — keep last known status
    if (!connectivityService.isOnline.value) {
      licenseStatus.value = 'offline'
    }
  }
}

function startHeartbeatLoop(key: string, uid?: string | null): void {
  // Stop any existing loop
  stopHeartbeatLoop()

  licenseKey = key
  deviceUid = uid || null

  // Send immediately
  sendHeartbeat()

  // Then every hour
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

  // Resume heartbeat when connectivity is restored
  unsubOnline = connectivityService.onOnline(() => {
    console.log('[LicenseHeartbeat] Online restored, sending heartbeat')
    sendHeartbeat()
  })

  console.log('[LicenseHeartbeat] Heartbeat loop started (interval: 1hr)')
}

function stopHeartbeatLoop(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (unsubOnline) {
    unsubOnline()
    unsubOnline = null
  }
  licenseKey = null
  deviceUid = null
}

export const licenseHeartbeatService = {
  licenseStatus: readonly(licenseStatus),
  startHeartbeatLoop,
  stopHeartbeatLoop,
  sendHeartbeat
}

export default licenseHeartbeatService
