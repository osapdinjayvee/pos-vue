/**
 * Database Adapter Interface
 * Defines the contract for platform-specific database implementations
 */

import type { Platform } from '../platform'

/**
 * Result from execute operations
 */
export interface QueryResult {
  /** Number of rows affected by the operation */
  rowsAffected: number
  /** Number of rows changed (alias for rowsAffected, for sqlite compatibility) */
  changes: number
  /** Last inserted row ID (if applicable) */
  lastInsertId?: number | string
}

/**
 * Database configuration options
 */
export interface DatabaseConfig {
  /** Database name (without extension) */
  name: string
  /** Database version for migration tracking */
  version: number
  /** Encryption key for encrypted databases (optional) */
  encryptionKey?: string
  /** Database file location (platform-specific) */
  location?: string
  /** Open database in read-only mode */
  readOnly?: boolean
}

/**
 * Context for executing queries within a transaction
 */
export interface TransactionContext {
  /** Execute a SQL statement within the transaction */
  execute(sql: string, params?: any[]): Promise<QueryResult>
  /** Query rows within the transaction */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  /** Get a single row within the transaction */
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>
}

/**
 * Platform-agnostic database adapter interface
 * All platform-specific implementations must implement this interface
 */
export interface DatabaseAdapter {
  // =====================
  // Lifecycle Methods
  // =====================

  /**
   * Initialize the database connection
   * @param config Database configuration options
   */
  initialize(config: DatabaseConfig): Promise<void>

  /**
   * Close the database connection
   */
  close(): Promise<void>

  /**
   * Check if the database is initialized
   */
  isInitialized(): boolean

  // =====================
  // Query Methods
  // =====================

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
   * @param sql SQL statement to execute
   * @param params Parameters for the SQL statement
   * @returns Query result with affected rows count
   */
  execute(sql: string, params?: any[]): Promise<QueryResult>

  /**
   * Query multiple rows
   * @param sql SQL SELECT statement
   * @param params Parameters for the SQL statement
   * @returns Array of row objects
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>

  /**
   * Query a single row
   * @param sql SQL SELECT statement
   * @param params Parameters for the SQL statement
   * @returns Single row object or null if not found
   */
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>

  // =====================
  // Transaction Methods
  // =====================

  /**
   * Execute a function within a transaction
   * Automatically commits on success, rolls back on error
   * @param fn Function to execute within the transaction
   * @returns Result of the function
   */
  transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>

  // =====================
  // Batch Operations
  // =====================

  /**
   * Execute multiple SQL statements in a batch
   * More efficient than executing statements one by one
   * @param statements Array of SQL statements with parameters
   * @returns Array of query results
   */
  executeBatch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]>

  // =====================
  // Import/Export
  // =====================

  /**
   * Export the entire database as a binary blob
   * Used for backup and sync operations
   * @returns Database as Uint8Array
   */
  export(): Promise<Uint8Array>

  /**
   * Import a database from a binary blob
   * Used for restore and sync operations
   * @param data Database binary data
   */
  import(data: Uint8Array): Promise<void>

  // =====================
  // Platform Info
  // =====================

  /**
   * Get the platform this adapter is running on
   */
  getPlatform(): Platform
}

/**
 * Default database configuration
 */
export const DEFAULT_CONFIG: DatabaseConfig = {
  name: 'pos_database',
  version: 1
}
