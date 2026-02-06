/**
 * Database Factory
 * Creates the appropriate database adapter based on the detected platform
 */

import { detectPlatform, type Platform } from './platform'
import type { DatabaseAdapter } from './adapters/DatabaseAdapter'

/**
 * Lazy-load adapter modules to avoid bundling unused platform code
 */
async function loadSqlJsAdapter(): Promise<DatabaseAdapter> {
  const { SqlJsAdapter } = await import('./adapters/SqlJsAdapter')
  return new SqlJsAdapter()
}

async function loadWebAdapter(): Promise<DatabaseAdapter> {
  const { WebAdapter } = await import('./adapters/WebAdapter')
  return new WebAdapter()
}

async function loadCapacitorAdapter(): Promise<DatabaseAdapter> {
  const { CapacitorAdapter } = await import('./adapters/CapacitorAdapter')
  return new CapacitorAdapter()
}

async function loadElectronAdapter(): Promise<DatabaseAdapter> {
  const { ElectronAdapter } = await import('./adapters/ElectronAdapter')
  return new ElectronAdapter()
}

/**
 * Factory for creating platform-specific database adapters
 */
export class DatabaseFactory {
  /**
   * Create a database adapter for the specified or detected platform
   * @param platform Optional platform override. If not provided, auto-detects.
   * @returns Promise resolving to a DatabaseAdapter instance
   */
  static async createAdapter(platform?: Platform): Promise<DatabaseAdapter> {
    const targetPlatform = platform || detectPlatform()

    console.log(`[DatabaseFactory] Creating adapter for platform: ${targetPlatform}`)

    switch (targetPlatform) {
      case 'electron':
        return loadElectronAdapter()

      case 'capacitor':
        return loadCapacitorAdapter()

      case 'web':
      default:
        // Use SqlJsAdapter for web (sql.js with localStorage)
        // WebAdapter (jeep-sqlite) can be used for Capacitor web builds
        return loadSqlJsAdapter()
    }
  }

  /**
   * Get the detected platform without creating an adapter
   */
  static getDetectedPlatform(): Platform {
    return detectPlatform()
  }
}

export default DatabaseFactory
