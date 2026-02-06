/**
 * X-Counter Repository
 * Manages the X-counter which resets after each Z-Reading
 */

import db from '@/db/database'
import type { XCounter } from '@/types/xReading'

class XCounterRepository {
  /**
   * Get the current X-counter for a terminal
   */
  async getCounter(terminalId: string): Promise<XCounter | null> {
    return await db.getOne<XCounter>(
      'SELECT * FROM x_counters WHERE terminal_id = ?',
      [terminalId]
    )
  }

  /**
   * Initialize an X-counter for a new terminal
   */
  async initializeCounter(terminalId: string): Promise<XCounter> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT OR IGNORE INTO x_counters (terminal_id, current_value, updated_at)
       VALUES (?, ?, ?)`,
      [terminalId, 0, now]
    )

    return (await this.getCounter(terminalId))!
  }

  /**
   * Increment the X-counter and return the new value
   * This is called when generating an X-Reading
   */
  async incrementCounter(terminalId: string): Promise<number> {
    const now = db.getCurrentTimestamp()

    return await db.transaction(async (ctx) => {
      const counter = await ctx.getOne<XCounter>(
        'SELECT * FROM x_counters WHERE terminal_id = ?',
        [terminalId]
      )

      if (!counter) {
        await ctx.execute(
          `INSERT INTO x_counters (terminal_id, current_value, updated_at)
           VALUES (?, ?, ?)`,
          [terminalId, 1, now]
        )
        return 1
      }

      const newValue = counter.current_value + 1

      await ctx.execute(
        `UPDATE x_counters SET current_value = ?, updated_at = ?
         WHERE terminal_id = ?`,
        [newValue, now, terminalId]
      )

      return newValue
    })
  }

  /**
   * Reset the X-counter (called after Z-Reading generation)
   */
  async resetCounter(terminalId: string): Promise<void> {
    const now = db.getCurrentTimestamp()

    await db.execute(
      `UPDATE x_counters SET current_value = 0, updated_at = ?
       WHERE terminal_id = ?`,
      [now, terminalId]
    )
  }

  /**
   * Get the next X-counter value without incrementing
   */
  async getNextValue(terminalId: string): Promise<number> {
    const counter = await this.getCounter(terminalId)
    return (counter?.current_value || 0) + 1
  }

  /**
   * Get all terminals with their X-counters
   */
  async getAllCounters(): Promise<XCounter[]> {
    return await db.query<XCounter>('SELECT * FROM x_counters ORDER BY terminal_id')
  }
}

export const xCounterRepository = new XCounterRepository()
export default xCounterRepository
