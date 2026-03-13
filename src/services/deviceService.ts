/**
 * Device Service
 * Handles device UID generation and registration against the backend
 */

import { httpClient } from '@/services/httpClient'
import type { DeviceRegisterResponse } from '@/types/onboarding'

const DEVICE_UID_KEY = 'pos_device_uid'

class DeviceService {
  /**
   * Get or generate a stable device UID.
   * Persisted in localStorage so it survives page reloads.
   */
  getDeviceUid(): string {
    let uid = localStorage.getItem(DEVICE_UID_KEY)
    if (!uid) {
      uid = crypto.randomUUID()
      localStorage.setItem(DEVICE_UID_KEY, uid)
    }
    return uid
  }

  /**
   * Register this device against the backend.
   * Safe to call multiple times — server handles re-registration (upsert).
   */
  async register(licenseKey: string): Promise<DeviceRegisterResponse> {
    try {
      const response = await httpClient.post<DeviceRegisterResponse>(
        '/device/register',
        {
          license_key: licenseKey,
          device_uid: this.getDeviceUid(),
          terminal_id: localStorage.getItem('terminal_id') || 'POS-001',
          device_name: this.getDeviceName(),
          platform: this.getPlatform(),
          app_version: this.getAppVersion()
        }
      )
      return response.data
    } catch (err: any) {
      const data = err.response?.data
      return {
        success: false,
        error: data?.error || err.message || 'Device registration failed',
        max_terminals: data?.max_terminals,
        active_count: data?.active_count
      }
    }
  }

  private getDeviceName(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent.slice(0, 100)
    }
    return 'Unknown Device'
  }

  private getPlatform(): string {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase()
      if (ua.includes('android')) return 'android'
      if (ua.includes('iphone') || ua.includes('ipad')) return 'ios'
      if (ua.includes('electron')) return 'electron'
      if (ua.includes('windows')) return 'windows'
      if (ua.includes('mac')) return 'macos'
      if (ua.includes('linux')) return 'linux'
    }
    return 'web'
  }

  private getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || '1.0.0'
  }
}

export const deviceService = new DeviceService()
export default deviceService
