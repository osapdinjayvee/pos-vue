/**
 * OR Allocation Service
 * Manages pre-allocated OR number ranges per terminal for BIR compliance
 */

import { orAllocationRepository } from '@/repositories/orAllocationRepository'
import { httpClient } from '@/services/httpClient'
import { connectivityService } from '@/services/connectivityService'
import db from '@/db/database'
import type { ORAllocation, ORAllocationResponse } from '@/types/sync'

/**
 * Request a new OR number range from the server
 */
async function requestNewRange(
  terminalId: string,
  prefix: string,
  branchId: string
): Promise<ORAllocation | null> {
  try {
    const response = await httpClient.post<ORAllocationResponse>(
      '/sync/or-allocations/request',
      { terminal_id: terminalId, prefix, branch_id: branchId }
    )

    if (response.data.success && response.data.allocation) {
      const allocation = response.data.allocation
      await orAllocationRepository.create(allocation)
      return allocation
    }

    console.warn('[ORAllocation] Server rejected allocation request:', response.data.error)
    return null
  } catch (e) {
    console.error('[ORAllocation] Failed to request new range:', e)
    return null
  }
}

/**
 * Check current allocation and request new range if < 20% remaining
 */
async function checkAndRequestRange(terminalId: string): Promise<void> {
  const allocations = await orAllocationRepository.findActiveByTerminal(terminalId)

  for (const alloc of allocations) {
    const usage = await orAllocationRepository.getUsagePercentage(alloc.id)
    if (usage >= 80 && connectivityService.isOnline.value) {
      console.log(`[ORAllocation] Allocation ${alloc.id} at ${usage.toFixed(0)}% usage, requesting new range`)
      await requestNewRange(terminalId, alloc.prefix, alloc.branch_id)
    }
  }
}

/**
 * Consume the next number from the active allocation
 * Returns the next OR number or null if exhausted
 */
async function consumeNumber(terminalId: string, prefix: string): Promise<number | null> {
  const alloc = await orAllocationRepository.getCurrentAllocation(terminalId, prefix)

  if (!alloc) return null

  if (alloc.current_number > alloc.end_number) {
    await orAllocationRepository.markExhausted(alloc.id)
    return null
  }

  const number = alloc.current_number
  await orAllocationRepository.incrementCurrentNumber(alloc.id)

  // Check if now exhausted
  if (number >= alloc.end_number) {
    await orAllocationRepository.markExhausted(alloc.id)
  }

  return number
}

/**
 * Check if a range is available for the terminal
 */
async function isRangeAvailable(terminalId: string): Promise<boolean> {
  const allocations = await orAllocationRepository.findActiveByTerminal(terminalId)
  return allocations.length > 0
}

/**
 * Get the active allocation with remaining count
 */
async function getActiveAllocation(
  terminalId: string
): Promise<(ORAllocation & { remaining: number; usagePercent: number }) | null> {
  const allocations = await orAllocationRepository.findActiveByTerminal(terminalId)

  if (allocations.length === 0) return null

  const alloc = allocations[0]
  const total = alloc.end_number - alloc.start_number + 1
  const used = alloc.current_number - alloc.start_number
  const remaining = total - used

  return {
    ...alloc,
    remaining,
    usagePercent: total > 0 ? (used / total) * 100 : 100
  }
}

export const orAllocationService = {
  requestNewRange,
  checkAndRequestRange,
  consumeNumber,
  isRangeAvailable,
  getActiveAllocation
}

export default orAllocationService
