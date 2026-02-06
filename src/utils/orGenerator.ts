// OR (Official Receipt) Number Generator utility
// Ensures sequential, gap-free OR numbering per BIR requirements

import type { ORSeries } from '@/types/receipt'

/**
 * OR number generation result
 */
export interface ORGenerationResult {
  success: boolean
  orNumber?: string
  newCurrentNumber?: number
  error?: string
  warning?: string
}

/**
 * OR series status
 */
export interface ORSeriesStatus {
  seriesId: string
  currentNumber: number
  startNumber: number
  endNumber: number
  remaining: number
  usedCount: number
  usagePercentage: number
  isLow: boolean        // > 80% used
  isCritical: boolean   // > 95% used
  isExhausted: boolean  // 100% used
}

/**
 * Generate next OR number from series
 * @param series - The OR series to generate from
 * @returns Generation result with OR number or error
 */
export function generateORNumber(series: ORSeries): ORGenerationResult {
  // Check if series is active
  if (series.is_active !== 1) {
    return {
      success: false,
      error: 'OR series is not active'
    }
  }

  // Calculate next number
  const nextNumber = series.current_number + 1

  // Check if exhausted
  if (nextNumber > series.end_number) {
    return {
      success: false,
      error: 'OR series exhausted. Please allocate a new series.'
    }
  }

  // Format OR number
  const orNumber = formatORNumber(
    series.prefix,
    series.branch_code,
    nextNumber
  )

  // Check for warnings
  const remaining = series.end_number - nextNumber
  const totalRange = series.end_number - series.start_number + 1
  const usagePercentage = ((nextNumber - series.start_number + 1) / totalRange) * 100

  let warning: string | undefined
  if (usagePercentage >= 95) {
    warning = `CRITICAL: OR series nearly exhausted (${remaining} remaining)`
  } else if (usagePercentage >= 80) {
    warning = `WARNING: OR series is low (${remaining} remaining)`
  }

  return {
    success: true,
    orNumber,
    newCurrentNumber: nextNumber,
    warning
  }
}

/**
 * Format OR number with standard format
 * Format: PREFIX-BRANCHCODE-XXXXXXXX (8 digits, zero-padded)
 */
export function formatORNumber(prefix: string, branchCode: string, number: number): string {
  const paddedNumber = number.toString().padStart(8, '0')
  return `${prefix}-${branchCode}-${paddedNumber}`
}

/**
 * Parse OR number to extract components
 */
export function parseORNumber(orNumber: string): {
  prefix: string
  branchCode: string
  number: number
} | null {
  const parts = orNumber.split('-')
  if (parts.length < 3) return null

  const prefix = parts[0] ?? ''
  const branchCode = parts[1] ?? ''
  const numberPart = parts.slice(2).join('')
  const number = parseInt(numberPart, 10)

  if (isNaN(number) || !prefix || !branchCode) return null

  return { prefix, branchCode, number }
}

/**
 * Get OR series status
 */
export function getSeriesStatus(series: ORSeries): ORSeriesStatus {
  const totalRange = series.end_number - series.start_number + 1
  const usedCount = series.current_number - series.start_number + 1
  const remaining = series.end_number - series.current_number
  const usagePercentage = (usedCount / totalRange) * 100

  return {
    seriesId: series.id,
    currentNumber: series.current_number,
    startNumber: series.start_number,
    endNumber: series.end_number,
    remaining,
    usedCount,
    usagePercentage,
    isLow: usagePercentage >= 80,
    isCritical: usagePercentage >= 95,
    isExhausted: remaining <= 0
  }
}

/**
 * Validate OR number format
 */
export function isValidORNumber(orNumber: string): boolean {
  const parsed = parseORNumber(orNumber)
  if (!parsed) return false

  // Validate prefix (letters only)
  if (!/^[A-Z]+$/.test(parsed.prefix)) return false

  // Validate branch code (alphanumeric)
  if (!/^[A-Z0-9]+$/.test(parsed.branchCode)) return false

  // Validate number (positive integer)
  if (parsed.number <= 0) return false

  return true
}

/**
 * Generate refund OR number
 * Format: ROR-BRANCHCODE-XXXXXXXX
 */
export function generateRefundORNumber(
  branchCode: string,
  number: number
): string {
  return formatORNumber('ROR', branchCode, number)
}

/**
 * Check if OR number belongs to series
 */
export function belongsToSeries(orNumber: string, series: ORSeries): boolean {
  const parsed = parseORNumber(orNumber)
  if (!parsed) return false

  return (
    parsed.prefix === series.prefix &&
    parsed.branchCode === series.branch_code &&
    parsed.number >= series.start_number &&
    parsed.number <= series.end_number
  )
}

/**
 * Get next OR number preview (doesn't increment)
 */
export function previewNextORNumber(series: ORSeries): string | null {
  const nextNumber = series.current_number + 1
  if (nextNumber > series.end_number) return null

  return formatORNumber(series.prefix, series.branch_code, nextNumber)
}

/**
 * Calculate how many ORs can be generated before exhaustion
 */
export function getRemainingCapacity(series: ORSeries): number {
  return Math.max(0, series.end_number - series.current_number)
}

/**
 * Estimate days until exhaustion based on daily average
 */
export function estimateDaysUntilExhaustion(
  series: ORSeries,
  dailyAverage: number
): number | null {
  if (dailyAverage <= 0) return null

  const remaining = getRemainingCapacity(series)
  return Math.ceil(remaining / dailyAverage)
}
