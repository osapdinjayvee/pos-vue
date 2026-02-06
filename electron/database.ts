/**
 * Electron Database Handler
 * Manages SQLite database using better-sqlite3 in the main process
 */

import { app, IpcMain } from 'electron'
import path from 'path'
import type { DatabaseConfig } from '../src/db/adapters/DatabaseAdapter'

// better-sqlite3 is loaded dynamically to prevent issues when not installed
let Database: any
let db: any | null = null

// Transaction management
const transactions = new Map<string, any>()
let transactionCounter = 0

/**
 * Get the database file path
 */
function getDatabasePath(name: string): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, `${name}.db`)
}

/**
 * Initialize the database
 */
async function initializeDatabase(config: DatabaseConfig): Promise<boolean> {
  try {
    // Dynamically import better-sqlite3
    if (!Database) {
      Database = require('better-sqlite3')
    }

    const dbPath = getDatabasePath(config.name)
    console.log(`[Database] Opening database at: ${dbPath}`)

    // Create database connection
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    })

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('foreign_keys = ON')

    console.log('[Database] Database initialized successfully')
    return true
  } catch (error) {
    console.error('[Database] Initialization failed:', error)
    throw error
  }
}

/**
 * Close the database
 */
function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[Database] Database closed')
  }
}

/**
 * Execute a SQL statement
 */
function execute(sql: string, params: any[] = []): { rowsAffected: number; lastInsertId: number | bigint } {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare(sql)
  const info = stmt.run(...params)

  return {
    rowsAffected: info.changes,
    lastInsertId: info.lastInsertRowid
  }
}

/**
 * Query multiple rows
 */
function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare(sql)
  return stmt.all(...params) as T[]
}

/**
 * Begin a transaction
 */
function beginTransaction(): string {
  if (!db) throw new Error('Database not initialized')

  const txId = `tx_${++transactionCounter}`
  const transaction = db.transaction(() => {})
  transactions.set(txId, { active: true })

  db.exec('BEGIN TRANSACTION')

  return txId
}

/**
 * Commit a transaction
 */
function commitTransaction(txId: string): void {
  if (!db) throw new Error('Database not initialized')

  const tx = transactions.get(txId)
  if (!tx || !tx.active) {
    throw new Error(`Transaction ${txId} not found or not active`)
  }

  db.exec('COMMIT')
  transactions.delete(txId)
}

/**
 * Rollback a transaction
 */
function rollbackTransaction(txId: string): void {
  if (!db) throw new Error('Database not initialized')

  const tx = transactions.get(txId)
  if (!tx || !tx.active) {
    throw new Error(`Transaction ${txId} not found or not active`)
  }

  db.exec('ROLLBACK')
  transactions.delete(txId)
}

/**
 * Execute within a transaction context
 */
function txExecute(txId: string, sql: string, params: any[] = []): { rowsAffected: number; lastInsertId: number | bigint } {
  const tx = transactions.get(txId)
  if (!tx || !tx.active) {
    throw new Error(`Transaction ${txId} not found or not active`)
  }

  return execute(sql, params)
}

/**
 * Query within a transaction context
 */
function txQuery<T = any>(txId: string, sql: string, params: any[] = []): T[] {
  const tx = transactions.get(txId)
  if (!tx || !tx.active) {
    throw new Error(`Transaction ${txId} not found or not active`)
  }

  return query(sql, params)
}

/**
 * Execute multiple statements in a batch
 */
function executeBatch(statements: Array<{ sql: string; params?: any[] }>): Array<{ rowsAffected: number; lastInsertId: number | bigint }> {
  if (!db) throw new Error('Database not initialized')

  const results: Array<{ rowsAffected: number; lastInsertId: number | bigint }> = []

  // Use a transaction for batch operations
  const batchTransaction = db.transaction(() => {
    for (const stmt of statements) {
      const result = execute(stmt.sql, stmt.params || [])
      results.push(result)
    }
  })

  batchTransaction()
  return results
}

/**
 * Export database as binary data
 */
function exportDatabase(): number[] {
  if (!db) throw new Error('Database not initialized')

  // Checkpoint WAL to ensure all data is in main file
  db.pragma('wal_checkpoint(TRUNCATE)')

  // Read the database file
  const fs = require('fs')
  const dbPath = db.name
  const data = fs.readFileSync(dbPath)

  return Array.from(data)
}

/**
 * Import database from binary data
 */
function importDatabase(data: number[], config: DatabaseConfig): void {
  if (!db) throw new Error('Database not initialized')

  // Close current database
  const dbPath = db.name
  db.close()

  // Write new data
  const fs = require('fs')
  fs.writeFileSync(dbPath, Buffer.from(data))

  // Reopen database
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  console.log('[Database] Database imported successfully')
}

/**
 * Setup IPC handlers for database operations
 */
export function setupDatabaseHandlers(ipcMain: IpcMain): void {
  // Initialize database
  ipcMain.handle('database:initialize', async (_, config: DatabaseConfig) => {
    return await initializeDatabase(config)
  })

  // Close database
  ipcMain.handle('database:close', async () => {
    closeDatabase()
    return true
  })

  // Execute SQL
  ipcMain.handle('database:execute', async (_, sql: string, params: any[]) => {
    return execute(sql, params)
  })

  // Query SQL
  ipcMain.handle('database:query', async (_, sql: string, params: any[]) => {
    return query(sql, params)
  })

  // Transaction operations
  ipcMain.handle('database:beginTransaction', async () => {
    return beginTransaction()
  })

  ipcMain.handle('database:commit', async (_, txId: string) => {
    commitTransaction(txId)
    return true
  })

  ipcMain.handle('database:rollback', async (_, txId: string) => {
    rollbackTransaction(txId)
    return true
  })

  ipcMain.handle('database:txExecute', async (_, txId: string, sql: string, params: any[]) => {
    return txExecute(txId, sql, params)
  })

  ipcMain.handle('database:txQuery', async (_, txId: string, sql: string, params: any[]) => {
    return txQuery(txId, sql, params)
  })

  // Batch operations
  ipcMain.handle('database:executeBatch', async (_, statements: Array<{ sql: string; params?: any[] }>) => {
    return executeBatch(statements)
  })

  // Export/Import
  ipcMain.handle('database:export', async () => {
    return exportDatabase()
  })

  ipcMain.handle('database:import', async (_, data: number[]) => {
    // Get current config
    const config: DatabaseConfig = { name: 'pos_database', version: 1 }
    importDatabase(data, config)
    return true
  })

  // Cleanup on app quit
  app.on('before-quit', () => {
    closeDatabase()
  })

  console.log('[Database] IPC handlers registered')
}
