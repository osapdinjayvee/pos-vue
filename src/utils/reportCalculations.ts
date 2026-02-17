/**
 * Report Calculation Utilities
 * Functions for calculating report totals and breakdowns
 */

import { toLocalDateStr } from '@/utils/dateHelpers'
import type { VATBreakdown, HourlyBreakdown, PaymentBreakdown, CategoryBreakdown } from '@/types/report'

// =====================
// VAT Calculations
// =====================

/**
 * Calculate VAT breakdown from sales amounts
 */
export function calculateVATBreakdown(
  vatableSales: number,
  vatExemptSales: number,
  zeroRatedSales: number,
  vatRate: number = 0.12
): VATBreakdown {
  const vatAmount = vatableSales * vatRate
  const totalSales = vatableSales + vatAmount + vatExemptSales + zeroRatedSales

  return {
    vatableSales,
    vatAmount,
    vatExemptSales,
    zeroRatedSales,
    totalSales
  }
}

/**
 * Extract VAT from a VAT-inclusive amount
 */
export function extractVATFromInclusive(vatInclusiveAmount: number, vatRate: number = 0.12): { netAmount: number; vatAmount: number } {
  const netAmount = vatInclusiveAmount / (1 + vatRate)
  const vatAmount = vatInclusiveAmount - netAmount

  return {
    netAmount: roundToTwo(netAmount),
    vatAmount: roundToTwo(vatAmount)
  }
}

/**
 * Add VAT to a net amount
 */
export function addVATToNet(netAmount: number, vatRate: number = 0.12): { grossAmount: number; vatAmount: number } {
  const vatAmount = netAmount * vatRate
  const grossAmount = netAmount + vatAmount

  return {
    grossAmount: roundToTwo(grossAmount),
    vatAmount: roundToTwo(vatAmount)
  }
}

// =====================
// Aggregation Functions
// =====================

/**
 * Calculate totals from an array of transactions
 */
export function calculateTotals<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/**
 * Calculate average ticket size
 */
export function calculateAverageTicket(totalSales: number, transactionCount: number): number {
  if (transactionCount === 0) return 0
  return roundToTwo(totalSales / transactionCount)
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return roundToTwo((value / total) * 100)
}

/**
 * Calculate period-over-period change
 */
export function calculateChange(current: number, previous: number): { absolute: number; percent: number } {
  const absolute = current - previous
  const percent = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100

  return {
    absolute: roundToTwo(absolute),
    percent: roundToTwo(percent)
  }
}

// =====================
// Hourly Breakdown
// =====================

/**
 * Group transactions by hour
 */
export function groupByHour(
  transactions: Array<{ created_at: string; total_amount: number }>
): HourlyBreakdown[] {
  const hourlyMap = new Map<number, { sales: number; count: number }>()

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { sales: 0, count: 0 })
  }

  // Aggregate by hour
  for (const tx of transactions) {
    const hour = new Date(tx.created_at).getHours()
    const current = hourlyMap.get(hour)!
    current.sales += tx.total_amount
    current.count += 1
  }

  // Convert to array
  return Array.from(hourlyMap.entries()).map(([hour, data]) => ({
    hour,
    label: formatHourLabel(hour),
    sales: roundToTwo(data.sales),
    transactionCount: data.count
  }))
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${period}`
}

// =====================
// Payment Breakdown
// =====================

/**
 * Group transactions by payment method
 */
export function groupByPaymentMethod(
  transactions: Array<{ payment_method: string; total_amount: number }>
): PaymentBreakdown[] {
  const methodMap = new Map<string, { amount: number; count: number }>()
  let totalAmount = 0

  for (const tx of transactions) {
    const method = tx.payment_method || 'cash'
    const current = methodMap.get(method) || { amount: 0, count: 0 }
    current.amount += tx.total_amount
    current.count += 1
    methodMap.set(method, current)
    totalAmount += tx.total_amount
  }

  return Array.from(methodMap.entries())
    .map(([method, data]) => ({
      method: formatPaymentMethod(method),
      amount: roundToTwo(data.amount),
      count: data.count,
      percentage: calculatePercentage(data.amount, totalAmount)
    }))
    .sort((a, b) => b.amount - a.amount)
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    gcash: 'GCash',
    maya: 'Maya',
    other: 'Other'
  }
  return labels[method.toLowerCase()] || method
}

// =====================
// Category Breakdown
// =====================

/**
 * Group sales by category
 */
export function groupByCategory(
  items: Array<{ category_id: string; category_name: string; quantity: number; line_total: number }>
): CategoryBreakdown[] {
  const categoryMap = new Map<string, { name: string; sales: number; quantity: number }>()
  let totalSales = 0

  for (const item of items) {
    const current = categoryMap.get(item.category_id) || {
      name: item.category_name,
      sales: 0,
      quantity: 0
    }
    current.sales += item.line_total
    current.quantity += item.quantity
    categoryMap.set(item.category_id, current)
    totalSales += item.line_total
  }

  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      sales: roundToTwo(data.sales),
      quantity: data.quantity,
      percentage: calculatePercentage(data.sales, totalSales)
    }))
    .sort((a, b) => b.sales - a.sales)
}

// =====================
// Date Utilities
// =====================

/**
 * Get start and end of day
 */
export function getDayBounds(date: string): { start: string; end: string } {
  const d = new Date(date)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Get start and end of week (Monday to Sunday)
 */
export function getWeekBounds(date: string): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday

  const start = new Date(d.setDate(diff))
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Get start and end of month
 */
export function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Get array of dates between two dates
 */
export function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const endDate = new Date(end)

  while (current <= endDate) {
    dates.push(toLocalDateStr(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// =====================
// Utility Functions
// =====================

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Safe division (returns 0 if divisor is 0)
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Sum an array of numbers
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  return roundToTwo(((revenue - cost) / revenue) * 100)
}
