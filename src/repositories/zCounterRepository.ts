/**
 * Z-Counter Repository
 * Manages the Z-counter which NEVER resets and is used for BIR compliance
 */

import db from '@/db/database'
import type { ZCounter } from '@/types/zReading'

class ZCounterRepository {
  /**
   * Get the current Z-counter for a terminal
   */
  async getCounter(terminalId: string): Promise<ZCounter | null> {
    return await db.getOne<ZCounter>(
      'SELECT * FROM z_counters WHERE terminal_id = ?',
      [terminalId]
    )
  }

  /**
   * Initialize a Z-counter for a new terminal
   */
  async initializeCounter(terminalId: string): Promise<ZCounter> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT OR IGNORE INTO z_counters (terminal_id, current_value, updated_at)
       VALUES (?, ?, ?)`,
      [terminalId, 0, now]
    )

    return (await this.getCounter(terminalId))!
  }

  /**
   * Increment the Z-counter and return the new value
   * This is called when generating a Z-Reading
   * CRITICAL: This operation must be atomic
   */
  async incrementCounter(terminalId: string): Promise<number> {
    const now = db.getCurrentTimestamp()
    const today = now.split('T')[0]

    // Use transaction for atomicity
    return await db.transaction(async (ctx) => {
      // Get current value
      const counter = await ctx.getOne<ZCounter>(
        'SELECT * FROM z_counters WHERE terminal_id = ?',
        [terminalId]
      )

      if (!counter) {
        // Initialize if not exists
        await ctx.execute(
          `INSERT INTO z_counters (terminal_id, current_value, last_z_date, updated_at)
           VALUES (?, ?, ?, ?)`,
          [terminalId, 1, today, now]
        )
        return 1
      }

      const newValue = counter.current_value + 1

      // Update counter
      await ctx.execute(
        `UPDATE z_counters SET current_value = ?, last_z_date = ?, updated_at = ?
         WHERE terminal_id = ?`,
        [newValue, today, now, terminalId]
      )

      return newValue
    })
  }

  /**
   * Get the next Z-counter value without incrementing
   * Used for preview/display purposes
   */
  async getNextValue(terminalId: string): Promise<number> {
    const counter = await this.getCounter(terminalId)
    return (counter?.current_value || 0) + 1
  }

  /**
   * Check if Z-Reading was already generated for today
   */
  async wasGeneratedToday(terminalId: string): Promise<boolean> {
    const counter = await this.getCounter(terminalId)
    if (!counter?.last_z_date) return false

    const today = new Date().toISOString().split('T')[0]
    return counter.last_z_date === today
  }

  /**
   * Get all terminals with their Z-counters
   */
  async getAllCounters(): Promise<ZCounter[]> {
    return await db.query<ZCounter>('SELECT * FROM z_counters ORDER BY terminal_id')
  }
}

export const zCounterRepository = new ZCounterRepository()
export default zCounterRepository
