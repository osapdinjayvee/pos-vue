/**
 * Cash Drawer Hardware Service
 *
 * Handles hardware integration for cash drawer operations via Electron IPC.
 * Provides graceful degradation for browser mode and implements retry logic
 * for reliable hardware communication.
 */

// Type declaration for Electron API
declare global {
  interface Window {
    electronAPI?: {
      openDrawer?: () => Promise<{ success: boolean; error?: string }>
    }
  }
}

class DrawerHardwareService {
  private readonly RETRY_DELAY = 500 // ms
  private readonly TIMEOUT = 2000 // ms
  private readonly MAX_RETRIES = 1

  /**
   * Opens the cash drawer with retry logic and timeout protection
   *
   * @returns Promise with success status and optional error message
   */
  async openDrawer(): Promise<{ success: boolean; error?: string }> {
    if (!this.isHardwareAvailable()) {
      console.warn('[DrawerHardware] No hardware available - running in browser mode')
      return {
        success: false,
        error: 'No hardware available'
      }
    }

    // Attempt to open drawer with retry logic
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.warn(`[DrawerHardware] Retry attempt ${attempt} after ${this.RETRY_DELAY}ms delay`)
        await this.delay(this.RETRY_DELAY)
      }

      try {
        const result = await this.openDrawerWithTimeout()

        if (result.success) {
          console.log('[DrawerHardware] Drawer opened successfully')
          return result
        }

        console.warn(`[DrawerHardware] Attempt ${attempt + 1} failed:`, result.error)

        // If this is the last attempt, return the error
        if (attempt === this.MAX_RETRIES) {
          return result
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`[DrawerHardware] Attempt ${attempt + 1} threw error:`, errorMessage)

        // If this is the last attempt, return the error
        if (attempt === this.MAX_RETRIES) {
          return {
            success: false,
            error: errorMessage
          }
        }
      }
    }

    // Fallback (should never reach here)
    return {
      success: false,
      error: 'Max retries exceeded'
    }
  }

  /**
   * Opens drawer with timeout protection
   *
   * @returns Promise with success status and optional error message
   */
  private async openDrawerWithTimeout(): Promise<{ success: boolean; error?: string }> {
    return Promise.race([
      this.callElectronAPI(),
      this.timeoutPromise()
    ])
  }

  /**
   * Calls the Electron IPC bridge to open the drawer
   *
   * @returns Promise with success status and optional error message
   */
  private async callElectronAPI(): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI?.openDrawer) {
      return {
        success: false,
        error: 'Electron API not available'
      }
    }

    try {
      const result = await window.electronAPI.openDrawer()
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Creates a timeout promise that rejects after the configured timeout
   *
   * @returns Promise that rejects with timeout error
   */
  private timeoutPromise(): Promise<{ success: boolean; error?: string }> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Hardware timeout after ${this.TIMEOUT}ms`))
      }, this.TIMEOUT)
    })
  }

  /**
   * Checks if hardware is available (Electron mode with drawer API)
   *
   * @returns True if Electron API with drawer support is available
   */
  isHardwareAvailable(): boolean {
    return typeof window.electronAPI?.openDrawer === 'function'
  }

  /**
   * Registers a callback for drawer state changes
   *
   * @param callback Function to call when drawer state changes
   * @remarks This is a stub for future hardware monitoring implementation
   */
  onDrawerStateChange(callback: (state: { isOpen: boolean }) => void): void {
    // Stub for future implementation
    // Future: Listen to hardware events via Electron IPC
    console.log('[DrawerHardware] State change monitoring registered (not yet implemented)')

    // Prevent unused parameter warning
    void callback
  }

  /**
   * Utility function to delay execution
   *
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const drawerHardwareService = new DrawerHardwareService()
