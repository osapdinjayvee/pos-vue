/**
 * OR Allocation Repository
 * Manages pre-allocated OR number ranges per terminal
 */

import db from '@/db/database'
import type { ORAllocation } from '@/types/sync'

class ORAllocationRepository {
  /**
   * Create a new OR allocation
   */
  async create(allocation: ORAllocation): Promise<void> {
    await db.execute(
      `INSERT INTO or_allocations (id, terminal_id, branch_id, prefix, start_number, end_number, current_number, allocated_at, exhausted_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        allocation.id,
        allocation.terminal_id,
        allocation.branch_id,
        allocation.prefix,
        allocation.start_number,
        allocation.end_number,
        allocation.current_number,
        allocation.allocated_at,
        allocation.exhausted_at,
        allocation.status
      ]
    )
  }

  /**
   * Find active allocations for a terminal
   */
  async findActiveByTerminal(terminalId: string): Promise<ORAllocation[]> {
    return await db.query<ORAllocation>(
      `SELECT * FROM or_allocations
       WHERE terminal_id = ? AND status = 'active'
       ORDER BY allocated_at ASC`,
      [terminalId]
    )
  }

  /**
   * Find all allocations for a terminal (active and exhausted)
   */
  async findByTerminal(terminalId: string): Promise<ORAllocation[]> {
    return await db.query<ORAllocation>(
      `SELECT * FROM or_allocations
       WHERE terminal_id = ?
       ORDER BY allocated_at DESC`,
      [terminalId]
    )
  }

  /**
   * Mark an allocation as exhausted
   */
  async markExhausted(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE or_allocations SET status = 'exhausted', exhausted_at = ? WHERE id = ?`,
      [now, id]
    )
  }

  /**
   * Get current active allocation for a terminal and prefix
   */
  async getCurrentAllocation(terminalId: string, prefix: string): Promise<ORAllocation | null> {
    return await db.getOne<ORAllocation>(
      `SELECT * FROM or_allocations
       WHERE terminal_id = ? AND prefix = ? AND status = 'active'
       ORDER BY allocated_at DESC
       LIMIT 1`,
      [terminalId, prefix]
    )
  }

  /**
   * Increment current_number in an allocation
   */
  async incrementCurrentNumber(id: string): Promise<void> {
    await db.execute(
      `UPDATE or_allocations SET current_number = current_number + 1 WHERE id = ?`,
      [id]
    )
  }

  /**
   * Get usage percentage of an allocation
   */
  async getUsagePercentage(id: string): Promise<number> {
    const alloc = await db.getOne<ORAllocation>(
      'SELECT * FROM or_allocations WHERE id = ?',
      [id]
    )
    if (!alloc) return 0
    const total = alloc.end_number - alloc.start_number + 1
    const used = alloc.current_number - alloc.start_number
    return total > 0 ? (used / total) * 100 : 100
  }
}

export const orAllocationRepository = new ORAllocationRepository()
export default orAllocationRepository
