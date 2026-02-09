/**
 * SqlJs Adapter - SQLite implementation for browsers using sql.js
 * Uses IndexedDB for persistence (supports much larger databases than localStorage)
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

const IDB_NAME = 'pos_sqljs'
const IDB_STORE = 'database'
const IDB_KEY = 'pos_database_data'
const LEGACY_STORAGE_KEY = 'pos_database_data'

/**
 * Simple IndexedDB helpers for storing/loading the database binary
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const request = store.get(key)
    request.onsuccess = () => {
      db.close()
      resolve(request.result ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function idbPut(key: string, value: Uint8Array): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    const request = store.put(value, key)
    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

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
 * SqlJs adapter using sql.js for browser-based SQLite with IndexedDB persistence
 */
export class SqlJsAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase | null = null
  private SQL: any = null
  private initialized = false
  private config: DatabaseConfig | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  async initialize(config: DatabaseConfig): Promise<void> {
    if (this.initialized) return

    this.config = config

    try {
      // Initialize sql.js with local WASM file
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `/${file}`
      })

      // Try to load existing database from IndexedDB
      let loaded = false
      try {
        const savedData = await idbGet(IDB_KEY)
        if (savedData) {
          this.db = new this.SQL.Database(new Uint8Array(savedData))
          loaded = true
          console.log('[SqlJsAdapter] Loaded existing database from IndexedDB')
        }
      } catch (e) {
        console.warn('[SqlJsAdapter] Failed to load from IndexedDB:', e)
      }

      // Migrate from localStorage if IndexedDB was empty
      if (!loaded) {
        try {
          const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY)
          if (legacyData) {
            const uint8Array = new Uint8Array(JSON.parse(legacyData))
            this.db = new this.SQL.Database(uint8Array)
            loaded = true
            console.log('[SqlJsAdapter] Migrated database from localStorage to IndexedDB')
            // Clean up localStorage after successful migration
            localStorage.removeItem(LEGACY_STORAGE_KEY)
          }
        } catch (e) {
          console.warn('[SqlJsAdapter] Failed to migrate from localStorage:', e)
        }
      }

      if (!loaded) {
        this.db = new this.SQL.Database()
        console.log('[SqlJsAdapter] Created new database')
      }

      this.initialized = true
      await this.saveToStorage()

      console.log(`[SqlJsAdapter] Database "${config.name}" initialized successfully`)
    } catch (error) {
      console.error('[SqlJsAdapter] Initialization failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      // Flush any pending save
      if (this.saveTimer) {
        clearTimeout(this.saveTimer)
        this.saveTimer = null
      }
      await this.saveToStorage()
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
    this.scheduleSave()

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
      const ctx = new SqlJsTransactionContext(this.db, () => this.scheduleSave())
      const result = await fn(ctx)

      // Commit transaction
      this.db.run('COMMIT')
      this.scheduleSave()

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
      this.scheduleSave()

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
    await this.saveToStorage()

    console.log('[SqlJsAdapter] Database imported successfully')
  }

  getPlatform(): Platform {
    return 'web'
  }

  /**
   * Debounced save - batches rapid writes into a single IndexedDB write
   * Saves within 100ms of the last write operation
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.saveToStorage()
    }, 100)
  }

  /**
   * Save database to IndexedDB
   */
  private async saveToStorage(): Promise<void> {
    if (!this.db) return
    try {
      const data = this.db.export()
      await idbPut(IDB_KEY, data)
    } catch (error) {
      console.warn('[SqlJsAdapter] Failed to save database to IndexedDB:', error)
    }
  }
}
