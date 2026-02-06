/**
 * Capacitor Adapter - SQLite implementation for native mobile (iOS/Android)
 * Uses @capacitor-community/sqlite for native SQLite access
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import type {
  DatabaseAdapter,
  DatabaseConfig,
  QueryResult,
  TransactionContext
} from './DatabaseAdapter'
import type { Platform } from '../platform'

/**
 * Transaction context for Capacitor adapter
 */
class CapacitorTransactionContext implements TransactionContext {
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
 * Capacitor adapter for native mobile platforms
 */
export class CapacitorAdapter implements DatabaseAdapter {
  private sqlite: SQLiteConnection
  private db: SQLiteDBConnection | null = null
  private initialized = false
  private config: DatabaseConfig | null = null

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite)
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) return

    this.config = config

    try {
      // Check connection consistency (important for iOS)
      const retCC = await this.sqlite.checkConnectionsConsistency()
      const isConn = (await this.sqlite.isConnection(config.name, false)).result

      if (retCC.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(config.name, false)
      } else {
        this.db = await this.sqlite.createConnection(
          config.name,
          config.encryptionKey !== undefined,
          config.encryptionKey || 'no-encryption',
          1, // version
          false // readonly
        )
      }

      await this.db.open()
      this.initialized = true

      console.log(`[CapacitorAdapter] Database "${config.name}" initialized successfully`)
    } catch (error) {
      console.error('[CapacitorAdapter] Initialization failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.db && this.config) {
      await this.db.close()
      await this.sqlite.closeConnection(this.config.name, false)
      this.db = null
      this.initialized = false
      console.log('[CapacitorAdapter] Database closed')
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) throw new Error('Database not initialized')

    const result = await this.db.run(sql, params)
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

    await this.db.execute('BEGIN TRANSACTION')

    try {
      const ctx = new CapacitorTransactionContext(this.db)
      const result = await fn(ctx)
      await this.db.execute('COMMIT')
      return result
    } catch (error) {
      await this.db.execute('ROLLBACK')
      throw error
    }
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    if (!this.db) throw new Error('Database not initialized')

    const results: QueryResult[] = []

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
    return 'capacitor'
  }
}
