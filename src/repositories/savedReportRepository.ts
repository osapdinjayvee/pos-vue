/**
 * Saved Report Repository
 * Manages saved report configurations for the custom report builder
 */

import db from '@/db/database'
import type { SavedReport, SavedReportInput } from '@/types/analytics'

class SavedReportRepository {
  async findAll(): Promise<SavedReport[]> {
    return await db.query<SavedReport>(
      'SELECT * FROM saved_reports ORDER BY updated_at DESC'
    )
  }

  async findById(id: string): Promise<SavedReport | null> {
    return await db.getOne<SavedReport>(
      'SELECT * FROM saved_reports WHERE id = ?',
      [id]
    )
  }

  async create(input: SavedReportInput): Promise<SavedReport> {
    const id = db.generateId('rpt')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO saved_reports (id, name, type, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.type, JSON.stringify(input.config), now, now]
    )

    return (await this.findById(id))!
  }

  async update(id: string, input: Partial<SavedReportInput>): Promise<SavedReport | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const now = db.getCurrentTimestamp()
    const name = input.name ?? existing.name
    const type = input.type ?? existing.type
    const config = input.config ? JSON.stringify(input.config) : existing.config

    await db.execute(
      `UPDATE saved_reports SET name = ?, type = ?, config = ?, updated_at = ? WHERE id = ?`,
      [name, type, config, now, id]
    )

    return await this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.execute(
      'DELETE FROM saved_reports WHERE id = ?',
      [id]
    )
    return result.changes > 0
  }

  async count(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM saved_reports'
    )
    return result?.count || 0
  }
}

export const savedReportRepository = new SavedReportRepository()
export default savedReportRepository
