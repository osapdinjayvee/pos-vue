/**
 * Platform detection for cross-platform SQLite support
 */

export type Platform = 'electron' | 'capacitor' | 'web'

/**
 * Detects the current runtime platform
 * - electron: Running in Electron renderer process
 * - capacitor: Running in Capacitor native app (iOS/Android)
 * - web: Running in standard web browser
 */
export function detectPlatform(): Platform {
  // Check for Electron renderer process
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as any).type === 'renderer'
  ) {
    return 'electron'
  }

  // Check for Electron via navigator userAgent (fallback)
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron')
  ) {
    return 'electron'
  }

  // Check for Capacitor native platform
  if (typeof window !== 'undefined') {
    const capacitor = (window as any).Capacitor
    if (capacitor?.isNativePlatform?.()) {
      return 'capacitor'
    }
  }

  // Default to web
  return 'web'
}

/**
 * Check if running on a native platform (Electron or Capacitor)
 */
export function isNativePlatform(): boolean {
  const platform = detectPlatform()
  return platform === 'electron' || platform === 'capacitor'
}

/**
 * Check if running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}
