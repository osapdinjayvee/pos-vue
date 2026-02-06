/**
 * Web Adapter - SQLite implementation for browsers using jeep-sqlite
 * Uses IndexedDB for persistence
 */

import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'
import type {
  DatabaseAdapter,
  DatabaseConfig,
  QueryResult,
  TransactionContext,
  DEFAULT_CONFIG
} from './DatabaseAdapter'
import type { Platform } from '../platform'

/**
 * Transaction context for web adapter
 */
class WebTransactionContext implements TransactionContext {
  constructor(private db: SQLiteDBConnection) {}

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    const result = await this.db.run(sql, params)
    const rowsAffected = result.changes?.changes ?? 0
    return {
      rowsAffected,
      changes: rowsAffected,
      lastInsertId: result.changes?.lastId
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.db.query(sql, params)
    return (result.values || []) as T[]
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }
}

/**
 * Web adapter using jeep-sqlite for browser-based SQLite
 */
export class WebAdapter implements DatabaseAdapter {
  private sqlite: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private initialized = false
  private config: DatabaseConfig | null = null
  private jeepSqliteEl: HTMLElement | null = null

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) return

    this.config = config

    try {
      // Load jeep-sqlite web component
      await jeepSqlite(window)

      // Create and append jeep-sqlite element if not exists
      if (!document.querySelector('jeep-sqlite')) {
        this.jeepSqliteEl = document.createElement('jeep-sqlite')
        document.body.appendChild(this.jeepSqliteEl)
      }

      // Wait for custom element to be defined
      await customElements.whenDefined('jeep-sqlite')

      // Initialize SQLite connection
      this.sqlite = new SQLiteConnection(CapacitorSQLite)

      // Initialize web store (IndexedDB)
      await this.sqlite.initWebStore()

      // Check for existing connection
      const isConn = (await this.sqlite.isConnection(config.name, false)).result

      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(config.name, false)
      } else {
        this.db = await this.sqlite.createConnection(
          config.name,
          false, // encryption
          'no-encryption',
          1, // version
          false // readonly
        )
      }

      await this.db.open()
      this.initialized = true

      console.log(`[WebAdapter] Database "${config.name}" initialized successfully`)
    } catch (error) {
      console.error('[WebAdapter] Initialization failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.db && this.config) {
      // Save to IndexedDB store before closing
      await this.saveToStore()
      await this.db.close()
      await this.sqlite?.closeConnection(this.config.name, false)
      this.db = null
      this.initialized = false
      console.log('[WebAdapter] Database closed')
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) throw new Error('Database not initialized')

    const result = await this.db.run(sql, params)

    // Auto-save after write operations
    await this.saveToStore()

    const rowsAffected = result.changes?.changes ?? 0
    return {
      rowsAffected,
      changes: rowsAffected,
      lastInsertId: result.changes?.lastId
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    const result = await this.db.query(sql, params)
    return (result.values || []) as T[]
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }

  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')

    // Begin transaction
    await this.db.execute('BEGIN TRANSACTION')

    try {
      const ctx = new WebTransactionContext(this.db)
      const result = await fn(ctx)

      // Commit transaction
      await this.db.execute('COMMIT')

      // Save to store after successful transaction
      await this.saveToStore()

      return result
    } catch (error) {
      // Rollback on error
      await this.db.execute('ROLLBACK')
      throw error
    }
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    if (!this.db) throw new Error('Database not initialized')

    const results: QueryResult[] = []

    // Execute in a transaction for better performance
    await this.db.execute('BEGIN TRANSACTION')

    try {
      for (const stmt of statements) {
        const result = await this.db.run(stmt.sql, stmt.params || [])
        const rowsAffected = result.changes?.changes ?? 0
        results.push({
          rowsAffected,
          changes: rowsAffected,
          lastInsertId: result.changes?.lastId
        })
      }

      await this.db.execute('COMMIT')
      await this.saveToStore()

      return results
    } catch (error) {
      await this.db.execute('ROLLBACK')
      throw error
    }
  }

  async export(): Promise<Uint8Array> {
    if (!this.db || !this.config) throw new Error('Database not initialized')

    const result = await this.db.exportToJson('full')
    const jsonStr = JSON.stringify(result.export)
    return new TextEncoder().encode(jsonStr)
  }

  async import(data: Uint8Array): Promise<void> {
    if (!this.sqlite) throw new Error('SQLite connection not initialized')

    const jsonStr = new TextDecoder().decode(data)
    const jsonData = JSON.parse(jsonStr)

    await this.sqlite.importFromJson(JSON.stringify(jsonData))

    // Refresh connection after import
    if (this.config) {
      await this.close()
      await this.initialize(this.config)
    }
  }

  getPlatform(): Platform {
    return 'web'
  }

  /**
   * Save database to IndexedDB store
   * Called automatically after write operations
   */
  private async saveToStore(): Promise<void> {
    if (this.sqlite && this.config) {
      try {
        await this.sqlite.saveToStore(this.config.name)
      } catch (error) {
        console.warn('[WebAdapter] Failed to save to store:', error)
      }
    }
  }
}
