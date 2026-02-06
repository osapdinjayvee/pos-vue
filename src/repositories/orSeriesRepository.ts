// OR Series Repository - CRUD operations for Official Receipt number series
import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { ORSeries, ORSeriesInput } from '@/types/receipt'

class ORSeriesRepository extends BaseRepository<ORSeries> {
  protected tableName = 'or_series'
  protected idPrefix = 'ors'

  async getAll(): Promise<ORSeries[]> {
    return this.findAll({ orderBy: 'created_at', orderDir: 'DESC' })
  }

  async findActive(): Promise<ORSeries[]> {
    return await db.query<ORSeries>(
      `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY created_at DESC`
    )
  }

  async findByBranch(branchId: string): Promise<ORSeries[]> {
    return await db.query<ORSeries>(
      `SELECT * FROM ${this.tableName} WHERE branch_id = ? ORDER BY created_at DESC`,
      [branchId]
    )
  }

  async findActiveByBranch(branchId: string): Promise<ORSeries | null> {
    return await db.getOne<ORSeries>(
      `SELECT * FROM ${this.tableName} WHERE branch_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
      [branchId]
    )
  }

  async findByTerminal(terminalId: string): Promise<ORSeries[]> {
    return await db.query<ORSeries>(
      `SELECT * FROM ${this.tableName} WHERE terminal_id = ? ORDER BY created_at DESC`,
      [terminalId]
    )
  }

  async findActiveByTerminal(terminalId: string): Promise<ORSeries | null> {
    return await db.getOne<ORSeries>(
      `SELECT * FROM ${this.tableName} WHERE terminal_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
      [terminalId]
    )
  }

  async createSeries(data: ORSeriesInput): Promise<ORSeries> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName}
       (id, branch_id, terminal_id, prefix, branch_code, start_number, end_number,
        current_number, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.branch_id,
        data.terminal_id || null,
        data.prefix,
        data.branch_code,
        data.start_number,
        data.end_number,
        data.start_number - 1, // current_number starts at one less than start
        data.is_active ?? 1,
        now,
        now
      ]
    )

    return await this.findById(id) as ORSeries
  }

  async incrementCurrentNumber(id: string): Promise<{ newNumber: number; orNumber: string } | null> {
    const series = await this.findById(id)
    if (!series) return null

    const newNumber = series.current_number + 1

    // Check if exhausted
    if (newNumber > series.end_number) {
      return null
    }

    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET current_number = ?, updated_at = ? WHERE id = ?`,
      [newNumber, now, id]
    )

    // Format OR number
    const orNumber = `${series.prefix}-${series.branch_code}-${newNumber.toString().padStart(8, '0')}`

    return { newNumber, orNumber }
  }

  async deactivate(id: string): Promise<boolean> {
    const now = db.getCurrentTimestamp()
    const result = await db.execute(
      `UPDATE ${this.tableName} SET is_active = 0, updated_at = ? WHERE id = ?`,
      [now, id]
    )
    return result.changes > 0
  }

  async activate(id: string): Promise<boolean> {
    const now = db.getCurrentTimestamp()
    const result = await db.execute(
      `UPDATE ${this.tableName} SET is_active = 1, updated_at = ? WHERE id = ?`,
      [now, id]
    )
    return result.changes > 0
  }

  async getSeriesStatus(id: string): Promise<{
    remaining: number
    usagePercentage: number
    isLow: boolean
    isCritical: boolean
    isExhausted: boolean
  } | null> {
    const series = await this.findById(id)
    if (!series) return null

    const totalRange = series.end_number - series.start_number + 1
    const usedCount = series.current_number - series.start_number + 1
    const remaining = series.end_number - series.current_number
    const usagePercentage = (usedCount / totalRange) * 100

    return {
      remaining,
      usagePercentage,
      isLow: usagePercentage >= 80,
      isCritical: usagePercentage >= 95,
      isExhausted: remaining <= 0
    }
  }

  async findLowSeries(thresholdPercentage: number = 80): Promise<ORSeries[]> {
    // Find series that are >= threshold% used
    return await db.query<ORSeries>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1
       AND (CAST(current_number - start_number + 1 AS REAL) / (end_number - start_number + 1)) * 100 >= ?
       ORDER BY (CAST(current_number - start_number + 1 AS REAL) / (end_number - start_number + 1)) DESC`,
      [thresholdPercentage]
    )
  }

  async findExhausted(): Promise<ORSeries[]> {
    return await db.query<ORSeries>(
      `SELECT * FROM ${this.tableName}
       WHERE is_active = 1 AND current_number >= end_number
       ORDER BY updated_at DESC`
    )
  }

  async getNextORNumber(branchId: string, terminalId?: string): Promise<{
    seriesId: string
    orNumber: string
    warning?: string
  } | null> {
    // Try to find active series for terminal first, then branch
    let series: ORSeries | null = null

    if (terminalId) {
      series = await this.findActiveByTerminal(terminalId)
    }

    if (!series) {
      series = await this.findActiveByBranch(branchId)
    }

    if (!series) {
      return null
    }

    const result = await this.incrementCurrentNumber(series.id)
    if (!result) {
      return null
    }

    // Check for warnings
    const status = await this.getSeriesStatus(series.id)
    let warning: string | undefined

    if (status?.isCritical) {
      warning = `CRITICAL: OR series nearly exhausted (${status.remaining} remaining)`
    } else if (status?.isLow) {
      warning = `WARNING: OR series is low (${status.remaining} remaining)`
    }

    return {
      seriesId: series.id,
      orNumber: result.orNumber,
      warning
    }
  }

  async countActive(): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1`
    )
    return result?.count || 0
  }

  async countByBranch(branchId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE branch_id = ?`,
      [branchId]
    )
    return result?.count || 0
  }
}

export const orSeriesRepository = new ORSeriesRepository()
export default orSeriesRepository
