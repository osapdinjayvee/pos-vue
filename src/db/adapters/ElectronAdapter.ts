/**
 * Electron Adapter - SQLite implementation for desktop using better-sqlite3
 * Communicates with main process via IPC
 */

import type {
  DatabaseAdapter,
  DatabaseConfig,
  QueryResult,
  TransactionContext
} from './DatabaseAdapter'
import type { Platform } from '../platform'

// Type for Electron IPC exposed through preload
interface ElectronAPI {
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, listener: (...args: any[]) => void): void
  }
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

/**
 * Transaction context for Electron adapter (uses IPC)
 */
class ElectronTransactionContext implements TransactionContext {
  constructor(private txId: string) {}

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    const result = await window.electron!.ipcRenderer.invoke(
      'database:txExecute',
      this.txId,
      sql,
      params
    )
    return result
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return await window.electron!.ipcRenderer.invoke(
      'database:txQuery',
      this.txId,
      sql,
      params
    )
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }
}

/**
 * Electron adapter using better-sqlite3 via IPC
 */
export class ElectronAdapter implements DatabaseAdapter {
  private initialized = false
  private config: DatabaseConfig | null = null

  private getIPC() {
    if (!window.electron?.ipcRenderer) {
      throw new Error(
        'Electron IPC not available. Make sure you are running in Electron with the preload script configured.'
      )
    }
    return window.electron.ipcRenderer
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) return

    this.config = config

    try {
      const ipc = this.getIPC()
      await ipc.invoke('database:initialize', config)
      this.initialized = true

      console.log(`[ElectronAdapter] Database "${config.name}" initialized successfully`)
    } catch (error) {
      console.error('[ElectronAdapter] Initialization failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.initialized) {
      const ipc = this.getIPC()
      await ipc.invoke('database:close')
      this.initialized = false
      console.log('[ElectronAdapter] Database closed')
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    const ipc = this.getIPC()
    return await ipc.invoke('database:execute', sql, params)
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const ipc = this.getIPC()
    return await ipc.invoke('database:query', sql, params)
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }

  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    const ipc = this.getIPC()

    // Begin transaction and get transaction ID
    const txId = await ipc.invoke('database:beginTransaction')

    try {
      const ctx = new ElectronTransactionContext(txId)
      const result = await fn(ctx)

      // Commit transaction
      await ipc.invoke('database:commit', txId)

      return result
    } catch (error) {
      // Rollback on error
      await ipc.invoke('database:rollback', txId)
      throw error
    }
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    const ipc = this.getIPC()
    return await ipc.invoke('database:executeBatch', statements)
  }

  async export(): Promise<Uint8Array> {
    const ipc = this.getIPC()
    const data: number[] = await ipc.invoke('database:export')
    return new Uint8Array(data)
  }

  async import(data: Uint8Array): Promise<void> {
    const ipc = this.getIPC()
    await ipc.invoke('database:import', Array.from(data))

    // Re-initialize after import
    if (this.config) {
      this.initialized = false
      await this.initialize(this.config)
    }
  }

  getPlatform(): Platform {
    return 'electron'
  }
}
