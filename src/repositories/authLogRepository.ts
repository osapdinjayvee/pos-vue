/**
 * Auth Log Repository
 * Data access for authentication event logging
 */

import db from '@/db/database'
import { BaseRepository, type QueryOptions } from './baseRepository'
import type { AuthLog, AuthLogInput, AuthEventType } from '@/types/user'

class AuthLogRepository extends BaseRepository<AuthLog> {
  protected tableName = 'auth_logs'
  protected idPrefix = 'alog'

  /**
   * Log an authentication event
   */
  async logEvent(input: AuthLogInput): Promise<AuthLog> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, user_id, username, event_type, terminal_id, ip_address, user_agent, failure_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.user_id || null,
        input.username,
        input.event_type,
        input.terminal_id,
        input.ip_address || null,
        input.user_agent || null,
        input.failure_reason || null,
        now
      ]
    )

    return (await this.findById(id))!
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(
    userId: string,
    username: string,
    terminalId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthLog> {
    return this.logEvent({
      user_id: userId,
      username,
      event_type: 'login_success',
      terminal_id: terminalId,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * Log failed login
   */
  async logLoginFailure(
    username: string,
    terminalId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthLog> {
    return this.logEvent({
      username,
      event_type: 'login_failure',
      terminal_id: terminalId,
      failure_reason: reason,
      ip_address: ipAddress,
      user_agent: userAgent
    })
  }

  /**
   * Log logout
   */
  async logLogout(
    userId: string,
    username: string,
    terminalId: string
  ): Promise<AuthLog> {
    return this.logEvent({
      user_id: userId,
      username,
      event_type: 'logout',
      terminal_id: terminalId
    })
  }

  /**
   * Log screen lock
   */
  async logLock(
    userId: string,
    username: string,
    terminalId: string
  ): Promise<AuthLog> {
    return this.logEvent({
      user_id: userId,
      username,
      event_type: 'lock',
      terminal_id: terminalId
    })
  }

  /**
   * Log screen unlock
   */
  async logUnlock(
    userId: string,
    username: string,
    terminalId: string
  ): Promise<AuthLog> {
    return this.logEvent({
      user_id: userId,
      username,
      event_type: 'unlock',
      terminal_id: terminalId
    })
  }

  /**
   * Find logs by user
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<AuthLog[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`
    const params: any[] = [userId]

    sql += ' ORDER BY created_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<AuthLog>(sql, params)
  }

  /**
   * Find logs by terminal
   */
  async findByTerminal(terminalId: string, options?: QueryOptions): Promise<AuthLog[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE terminal_id = ?`
    const params: any[] = [terminalId]

    sql += ' ORDER BY created_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<AuthLog>(sql, params)
  }

  /**
   * Find logs by event type
   */
  async findByEventType(eventType: AuthEventType, options?: QueryOptions): Promise<AuthLog[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE event_type = ?`
    const params: any[] = [eventType]

    sql += ' ORDER BY created_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<AuthLog>(sql, params)
  }

  /**
   * Find logs within date range
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    options?: QueryOptions
  ): Promise<AuthLog[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE created_at >= ? AND created_at <= ?`
    const params: any[] = [startDate, endDate]

    sql += ' ORDER BY created_at DESC'

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`
      }
    }

    return await db.query<AuthLog>(sql, params)
  }

  /**
   * Count failed logins for a username in the last N minutes
   */
  async countRecentFailures(username: string, minutes: number = 15): Promise<number> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}
       WHERE username = ? AND event_type = 'login_failure' AND created_at >= ?`,
      [username, cutoffTime]
    )

    return result?.count || 0
  }

  /**
   * Get unsynced logs for sync
   */
  async getUnsynced(limit: number = 100): Promise<AuthLog[]> {
    return await db.query<AuthLog>(
      `SELECT * FROM ${this.tableName} WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      [limit]
    )
  }

  /**
   * Mark logs as synced
   */
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const placeholders = ids.map(() => '?').join(', ')
    await db.execute(
      `UPDATE ${this.tableName} SET synced_at = ? WHERE id IN (${placeholders})`,
      [db.getCurrentTimestamp(), ...ids]
    )
  }

  /**
   * Delete old logs (for cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const result = await db.execute(
      `DELETE FROM ${this.tableName} WHERE created_at < ? AND synced_at IS NOT NULL`,
      [cutoffDate]
    )

    return result.changes
  }
}

export const authLogRepository = new AuthLogRepository()
export default authLogRepository
