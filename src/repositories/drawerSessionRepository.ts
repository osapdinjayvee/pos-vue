/**
 * Drawer Session Repository
 * Data access for cash drawer sessions
 */

import db from '@/db/database'
import type { DrawerSession, DrawerSessionInput } from '@/types/cashDrawer'

class DrawerSessionRepository {
  private tableName = 'drawer_sessions'
  private idPrefix = 'dsess'

  async create(input: DrawerSessionInput): Promise<DrawerSession> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, shift_id, user_id, terminal_id, opening_amount, status, opened_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [id, input.shift_id, input.user_id, input.terminal_id, input.opening_amount, now]
    )

    return (await this.findById(id))!
  }

  async findById(id: string): Promise<DrawerSession | null> {
    return await db.getOne<DrawerSession>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    )
  }

  async findByShiftId(shiftId: string): Promise<DrawerSession | null> {
    return await db.getOne<DrawerSession>(
      `SELECT * FROM ${this.tableName} WHERE shift_id = ?`,
      [shiftId]
    )
  }

  async findOpen(userId: string): Promise<DrawerSession | null> {
    return await db.getOne<DrawerSession>(
      `SELECT * FROM ${this.tableName} WHERE user_id = ? AND status = 'open'`,
      [userId]
    )
  }

  async update(id: string, data: Partial<DrawerSession>): Promise<DrawerSession | null> {
    const { id: _id, ...updateData } = data
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    )

    const fields = Object.keys(filteredData)
    const values = Object.values(filteredData)

    if (fields.length === 0) return await this.findById(id)

    const setClause = fields.map(f => `${f} = ?`).join(', ')

    await db.execute(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      [...values, id]
    )

    return await this.findById(id)
  }

  async close(
    id: string,
    closingAmount: number,
    expectedAmount: number,
    variance: number,
    reason: string | null
  ): Promise<DrawerSession | null> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `UPDATE ${this.tableName}
       SET closing_amount = ?, expected_amount = ?, variance = ?, variance_reason = ?, status = 'closed', closed_at = ?
       WHERE id = ?`,
      [closingAmount, expectedAmount, variance, reason, now, id]
    )

    return await this.findById(id)
  }

  async findByDateRange(startDate: string, endDate: string): Promise<DrawerSession[]> {
    return await db.query<DrawerSession>(
      `SELECT * FROM ${this.tableName}
       WHERE opened_at >= ? AND opened_at <= ?
       ORDER BY opened_at DESC`,
      [startDate, endDate + 'T23:59:59.999Z']
    )
  }

  async findClosedByDateRange(startDate: string, endDate: string): Promise<DrawerSession[]> {
    return await db.query<DrawerSession>(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'closed' AND opened_at >= ? AND opened_at <= ?
       ORDER BY opened_at DESC`,
      [startDate, endDate + 'T23:59:59.999Z']
    )
  }
}

export const drawerSessionRepository = new DrawerSessionRepository()
export default drawerSessionRepository
