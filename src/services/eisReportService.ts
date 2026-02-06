/**
 * EIS Report Service
 * Generates submission summaries and compliance reports
 */

import db from '@/db/database'
import type { EISSummaryReport, EISZReadingComparison, EISDailyBreakdown } from '@/types/eis'

/**
 * Get submission summary for a date range
 */
async function getSubmissionSummary(dateFrom: string, dateTo: string): Promise<EISSummaryReport> {
  const rows = await db.query<{ status: string; cnt: number }>(
    `SELECT status, COUNT(*) as cnt FROM eis_submissions
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY status`,
    [dateFrom, dateTo]
  )

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.status] = row.cnt
  }

  // Get financial totals from submitted records' payloads
  const submissions = await db.query<{ payload: string }>(
    `SELECT payload FROM eis_submissions
     WHERE created_at >= ? AND created_at <= ? AND status = 'submitted'`,
    [dateFrom, dateTo]
  )

  let totalGrossSales = 0
  let totalVatAmount = 0
  let totalNetSales = 0
  let totalDiscounts = 0

  for (const sub of submissions) {
    try {
      const p = JSON.parse(sub.payload)
      totalGrossSales += p.gross_sales || 0
      totalVatAmount += p.vat_amount || 0
      totalNetSales += p.net_sales || 0
      totalDiscounts += p.discount_amount || 0
    } catch { /* skip malformed */ }
  }

  return {
    totalSubmissions: (counts.pending || 0) + (counts.submitted || 0) + (counts.failed || 0) + (counts.rejected || 0),
    submittedCount: counts.submitted || 0,
    failedCount: counts.failed || 0,
    rejectedCount: counts.rejected || 0,
    pendingCount: counts.pending || 0,
    totalGrossSales,
    totalVatAmount,
    totalNetSales,
    totalDiscounts
  }
}

/**
 * Compare EIS submissions with Z-Reading totals
 */
async function getComparisonWithZReading(dateFrom: string, dateTo: string): Promise<EISZReadingComparison> {
  // Get EIS daily totals
  const eisDaily = await db.query<{ day: string; total: number }>(
    `SELECT DATE(created_at) as day, SUM(json_extract(payload, '$.gross_sales')) as total
     FROM eis_submissions
     WHERE created_at >= ? AND created_at <= ? AND status = 'submitted'
     GROUP BY DATE(created_at)`,
    [dateFrom, dateTo]
  )

  // Get Z-Reading daily totals (from transactions as Z-Reading source)
  const zDaily = await db.query<{ day: string; total: number }>(
    `SELECT DATE(created_at) as day, SUM(total_amount) as total
     FROM transactions
     WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
     GROUP BY DATE(created_at)`,
    [dateFrom, dateTo]
  )

  const eisMap = new Map(eisDaily.map((r) => [r.day, r.total || 0]))
  const zMap = new Map(zDaily.map((r) => [r.day, r.total || 0]))

  const allDays = new Set([...eisMap.keys(), ...zMap.keys()])
  let eisGross = 0
  let zReadingGross = 0
  const discrepancies: EISZReadingComparison['discrepancies'] = []

  for (const day of allDays) {
    const eis = eisMap.get(day) || 0
    const z = zMap.get(day) || 0
    eisGross += eis
    zReadingGross += z
    if (Math.abs(eis - z) > 0.01) {
      discrepancies.push({ date: day, eisAmount: eis, zReadingAmount: z, difference: eis - z })
    }
  }

  const difference = eisGross - zReadingGross
  const matchPercentage = zReadingGross > 0 ? Math.min(100, (1 - Math.abs(difference) / zReadingGross) * 100) : (eisGross === 0 ? 100 : 0)

  return {
    eisGross,
    zReadingGross,
    difference,
    matchPercentage: Math.round(matchPercentage * 100) / 100,
    discrepancies: discrepancies.sort((a, b) => a.date.localeCompare(b.date))
  }
}

/**
 * Get daily breakdown for a date range
 */
async function getDailyBreakdown(dateFrom: string, dateTo: string): Promise<EISDailyBreakdown[]> {
  const rows = await db.query<{ day: string; status: string; cnt: number; payloads: string }>(
    `SELECT DATE(created_at) as day, status, COUNT(*) as cnt,
     GROUP_CONCAT(payload, '|||') as payloads
     FROM eis_submissions
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY DATE(created_at), status
     ORDER BY day`,
    [dateFrom, dateTo]
  )

  const dayMap = new Map<string, EISDailyBreakdown>()

  for (const row of rows) {
    if (!dayMap.has(row.day)) {
      dayMap.set(row.day, {
        date: row.day,
        submittedCount: 0,
        grossSales: 0,
        vatAmount: 0,
        netSales: 0,
        failedCount: 0
      })
    }
    const entry = dayMap.get(row.day)!

    if (row.status === 'submitted') {
      entry.submittedCount += row.cnt
      // Parse payloads for financial data
      if (row.payloads) {
        for (const payloadStr of row.payloads.split('|||')) {
          try {
            const p = JSON.parse(payloadStr)
            entry.grossSales += p.gross_sales || 0
            entry.vatAmount += p.vat_amount || 0
            entry.netSales += p.net_sales || 0
          } catch { /* skip */ }
        }
      }
    } else if (row.status === 'failed' || row.status === 'rejected') {
      entry.failedCount += row.cnt
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export const eisReportService = {
  getSubmissionSummary,
  getComparisonWithZReading,
  getDailyBreakdown
}

export default eisReportService
