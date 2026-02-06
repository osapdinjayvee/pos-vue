/**
 * SqlJs Adapter - SQLite implementation for browsers using sql.js
 * Uses localStorage for persistence (fallback for when jeep-sqlite fails)
 */

import initSqlJs from 'sql.js'
import type { Database as SqlJsDatabase } from 'sql.js'
import type {
  DatabaseAdapter,
  DatabaseConfig,
  QueryResult,
  TransactionContext
} from './DatabaseAdapter'
import type { Platform } from '../platform'

const DB_STORAGE_KEY = 'pos_database_data'

/**
 * Transaction context for SqlJs adapter
 */
class SqlJsTransactionContext implements TransactionContext {
  constructor(
    private db: SqlJsDatabase,
    private saveCallback: () => void
  ) {}

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    this.db.run(sql, params)
    return {
      rowsAffected: this.db.getRowsModified(),
      changes: this.db.getRowsModified(),
      lastInsertId: undefined
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql)
    stmt.bind(params)

    const results: T[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(row as T)
    }
    stmt.free()

    return results
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }
}

/**
 * SqlJs adapter using sql.js for browser-based SQLite with localStorage persistence
 */
export class SqlJsAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase | null = null
  private SQL: any = null
  private initialized = false
  private config: DatabaseConfig | null = null

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) return

    this.config = config

    try {
      // Initialize sql.js with local WASM file
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`
      })

      // Try to load existing database from localStorage
      const savedData = localStorage.getItem(DB_STORAGE_KEY)
      if (savedData) {
        try {
          const uint8Array = new Uint8Array(JSON.parse(savedData))
          this.db = new this.SQL.Database(uint8Array)
          console.log('[SqlJsAdapter] Loaded existing database from storage')
        } catch (e) {
          console.warn('[SqlJsAdapter] Failed to load saved database, creating new one')
          this.db = new this.SQL.Database()
        }
      } else {
        this.db = new this.SQL.Database()
        console.log('[SqlJsAdapter] Created new database')
      }

      this.initialized = true
      this.saveToStorage()

      console.log(`[SqlJsAdapter] Database "${config.name}" initialized successfully`)
    } catch (error) {
      console.error('[SqlJsAdapter] Initialization failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.saveToStorage()
      this.db.close()
      this.db = null
      this.initialized = false
      console.log('[SqlJsAdapter] Database closed')
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) throw new Error('Database not initialized')

    this.db.run(sql, params)
    this.saveToStorage()

    return {
      rowsAffected: this.db.getRowsModified(),
      changes: this.db.getRowsModified(),
      lastInsertId: undefined
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(sql)
    stmt.bind(params)

    const results: T[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(row as T)
    }
    stmt.free()

    return results
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? (results[0] ?? null) : null
  }

  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')

    // Begin transaction
    this.db.run('BEGIN TRANSACTION')

    try {
      const ctx = new SqlJsTransactionContext(this.db, () => this.saveToStorage())
      const result = await fn(ctx)

      // Commit transaction
      this.db.run('COMMIT')
      this.saveToStorage()

      return result
    } catch (error) {
      // Rollback on error
      this.db.run('ROLLBACK')
      throw error
    }
  }

  async executeBatch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    if (!this.db) throw new Error('Database not initialized')

    const results: QueryResult[] = []

    // Execute in a transaction for better performance
    this.db.run('BEGIN TRANSACTION')

    try {
      for (const stmt of statements) {
        this.db.run(stmt.sql, stmt.params || [])
        results.push({
          rowsAffected: this.db.getRowsModified(),
          changes: this.db.getRowsModified(),
          lastInsertId: undefined
        })
      }

      this.db.run('COMMIT')
      this.saveToStorage()

      return results
    } catch (error) {
      this.db.run('ROLLBACK')
      throw error
    }
  }

  async export(): Promise<Uint8Array> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.export()
  }

  async import(data: Uint8Array): Promise<void> {
    if (!this.SQL) throw new Error('SQL.js not initialized')

    if (this.db) {
      this.db.close()
    }

    this.db = new this.SQL.Database(data)
    this.saveToStorage()

    console.log('[SqlJsAdapter] Database imported successfully')
  }

  getPlatform(): Platform {
    return 'web'
  }

  /**
   * Save database to localStorage
   */
  private saveToStorage(): void {
    if (!this.db) return
    try {
      const data = this.db.export()
      const arr = Array.from(data)
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(arr))
    } catch (error) {
      console.warn('[SqlJsAdapter] Failed to save database to storage:', error)
    }
  }
}
