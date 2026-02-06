/**
 * EIS Connection Test Service
 * Tests connectivity to BIR EIS endpoints
 */

import type { EISConfig, EISConnectionTestResult } from '@/types/eis'
import { EIS_ENDPOINTS } from '@/types/eis'
import { DEFAULT_SYNC_CONFIG } from '@/config/sync'

/**
 * Test connection to EIS endpoint
 */
export async function testConnection(
  config: Partial<EISConfig>
): Promise<EISConnectionTestResult> {
  const startTime = Date.now()

  try {
    // Validate required fields
    if (!config.tin || !config.branch_code || !config.api_key || !config.api_secret) {
      return {
        success: false,
        message: 'Missing required credentials (TIN, branch code, API key, or API secret)',
        latencyMs: 0
      }
    }

    // Get endpoint URL based on environment
    const environment = config.environment || 'test'
    const endpointUrl = config.endpoint_url || EIS_ENDPOINTS[environment]

    if (!endpointUrl) {
      return {
        success: false,
        message: 'Invalid or missing endpoint URL',
        latencyMs: 0
      }
    }

    // Build test connection URL (via our server proxy)
    const proxyUrl = `${DEFAULT_SYNC_CONFIG.apiBaseUrl}/eis/test-connection`

    // Create request payload
    const payload = {
      tin: config.tin,
      branch_code: config.branch_code,
      api_key: config.api_key,
      api_secret: config.api_secret,
      endpoint_url: endpointUrl,
      environment
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      // Send test request
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const latencyMs = Date.now() - startTime

      // Handle response
      if (!response.ok) {
        // Try to parse error from response
        let errorMessage = `Connection failed (HTTP ${response.status})`
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Could not parse JSON error
        }

        return {
          success: false,
          message: errorMessage,
          latencyMs
        }
      }

      // Parse successful response
      const data = await response.json()

      if (data.success) {
        return {
          success: true,
          message: `Connection successful! (${latencyMs}ms)`,
          latencyMs
        }
      } else {
        return {
          success: false,
          message: data.message || 'Connection test failed',
          latencyMs
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      const latencyMs = Date.now() - startTime

      // Handle specific error types
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout after 10 seconds. Please check your network and endpoint configuration.',
          latencyMs
        }
      }

      if (error.message?.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Network error: Unable to reach the server. Please check your internet connection.',
          latencyMs
        }
      }

      return {
        success: false,
        message: `Connection error: ${error.message || 'Unknown error'}`,
        latencyMs
      }
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime
    return {
      success: false,
      message: `Unexpected error: ${error.message || 'Unknown error'}`,
      latencyMs
    }
  }
}

/**
 * Format latency for display
 */
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 100) {
    return `${latencyMs}ms (Excellent)`
  } else if (latencyMs < 500) {
    return `${latencyMs}ms (Good)`
  } else if (latencyMs < 1000) {
    return `${latencyMs}ms (Fair)`
  } else {
    return `${Math.round(latencyMs / 100) / 10}s (Slow)`
  }
}

/**
 * Get connection quality based on latency
 */
export function getConnectionQuality(
  latencyMs: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (latencyMs < 100) return 'excellent'
  if (latencyMs < 500) return 'good'
  if (latencyMs < 1000) return 'fair'
  return 'poor'
}

export default {
  testConnection,
  formatLatency,
  getConnectionQuality
}
